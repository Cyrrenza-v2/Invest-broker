import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const url = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const authClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
const origins = new Set(["https://invest-broker.vercel.app","http://localhost:5173","http://127.0.0.1:5173"]);
function json(req: Request, body: unknown, status = 200) {
  const origin = req.headers.get("origin") ?? "";
  const headers = new Headers({"content-type":"application/json","cache-control":"no-store","vary":"Origin"});
  if (origins.has(origin)) { headers.set("access-control-allow-origin",origin); headers.set("access-control-allow-headers","authorization, apikey, content-type, x-client-info"); headers.set("access-control-allow-methods","GET, OPTIONS"); }
  return new Response(JSON.stringify(body),{status,headers});
}
Deno.serve(async req => {
  if (req.method === "OPTIONS") return json(req,{});
  if (req.method !== "GET") return json(req,{error:"Method not allowed; financial mutations are not enabled."},405);
  const origin=req.headers.get("origin")??"";
  if (origin && !origins.has(origin)) return json(req,{error:"Origin not allowed"},403);
  const header=req.headers.get("authorization")??"";
  const token=header.startsWith("Bearer ")?header.slice(7):"";
  if (!token) return json(req,{error:"Authentication required"},401);
  const {data:{user},error:authError}=await authClient.auth.getUser(token);
  if(authError||!user) return json(req,{error:"Invalid or expired session"},401);
  if(["admin","manager","system"].includes(user.app_metadata?.role)) return json(req,{error:"Use the Admin API for privileged accounts"},403);
  const route=new URL(req.url).pathname.split("/").filter(Boolean).slice(-1)[0]??"me";
  try {
    if(route==="me"||route==="profile"){
      const {data,error}=await db.from("profiles").select("id,user_code,full_name,phone,kyc_status,account_status,created_at,updated_at").eq("id",user.id).maybeSingle();
      if(error) throw error; return json(req,{data});
    }
    const map:Record<string,{table:string;select:string;owner:string;limit:number}> = {
      wallet:{table:"wallets",select:"id,wallet_code,user_id,currency,status,created_at",owner:"user_id",limit:1},
      investments:{table:"investments",select:"id,investment_code,plan_id,principal,currency,status,started_at,maturity_at,created_at",owner:"user_id",limit:100},
      transactions:{table:"ledger_entries",select:"id,wallet_id,entry_type,amount,currency,status,reference,related_entity_type,related_entity_id,description,created_at,posted_at",owner:"user_id",limit:200},
      deposits:{table:"deposits",select:"id,deposit_code,amount,currency,status,provider,created_at,confirmed_at",owner:"user_id",limit:100},
      withdrawals:{table:"withdrawals",select:"id,withdrawal_code,amount,currency,status,created_at,reviewed_at,completed_at",owner:"user_id",limit:100},
      support:{table:"support_messages",select:"id,subject,body,sender_role,read_at,created_at",owner:"user_id",limit:100}
    };
    if(route==="investment-plans"){
      const {data,error}=await db.from("investment_plans").select("id,name,description,currency,minimum_amount,maximum_amount,duration_days,return_rate,return_method,withdrawal_window_days,terms_version").eq("is_active",true).order("minimum_amount").limit(100);
      if(error) throw error; return json(req,{data:data??[]});
    }
    const spec=map[route]; if(!spec) return json(req,{error:"Route not found"},404);
    let q=db.from(spec.table).select(spec.select).eq(spec.owner,user.id).order("created_at",{ascending:false}).limit(spec.limit);
    if(route==="wallet") q=db.from(spec.table).select(spec.select).eq(spec.owner,user.id).limit(1);
    const {data,error}=await q; if(error) throw error;
    return json(req,{data:route==="wallet"?(data?.[0]??null):(data??[])});
  } catch(error) { console.error("user-api error",error); return json(req,{error:"Unable to retrieve requested data"},500); }
});