import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const url=Deno.env.get("SUPABASE_URL")!;
const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const anonKey=Deno.env.get("SUPABASE_ANON_KEY")!;
const db=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
const authClient=createClient(url,anonKey,{auth:{persistSession:false,autoRefreshToken:false}});
const origins=new Set(["https://invest-broker.vercel.app","http://localhost:5173","http://127.0.0.1:5173"]);
function json(req:Request,body:unknown,status=200){
 const origin=req.headers.get("origin")??"";
 const headers=new Headers({"content-type":"application/json","cache-control":"no-store","vary":"Origin"});
 if(origins.has(origin)){headers.set("access-control-allow-origin",origin);headers.set("access-control-allow-headers","authorization, apikey, content-type, x-client-info");headers.set("access-control-allow-methods","GET, OPTIONS");}
 return new Response(JSON.stringify(body),{status,headers});
}
Deno.serve(async req=>{
 if(req.method==="OPTIONS") return json(req,{});
 if(req.method!=="GET") return json(req,{error:"Admin write operations remain disabled until transactional approval workflows are implemented."},405);
 const origin=req.headers.get("origin")??"";
 if(origin&&!origins.has(origin)) return json(req,{error:"Origin not allowed"},403);
 const header=req.headers.get("authorization")??"";
 const token=header.startsWith("Bearer ")?header.slice(7):"";
 if(!token) return json(req,{error:"Authentication required"},401);
 const {data:{user},error:authError}=await authClient.auth.getUser(token);
 if(authError||!user) return json(req,{error:"Invalid or expired session"},401);
 if(!["admin","manager"].includes(user.app_metadata?.role)) return json(req,{error:"Manager permission required"},403);
 const {data:claimsData,error:claimsError}=await authClient.auth.getClaims(token);
 if(claimsError||claimsData?.claims?.aal!=="aal2") return json(req,{error:"Verified MFA (AAL2) is required"},403);
 const urlObj=new URL(req.url); const route=urlObj.pathname.split("/").filter(Boolean).slice(-1)[0]??"dashboard";
  const routeRoles:Record<string,string[]> = {
   dashboard:["admin","manager"], users:["admin","manager"], investments:["admin","manager"],
   "investment-plans":["admin","manager"], returns:["admin","manager"], deposits:["admin","manager"],
   withdrawals:["admin","manager"], compliance:["admin","manager"], treasury:["admin"], "audit-logs":["admin"]
  };
  if(!routeRoles[route]) return json(req,{error:"Route not found"},404);
  if(!routeRoles[route].includes(user.app_metadata?.role)) return json(req,{error:"Insufficient permission for this resource"},403);
 const limit=Math.min(Math.max(Number(urlObj.searchParams.get("limit")??100),1),200);
 try{
  if(route==="dashboard"){
   const results=await Promise.all([
    db.from("profiles").select("id",{count:"exact",head:true}),
    db.from("investments").select("id",{count:"exact",head:true}).in("status",["active","matured"]),
    db.from("deposits").select("id",{count:"exact",head:true}).in("status",["pending","processing"]),
    db.from("withdrawals").select("id",{count:"exact",head:true}).in("status",["pending","under_review"]),
    db.from("compliance_cases").select("id",{count:"exact",head:true}).in("status",["open","in_review","on_hold"])
   ]);
   for(const result of results) if(result.error) throw result.error;
   return json(req,{data:{users:results[0].count??0,activeOrMaturedInvestments:results[1].count??0,pendingDeposits:results[2].count??0,pendingWithdrawals:results[3].count??0,openComplianceCases:results[4].count??0}});
  }
  const specs:Record<string,{table:string;select:string}> = {
   users:{table:"profiles",select:"id,user_code,full_name,phone,kyc_status,account_status,created_at,updated_at"},
   investments:{table:"investments",select:"id,investment_code,user_id,plan_id,principal,currency,status,started_at,maturity_at,created_at"},
   "investment-plans":{table:"investment_plans",select:"id,name,description,currency,minimum_amount,maximum_amount,duration_days,return_rate,return_method,withdrawal_window_days,is_active,terms_version,created_at,updated_at"},
   returns:{table:"ledger_entries",select:"id,user_id,wallet_id,entry_type,amount,currency,status,reference,related_entity_type,related_entity_id,description,created_at,posted_at"},
   deposits:{table:"deposits",select:"id,deposit_code,user_id,amount,currency,status,provider,provider_reference,created_at,confirmed_at"},
   withdrawals:{table:"withdrawals",select:"id,withdrawal_code,user_id,amount,currency,status,provider,provider_reference,reviewed_by,review_reason,created_at,reviewed_at,completed_at"},
   compliance:{table:"compliance_cases",select:"id,user_id,case_type,status,risk_level,summary,assigned_to,resolution,created_at,resolved_at"},
   treasury:{table:"treasury_accounts",select:"id,account_name,currency,provider,external_reference,status,created_at"},
   "audit-logs":{table:"audit_logs",select:"id,actor_id,actor_role,action,entity_type,entity_id,request_id,reason,before_state,after_state,created_at"}
  };
  const spec=specs[route]; if(!spec) return json(req,{error:"Route not found"},404);
  let query=db.from(spec.table).select(spec.select).order("created_at",{ascending:false}).limit(limit);
  const userId=urlObj.searchParams.get("user_id");
  if(userId&&["investments","returns","deposits","withdrawals"].includes(route)) query=query.eq("user_id",userId);
  const {data,error}=await query; if(error) throw error;
  return json(req,{data:data??[]});
 }catch(error){console.error("admin-api error",error);return json(req,{error:"Unable to retrieve requested admin data"},500);}
});