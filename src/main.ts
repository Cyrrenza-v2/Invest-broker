import { Authenticator } from 'otplib';
import QRCode from 'qrcode';

type PortalMode = 'user' | 'admin';
type View = 'welcome' | 'userLogin' | 'adminLogin' | 'userDashboard' | 'adminDashboard';

type TfaState = {
  enabled: boolean;
  secret: string;
  recoveryCodes: string[];
};

const STORAGE_KEY = 'invest-broker-2fa';
const authenticator = new Authenticator();
const app = document.querySelector('#app');

if (!app) {
  throw new Error('App root element not found');
}

const state: { view: View; portal: PortalMode; pendingLogin: PortalMode | null } = {
  view: 'welcome',
  portal: 'user',
  pendingLogin: null,
};

const getTfaState = (): TfaState => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return { enabled: false, secret: '', recoveryCodes: [] };
  }

  try {
    const parsed = JSON.parse(saved) as Partial<TfaState>;
    return {
      enabled: Boolean(parsed.enabled),
      secret: parsed.secret ?? '',
      recoveryCodes: parsed.recoveryCodes ?? [],
    };
  } catch {
    return { enabled: false, secret: '', recoveryCodes: [] };
  }
};

const saveTfaState = (next: TfaState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
};

const createRecoveryCodes = () =>
  Array.from({ length: 5 }, () =>
    Math.random().toString(36).slice(2, 8).toUpperCase() +
    '-' +
    Math.random().toString(36).slice(2, 6).toUpperCase(),
  );

const renderMetricCards = (metrics: Array<{ label: string; value: string; change: string; tone: 'positive' | 'neutral' | 'alert' }>) =>
  metrics
    .map(
      (metric) => `
        <article class="metric-card metric-${metric.tone}">
          <p>${metric.label}</p>
          <h3>${metric.value}</h3>
          <span>${metric.change}</span>
        </article>
      `,
    )
    .join('');

const renderActivity = (items: Array<{ title: string; details: string; time: string; amount?: string }>) =>
  items
    .map(
      (item) => `
        <li>
          <div>
            <strong>${item.title}</strong>
            <small>${item.details}</small>
          </div>
          <div class="activity-meta">
            <span>${item.time}</span>
            ${item.amount ? `<em>${item.amount}</em>` : ''}
          </div>
        </li>
      `,
    )
    .join('');

const renderWelcome = () => `
  <main class="page-shell">
    <header class="topbar">
      <div class="brand-wrap">
        <div class="brand-mark">IB</div>
        <div>
          <p class="eyebrow">Invest Broker</p>
          <h1>Platform foundation</h1>
        </div>
      </div>
    </header>

    <section class="hero-panel">
      <div>
        <p class="eyebrow accent">Unified investment platform</p>
        <h2>Connect clients and operators from one secure core.</h2>
        <p>Launch a dedicated customer experience and a confidential manager dashboard with shared ledger logic, controls, and compliance workflows.</p>
      </div>
      <div class="hero-actions">
        <button class="primary" data-action="open-user-login">Open user portal</button>
        <button class="secondary" data-action="open-admin-login">Open admin portal</button>
      </div>
    </section>

    <section class="overview-grid">
      <article class="card accent-panel">
        <div class="card-title-row">
          <span class="chip chip-green">User side</span>
          <span class="mini-status">Live onboarding</span>
        </div>
        <h3>Customer journey</h3>
        <ul>
          <li>Register, verify and KYC</li>
          <li>Wallet, investment plans, and returns</li>
          <li>Deposit, withdraw, support and notifications</li>
        </ul>
      </article>

      <article class="card accent-panel alt">
        <div class="card-title-row">
          <span class="chip chip-blue">Admin side</span>
          <span class="mini-status">Protected</span>
        </div>
        <h3>Manager workspace</h3>
        <ul>
          <li>User management and approvals</li>
          <li>KYC review and compliance</li>
          <li>Fund movement, treasury and audit logs</li>
        </ul>
      </article>
    </section>
  </main>
`;

const renderLogin = (mode: PortalMode) => `
  <main class="page-shell compact-shell">
    <header class="topbar login-topbar">
      <div class="brand-wrap">
        <div class="brand-mark">IB</div>
        <div>
          <p class="eyebrow">${mode === 'user' ? 'User portal' : 'Admin portal'}</p>
          <h1>${mode === 'user' ? 'Sign in to your account' : 'Manager access'}</h1>
        </div>
      </div>
      <button class="ghost" data-action="back-to-welcome">Back</button>
    </header>

    <section class="auth-card">
      <div class="auth-header">
        <span class="chip ${(mode === 'user' ? 'chip-green' : 'chip-blue')}">${mode === 'user' ? 'Client access' : 'Private operations'}</span>
        <h2>${mode === 'user' ? 'Welcome back' : 'Secure admin login'}</h2>
      </div>

      <form class="auth-form" novalidate>
        <label>
          Email or phone
          <input type="text" placeholder=${mode === 'user' ? 'user@investbroker.ng' : 'admin@investbroker.ng'} />
        </label>
        <label>
          Password
          <input type="password" placeholder="••••••••" />
        </label>
        <label class="checkbox-row">
          <input type="checkbox" />
          <span>Keep me signed in</span>
        </label>
        <button type="button" class="primary submit-button" data-action="login-${mode}">${mode === 'user' ? 'Enter dashboard' : 'Continue to manager dashboard'}</button>
      </form>
    </section>
  </main>
`;

const userMetrics = [
  { label: 'Portfolio balance', value: '₦18,420,300', change: '+12.4% vs last month', tone: 'positive' as const },
  { label: 'Active investments', value: '14', change: '3 new this week', tone: 'neutral' as const },
  { label: 'Scheduled withdrawals', value: '₦2,640,000', change: '2 approvals pending', tone: 'alert' as const },
  { label: 'KYC status', value: 'Verified', change: 'No blockers', tone: 'positive' as const },
];

const adminMetrics = [
  { label: 'Total users', value: '28,420', change: '+6.2% this month', tone: 'positive' as const },
  { label: 'Pending KYC', value: '146', change: '18 need follow-up', tone: 'alert' as const },
  { label: 'Pending withdrawals', value: '34', change: '9 over SLA', tone: 'alert' as const },
  { label: 'Treasury position', value: '₦297.9M', change: 'Healthy reserve ratio', tone: 'positive' as const },
];

const userActivities = [
  { title: 'Investment matured', details: 'Farm Credit Note • 320 days', time: '15 mins ago', amount: '+₦410,000' },
  { title: 'Deposit received', details: 'Zenith Bank transfer', time: '3 hours ago', amount: '+₦750,000' },
  { title: 'Withdrawal queued', details: 'Bank transfer • GTBank', time: 'Yesterday', amount: '-₦650,000' },
  { title: 'KYC documents approved', details: 'ID + address verification', time: '2 days ago' },
];

const adminActivities = [
  { title: 'Compliance review completed', details: 'User #18472 • medium risk', time: '11 mins ago' },
  { title: 'Large deposit flagged', details: 'Bank transfer amount reviewed', time: '55 mins ago', amount: '₦7.5M' },
  { title: 'Approved withdrawal batch', details: '18 requests processed', time: '3 hours ago', amount: '-₦4.2M' },
  { title: 'AI assistant summary', details: 'Investment activity and reconciliation differences', time: 'Today' },
];

const userRows = [
  { label: 'Ada Okafor', value: 'Treasury Plus', secondary: '₦1,250,000', status: 'Active' },
  { label: 'Chukwu Nnaji', value: 'Growth Fund', secondary: '₦950,000', status: 'Pending' },
  { label: 'Aisha Bello', value: 'Property Yield', secondary: '₦2,880,000', status: 'Matured' },
  { label: 'Tunde Salami', value: 'Fixed Income', secondary: '₦625,000', status: 'Active' },
];

const adminRows = [
  { label: 'KYC review', value: 'Operations', secondary: '146 cases', status: 'Needs review' },
  { label: 'Withdrawal queue', value: 'Treasury', secondary: '34 requests', status: 'Pending' },
  { label: 'Treasury transfer', value: 'Finance', secondary: '₦18.2M', status: 'Approved' },
  { label: 'Risk exception', value: 'Compliance', secondary: '7 alerts', status: 'Escalated' },
];

const renderTfaBox = (mode: PortalMode) => {
  const tfa = getTfaState();
  const title = tfa.enabled ? '2FA enabled' : '2FA status';
  const actionText = tfa.enabled ? 'Manage 2FA' : 'Enable 2FA';

  return `
    <aside class="security-box ${mode === 'admin' ? 'admin-box' : ''}">
      <div class="security-header">
        <div>
          <p class="eyebrow">Security</p>
          <h4>${title}</h4>
        </div>
        <button class="ghost small" data-action="toggle-2fa">${actionText}</button>
      </div>
      <p>${tfa.enabled ? 'Authenticator app verification is enabled for this account.' : 'Protect this account with a TOTP app using Cloudflare-compatible 2FA setup.'}</p>
      <ul>
        <li>${tfa.enabled ? 'Recovery codes available' : 'No TOTP configured yet'}</li>
        <li>${tfa.enabled ? 'Verification is required on login' : 'Add a mobile authenticator app'}</li>
      </ul>
    </aside>
  `;
};

const renderDashboard = (mode: PortalMode) => {
  const metrics = mode === 'user' ? userMetrics : adminMetrics;
  const activities = mode === 'user' ? userActivities : adminActivities;
  const rows = mode === 'user' ? userRows : adminRows;
  const chartBars = mode === 'user' ? [54, 72, 48, 88, 64] : [66, 58, 74, 92, 62];

  return `
    <main class="page-shell">
      <header class="topbar dashboard-topbar">
        <div class="brand-wrap">
          <div class="brand-mark">IB</div>
          <div>
            <p class="eyebrow">${mode === 'user' ? 'User platform' : 'Admin / manager platform'}</p>
            <h1>${mode === 'user' ? 'Welcome, Ada' : 'Operations command center'}</h1>
          </div>
        </div>

        <nav class="nav-pills">
          <button class="pill active">${mode === 'user' ? 'Overview' : 'Dashboard'}</button>
          <button class="pill">${mode === 'user' ? 'Wallet' : 'KYC'}</button>
          <button class="pill">${mode === 'user' ? 'Investments' : 'Treasury'}</button>
          <button class="ghost" data-action="logout">Logout</button>
        </nav>
      </header>

      <section class="hero-panel dashboard-hero ${mode === 'user' ? 'user-hero' : 'admin-hero'}">
        <div>
          <p class="eyebrow accent">${mode === 'user' ? 'Customer overview' : 'Operations overview'}</p>
          <h2>${mode === 'user' ? 'Build wealth with clarity and control.' : 'Track risk, approvals, and treasury in real time.'}</h2>
          <p>${mode === 'user' ? 'Monitor returns, investment opportunities, wallet activity, and onboarding progress.' : 'Review compliance actions, approvals, reconciliations, and financial controls across the platform.'}</p>
        </div>
        <div class="hero-badge">
          <span class="pulse"></span>
          ${mode === 'user' ? 'This month' : 'Current cycle'} · operationally stable
        </div>
      </section>

      <section class="metrics-grid">
        ${renderMetricCards(metrics)}
      </section>

      <section class="dashboard-grid">
        <article class="card panel-card">
          <div class="card-title-row">
            <h3>Recent activity</h3>
            <button class="ghost small">View all</button>
          </div>
          <ul class="activity-list">${renderActivity(activities)}</ul>
        </article>

        <article class="card panel-card">
          <div class="card-title-row">
            <h3>${mode === 'user' ? 'Priority focus' : 'Current controls'}</h3>
            <button class="ghost small">Review</button>
          </div>
          <ul class="focus-list">
            ${(mode === 'user'
              ? ['Digital onboarding', 'Wallet reconciliation', 'Investment marketplace', 'Treasury-safe withdrawal flow']
              : ['User governance', 'KYC and risk controls', 'Treasury movement approvals', 'Immutable audit logging']
            )
              .map((item) => `<li>${item}</li>`)
              .join('')}
          </ul>
        </article>
      </section>

      <section class="card panel-card chart-card">
        <div class="card-title-row">
          <h3>${mode === 'user' ? 'Portfolio trend' : 'Control indexes'}</h3>
          <button class="ghost small">Export</button>
        </div>
        <div class="chart">
          <div class="chart-labels">
            <span>Jan</span>
            <span>Feb</span>
            <span>Mar</span>
            <span>Apr</span>
            <span>May</span>
          </div>
          <div class="chart-bars">
            ${chartBars.map((height) => `<span style="height:${height}%"></span>`).join('')}
          </div>
        </div>
      </section>

      <section class="card panel-card table-card">
        <div class="card-title-row">
          <h3>${mode === 'user' ? 'Recent investments' : 'Operational queue'}</h3>
          <button class="ghost small">Manage</button>
        </div>

        <table>
          <thead>
            <tr>
              <th>${mode === 'user' ? 'Investor' : 'Item'}</th>
              <th>${mode === 'user' ? 'Plan' : 'Owner'}</th>
              <th>${mode === 'user' ? 'Amount' : 'Value'}</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row) => `
                  <tr>
                    <td>${row.label}</td>
                    <td>${row.value}</td>
                    <td>${row.secondary}</td>
                    <td><span class="tag">${row.status}</span></td>
                  </tr>
                `,
              )
              .join('')}
          </tbody>
        </table>
      </section>

      ${renderTfaBox(mode)}
    </main>
  `;
};

const renderTfaSetup = async (mode: PortalMode) => {
  const current = getTfaState();
  const secret = current.secret || authenticator.generateSecret();
  const otpauth = authenticator.keyuri(mode === 'user' ? 'ada@investbroker.ng' : 'manager@investbroker.ng', 'Invest Broker', secret);
  const qr = await QRCode.toDataURL(otpauth);

  const recoveryCodes = current.recoveryCodes.length ? current.recoveryCodes : createRecoveryCodes();

  const html = `
    <main class="page-shell compact-shell">
      <header class="topbar login-topbar">
        <div class="brand-wrap">
          <div class="brand-mark">IB</div>
          <div>
            <p class="eyebrow">Security</p>
            <h1>Authenticator setup</h1>
          </div>
        </div>
        <button class="ghost" data-action="close-2fa">Back</button>
      </header>

      <section class="auth-card tfa-card">
        <div class="auth-header">
          <span class="chip chip-blue">TOTP 2FA</span>
          <h2>Set up your mobile authenticator</h2>
        </div>

        <div class="qr-wrap">
          <img src="${qr}" alt="Authenticator QR code" />
        </div>

        <div class="code-box">
          <p>Manual key</p>
          <code>${secret}</code>
        </div>

        <label class="field-label">
          Enter the 6-digit code from your app
          <input type="text" id="totp-code" maxlength="6" placeholder="123456" inputmode="numeric" />
        </label>

        <button class="primary submit-button" data-action="confirm-2fa">Verify and enable</button>

        <div class="security-note">
          <strong>Recovery codes:</strong>
          <ul>
            ${recoveryCodes.map((code) => `<li>${code}</li>`).join('')}
          </ul>
        </div>
      </section>
    </main>
  `;

  app.innerHTML = html;
  const input = document.querySelector('#totp-code') as HTMLInputElement | null;
  if (input) input.focus();
};

const renderTfaPrompt = (mode: PortalMode) => `
  <main class="page-shell compact-shell">
    <header class="topbar login-topbar">
      <div class="brand-wrap">
        <div class="brand-mark">IB</div>
        <div>
          <p class="eyebrow">Two-factor auth</p>
          <h1>Verify your code</h1>
        </div>
      </div>
      <button class="ghost" data-action="cancel-2fa-login">Cancel</button>
    </header>

    <section class="auth-card tfa-card">
      <div class="auth-header">
        <span class="chip ${mode === 'user' ? 'chip-green' : 'chip-blue'}">${mode === 'user' ? 'User' : 'Admin'} verification</span>
        <h2>Enter the 6-digit code</h2>
      </div>

      <label class="field-label">
        TOTP code
        <input type="text" id="login-totp" maxlength="6" placeholder="123456" inputmode="numeric" />
      </label>

      <button class="primary submit-button" data-action="verify-login-2fa">Continue</button>
      <p class="helper-text">Use the authenticator app linked to your account. Recovery codes are also accepted during fallback.</p>
    </section>
  </main>
`;

const renderApp = () => {
  switch (state.view) {
    case 'welcome':
      app.innerHTML = renderWelcome();
      break;
    case 'userLogin':
      app.innerHTML = renderLogin('user');
      break;
    case 'adminLogin':
      app.innerHTML = renderLogin('admin');
      break;
    case 'userDashboard':
      app.innerHTML = renderDashboard('user');
      break;
    case 'adminDashboard':
      app.innerHTML = renderDashboard('admin');
      break;
    default:
      app.innerHTML = renderWelcome();
      break;
  }
};

const proceedToDashboard = (mode: PortalMode) => {
  const tfaState = getTfaState();
  if (tfaState.enabled) {
    state.pendingLogin = mode;
    app.innerHTML = renderTfaPrompt(mode);
    return;
  }

  state.view = mode === 'user' ? 'userDashboard' : 'adminDashboard';
  state.portal = mode;
  renderApp();
};

const handleLoginConfirm = () => {
  const codeInput = document.querySelector('#login-totp') as HTMLInputElement | null;
  const code = codeInput?.value.trim() ?? '';
  const tfaState = getTfaState();

  if (!state.pendingLogin) {
    return;
  }

  const isValid = code.length === 6 && authenticator.check(code, tfaState.secret);
  if (!isValid) {
    const recovery = tfaState.recoveryCodes.includes(code.toUpperCase());
    if (!recovery) {
      alert('Invalid 2FA code. Please try again or use a recovery code.');
      return;
    }
  }

  const targetView = state.pendingLogin === 'user' ? 'userDashboard' : 'adminDashboard';
  state.view = targetView;
  state.portal = state.pendingLogin;
  state.pendingLogin = null;
  renderApp();
};

const enableTfa = async () => {
  const mode = state.portal || 'user';
  const secret = authenticator.generateSecret();
  const next: TfaState = {
    enabled: false,
    secret,
    recoveryCodes: createRecoveryCodes(),
  };
  saveTfaState(next);
  await renderTfaSetup(mode);
};

const confirmTfaSetup = () => {
  const codeInput = document.querySelector('#totp-code') as HTMLInputElement | null;
  const code = codeInput?.value.trim() ?? '';
  const tfaState = getTfaState();

  if (!tfaState.secret) {
    alert('No secret has been generated yet.');
    return;
  }

  const valid = authenticator.check(code, tfaState.secret);
  if (!valid) {
    alert('The verification code is invalid. Please check the authenticator app and try again.');
    return;
  }

  const next = {
    enabled: true,
    secret: tfaState.secret,
    recoveryCodes: tfaState.recoveryCodes.length ? tfaState.recoveryCodes : createRecoveryCodes(),
  };
  saveTfaState(next);

  state.view = state.portal === 'user' ? 'userDashboard' : 'adminDashboard';
  renderApp();
};

const handleAction = (action: string) => {
  switch (action) {
    case 'open-user-login':
      state.view = 'userLogin';
      state.portal = 'user';
      renderApp();
      break;
    case 'open-admin-login':
      state.view = 'adminLogin';
      state.portal = 'admin';
      renderApp();
      break;
    case 'back-to-welcome':
      state.view = 'welcome';
      renderApp();
      break;
    case 'login-user':
      proceedToDashboard('user');
      break;
    case 'login-admin':
      proceedToDashboard('admin');
      break;
    case 'verify-login-2fa':
      handleLoginConfirm();
      break;
    case 'cancel-2fa-login':
      state.pendingLogin = null;
      state.view = state.portal === 'user' ? 'userLogin' : 'adminLogin';
      renderApp();
      break;
    case 'logout':
      state.view = 'welcome';
      state.pendingLogin = null;
      renderApp();
      break;
    case 'toggle-2fa':
      if (getTfaState().enabled) {
        const next = { enabled: false, secret: '', recoveryCodes: [] };
        saveTfaState(next);
        state.view = state.portal === 'user' ? 'userDashboard' : 'adminDashboard';
        renderApp();
      } else {
        void enableTfa();
      }
      break;
    case 'confirm-2fa':
      confirmTfaSetup();
      break;
    case 'close-2fa':
      state.view = state.portal === 'user' ? 'userDashboard' : 'adminDashboard';
      renderApp();
      break;
    default:
      break;
  }
};

app.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  const action = target.dataset.action;
  if (action) {
    handleAction(action);
  }
});

renderApp();
