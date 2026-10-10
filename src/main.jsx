import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import {
  Activity, ArrowDownLeft, ArrowUpRight, Bell, BriefcaseBusiness, CheckCircle2,
  ChevronDown, CircleHelp, Clock3, CreditCard, Eye, EyeOff, FileCheck2,
  LayoutDashboard, LockKeyhole, LogOut, Menu, Search, ShieldCheck, TrendingUp,
  Users, Wallet, X
} from "lucide-react";
import "./style.css";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://rjgzvpkyccfpnpzlbcuc.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const money = (n) => new Intl.NumberFormat("en-US", {
  style: "currency", currency: "NGN", maximumFractionDigits: 2
}).format(n);

function App() {
  const [section, setSection] = useState("Overview");
  const [adminMode, setAdminMode] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [notice, setNotice] = useState("");
  const [session, setSession] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [liveData, setLiveData] = useState({ profile: null, wallet: null, investments: [], ledger: [], deposits: [], withdrawals: [], usersCount: null, loading: false });
  const configured = Boolean(supabase);
  const isManager = ["admin", "manager"].includes(session?.user?.app_metadata?.role);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !session?.user?.id) {
      setLiveData({ profile: null, wallet: null, investments: [], ledger: [], deposits: [], withdrawals: [], usersCount: null, loading: false });
      setAdminMode(false);
      return;
    }
    let cancelled = false;
    async function loadRecords() {
      setLiveData(previous => ({ ...previous, loading: true }));
      const uid = session.user.id;
      const [profileRes, walletRes, investmentsRes, ledgerRes, depositsRes, withdrawalsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase.from("wallets").select("*").eq("user_id", uid).maybeSingle(),
        supabase.from("investments").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("ledger_entries").select("*").eq("status", "posted").order("created_at", { ascending: false }).limit(100),
        supabase.from("deposits").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("withdrawals").select("*").order("created_at", { ascending: false }).limit(50)
      ]);
      let usersCount = null;
      if (["admin", "manager"].includes(session.user.app_metadata?.role)) {
        const countRes = await supabase.from("profiles").select("id", { count: "exact", head: true });
        usersCount = countRes.count ?? null;
      }
      if (cancelled) return;
      setLiveData({ profile: profileRes.data, wallet: walletRes.data, investments: investmentsRes.data || [], ledger: ledgerRes.data || [], deposits: depositsRes.data || [], withdrawals: withdrawalsRes.data || [], usersCount, loading: false });
      if (["admin", "manager"].includes(session.user.app_metadata?.role)) setAdminMode(true);
      if ([profileRes, walletRes, investmentsRes, ledgerRes, depositsRes, withdrawalsRes].some(result => result.error)) {
        setNotice("Signed in, but some records could not be loaded. Check table permissions and Supabase policies.");
      }
    }
    loadRecords();
    return () => { cancelled = true; };
  }, [session?.user?.id, session?.user?.app_metadata?.role]);

  const userItems = [
    ["Overview", LayoutDashboard], ["My investments", BriefcaseBusiness],
    ["Wallet", Wallet], ["Transactions", Activity], ["Verification", FileCheck2]
  ];
  const adminItems = [
    ["Overview", LayoutDashboard], ["Users", Users], ["Investments", BriefcaseBusiness],
    ["Deposits & withdrawals", CreditCard], ["Compliance", ShieldCheck], ["Audit log", Activity]
  ];
  const items = adminMode && isManager ? adminItems : userItems;

  async function signIn() {
    if (!supabase) {
      setNotice("Supabase is not connected yet. Configure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY after the dedicated project is selected.");
      return;
    }
    if (!email.trim()) {
      setNotice("Enter your email address first.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: window.location.origin } });
    setBusy(false);
    setNotice(error ? error.message : "A sign-in link has been requested. Check your email.");
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    setSession(null);
    setNotice("You are signed out.");
  }

  function selectSection(name) {
    setSection(name);
    setMobileNav(false);
    if (name !== "Overview") setNotice(name + " is part of the platform foundation; secure data workflows are not live yet.");
  }

  return <div className="app-shell">
    <aside className={"sidebar " + (mobileNav ? "sidebar-open" : "")}>
      <div className="brand"><div className="brand-mark"><TrendingUp size={21}/></div><div><b>INVEST<span>BROKER</span></b><small>INVESTMENT PLATFORM</small></div><button className="icon-button mobile-close" onClick={() => setMobileNav(false)} aria-label="Close menu"><X size={18}/></button></div>
      <div className="workspace-label">{adminMode ? "MANAGEMENT WORKSPACE" : "PERSONAL WORKSPACE"}</div>
      <nav>{items.map(([label, Icon]) => <button key={label} onClick={() => selectSection(label)} className={"nav-item " + (section === label ? "active" : "")}><Icon size={18}/><span>{label}</span>{label === "Verification" && <span className="nav-dot"/>}</button>)}</nav>
      <div className="sidebar-bottom">
        <div className="secure-card"><div className="secure-icon"><ShieldCheck size={18}/></div><b>Security first</b><p>Account security and compliance are core to the platform.</p><span><LockKeyhole size={12}/> Protected workspace</span></div>
        <button className="nav-item" onClick={() => setNotice("Help centre is not connected yet.")}><CircleHelp size={18}/><span>Help & support</span></button>
        <div className="profile-row"><div className="avatar">{session?.user?.email?.slice(0,1).toUpperCase() || "G"}</div><div className="profile-copy"><b>{liveData.profile?.full_name || session?.user?.email || "Guest preview"}</b><small>{session ? (isManager ? "Authorized manager" : "Authenticated customer") : "Not signed in"}</small></div><button className="icon-button" aria-label="Account options" onClick={() => session ? signOut() : setAuthOpen(true)}>{session ? <LogOut size={16}/> : <ChevronDown size={16}/>}</button></div>
      </div>
    </aside>
    {mobileNav && <button className="scrim" onClick={() => setMobileNav(false)} aria-label="Close navigation"/>}
    <main className="main-area">
      <header className="topbar"><div className="top-left"><button className="icon-button mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open menu"><Menu size={20}/></button><div className="breadcrumb">Workspace <span>/</span> <b>{section}</b></div></div><div className="top-actions"><span className={"connection-pill " + (configured ? "connected" : "")}><i/>{configured ? "Supabase configured" : "Backend not connected"}</span><button className="icon-button notification-button" onClick={() => setNotice("Notifications will appear here when the backend is connected.")} aria-label="Notifications"><Bell size={18}/><i/></button><button className="user-chip" onClick={() => { if (!session) { setAuthOpen(true); return; } if (!isManager) { setNotice("Admin access is restricted to manager accounts assigned by a trusted administrator."); return; } setAdminMode(!adminMode); setSection("Overview"); }}><div className="avatar small">{adminMode && isManager ? "A" : "U"}</div><span>{adminMode && isManager ? "Admin panel" : "My account"}</span><ChevronDown size={14}/></button></div></header>
      <div className="content">
        <div className="welcome-row"><div><div className="eyebrow"><span className="status-dot"/> INVEST BROKER <span className="tag">{configured ? (session ? "CONNECTED" : "READY") : "PREVIEW"}</span></div><h1>{section === "Overview" ? (adminMode ? "Management overview" : "Welcome to your workspace") : section}</h1><p>{section === "Overview" ? (adminMode ? "Monitor account activity, reviews and platform operations." : "Your investment account, organized in one clear view.") : "This area is scaffolded for the next implementation phase."}</p></div><button className="primary-button" onClick={() => setAuthOpen(true)}>{session ? "Account settings" : "Sign in"} <ArrowUpRight size={16}/></button></div>
        {!configured && <div className="notice-banner"><div className="notice-icon"><LockKeyhole size={18}/></div><div><b>Backend connection required</b><p>This is a working UI foundation using preview-only sample data. Authentication, balances, deposits, withdrawals and investments are not active until a dedicated Supabase project and secure backend are configured.</p></div><span className="notice-state">NOT LIVE</span></div>}
        {notice && <div className="toast" role="status"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss notice"><X size={16}/></button></div>}
        <section className="metrics-grid">
          <Metric title={adminMode ? "Total users" : "Portfolio value"} value={adminMode && isManager ? (liveData.usersCount ?? "—") : money(liveData.ledger.reduce((sum, entry) => sum + Number(entry.amount || 0), 0))} subtitle={adminMode ? "Awaiting secure database" : "Connect an account to load live data"} icon={Wallet} tone="blue"/>
          <Metric title={adminMode && isManager ? "Pending reviews" : "Active investments"} value={adminMode && isManager ? liveData.withdrawals.filter(item => ["pending","under_review"].includes(item.status)).length : liveData.investments.filter(item => item.status === "active").length} subtitle={liveData.loading ? "Loading records…" : "From shared Supabase records"} icon={BriefcaseBusiness} tone="violet"/>
          <Metric title={adminMode && isManager ? "Pending withdrawals" : "Total returns"} value={adminMode && isManager ? liveData.withdrawals.filter(item => ["pending","under_review","approved","processing"].includes(item.status)).length : money(liveData.ledger.filter(item => item.entry_type === "profit_credit").reduce((sum, entry) => sum + Number(entry.amount || 0), 0))} subtitle={liveData.loading ? "Loading records…" : "Verified ledger entries only"} icon={TrendingUp} tone="green"/>
          <Metric title={adminMode && isManager ? "Security events" : "Account status"} value={session ? (liveData.profile?.account_status || "Signed in") : "Guest"} subtitle={liveData.profile?.kyc_status ? "KYC: " + liveData.profile.kyc_status.replace("_", " ") : (configured ? "Waiting for sign-in" : "Backend setup pending")} icon={ShieldCheck} tone="amber"/>
        </section>
        <div className="section-grid">
          <section className="panel portfolio-panel"><div className="panel-heading"><div><h2>{adminMode ? "Platform activity" : "Portfolio snapshot"}</h2><p>{adminMode ? "Latest platform events" : "A clear view of your account at a glance"}</p></div><button className="subtle-button" onClick={() => setNotice("Live records are unavailable until backend integration is complete.")}>View details <ArrowUpRight size={14}/></button></div>
            <div className="balance-card"><div className="balance-top"><span>{adminMode ? "PLATFORM TOTALS" : "TOTAL PORTFOLIO VALUE"}</span><button onClick={() => setShowBalance(!showBalance)} aria-label="Toggle balance visibility">{showBalance ? <Eye size={17}/> : <EyeOff size={17}/>}</button></div><div className="balance-value">{showBalance ? (session ? money(liveData.ledger.reduce((sum, entry) => sum + Number(entry.amount || 0), 0)) : "— — —") : "••••••"}</div><div className="balance-foot"><span><Clock3 size={14}/> Waiting for verified data</span><span className="balance-badge">PREVIEW ONLY</span></div><div className="balance-graph"><div/><div/><div/><div/><div/><div/><div/><div/><div/><div/><div/><div/><div/><div/><div/><div/><div/><div/><div/><div/><div/><div/><div/><div/><div/><div/><div/><div/><div/></div></div>
            <div className="panel-footnote"><ShieldCheck size={15}/> {session ? "Read-only financial summary from the shared backend. Financial actions remain disabled." : "No live customer records shown until you sign in."}</div>
          </section>
          <section className="panel quick-panel"><div className="panel-heading"><div><h2>Quick actions</h2><p>Common account tasks</p></div></div><div className="quick-actions"><QuickAction icon={ArrowDownLeft} title="Add funds" desc="Deposit workflow" onClick={() => setNotice("Deposits are disabled in preview mode.")}/><QuickAction icon={ArrowUpRight} title="Withdraw" desc="Withdrawal workflow" onClick={() => setNotice("Withdrawals are disabled in preview mode.")}/><QuickAction icon={BriefcaseBusiness} title="Explore plans" desc="Investment marketplace" onClick={() => selectSection("My investments")}/><QuickAction icon={FileCheck2} title="Verify identity" desc="KYC & compliance" onClick={() => selectSection("Verification")}/></div><div className="quick-foot"><LockKeyhole size={15}/> Financial actions stay disabled until server-side controls are implemented.</div></section>
        </div>
        <section className="panel activity-panel"><div className="panel-heading"><div><h2>{adminMode ? "Recent audit events" : "Recent transactions"}</h2><p>{adminMode ? "A tamper-aware activity trail will appear here" : "Your account activity will appear here"}</p></div><button className="icon-button" onClick={() => setNotice("No live transactions are available in preview mode.")} aria-label="Search transactions"><Search size={17}/></button></div><div className="empty-state"><div className="empty-illustration"><Activity size={24}/></div><b>No activity to show yet</b><p>Once the backend is connected and verified, account events will appear in this space.</p></div></section>
        <footer className="footer"><span>© {new Date().getFullYear()} Invest Broker</span><span><ShieldCheck size={13}/> Secure-by-design foundation</span><span>Preview • Not for financial transactions</span></footer>
      </div>
    </main>
    {authOpen && <div className="modal-backdrop" onClick={() => setAuthOpen(false)}><div className="auth-modal" onClick={e => e.stopPropagation()}><button className="modal-close icon-button" onClick={() => setAuthOpen(false)} aria-label="Close"><X size={18}/></button><div className="modal-brand"><div className="brand-mark"><TrendingUp size={20}/></div></div><h2>{session ? "Account settings" : "Sign in securely"}</h2><p>{configured ? "We’ll send a secure one-time sign-in link to your email." : "Authentication will be available after the dedicated backend is connected."}</p>{!session && <><label htmlFor="email">Email address</label><input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email"/><button className="primary-button full-button" onClick={signIn} disabled={busy}>{busy ? "Requesting link…" : "Send sign-in link"} <ArrowUpRight size={16}/></button></>}{session && <button className="primary-button full-button" onClick={signOut}>Sign out <LogOut size={16}/></button>}<div className="modal-safety"><LockKeyhole size={14}/> Never share passwords or verification codes.</div></div></div>}
  </div>;
}

function Metric({ title, value, subtitle, icon: Icon, tone }) {
  return <div className="metric-card"><div className={"metric-icon " + tone}><Icon size={19}/></div><div className="metric-title">{title}</div><div className="metric-value">{value}</div><div className="metric-subtitle">{subtitle}</div></div>;
}
function QuickAction({ icon: Icon, title, desc, onClick }) {
  return <button className="quick-action" onClick={onClick}><div className="quick-icon"><Icon size={18}/></div><div><b>{title}</b><small>{desc}</small></div><ArrowUpRight size={15} className="quick-arrow"/></button>;
}

createRoot(document.getElementById("root")).render(<React.StrictMode><App/></React.StrictMode>);