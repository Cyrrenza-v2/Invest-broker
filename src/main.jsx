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

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const money = (n) => new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", maximumFractionDigits: 2
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
  const configured = Boolean(supabase);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => listener.subscription.unsubscribe();
  }, []);

  const userItems = [
    ["Overview", LayoutDashboard], ["My investments", BriefcaseBusiness],
    ["Wallet", Wallet], ["Transactions", Activity], ["Verification", FileCheck2]
  ];
  const adminItems = [
    ["Overview", LayoutDashboard], ["Users", Users], ["Investments", BriefcaseBusiness],
    ["Deposits & withdrawals", CreditCard], ["Compliance", ShieldCheck], ["Audit log", Activity]
  ];
  const items = adminMode ? adminItems : userItems;

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
        <div className="profile-row"><div className="avatar">{session?.user?.email?.slice(0,1).toUpperCase() || "G"}</div><div className="profile-copy"><b>{session?.user?.email || "Guest preview"}</b><small>{session ? "Authenticated session" : "Not signed in"}</small></div><button className="icon-button" aria-label="Account options" onClick={() => session ? signOut() : setAuthOpen(true)}>{session ? <LogOut size={16}/> : <ChevronDown size={16}/>}</button></div>
      </div>
    </aside>
    {mobileNav && <button className="scrim" onClick={() => setMobileNav(false)} aria-label="Close navigation"/>}
    <main className="main-area">
      <header className="topbar"><div className="top-left"><button className="icon-button mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open menu"><Menu size={20}/></button><div className="breadcrumb">Workspace <span>/</span> <b>{section}</b></div></div><div className="top-actions"><span className={"connection-pill " + (configured ? "connected" : "")}><i/>{configured ? "Supabase configured" : "Backend not connected"}</span><button className="icon-button notification-button" onClick={() => setNotice("Notifications will appear here when the backend is connected.")} aria-label="Notifications"><Bell size={18}/><i/></button><button className="user-chip" onClick={() => { setAdminMode(!adminMode); setSection("Overview"); setNotice(adminMode ? "Switched to personal workspace." : "Admin screens are preview-only. Secure admin authorization is not configured."); }}><div className="avatar small">{adminMode ? "A" : "U"}</div><span>{adminMode ? "Admin preview" : "My account"}</span><ChevronDown size={14}/></button></div></header>
      <div className="content">
        <div className="welcome-row"><div><div className="eyebrow"><span className="status-dot"/> PLATFORM FOUNDATION <span className="tag">PREVIEW</span></div><h1>{section === "Overview" ? (adminMode ? "Management overview" : "Welcome to your workspace") : section}</h1><p>{section === "Overview" ? (adminMode ? "Monitor account activity, reviews and platform operations." : "Your investment account, organized in one clear view.") : "This area is scaffolded for the next implementation phase."}</p></div><button className="primary-button" onClick={() => setAuthOpen(true)}>{session ? "Account settings" : "Sign in"} <ArrowUpRight size={16}/></button></div>
        {!configured && <div className="notice-banner"><div className="notice-icon"><LockKeyhole size={18}/></div><div><b>Backend connection required</b><p>This is a working UI foundation using preview-only sample data. Authentication, balances, deposits, withdrawals and investments are not active until a dedicated Supabase project and secure backend are configured.</p></div><span className="notice-state">NOT LIVE</span></div>}
        {notice && <div className="toast" role="status"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss notice"><X size={16}/></button></div>}
        <section className="metrics-grid">
          <Metric title={adminMode ? "Total users" : "Portfolio value"} value={adminMode ? "—" : "—"} subtitle={adminMode ? "Awaiting secure database" : "Connect an account to load live data"} icon={Wallet} tone="blue"/>
          <Metric title={adminMode ? "Pending reviews" : "Active investments"} value="—" subtitle="No live records loaded" icon={BriefcaseBusiness} tone="violet"/>
          <Metric title={adminMode ? "Pending withdrawals" : "Total returns"} value="—" subtitle="No financial calculations enabled" icon={TrendingUp} tone="green"/>
          <Metric title={adminMode ? "Security events" : "Account status"} value={session ? "Signed in" : "Guest"} subtitle={configured ? "Auth configured; verify policies" : "Backend setup pending"} icon={ShieldCheck} tone="amber"/>
        </section>
        <div className="section-grid">
          <section className="panel portfolio-panel"><div className="panel-heading"><div><h2>{adminMode ? "Platform activity" : "Portfolio snapshot"}</h2><p>{adminMode ? "Latest platform events" : "A clear view of your account at a glance"}</p></div><button className="subtle-button" onClick={() => setNotice("Live records are unavailable until backend integration is complete.")}>View details <ArrowUpRight size={14}/></button></div>
            <div className="balance-card"><div className="balance-top"><span>{adminMode ? "PLATFORM TOTALS" : "TOTAL PORTFOLIO VALUE"}</span><button onClick={() => setShowBalance(!showBalance)} aria-label="Toggle balance visibility">{showBalance ? <Eye size={17}/> : <EyeOff size={17}/>}</button></div><div className="balance-value">{showBalance ? "— — —" : "••••••"}</div><div className="balance-foot"><span><Clock3 size={14}/> Waiting for verified data</span><span className="balance-badge">PREVIEW ONLY</span></div><div className="balance-graph"><div/><div/><div/><div/><div/><div/><div/><div/><div/><div/><div/><div/><div/><div/><div/><div/><div/><div/><div/><div/><div/><div/><div/><div/><div/><div/><div/><div/><div/></div></div>
            <div className="panel-footnote"><ShieldCheck size={15}/> Sample interface only. No funds are held or moved by this preview.</div>
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