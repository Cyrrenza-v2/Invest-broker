import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import {
  Activity, ArrowDownLeft, ArrowUpRight, Bell, BriefcaseBusiness, CheckCircle2,
  ChevronRight, CircleHelp, Clock3, CreditCard, Eye, EyeOff, FileCheck2,
  FileText, LayoutDashboard, LockKeyhole, LogOut, Menu, MessageCircle,
  ShieldCheck, TrendingUp, UserRound, Wallet, X, Landmark, CalendarDays,
  RefreshCw, AlertCircle
} from "lucide-react";
import "./style.css";
import { getUserPath, resolveUserRoute } from "./routing.js";
import { approvalAccessMessage, isApprovedAccount } from "./approval.js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://rjgzvpkyccfpnpzlbcuc.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey, { auth: { storageKey: "invest-broker-user-auth-v1", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;
const money = (n, currency = "NGN") => new Intl.NumberFormat("en-NG", { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(n || 0));
const date = value => value ? new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(new Date(value)) : "Not set";
const roleIsAdmin = user => user?.app_metadata?.role === "admin";
const userApi = `${supabaseUrl}/functions/v1/user-api`;
async function callUserApi(session, route, options = {}) {
  const response = await fetch(`${userApi}/${route}`, { ...options, headers: { Authorization: `Bearer ${session.access_token}`, apikey: supabaseKey, "Content-Type": "application/json" } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "User API request failed");
  return payload.data;
}
const navItems = [
  ["Overview", LayoutDashboard], ["My investments", BriefcaseBusiness], ["My wallet", Wallet],
  ["Profit", TrendingUp], ["Withdrawals", ArrowUpRight], ["Deposits", ArrowDownLeft],
  ["Transactions", Activity], ["Verification", FileCheck2], ["Documents", FileText],
  ["Notifications", Bell], ["Support & complaints", MessageCircle], ["Security", ShieldCheck]
];

function App() {
  const [section, setSection] = useState(() => resolveUserRoute(window.location.pathname).section);
  const [mobileNav, setMobileNav] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [notice, setNotice] = useState("");
  const [session, setSession] = useState(null);
  const [approvalStatus, setApprovalStatus] = useState("signed_out");
  const [registrationPending, setRegistrationPending] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [authMode, setAuthMode] = useState("login");
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState({ profile:null, wallet:null, plans:[], investments:[], ledger:[], deposits:[], withdrawals:[], bankAccounts:[], notifications:[], documents:[], messages:[], complaints:[], loading:false });
  const [complaint, setComplaint] = useState({category:"other",subject:"",description:""});
  const [messageBody, setMessageBody] = useState("");
  const [showComplaintForm, setShowComplaintForm] = useState(false);

  useEffect(() => {
    const syncRoute = () => {
      const route = resolveUserRoute(window.location.pathname);
      setSection(route.section);
      if (route.authMode) {
        setAuthMode(route.authMode);
        setAuthOpen(true);
      } else {
        setAuthOpen(false);
      }
    };
    syncRoute();
    window.addEventListener("popstate", syncRoute);
    return () => window.removeEventListener("popstate", syncRoute);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({data}) => { setSession(data.session); setApprovalStatus(data.session ? "checking" : "signed_out"); if (!data.session && ["/","/dashboard","/login","/register"].includes(window.location.pathname)) { const route=resolveUserRoute(window.location.pathname); setAuthMode(route.authMode || "login"); setAuthOpen(true); } });
    const {data: listener} = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); setApprovalStatus(next ? "checking" : "signed_out"); });
    return () => listener.subscription.unsubscribe();
  }, []);

  const loadData = async (quiet = false) => {
    if (!supabase || !session?.user?.id) return;
    if (quiet) setRefreshing(true);
    else setData(previous => ({...previous, loading:true}));
    try {
      const profile = await callUserApi(session, "me");
      setData(previous => ({...previous, profile:profile||null, loading:false}));
      const approval = approvalAccessMessage(profile);
      setApprovalStatus(approval);
      if (!isApprovedAccount(profile)) {
        setData({profile:profile||null,wallet:null,plans:[],investments:[],ledger:[],deposits:[],withdrawals:[],bankAccounts:[],notifications:[],documents:[],messages:[],complaints:[],loading:false});
        setNotice("");
        return;
      }
      setRegistrationPending(false);
      const [wallet,plans,investments,ledger,deposits,withdrawals,messages] = await Promise.all([
        callUserApi(session,"wallet"), callUserApi(session,"investment-plans"),
        callUserApi(session,"investments"), callUserApi(session,"transactions"), callUserApi(session,"deposits"),
        callUserApi(session,"withdrawals"), callUserApi(session,"support")
      ]);
      setData({profile:profile||null,wallet:wallet||null,plans:plans||[],investments:investments||[],ledger:ledger||[],
        deposits:deposits||[],withdrawals:withdrawals||[],bankAccounts:[],notifications:[],documents:[],
        messages:messages||[],complaints:[],loading:false});
      setNotice("");
    } catch (error) {
      setApprovalStatus("error");
      setData(previous=>({...previous,loading:false}));
      setNotice(error.message || "Account data could not be loaded from the secure User API.");
    } finally { setRefreshing(false); }
  };

  useEffect(() => { if (session?.user?.id) { setApprovalStatus("checking"); loadData(); } else { setApprovalStatus("signed_out"); setData({profile:null,wallet:null,plans:[],investments:[],ledger:[],deposits:[],withdrawals:[],bankAccounts:[],notifications:[],documents:[],messages:[],complaints:[],loading:false}); } }, [session?.user?.id]);

  const postedLedger = data.ledger.filter(entry => entry.status === "posted");
  const availableBalance = postedLedger.reduce((sum, entry) => {
    const amount = Number(entry.amount || 0);
    if (amount < 0) return sum + amount;
    if (["withdrawal","principal_debit","fee"].includes(entry.entry_type)) return sum - amount;
    if (entry.entry_type === "reversal") return sum + amount;
    return sum + amount;
  }, 0);
  const invested = data.investments.filter(item => ["active","matured","under_review"].includes(item.status)).reduce((sum,item)=>sum+Number(item.principal||0),0);
  const profitCredited = postedLedger.filter(item=>item.entry_type==="profit_credit").reduce((sum,item)=>sum+Math.abs(Number(item.amount||0)),0);
  const activeInvestments = data.investments.filter(item=>item.status==="active");
  const nextMaturity = activeInvestments.map(item=>item.maturity_at).filter(Boolean).sort()[0];
  const unreadCount = data.notifications.filter(item=>!item.read_at).length;
  const isAdmin = roleIsAdmin(session?.user);
  const displayName = data.profile?.full_name || session?.user?.user_metadata?.full_name || session?.user?.email?.split("@")[0] || "Investor";

  async function submitAuth() {
    if (!supabase) { setNotice("The Supabase publishable key is not configured in this deployment."); return; }
    if (!email.trim()) { setNotice("Enter your email address first."); return; }
    setBusy(true);
    let error = null;
    if (authMode === "signup") {
      if (!fullName.trim()) { setBusy(false); setNotice("Enter your full name."); return; }
      if (password.length < 8) { setBusy(false); setNotice("Use a password with at least 8 characters."); return; }
      const result = await supabase.auth.signUp({email:email.trim(),password,options:{data:{full_name:fullName.trim()},emailRedirectTo:window.location.origin}});
      error = result.error;
      if (!error) {
        setFullName("");
        setPassword("");
        setRegistrationPending(true);
        setApprovalStatus(result.data.session ? "checking" : "pending");
        if (result.data.session) setSession(result.data.session);
        setAuthOpen(false);
        const path = getUserPath("Overview");
        if (window.location.pathname !== path) window.history.pushState({}, "", path);
        setSection("Overview");
        setNotice("Registration received. Your account is waiting for administrator approval.");
      }
    } else if (authMode === "reset") {
      const result = await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo:window.location.origin});
      error = result.error;
      if (!error) setNotice("Password reset instructions have been sent if the email is registered.");
    } else {
      const result = await supabase.auth.signInWithPassword({email:email.trim(),password});
      error = result.error;
      if (!error) {
        const profile = await callUserApi(result.data.session, "me");
        if (!isApprovedAccount(profile)) {
          await supabase.auth.signOut();
          setSession(null);
          const status=approvalAccessMessage(profile);
          setApprovalStatus(status);
          setPassword("");
          setNotice(status === "rejected"
            ? "This account application was rejected. Contact the platform administrator."
            : status === "restricted"
              ? "This account is restricted. Contact the platform administrator."
              : "Your account is awaiting administrator approval. You can sign in after it is approved.");
        } else {
          setSession(result.data.session);
          setApprovalStatus("approved");
          setAuthOpen(false);
          setPassword("");
          setNotice("Signed in successfully. Welcome to your dashboard.");
          const path = getUserPath("Overview");
          if (window.location.pathname !== path) window.history.pushState({}, "", path);
          setSection("Overview");
        }
      }
    }
    setBusy(false);
    if (error) setNotice(error.message);
  }
  async function signOut() { if (supabase) await supabase.auth.signOut(); const path = getUserPath("Overview"); if (window.location.pathname !== path) window.history.pushState({}, "", path); setSession(null); setApprovalStatus("signed_out"); setRegistrationPending(false); setSection("Overview"); setNotice("You are signed out."); }
  function go(name) { const path = getUserPath(name); if (window.location.pathname !== path) window.history.pushState({}, "", path); setSection(name); setMobileNav(false); setAuthOpen(false); setNotice(""); }
  function disabledAction(action) { setNotice(action + " is not enabled yet. It will remain disabled until the secure server-side workflow and authorized payment provider are verified."); }
  async function sendComplaint(e) {
    e.preventDefault();
    disabledAction("Complaint submission");
  }
  async function sendSupportMessage(e) {
    e.preventDefault();
    if (!messageBody.trim() || !session) return;
    setBusy(true);
    try {
      await callUserApi(session,"support",{method:"POST",body:JSON.stringify({subject:"Customer support",body:messageBody.trim()})});
      setMessageBody("");
      setNotice("Your message was sent to support.");
      await loadData(true);
    } catch (error) { setNotice("Message could not be sent: " + error.message); }
    finally { setBusy(false); }
  }
  async function markNotificationRead() {
    disabledAction("Notification updates");
  }

  if (registrationPending || (session && approvalStatus !== "approved")) {
    const rejected = approvalStatus === "rejected" || data.profile?.approval_status === "rejected";
    const checking = approvalStatus === "checking" || !approvalStatus;
    return <div className="app-shell user-portal" style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:24}}>
      <section className="panel user-panel" style={{width:"min(560px,100%)",padding:32}}>
        <div className="brand-mark" style={{marginBottom:20}}><ShieldCheck size={24}/></div>
        <div className="eyebrow">INVEST BROKER · ACCOUNT ACCESS</div>
        <h1 style={{marginTop:12}}>{checking ? "Checking account status…" : rejected ? "Account approval declined" : approvalStatus === "restricted" ? "Account access is restricted" : approvalStatus === "error" ? "We couldn't verify your account" : "Your account is awaiting approval"}</h1>
        <p>{checking ? "We're securely checking the status of your registration." : rejected ? "The administrator did not approve this application. Contact the platform administrator if you believe this is a mistake." : approvalStatus === "restricted" ? "Your account has been restricted by the platform. Contact the sole administrator for assistance." : approvalStatus === "error" ? "The account status service could not be reached. Your account remains locked until verification succeeds." : "Your registration profile and wallet are created automatically. The sole administrator must approve the account before any customer dashboard data or account actions become available."}</p>
        {data.profile?.user_code && <p><b>Account reference:</b> {data.profile.user_code}</p>}
        {notice && <div className="toast" role="status">{notice}</div>}
        <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:16}}><button className="primary-button" onClick={async()=>{if(session){await loadData(true);return;}setRegistrationPending(false);setApprovalStatus("signed_out");setAuthMode("login");setAuthOpen(true);setNotice("Enter the email and password you registered with. Login will only succeed after the administrator approves your account.");}}>{checking ? "Check status again" : rejected ? "Return to login" : "I have been approved — sign in"} <ChevronRight size={16}/></button><button className="subtle-button" onClick={()=>{if(session&&supabase)supabase.auth.signOut();setSession(null);setRegistrationPending(false);setApprovalStatus("signed_out");setAuthMode("login");setAuthOpen(true);setNotice("");}}>Back to login</button></div>
      </section>
    </div>;
  }

  return <div className="app-shell user-portal">
    <aside className={"sidebar " + (mobileNav?"sidebar-open":"")}>
      <div className="brand"><div className="brand-mark"><TrendingUp size={21}/></div><div><b>INVEST<span>BROKER</span></b><small>INVESTOR PORTAL</small></div><button className="icon-button mobile-close" onClick={()=>setMobileNav(false)} aria-label="Close menu"><X size={18}/></button></div>
      <div className="workspace-label">MY ACCOUNT</div>
      <nav>{navItems.map(([label,Icon])=><button key={label} onClick={()=>go(label)} className={"nav-item "+(section===label?"active":"")}><Icon size={18}/><span>{label}</span>{label==="Notifications"&&unreadCount>0&&<span className="nav-count">{unreadCount}</span>}</button>)}</nav>
      <div className="sidebar-bottom">
        <div className="secure-card"><div className="secure-icon"><ShieldCheck size={18}/></div><b>Your money, your records</b><p>Your account is isolated from manager tools and company treasury records.</p><span><LockKeyhole size={12}/> Protected workspace</span></div>
        <div className="profile-row"><div className="avatar">{session?displayName.slice(0,1).toUpperCase():"G"}</div><div className="profile-copy"><b>{session?displayName:"Guest preview"}</b><small>{session?data.profile?.account_status||"Customer account":"Not signed in"}</small></div><button className="icon-button" aria-label={session?"Sign out":"Sign in"} onClick={()=>session?signOut():setAuthOpen(true)}>{session?<LogOut size={16}/>:<ChevronRight size={16}/>}</button></div>
      </div>
    </aside>
    {mobileNav&&<button className="scrim" onClick={()=>setMobileNav(false)} aria-label="Close navigation"/>}
    <main className="main-area">
      <header className="topbar"><div className="top-left"><button className="icon-button mobile-menu" onClick={()=>setMobileNav(true)} aria-label="Open menu"><Menu size={20}/></button><div className="breadcrumb">My account <span>/</span> <b>{section}</b></div></div><div className="top-actions"><span className={"connection-pill "+(supabase?"connected":"")}><i/>{supabase?"Backend configured":"Preview mode"}</span><button className="icon-button notification-button" onClick={()=>go("Notifications")} aria-label="Notifications"><Bell size={18}/>{unreadCount>0&&<i/>}</button><button className="user-chip" onClick={()=>session?signOut():setAuthOpen(true)}><div className="avatar small">{session?displayName.slice(0,1).toUpperCase():"G"}</div><span>{session?"Sign out":"Sign in"}</span><ChevronRight size={14}/></button></div></header>
      <div className="content">
        <div className="welcome-row"><div><div className="eyebrow"><span className="status-dot"/> INVEST BROKER <span className="tag">{session?"CUSTOMER PORTAL":"PREVIEW"}</span></div><h1>{section==="Overview"?"Welcome back, "+displayName:section}</h1><p>{section==="Overview"?"Your investments, wallet and account activity in one place.":sectionDescription(section)}</p></div><div className="header-actions"><button className="subtle-button" onClick={()=>loadData(true)} disabled={!session||refreshing}><RefreshCw size={15} className={refreshing?"spin":""}/> Refresh</button>{!session&&<button className="primary-button" onClick={()=>setAuthOpen(true)}>Sign in securely <ChevronRight size={16}/></button>}</div></div>
        {!session&&<div className="notice-banner"><div className="notice-icon"><LockKeyhole size={18}/></div><div><b>Sign in to view your account</b><p>This preview does not contain sample money or fabricated investment records. Sign in with the email associated with your account to load your own permitted records.</p></div><span className="notice-state">PRIVATE</span></div>}
        {notice&&<div className="toast" role="status"><span>{notice}</span><button onClick={()=>setNotice("")} aria-label="Dismiss notice"><X size={16}/></button></div>}
        {isAdmin&&<div className="notice-banner"><div className="notice-icon"><ShieldCheck size={18}/></div><div><b>Administrator account detected</b><p>This interface is the customer portal. Use the separately authorized admin interface for management actions.</p></div><span className="notice-state">USER SIDE</span></div>}
        {section==="Overview"&&<Overview data={data} availableBalance={availableBalance} invested={invested} profitCredited={profitCredited} activeInvestments={activeInvestments} nextMaturity={nextMaturity} showBalance={showBalance} setShowBalance={setShowBalance} go={go} disabledAction={disabledAction} />}
        {section==="My investments"&&<Investments data={data} go={go} />}
        {section==="My wallet"&&<WalletPage data={data} availableBalance={availableBalance} invested={invested} profitCredited={profitCredited} showBalance={showBalance} setShowBalance={setShowBalance} disabledAction={disabledAction} />}
        {section==="Profit"&&<ProfitPage ledger={postedLedger} profitCredited={profitCredited} investments={data.investments} />}
        {section==="Withdrawals"&&<Withdrawals data={data} availableBalance={availableBalance} disabledAction={disabledAction} />}
        {section==="Deposits"&&<Deposits data={data} disabledAction={disabledAction} />}
        {section==="Transactions"&&<Transactions ledger={data.ledger} deposits={data.deposits} withdrawals={data.withdrawals} />}
        {section==="Verification"&&<Verification profile={data.profile} bankAccounts={data.bankAccounts} />}
        {section==="Documents"&&<Documents documents={data.documents} />}
        {section==="Notifications"&&<Notifications items={data.notifications} onRead={markNotificationRead} />}
        {section==="Support & complaints"&&<Support messages={data.messages} complaints={data.complaints} messageBody={messageBody} setMessageBody={setMessageBody} sendSupportMessage={sendSupportMessage} complaint={complaint} setComplaint={setComplaint} showComplaintForm={showComplaintForm} setShowComplaintForm={setShowComplaintForm} sendComplaint={sendComplaint} busy={busy} />}
        {section==="Security"&&<Security session={session} disabledAction={disabledAction} />}
        <footer className="footer"><span>© {new Date().getFullYear()} Invest Broker</span><span><ShieldCheck size={13}/> Private customer workspace</span><span>Financial actions require secure backend verification</span></footer>
      </div>
    </main>
    {authOpen&&<div className="modal-backdrop" onClick={()=>setAuthOpen(false)}><div className="auth-modal" onClick={e=>e.stopPropagation()}><button className="modal-close icon-button" onClick={()=>setAuthOpen(false)} aria-label="Close"><X size={18}/></button><div className="modal-brand"><div className="brand-mark"><TrendingUp size={20}/></div></div><h2>{authMode==="signup"?"Create your account":authMode==="reset"?"Reset password":"Welcome back"}</h2><p>{authMode==="signup"?"Register your personal customer account.":authMode==="reset"?"We’ll email you a secure password reset link.":"Sign in to access your private investment dashboard."}</p>{authMode==="signup"&&<><label htmlFor="fullName">Full name</label><input id="fullName" value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Your full name" autoComplete="name"/></>}<label htmlFor="email">Email address</label><input id="email" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required/>{authMode!=="reset"&&<><label htmlFor="password">Password</label><input id="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete={authMode==="signup"?"new-password":"current-password"} minLength={8} required/></>}{authMode==="login"&&<button className="auth-text-link" onClick={()=>setAuthMode("reset")}>Forgot password?</button>}<button className="primary-button full-button" onClick={submitAuth} disabled={busy}>{busy?"Please wait…":authMode==="signup"?"Create account":authMode==="reset"?"Send reset link":"Login"} <ChevronRight size={16}/></button><div className="auth-mode-switch">{authMode==="signup"?"Already registered?":"New to Invest Broker?"} <button onClick={()=>{setAuthMode(authMode==="signup"?"login":"signup");setNotice("");}}>{authMode==="signup"?"Login":"Create account"}</button>{authMode==="reset"&&<button onClick={()=>setAuthMode("login")}>Back to login</button>}</div><div className="modal-safety"><LockKeyhole size={14}/> Never share passwords or verification codes.</div></div></div>}
  </div>;
}

function sectionDescription(name) {
 const descriptions={"My investments":"Review your investment records, plan terms and maturity dates.","My wallet":"Your customer wallet is separate from company treasury accounts.","Profit":"See the difference between credited profit and returns that have not yet been verified.","Withdrawals":"Track withdrawal requests and their confirmed processing status.","Deposits":"Track deposits verified by the authorized funding provider.","Transactions":"A chronological view of posted ledger entries and funding activity.","Verification":"Review your KYC status and verified payout account details.","Documents":"Access documents and statements made available to your account.","Notifications":"Account notices and status updates from the platform.","Support & complaints":"Contact support or submit a complaint tied to your account.","Security":"Review your session and account security controls."};
 return descriptions[name]||"Your account details.";
}
function Panel({title,subtitle,children,action}) { return <section className="panel user-panel"><div className="panel-heading"><div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div>{action}</div>{children}</section>; }
function Metric({title,value,subtitle,icon:Icon,tone="blue"}) { return <div className="metric-card"><div className={"metric-icon "+tone}><Icon size={19}/></div><div className="metric-title">{title}</div><div className="metric-value">{value}</div><div className="metric-subtitle">{subtitle}</div></div>; }
function Empty({title,body,action}) { return <div className="empty-state"><div className="empty-illustration"><Activity size={24}/></div><b>{title}</b><p>{body}</p>{action}</div>; }
function Status({value}) { const label=(value||"unknown").replaceAll("_"," "); return <span className={"status-tag status-"+(value||"unknown")}>{label}</span>; }
function Table({columns,rows,empty="No records yet"}) { return rows.length?<div className="table-wrap"><table><thead><tr>{columns.map(c=><th key={c.label}>{c.label}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={row.id||i}>{columns.map(c=><td key={c.label}>{c.render?c.render(row):row[c.key]??"—"}</td>)}</tr>)}</tbody></table></div>:<Empty title={empty} body="When verified records become available, they will appear here automatically."/>; }

function Overview({data,availableBalance,invested,profitCredited,activeInvestments,nextMaturity,showBalance,setShowBalance,go,disabledAction}) {
 return <>
  <div className="metrics-grid"><Metric title="Available wallet balance" value={showBalance?money(availableBalance):"••••••"} subtitle="Posted ledger entries only" icon={Wallet} tone="blue"/><Metric title="Total invested" value={showBalance?money(invested):"••••••"} subtitle={activeInvestments.length+" active investment(s)"} icon={BriefcaseBusiness} tone="violet"/><Metric title="Profit credited" value={showBalance?money(profitCredited):"••••••"} subtitle="Confirmed ledger credits only" icon={TrendingUp} tone="green"/><Metric title="Next maturity" value={date(nextMaturity)} subtitle="Based on active investments" icon={CalendarDays} tone="amber"/></div>
  <div className="section-grid"><Panel title="My wallet" subtitle="Your own customer wallet"><div className="wallet-highlight"><div><span>AVAILABLE BALANCE</span><strong>{showBalance?money(availableBalance):"••••••"}</strong></div><button className="icon-button" onClick={()=>setShowBalance(!showBalance)} aria-label="Toggle balance">{showBalance?<Eye size={17}/>:<EyeOff size={17}/>}</button></div><div className="action-row"><button className="primary-button" onClick={()=>disabledAction("Deposit") }><ArrowDownLeft size={16}/> Deposit</button><button className="secondary-button" onClick={()=>disabledAction("Withdrawal") }><ArrowUpRight size={16}/> Withdraw</button><button className="secondary-button" onClick={()=>go("My wallet")}>Wallet details <ChevronRight size={15}/></button></div><p className="small-note"><LockKeyhole size={14}/> Your wallet is not the company treasury wallet.</p></Panel>
   <Panel title="Investment summary" subtitle="Your current investment records" action={<button className="subtle-button" onClick={()=>go("My investments")}>View all <ChevronRight size={14}/></button>}>{activeInvestments.length?<div className="investment-mini-list">{activeInvestments.slice(0,3).map(item=><div className="investment-mini" key={item.id}><div className="mini-icon"><BriefcaseBusiness size={17}/></div><div className="mini-copy"><b>{item.investment_code}</b><span>{item.investment_plans?.name||"Investment plan"} · Matures {date(item.maturity_at)}</span></div><div className="mini-amount">{money(item.principal,item.currency)}<Status value={item.status}/></div></div>)}</div>:<Empty title="No active investments" body="Your active investments will appear here after they are confirmed by the platform."/>}</Panel></div>
  <Panel title="Recent activity" subtitle="Latest verified account activity" action={<button className="subtle-button" onClick={()=>go("Transactions")}>All transactions <ChevronRight size={14}/></button>}><Table columns={[{label:"Reference",render:r=><b>{r.reference}</b>},{label:"Activity",render:r=>r.entry_type.replaceAll("_"," ")},{label:"Date",render:r=>date(r.created_at)},{label:"Amount",render:r=><span className={Number(r.amount)>=0?"amount-positive":"amount-negative"}>{money(r.amount,r.currency)}</span>},{label:"Status",render:r=><Status value={r.status}/>}]} rows={data.ledger.slice(0,5)}/></Panel>
 </>;
}
function Investments({data,go}) { return <><Panel title="My investments" subtitle="Investment status, principal and maturity"><Table columns={[{label:"Investment",render:r=><><b>{r.investment_code}</b><small className="cell-sub">{r.investment_plans?.name||"Plan details"}</small></>},{label:"Principal",render:r=>money(r.principal,r.currency)},{label:"Started",render:r=>date(r.started_at||r.created_at)},{label:"Maturity",render:r=>date(r.maturity_at)},{label:"Status",render:r=><Status value={r.status}/>},{label:"Details",render:r=><button className="text-button" onClick={()=>go("Profit")}>Return details <ChevronRight size={13}/></button>}]} rows={data.investments}/></Panel><Panel title="Available investment plans" subtitle="Only active plans published by the platform"><Table columns={[{label:"Plan",key:"name"},{label:"Duration",render:r=>r.duration_days+" days"},{label:"Minimum",render:r=>money(r.minimum_amount,r.currency)},{label:"Return method",render:r=>r.return_method},{label:"Terms",render:r=>r.terms_version}]} rows={data.plans} empty="No active plans are currently available"/></Panel></>; }
function WalletPage({data,availableBalance,invested,profitCredited,showBalance,setShowBalance,disabledAction}) { return <><div className="metrics-grid"><Metric title="Available balance" value={showBalance?money(availableBalance):"••••••"} subtitle="Posted ledger total" icon={Wallet}/><Metric title="Invested" value={showBalance?money(invested):"••••••"} subtitle="Active, matured or under review" icon={BriefcaseBusiness} tone="violet"/><Metric title="Profit earned" value={showBalance?money(profitCredited):"••••••"} subtitle="Posted profit credits" icon={TrendingUp} tone="green"/></div><Panel title="My wallet" subtitle={data.wallet?data.wallet.wallet_code:"Wallet record will appear after account provisioning"}><div className="wallet-highlight"><div><span>AVAILABLE BALANCE</span><strong>{showBalance?money(availableBalance):"••••••"}</strong></div><button className="icon-button" onClick={()=>setShowBalance(!showBalance)}>{showBalance?<Eye size={17}/>:<EyeOff size={17}/>}</button></div><div className="action-row"><button className="primary-button" onClick={()=>disabledAction("Deposit")}> <ArrowDownLeft size={16}/> Deposit</button><button className="secondary-button" onClick={()=>disabledAction("Withdrawal")}><ArrowUpRight size={16}/> Withdraw</button></div><p className="small-note"><ShieldCheck size={14}/> The balance is derived from posted ledger entries. Pending deposits and uncredited projected returns are excluded.</p></Panel><Panel title="Wallet ledger" subtitle="Every posted balance movement has a reference"><Table columns={[{label:"Reference",key:"reference"},{label:"Type",render:r=>r.entry_type.replaceAll("_"," ")},{label:"Date",render:r=>date(r.created_at)},{label:"Amount",render:r=>money(r.amount,r.currency)},{label:"Status",render:r=><Status value={r.status}/>}]} rows={data.ledger}/></Panel></>; }
function ProfitPage({ledger,profitCredited,investments}) { const credits=ledger.filter(r=>r.entry_type==="profit_credit"); return <><div className="metrics-grid"><Metric title="Profit credited" value={money(profitCredited)} subtitle="Confirmed ledger credits" icon={TrendingUp} tone="green"/><Metric title="Profit pending" value="Not calculated" subtitle="No accrued-profit engine is enabled" icon={Clock3} tone="amber"/><Metric title="Active investments" value={investments.filter(r=>r.status==="active").length} subtitle="Investment records" icon={BriefcaseBusiness} tone="violet"/></div><div className="notice-banner"><div className="notice-icon"><AlertCircle size={18}/></div><div><b>Projected returns are not credited profit</b><p>Only posted profit-credit ledger entries are shown as earned. Pending or projected returns will appear after the investment calculation and approval service is implemented.</p></div></div><Panel title="Profit history" subtitle="Posted profit credits"><Table columns={[{label:"Reference",key:"reference"},{label:"Date",render:r=>date(r.created_at)},{label:"Amount",render:r=>money(r.amount,r.currency)},{label:"Status",render:r=><Status value={r.status}/>}]} rows={credits}/></Panel></>; }
function Withdrawals({data,availableBalance,disabledAction}) { return <><div className="metrics-grid"><Metric title="Available balance" value={money(availableBalance)} subtitle="Posted ledger entries" icon={Wallet}/><Metric title="Pending requests" value={data.withdrawals.filter(r=>["pending","under_review"].includes(r.status)).length} subtitle="Awaiting review" icon={Clock3} tone="amber"/><Metric title="Completed" value={data.withdrawals.filter(r=>r.status==="completed").length} subtitle="Provider-confirmed" icon={CheckCircle2} tone="green"/></div><Panel title="Request a withdrawal" subtitle="Secure withdrawal submission is not enabled yet"><div className="withdrawal-callout"><div className="notice-icon"><LockKeyhole size={20}/></div><div><b>Withdrawal requests are temporarily disabled</b><p>The server-side balance reservation, compliance review, approval audit and payment-provider confirmation flow must be verified before you can submit a request.</p><button className="primary-button" onClick={()=>disabledAction("Withdrawal request")}>Request withdrawal <ArrowUpRight size={15}/></button></div></div><div className="info-grid"><Info label="Available" value={money(availableBalance)}/><Info label="Primary payout account" value={data.bankAccounts.find(r=>r.is_primary)?.provider_name||"Not linked"}/><Info label="Next eligible window" value="Not configured"/></div></Panel><Panel title="Withdrawal history" subtitle="Status changes from request to provider confirmation"><Table columns={[{label:"Reference",render:r=><b>{r.withdrawal_code}</b>},{label:"Amount",render:r=>money(r.amount,r.currency)},{label:"Requested",render:r=>date(r.created_at)},{label:"Status",render:r=><Status value={r.status}/>},{label:"Updated",render:r=>date(r.completed_at||r.reviewed_at||r.created_at)}]} rows={data.withdrawals}/></Panel></>; }
function Deposits({data,disabledAction}) { return <><Panel title="Add funds" subtitle="Funding through an authorized provider only"><div className="withdrawal-callout"><div className="notice-icon"><Landmark size={20}/></div><div><b>Deposit provider is not configured</b><p>Do not transfer funds to a personal account. Deposit instructions will appear here only after an approved payment provider is connected and its verification callback is tested.</p><button className="primary-button" onClick={()=>disabledAction("Deposit")}>Start deposit <ArrowDownLeft size={15}/></button></div></div></Panel><Panel title="Deposit history" subtitle="Only provider-verified deposits should be credited"><Table columns={[{label:"Reference",render:r=><b>{r.deposit_code}</b>},{label:"Amount",render:r=>money(r.amount,r.currency)},{label:"Created",render:r=>date(r.created_at)},{label:"Provider",render:r=>r.provider||"—"},{label:"Status",render:r=><Status value={r.status}/> }]} rows={data.deposits}/></Panel></>; }
function Transactions({ledger,deposits,withdrawals}) { const all=[...ledger.map(r=>({...r,displayRef:r.reference,type:r.entry_type,displayAmount:r.amount})),...deposits.map(r=>({...r,displayRef:r.deposit_code,type:"deposit request",displayAmount:r.amount})),...withdrawals.map(r=>({...r,displayRef:r.withdrawal_code,type:"withdrawal request",displayAmount:-Math.abs(Number(r.amount)),currency:r.currency}))].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)); return <Panel title="Transaction history" subtitle="Ledger entries and payment requests in date order"><Table columns={[{label:"Reference",render:r=><b>{r.displayRef}</b>},{label:"Transaction",render:r=>r.type.replaceAll("_"," ")},{label:"Date",render:r=>date(r.created_at)},{label:"Amount",render:r=>money(r.displayAmount,r.currency)},{label:"Status",render:r=><Status value={r.status}/>}]} rows={all}/></Panel>; }
function Verification({profile,bankAccounts}) { return <><div className="metrics-grid"><Metric title="Identity verification" value={(profile?.kyc_status||"pending").replaceAll("_"," ")} subtitle="KYC status from your profile" icon={FileCheck2} tone="violet"/><Metric title="Account status" value={(profile?.account_status||"pending_kyc").replaceAll("_"," ")} subtitle="Platform access status" icon={ShieldCheck} tone="green"/></div><Panel title="Personal profile" subtitle="Verified account details"><div className="info-grid"><Info label="Customer ID" value={profile?.user_code||"Created after registration"}/><Info label="Full name" value={profile?.full_name||"Not provided"}/><Info label="Phone" value={profile?.phone||"Not provided"}/><Info label="KYC status" value={(profile?.kyc_status||"pending").replaceAll("_"," ")}/></div><p className="small-note"><LockKeyhole size={14}/> Personal information changes and KYC uploads require a secure verification workflow.</p></Panel><Panel title="Payout accounts" subtitle="Only masked account details are displayed"><Table columns={[{label:"Provider",key:"provider_name"},{label:"Account name",key:"account_name"},{label:"Account",render:r=>"•••• "+r.account_last4},{label:"Status",render:r=><Status value={r.status}/>},{label:"Primary",render:r=>r.is_primary?"Yes":"No"}]} rows={bankAccounts} empty="No payout account has been linked"/></Panel></>; }
function Documents({documents}) { return <Panel title="Your documents" subtitle="Statements, confirmations and terms published to your account"><Table columns={[{label:"Document",key:"title"},{label:"Type",key:"document_type"},{label:"Version",key:"version"},{label:"Date",render:r=>date(r.created_at)},{label:"Status",render:r=><Status value={r.status}/>},{label:"Access",render:r=>r.storage_path?<span className="muted">Private file link pending</span>:"Not uploaded"}]} rows={documents} empty="No documents have been published yet"/></Panel>; }
function Notifications({items,onRead}) { return <Panel title="Notifications" subtitle="Investment, payment and account-status updates"><Table columns={[{label:"Notice",render:r=><><b>{r.title}</b><small className="cell-sub">{r.body}</small></>},{label:"Date",render:r=>date(r.created_at)},{label:"Status",render:r=><Status value={r.read_at?"read":"unread"}/>},{label:"Action",render:r=>!r.read_at?<button className="text-button" onClick={()=>onRead(r)}>Mark read</button>:"—"}]} rows={items} empty="You're all caught up"/></Panel>; }
function Support({messages,complaints,messageBody,setMessageBody,sendSupportMessage,complaint,setComplaint,showComplaintForm,setShowComplaintForm,sendComplaint,busy}) { return <><Panel title="Contact support" subtitle="Messages associated with your account"><form className="inline-form" onSubmit={sendSupportMessage}><textarea value={messageBody} onChange={e=>setMessageBody(e.target.value)} placeholder="How can our support team help?" minLength={1} maxLength={10000} required/><button className="primary-button" disabled={busy||!messageBody.trim()}>Send message <ChevronRight size={15}/></button></form><div className="message-list">{messages.map(m=><div className="message-item" key={m.id}><div className="message-icon"><MessageCircle size={16}/></div><div><b>{m.sender_role==="user"?"You":m.sender_role==="manager"?"Support team":"System"}</b><p>{m.body}</p><small>{date(m.created_at)}</small></div></div>)}</div></Panel><Panel title="Complaints" subtitle="Submit an issue and track its status" action={<button className="secondary-button" onClick={()=>setShowComplaintForm(!showComplaintForm)}>{showComplaintForm?"Cancel":"New complaint"}</button>}>{showComplaintForm&&<form className="complaint-form" onSubmit={sendComplaint}><label>Category<select value={complaint.category} onChange={e=>setComplaint({...complaint,category:e.target.value})}>{["account","deposit","withdrawal","investment","profit","security","other"].map(x=><option key={x} value={x}>{x}</option>)}</select></label><label>Subject<input value={complaint.subject} onChange={e=>setComplaint({...complaint,subject:e.target.value})} minLength={3} maxLength={200} required/></label><label>Description<textarea value={complaint.description} onChange={e=>setComplaint({...complaint,description:e.target.value})} minLength={10} maxLength={10000} required/></label><button className="primary-button" disabled={busy}>Submit complaint</button></form>}<Table columns={[{label:"Case ID",render:r=><b>{r.complaint_code}</b>},{label:"Subject",key:"subject"},{label:"Submitted",render:r=>date(r.created_at)},{label:"Status",render:r=><Status value={r.status}/>}]} rows={complaints} empty="No complaints submitted"/></Panel></>; }
function Security({session,disabledAction}) { return <><Panel title="Account security" subtitle="Security settings for your authenticated session"><div className="security-list"><SecurityRow icon={LockKeyhole} title="Passwordless sign-in" detail="Authentication uses a one-time email link." status={session?"Available":"Sign in required"}/><SecurityRow icon={ShieldCheck} title="Two-factor authentication" detail="A dedicated MFA enrollment and recovery flow has not been configured." status="Not configured"/><SecurityRow icon={Activity} title="Active session" detail={session?.user?.email||"You are not signed in."} status={session?"Signed in":"Guest"}/><SecurityRow icon={Landmark} title="Payout account protection" detail="Bank account change verification must be completed before payout workflows are enabled." status="Protected workflow pending"/></div><button className="secondary-button" onClick={()=>disabledAction("Security settings change")}>Manage security settings</button></Panel><div className="notice-banner"><div className="notice-icon"><AlertCircle size={18}/></div><div><b>Financial controls remain locked</b><p>Withdrawal PIN, trusted-device management, login history and bank-change confirmation are not presented as active until their backend controls are implemented and tested.</p></div></div></>; }
function Info({label,value}) { return <div className="info-cell"><span>{label}</span><b>{value}</b></div>; }
function SecurityRow({icon:Icon,title,detail,status}) { return <div className="security-row"><div className="quick-icon"><Icon size={18}/></div><div className="security-copy"><b>{title}</b><small>{detail}</small></div><span className="muted">{status}</span></div>; }

createRoot(document.getElementById("root")).render(<React.StrictMode><App/></React.StrictMode>);
