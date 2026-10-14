type Role = 'user' | 'admin';
type Route =
  | '/welcome'
  | '/login/user'
  | '/login/admin'
  | '/register/user'
  | '/register/admin'
  | '/user/dashboard'
  | '/user/marketplace'
  | '/user/kyc'
  | '/admin/dashboard'
  | '/admin/users'
  | '/admin/approvals'
  | '/admin/treasury';

type KycStatus = 'not-started' | 'pending' | 'approved' | 'rejected';

type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  kycStatus: KycStatus;
  walletBalance: number;
  invested: number;
  pendingWithdrawals: number;
};

type AppState = {
  users: User[];
  activeUserId: string | null;
};

const STORAGE_KEY = 'invest-broker-app-state-v1';

const seedUsers: User[] = [
  {
    id: 'user-01',
    name: 'Ada Okafor',
    email: 'user@investbroker.ng',
    password: 'password123',
    role: 'user',
    kycStatus: 'approved',
    walletBalance: 18420290,
    invested: 12800000,
    pendingWithdrawals: 2640000,
  },
  {
    id: 'admin-01',
    name: 'Mary James',
    email: 'admin@investbroker.ng',
    password: 'admin123',
    role: 'admin',
    kycStatus: 'approved',
    walletBalance: 0,
    invested: 0,
    pendingWithdrawals: 0,
  },
];

const app = document.querySelector('#app');

if (!app) {
  throw new Error('App root not found');
}

const PORTAL_ROLE: Role = import.meta.env.VITE_APP_ROLE === 'admin' ? 'admin' : 'user';

const defaultState: AppState = {
  users: seedUsers,
  activeUserId: null,
};

const readState = (): AppState => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultState));
    return defaultState;
  }

  try {
    const parsed = JSON.parse(raw) as AppState;
    return {
      users: parsed.users ?? defaultState.users,
      activeUserId: parsed.activeUserId ?? null,
    };
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultState));
    return defaultState;
  }
};

const writeState = (next: AppState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
};

const getActiveUser = (): User | null => {
  const state = readState();
  if (!state.activeUserId) return null;
  return state.users.find((user) => user.id === state.activeUserId) ?? null;
};

const setActiveUser = (user: User | null) => {
  const state = readState();
  writeState({ ...state, activeUserId: user ? user.id : null });
};

const getRouteFromHash = (): Route => {
  const hash = window.location.hash || '#/welcome';
  const path = hash.replace('#', '') || '/welcome';
  const routeMap: Record<string, Route> = {
    '/welcome': '/welcome',
    '/login/user': '/login/user',
    '/login/admin': '/login/admin',
    '/register/user': '/register/user',
    '/register/admin': '/register/admin',
    '/user/dashboard': '/user/dashboard',
    '/user/marketplace': '/user/marketplace',
    '/user/kyc': '/user/kyc',
    '/admin/dashboard': '/admin/dashboard',
    '/admin/users': '/admin/users',
    '/admin/approvals': '/admin/approvals',
    '/admin/treasury': '/admin/treasury',
  };

  return routeMap[path] ?? '/welcome';
};

const navigate = (route: Route) => {
  window.location.hash = route;
};

const money = (value: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value);

const metricCards = (entries: Array<{ label: string; value: string; change: string; tone: 'positive' | 'neutral' | 'alert' }>) =>
  entries
    .map(
      (entry) => `
        <article class="metric-card metric-${entry.tone}">
          <p>${entry.label}</p>
          <h3>${entry.value}</h3>
          <span>${entry.change}</span>
        </article>
      `,
    )
    .join('');

const sidebar = (role: Role) => {
  const links = {
    user: [
      { route: '/user/dashboard', label: 'Dashboard' },
      { route: '/user/marketplace', label: 'Marketplace' },
      { route: '/user/kyc', label: 'KYC' },
      { route: '/welcome', label: 'Logout' },
    ],
    admin: [
      { route: '/admin/dashboard', label: 'Dashboard' },
      { route: '/admin/users', label: 'Users' },
      { route: '/admin/approvals', label: 'Approvals' },
      { route: '/admin/treasury', label: 'Treasury' },
      { route: '/welcome', label: 'Logout' },
    ],
  } as const;

  return `
    <aside class="sidebar">
      <div class="sidebar-brand">
        <div class="brand-mark">IB</div>
        <div>
          <span>Invest Broker</span>
          <small>${role === 'user' ? 'Client portal' : 'Admin portal'}</small>
        </div>
      </div>
      <nav class="sidebar-nav">
        ${links[role]
          .map((item) => {
            const action = item.label === 'Logout' ? 'logout' : 'route';
            return `<button class="menu-link" data-action="${action}" data-route="${item.route}">${item.label}</button>`;
          })
          .join('')}
      </nav>
    </aside>
  `;
};

const renderWelcome = () => PORTAL_ROLE === 'admin' ? `
  <main class="page-shell compact-shell">
    <header class="topbar shell-pad">
      <div class="brand-wrap">
        <div class="brand-mark">IB</div>
        <div>
          <p class="eyebrow">Invest Broker · Private</p>
          <h1>Administration portal</h1>
        </div>
      </div>
      <span class="chip chip-blue">Admin workspace</span>
    </header>
    <section class="hero-panel hero-split shell-pad">
      <div>
        <p class="eyebrow accent">Restricted operations</p>
        <h2>Manage platform operations from a dedicated admin app.</h2>
        <p>Review demo KYC queues, approvals, user management, and treasury screens. This preview uses browser-only sample data and is not connected to real money or production authentication.</p>
      </div>
      <div class="stacked-actions">
        <button class="secondary" data-action="route" data-route="/login/admin">Admin sign in</button>
      </div>
    </section>
    <p class="eyebrow" style="text-align:center;margin-top:22px">Demo preview only · no real financial operations</p>
  </main>
` : `
  <main class="page-shell">
    <header class="topbar shell-pad">
      <div class="brand-wrap">
        <div class="brand-mark">IB</div>
        <div>
          <p class="eyebrow">Invest Broker</p>
          <h1>Customer portal</h1>
        </div>
      </div>
      <span class="chip chip-green">Client app</span>
    </header>
    <section class="hero-panel hero-split shell-pad">
      <div>
        <p class="eyebrow accent">Your investment workspace</p>
        <h2>Track your portfolio and account journey in one place.</h2>
        <p>Sign in to view the customer dashboard, explore the sample marketplace, and review onboarding screens. This preview uses browser-only sample data and does not process deposits or withdrawals.</p>
      </div>
      <div class="stacked-actions">
        <button class="primary" data-action="route" data-route="/login/user">User sign in</button>
        <button class="ghost" data-action="route" data-route="/register/user">Create user account</button>
      </div>
    </section>
    <section class="feature-grid shell-pad">
      <article class="card feature-card">
        <span class="chip chip-green">Customer journey</span>
        <h3>Your portfolio</h3>
        <ul><li>Account and portfolio overview</li><li>Sample investment marketplace</li><li>KYC status and activity screens</li></ul>
      </article>
      <article class="card feature-card">
        <span class="chip chip-blue">Private operations</span>
        <h3>Separate admin app</h3>
        <p>The administration workspace is published at its own URL and is not linked from this customer portal.</p>
      </article>
    </section>
    <p class="eyebrow" style="text-align:center;margin-top:22px">Demo preview only · no real financial operations</p>
  </main>
`;

const renderAuthPage = (role: Role, mode: 'login' | 'register') => `
  <main class="page-shell compact-shell">
    <header class="topbar shell-pad">
      <div class="brand-wrap">
        <div class="brand-mark">IB</div>
        <div>
          <p class="eyebrow">${role === 'user' ? 'User portal' : 'Admin portal'}</p>
          <h1>${mode === 'login' ? 'Welcome back' : 'Create account'}</h1>
        </div>
      </div>
      <button class="ghost" data-action="route" data-route="/welcome">Back</button>
    </header>

    <section class="auth-card shell-pad">
      <div class="auth-header">
        <span class="chip ${role === 'user' ? 'chip-green' : 'chip-blue'}">${role === 'user' ? 'Client access' : 'Private operations'}</span>
        <h2>${mode === 'login' ? 'Secure sign in' : 'Create your account'}</h2>
      </div>

      <form class="auth-form" data-form="auth" data-role="${role}" data-mode="${mode}">
        ${mode === 'register' ? `<label><span>Full name</span><input name="name" type="text" placeholder="Ada Okafor" required /></label>` : ''}
        <label><span>Email</span><input name="email" type="email" placeholder="${role === 'user' ? 'user@investbroker.ng' : 'admin@investbroker.ng'}" required /></label>
        <label><span>Password</span><input name="password" type="password" placeholder="••••••••" required /></label>
        <button class="primary submit-button" type="submit">${mode === 'login' ? 'Continue' : 'Create account'}</button>
      </form>
    </section>
  </main>
`;

const renderDashboardLayout = (role: Role, main: string) => `
  <main class="dashboard-shell">
    ${sidebar(role)}
    <section class="main-panel">
      <header class="topbar panel-header-row">
        <div>
          <p class="eyebrow">${role === 'user' ? 'User platform' : 'Admin platform'}</p>
          <h2>${role === 'user' ? 'Customer dashboard' : 'Operations dashboard'}</h2>
        </div>
        <div class="header-actions">
          <span class="status-pill">System stable</span>
          <button class="ghost" data-action="logout">Logout</button>
        </div>
      </header>
      ${main}
    </section>
  </main>
`;

const renderUserDashboard = () => {
  const user = getActiveUser();
  if (!user || user.role !== 'user') {
    navigate('/welcome');
    return '';
  }

  const metrics = [
    { label: 'Portfolio balance', value: money(user.walletBalance), change: '+12.4% vs last month', tone: 'positive' as const },
    { label: 'Invested capital', value: money(user.invested), change: '3 new this week', tone: 'neutral' as const },
    { label: 'Pending withdrawals', value: money(user.pendingWithdrawals), change: '2 approvals pending', tone: 'alert' as const },
    { label: 'KYC status', value: user.kycStatus.toUpperCase(), change: 'No blockers', tone: 'positive' as const },
  ];

  const main = `
    <section class="hero-panel user-hero">
      <div>
        <p class="eyebrow accent">Welcome back</p>
        <h3>Hello, ${user.name.split(' ')[0]}</h3>
        <p>Monitor investments, wallet activity, and withdrawals from a single secure workspace.</p>
      </div>
      <div class="hero-badge">
        <span class="pulse"></span>
        Operationally stable
      </div>
    </section>

    <section class="metrics-grid">
      ${metricCards(metrics)}
    </section>

    <section class="dashboard-grid">
      <article class="card panel-card">
        <div class="card-title-row">
          <h3>Recent activity</h3>
          <button class="ghost small" data-action="route" data-route="/user/dashboard">View all</button>
        </div>
        <ul class="activity-list">
          <li><div><strong>Investment matured</strong><small>Farm Credit Note • 320 days</small></div><div class="activity-meta"><span>15 mins ago</span><em>+₦410,000</em></div></li>
          <li><div><strong>Deposit received</strong><small>Zenith Bank transfer</small></div><div class="activity-meta"><span>3 hours ago</span><em>+₦750,000</em></div></li>
          <li><div><strong>Withdrawal queued</strong><small>Bank transfer • GTBank</small></div><div class="activity-meta"><span>Yesterday</span><em>-₦650,000</em></div></li>
        </ul>
      </article>

      <article class="card panel-card">
        <div class="card-title-row">
          <h3>Priority focus</h3>
          <button class="ghost small" data-action="route" data-route="/user/marketplace">Open marketplace</button>
        </div>
        <ul class="focus-list">
          <li>Digital onboarding and identity verification</li>
          <li>Wallet reconciliation and investment access</li>
          <li>Withdrawal eligibility and compliance review</li>
        </ul>
      </article>
    </section>
  `;

  return renderDashboardLayout('user', main);
};

const renderAdminDashboard = () => {
  const user = getActiveUser();
  if (!user || user.role !== 'admin') {
    navigate('/welcome');
    return '';
  }

  const metrics = [
    { label: 'Total users', value: '28,420', change: '+6.2% this month', tone: 'positive' as const },
    { label: 'Pending KYC', value: '146', change: '18 need follow-up', tone: 'alert' as const },
    { label: 'Pending withdrawals', value: '34', change: '9 over SLA', tone: 'alert' as const },
    { label: 'Treasury position', value: '₦297.9M', change: 'Healthy reserve ratio', tone: 'positive' as const },
  ];

  const main = `
    <section class="hero-panel admin-hero">
      <div>
        <p class="eyebrow accent">Operations overview</p>
        <h3>Review risk, approvals, and treasury in real time.</h3>
        <p>Monitor compliance, withdrawals, KYC review, and treasury flows across the platform.</p>
      </div>
      <div class="hero-badge">
        <span class="pulse"></span>
        Current cycle
      </div>
    </section>

    <section class="metrics-grid">
      ${metricCards(metrics)}
    </section>

    <section class="dashboard-grid">
      <article class="card panel-card">
        <div class="card-title-row">
          <h3>Approval queue</h3>
          <button class="ghost small" data-action="route" data-route="/admin/approvals">Review</button>
        </div>
        <ul class="activity-list">
          <li><div><strong>KYC decision needed</strong><small>User #18472 • medium risk</small></div><div class="activity-meta"><span>11 mins ago</span></div></li>
          <li><div><strong>Withdrawal review</strong><small>34 requests pending approval</small></div><div class="activity-meta"><span>55 mins ago</span></div></li>
          <li><div><strong>Treasury transfer</strong><small>18.2M pending verification</small></div><div class="activity-meta"><span>3 hours ago</span></div></li>
        </ul>
      </article>

      <article class="card panel-card">
        <div class="card-title-row">
          <h3>Current controls</h3>
          <button class="ghost small" data-action="route" data-route="/admin/treasury">Open treasury</button>
        </div>
        <ul class="focus-list">
          <li>User governance and access review</li>
          <li>KYC and risk controls</li>
          <li>Immutable audit logging</li>
          <li>Fund movement approvals</li>
        </ul>
      </article>
    </section>
  `;

  return renderDashboardLayout('admin', main);
};

const renderMarketplace = () => {
  const user = getActiveUser();
  if (!user || user.role !== 'user') {
    navigate('/welcome');
    return '';
  }

  const plans = [
    { name: 'Treasury Plus', returnText: '12% p.a.', min: 100000, duration: '12 months' },
    { name: 'Growth Fund', returnText: '15% p.a.', min: 250000, duration: '18 months' },
    { name: 'Property Yield', returnText: '18% p.a.', min: 500000, duration: '24 months' },
  ];

  const main = `
    <section class="page-section-card">
      <div class="card-title-row">
        <div>
          <p class="eyebrow accent">Marketplace</p>
          <h3>Investment plans</h3>
        </div>
      </div>

      <div class="plan-grid">
        ${plans
          .map(
            (plan) => `
              <article class="plan-card">
                <div class="plan-badge">${plan.name}</div>
                <h4>${plan.name}</h4>
                <p>Minimum: ${money(plan.min)}</p>
                <p>Duration: ${plan.duration}</p>
                <p>Projected return: ${plan.returnText}</p>
                <button class="primary" data-action="buy-plan" data-plan="${plan.name}">Invest now</button>
              </article>
            `,
          )
          .join('')}
      </div>
    </section>
  `;

  return renderDashboardLayout('user', main);
};

const renderKyc = () => {
  const user = getActiveUser();
  if (!user || user.role !== 'user') {
    navigate('/welcome');
    return '';
  }

  const main = `
    <section class="page-section-card">
      <div class="card-title-row">
        <div>
          <p class="eyebrow accent">KYC</p>
          <h3>Verification status</h3>
        </div>
        <span class="status-pill success">${user.kycStatus}</span>
      </div>

      <div class="two-column-grid">
        <div class="card mini-panel">
          <h4>Required documents</h4>
          <ul class="check-list">
            <li>Government-issued ID</li>
            <li>Proof of address</li>
            <li>Bank verification</li>
            <li>Passport photograph</li>
          </ul>
        </div>

        <div class="card mini-panel">
          <h4>Review timeline</h4>
          <ul class="timeline">
            <li>Not started</li>
            <li>Pending review</li>
            <li>Under review</li>
            <li>Approved or rejected</li>
          </ul>
        </div>
      </div>

      <div class="card upload-box">
        <h4>Upload supporting documents</h4>
        <button class="primary" data-action="upload-kyc">Upload verification documents</button>
      </div>
    </section>
  `;

  return renderDashboardLayout('user', main);
};

const renderAdminUsers = () => {
  const state = readState();
  const users = state.users.filter((u) => u.role === 'user');

  const main = `
    <section class="page-section-card">
      <div class="card-title-row">
        <div>
          <p class="eyebrow accent">User management</p>
          <h3>Portfolio users</h3>
        </div>
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>KYC</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${users
            .map(
              (u) => `
                <tr>
                  <td>${u.name}</td>
                  <td>${u.email}</td>
                  <td>${u.kycStatus}</td>
                  <td><span class="tag">${u.kycStatus === 'approved' ? 'Verified' : 'Needs review'}</span></td>
                </tr>
              `,
            )
            .join('')}
        </tbody>
      </table>
    </section>
  `;

  return renderDashboardLayout('admin', main);
};

const renderAdminApprovals = () => {
  const main = `
    <section class="page-section-card">
      <div class="card-title-row">
        <div>
          <p class="eyebrow accent">Approvals</p>
          <h3>Review queue</h3>
        </div>
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th>Request</th>
            <th>Owner</th>
            <th>Value</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>KYC review</td>
            <td>Ada Okafor</td>
            <td>₦2.4M</td>
            <td><div class="inline-actions"><button class="primary small-btn" data-action="approve-request">Approve</button><button class="ghost small-btn" data-action="reject-request">Reject</button></div></td>
          </tr>
          <tr>
            <td>Withdrawal approval</td>
            <td>David Adebayo</td>
            <td>₦850,000</td>
            <td><div class="inline-actions"><button class="primary small-btn" data-action="approve-request">Approve</button><button class="ghost small-btn" data-action="reject-request">Reject</button></div></td>
          </tr>
        </tbody>
      </table>
    </section>
  `;

  return renderDashboardLayout('admin', main);
};

const renderTreasury = () => {
  const main = `
    <section class="page-section-card">
      <div class="card-title-row">
        <div>
          <p class="eyebrow accent">Treasury</p>
          <h3>Fund movement and reconciliation</h3>
        </div>
      </div>

      <div class="two-column-grid">
        <article class="card mini-panel">
          <h4>Movement overview</h4>
          <ul class="check-list">
            <li>Source: Client funds</li>
            <li>Destination: Treasury reserve</li>
            <li>Reason: Investment settlement</li>
            <li>Approval: Manager override</li>
          </ul>
        </article>

        <article class="card mini-panel">
          <h4>Recent treasury actions</h4>
          <ul class="timeline">
            <li>₦18.2M transfer approved</li>
            <li>₦7.5M large deposit flagged</li>
            <li>Reconciliation review open</li>
          </ul>
        </article>
      </div>

      <div class="card upload-box">
        <h4>Approve or reject treasury request</h4>
        <div class="inline-actions">
          <button class="primary small-btn" data-action="approve-treasury">Approve</button>
          <button class="ghost small-btn" data-action="reject-treasury">Reject</button>
        </div>
      </div>
    </section>
  `;

  return renderDashboardLayout('admin', main);
};

const routeToComponent = (route: Route) => {
  if (route === '/welcome') return renderWelcome();
  if (route === '/login/user') return renderAuthPage('user', 'login');
  if (route === '/login/admin') return renderAuthPage('admin', 'login');
  if (route === '/register/user') return renderAuthPage('user', 'register');
  if (route === '/register/admin') return renderAuthPage('admin', 'register');
  if (route === '/user/dashboard') return renderUserDashboard();
  if (route === '/user/marketplace') return renderMarketplace();
  if (route === '/user/kyc') return renderKyc();
  if (route === '/admin/dashboard') return renderAdminDashboard();
  if (route === '/admin/users') return renderAdminUsers();
  if (route === '/admin/approvals') return renderAdminApprovals();
  if (route === '/admin/treasury') return renderTreasury();
  return renderWelcome();
};

const requireLogin = (role: Role) => {
  const user = getActiveUser();
  if (!user || user.role !== role) {
    navigate('/welcome');
    return false;
  }
  return true;
};

const handleAuthSubmit = (event: SubmitEvent) => {
  event.preventDefault();
  const form = event.target as HTMLFormElement;
  const formData = new FormData(form);
  const role = form.dataset.role as Role;
  const mode = form.dataset.mode as 'login' | 'register';
  if (role !== PORTAL_ROLE || (role === 'admin' && mode === 'register')) {
    alert('This action is not available in this portal.');
    return;
  }
  const state = readState();

  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '').trim();

  if (mode === 'login') {
    const match = state.users.find((user) => user.email.toLowerCase() === email.toLowerCase() && user.password === password && user.role === role);
    if (!match) {
      alert('Invalid credentials for this portal.');
      return;
    }
    setActiveUser(match);
    navigate(role === 'user' ? '/user/dashboard' : '/admin/dashboard');
    return;
  }

  const name = String(formData.get('name') ?? '').trim();
  const existing = state.users.find((user) => user.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    alert('This email is already registered. Please log in instead.');
    return;
  }

  const newUser: User = {
    id: `${role}-${Date.now()}`,
    name,
    email,
    password,
    role,
    kycStatus: 'not-started',
    walletBalance: role === 'user' ? 0 : 0,
    invested: 0,
    pendingWithdrawals: 0,
  };

  state.users.push(newUser);
  writeState(state);
  setActiveUser(newUser);
  navigate(role === 'user' ? '/user/dashboard' : '/admin/dashboard');
};

const handleAction = (action: string, route?: string, plan?: string) => {
  if (action === 'route' && route) {
    if ((route.startsWith('/user') || route === '/login/user' || route === '/register/user') && PORTAL_ROLE !== 'user') return;
    if ((route.startsWith('/admin') || route === '/login/admin' || route === '/register/admin') && PORTAL_ROLE !== 'admin') return;
    if (route.startsWith('/user') && !requireLogin('user')) return;
    if (route.startsWith('/admin') && !requireLogin('admin')) return;
    navigate(route as Route);
    return;
  }

  if (action === 'logout') {
    setActiveUser(null);
    navigate('/welcome');
    return;
  }

  if (action === 'buy-plan' && plan) {
    const user = getActiveUser();
    if (!user || user.role !== 'user') return;
    alert(`Investment request started for ${plan}. This mirrors a real marketplace flow and will route to the order review process.`);
    return;
  }

  if (action === 'upload-kyc') {
    alert('KYC upload flow started. This would connect to secure document storage and review workflow.');
    return;
  }

  if (action === 'approve-request' || action === 'approve-treasury') {
    alert('Approval recorded in the audit trail. This matches the admin approvals workflow.');
    return;
  }

  if (action === 'reject-request' || action === 'reject-treasury') {
    alert('Request rejected and flagged for follow-up.');
    return;
  }
};

const renderApp = () => {
  const route = getRouteFromHash();
  const activeUser = getActiveUser();

  if (PORTAL_ROLE === 'user' && (route.startsWith('/admin') || route === '/login/admin' || route === '/register/admin')) {
    navigate('/login/user');
    return;
  }
  if (PORTAL_ROLE === 'admin' && (route.startsWith('/user') || route === '/login/user' || route === '/register/user')) {
    navigate('/login/admin');
    return;
  }

  if (route.startsWith('/user') && (!activeUser || activeUser.role !== 'user')) {
    app.innerHTML = renderAuthPage('user', 'login');
    return;
  }

  if (route.startsWith('/admin') && (!activeUser || activeUser.role !== 'admin')) {
    app.innerHTML = renderAuthPage('admin', 'login');
    return;
  }

  app.innerHTML = routeToComponent(route);
};

app.addEventListener('submit', (event) => {
  const form = event.target as HTMLFormElement | null;
  if (!form || !form.matches('[data-form="auth"]')) return;
  handleAuthSubmit(event as SubmitEvent);
});

app.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  const action = target.dataset.action;
  const route = target.dataset.route;
  const plan = target.dataset.plan;

  if (action) {
    handleAction(action, route as Route | undefined, plan);
  }
});

window.addEventListener('hashchange', renderApp);

renderApp();
