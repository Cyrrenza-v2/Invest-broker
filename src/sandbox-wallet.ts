export type SandboxAsset = { symbol: string; name: string; price: number; change: number; icon: string };
export type SandboxActivity = { id: string; type: string; asset: string; amount: number; quoteAmount: number; status: string; detail: string; createdAt: string };
export type SandboxState = { usd: number; coins: Record<string, number>; activity: SandboxActivity[] };
export const SANDBOX_KEY = 'invest-broker-wallet-sandbox-v1';
export const SANDBOX_ASSETS: SandboxAsset[] = [
  { symbol: 'BTC', name: 'Bitcoin', price: 67240, change: 2.4, icon: '₿' },
  { symbol: 'ETH', name: 'Ethereum', price: 3520, change: 1.7, icon: '◆' },
  { symbol: 'USDT', name: 'Tether', price: 1, change: 0.01, icon: '₮' },
  { symbol: 'SOL', name: 'Solana', price: 158.2, change: -1.2, icon: '◎' },
  { symbol: 'BNB', name: 'BNB', price: 594.7, change: 0.8, icon: '◆' },
  { symbol: 'XRP', name: 'XRP', price: 0.53, change: -0.6, icon: '✕' },
];
const initialState = (): SandboxState => ({ usd: 10000, coins: { BTC: 0.05, ETH: 0.8, USDT: 2500, SOL: 12, BNB: 2, XRP: 900 }, activity: [] });
const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c] || c));
const fmt = (value: number, digits = 2) => new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(value);
const usd = (value: number) => '$' + fmt(value, 2);
export function loadSandboxState(): SandboxState {
  try {
    const raw = localStorage.getItem(SANDBOX_KEY);
    if (!raw) return initialState();
    const parsed = JSON.parse(raw) as Partial<SandboxState>;
    if (typeof parsed.usd !== 'number' || !parsed.coins || !Array.isArray(parsed.activity)) return initialState();
    return { usd: Math.max(0, parsed.usd), coins: parsed.coins, activity: parsed.activity.slice(0, 100) };
  } catch { return initialState(); }
}
function save(state: SandboxState) { localStorage.setItem(SANDBOX_KEY, JSON.stringify(state)); }
function asset(symbol: string) { return SANDBOX_ASSETS.find(a => a.symbol === symbol); }
function addActivity(state: SandboxState, item: Omit<SandboxActivity, 'id'|'createdAt'>) {
  state.activity.unshift({ ...item, id: 'SIM-' + Math.random().toString(36).slice(2, 10).toUpperCase(), createdAt: new Date().toISOString() });
  state.activity = state.activity.slice(0, 100);
}
export function simulateTrade(state: SandboxState, side: 'buy'|'sell', symbol: string, amount: number): { state: SandboxState; error?: string } {
  const coin = asset(symbol);
  if (!coin) return { state, error: 'Choose a supported demo asset.' };
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000) return { state, error: 'Enter a positive amount within the sandbox limit.' };
  const quote = amount * coin.price;
  if (side === 'buy') {
    if (quote > state.usd) return { state, error: 'Not enough simulated USD. Reduce the order amount.' };
    state.usd = Math.round((state.usd - quote) * 100) / 100;
    state.coins[symbol] = (state.coins[symbol] || 0) + amount;
  } else {
    if (amount > (state.coins[symbol] || 0)) return { state, error: 'Not enough simulated ' + symbol + ' to sell.' };
    state.coins[symbol] = Math.max(0, (state.coins[symbol] || 0) - amount);
    state.usd = Math.round((state.usd + quote) * 100) / 100;
  }
  addActivity(state, { type: side === 'buy' ? 'Simulated buy' : 'Simulated sell', asset: symbol, amount, quoteAmount: quote, status: 'simulated', detail: side.toUpperCase() + ' ' + fmt(amount, 8) + ' ' + symbol + ' at demo quote ' + usd(coin.price) });
  return { state };
}
export function simulateTransfer(state: SandboxState, symbol: string, amount: number, recipient: string): { state: SandboxState; error?: string } {
  const coin = asset(symbol);
  if (!coin) return { state, error: 'Choose a supported demo asset.' };
  if (!recipient.trim() || recipient.trim().length > 120) return { state, error: 'Enter a demo recipient label or email.' };
  if (!Number.isFinite(amount) || amount <= 0 || amount > (state.coins[symbol] || 0)) return { state, error: 'Transfer amount must be positive and no greater than your simulated balance.' };
  state.coins[symbol] = Math.max(0, (state.coins[symbol] || 0) - amount);
  addActivity(state, { type: 'Simulated transfer', asset: symbol, amount, quoteAmount: amount * coin.price, status: 'simulated', detail: 'Demo-only transfer recipient: ' + recipient.trim() });
  return { state };
}
function activityTable(state: SandboxState) {
  if (!state.activity.length) return '<div class="sandbox-empty"><strong>No sandbox activity yet</strong><p>Run a simulated buy, sell, deposit request, or transfer to populate this history.</p></div>';
  return '<div class="table-wrap"><table class="data-table"><thead><tr><th>Activity</th><th>Asset</th><th>Amount</th><th>Quote value</th><th>Status</th><th>Time</th></tr></thead><tbody>' + state.activity.map(x => '<tr><td><strong>' + escapeHtml(x.type) + '</strong><small class="sandbox-detail">' + escapeHtml(x.detail) + '</small></td><td>' + escapeHtml(x.asset) + '</td><td>' + fmt(x.amount, 8) + '</td><td>' + usd(x.quoteAmount) + '</td><td><span class="sandbox-status">SIMULATED</span></td><td>' + escapeHtml(new Date(x.createdAt).toLocaleString()) + '</td></tr>').join('') + '</tbody></table></div>';
}
function marketTable() {
  return '<div class="sandbox-market-grid">' + SANDBOX_ASSETS.map(a => '<article class="sandbox-coin"><div class="sandbox-coin-head"><span class="sandbox-coin-icon">' + escapeHtml(a.icon) + '</span><div><strong>' + escapeHtml(a.name) + '</strong><small>' + escapeHtml(a.symbol) + ' / USD</small></div><span class="sandbox-change ' + (a.change < 0 ? 'down' : 'up') + '">' + (a.change > 0 ? '+' : '') + a.change.toFixed(2) + '%</span></div><h3>' + usd(a.price) + '</h3><p>Static demonstration quote · not a live exchange price</p><button class="primary small" data-sandbox-action="trade" data-symbol="' + a.symbol + '">Test trade</button></article>').join('') + '</div>';
}
function nav(active: string) {
  const links = [['/sandbox/wallet','Wallet'],['/sandbox/market','Markets'],['/sandbox/trade','Buy / Sell'],['/sandbox/transfer','Transfer'],['/sandbox/activity','Activity'],['/sandbox/admin','Admin demo']];
  return '<aside class="sandbox-sidebar"><a class="sandbox-brand" href="#/sandbox/wallet"><span>IB</span><div><strong>Invest Broker</strong><small>Wallet sandbox</small></div></a><nav>' + links.map(([path,label]) => '<a class="' + (active === path ? 'active' : '') + '" href="#' + path + '">' + label + '</a>').join('') + '</nav><p class="sandbox-sidebar-note">Local-only demo<br>No real assets or payments</p></aside>';
}
export function sandboxContent(path: string): string {
  const state = loadSandboxState();
  if (path === '/sandbox/market') return '<section class="sandbox-heading"><p class="eyebrow">Sandbox market</p><h2>Explore demo assets</h2><p>All quotes are fixed examples, not connected to an exchange.</p></section>' + marketTable();
  if (path === '/sandbox/trade') return '<section class="sandbox-heading"><p class="eyebrow">Paper trading</p><h2>Buy or sell coins</h2><p>Orders change only this browser’s simulated balances.</p></section><div class="sandbox-columns"><section class="page-section-card"><form class="stack-form" data-sandbox-form="trade"><label>Order side<select name="side"><option value="buy">Buy</option><option value="sell">Sell</option></select></label><label>Asset<select name="symbol">' + SANDBOX_ASSETS.map(a => '<option value="' + a.symbol + '">' + a.symbol + ' · ' + a.name + '</option>').join('') + '</select></label><label>Coin amount<input name="amount" type="number" min="0.00000001" step="any" required placeholder="0.01"></label><p class="small-text muted">Buy orders use simulated USD. Sell orders credit simulated USD at the static demo quote.</p><button class="primary" type="submit">Place simulated order</button><div class="sandbox-message" aria-live="polite"></div></form></section><section class="page-section-card"><h3>Available demo balances</h3>' + balanceTable(state) + '</section></div>';
  if (path === '/sandbox/transfer') return '<section class="sandbox-heading"><p class="eyebrow">Internal transfer simulation</p><h2>Transfer a demo coin</h2><p>This creates a local test record only. No wallet address or blockchain is contacted.</p></section><div class="sandbox-columns"><section class="page-section-card"><form class="stack-form" data-sandbox-form="transfer"><label>Asset<select name="symbol">' + SANDBOX_ASSETS.map(a => '<option value="' + a.symbol + '">' + a.symbol + ' · ' + a.name + '</option>').join('') + '</select></label><label>Recipient label<input name="recipient" required maxlength="120" placeholder="demo-recipient@example.test"></label><label>Coin amount<input name="amount" type="number" min="0.00000001" step="any" required placeholder="0.01"></label><button class="primary" type="submit">Run simulated transfer</button><div class="sandbox-message" aria-live="polite"></div></form></section><section class="page-section-card"><h3>Transfer checks</h3><ul class="clean-list"><li>Positive amount required</li><li>Amount cannot exceed the demo balance</li><li>Recipient is stored as a label only</li><li>Activity is marked SIMULATED</li></ul></section></div>';
  if (path === '/sandbox/activity') return '<section class="sandbox-heading"><p class="eyebrow">Sandbox ledger</p><h2>Activity history</h2><p>Browser-local records for simulated orders and transfers.</p></section><section class="page-section-card">' + activityTable(state) + '<button class="ghost" data-sandbox-action="reset">Reset demo data</button></section>';
  if (path === '/sandbox/admin') return '<section class="sandbox-heading"><p class="eyebrow">Admin demonstration</p><h2>Sandbox operations overview</h2><p>This is a public demo screen, not a protected admin console. It contains no customer data and cannot approve or release money.</p></section><div class="sandbox-kpis"><article><span>Demo orders/transfers</span><strong>' + state.activity.length + '</strong></article><article><span>Buy orders</span><strong>' + state.activity.filter(x => x.type === 'Simulated buy').length + '</strong></article><article><span>Sell orders</span><strong>' + state.activity.filter(x => x.type === 'Simulated sell').length + '</strong></article><article><span>Transfers</span><strong>' + state.activity.filter(x => x.type === 'Simulated transfer').length + '</strong></article></div><section class="page-section-card"><h3>Sandbox activity feed</h3>' + activityTable(state) + '</section>';
  return '<section class="sandbox-heading"><p class="eyebrow">Wallet sandbox · browser-only</p><h2>Your demo crypto wallet</h2><p>Explore coin balances and test trading and transfer screens without connecting a real wallet or using funds.</p></section><section class="sandbox-total"><div><span>Simulated USD balance</span><strong>' + usd(state.usd) + '</strong><small>Demo balance only · not withdrawable</small></div><span class="sandbox-total-icon">$</span></section><div class="sandbox-quick-actions"><a href="#/sandbox/market">Explore markets</a><a href="#/sandbox/trade">Buy / sell</a><a href="#/sandbox/transfer">Transfer</a><a href="#/sandbox/activity">Activity</a></div><section class="page-section-card"><div class="section-heading"><div><p class="eyebrow">Portfolio</p><h3>Your demo assets</h3></div><a href="#/sandbox/market">View markets →</a></div>' + coinTable(state) + '</section><section class="page-section-card"><div class="section-heading"><h3>Recent activity</h3><a href="#/sandbox/activity">View all →</a></div>' + activityTable(state) + '</section>';
}
function coinTable(state: SandboxState) {
  return '<div class="table-wrap"><table class="data-table"><thead><tr><th>Asset</th><th>Balance</th><th>Demo price</th><th>Demo value</th><th>24h sample</th></tr></thead><tbody>' + SANDBOX_ASSETS.map(a => '<tr><td><span class="sandbox-coin-cell"><span class="sandbox-coin-icon">' + escapeHtml(a.icon) + '</span><span><strong>' + escapeHtml(a.name) + '</strong><small>' + a.symbol + '</small></span></span></td><td>' + fmt(state.coins[a.symbol] || 0, 8) + '</td><td>' + usd(a.price) + '</td><td>' + usd((state.coins[a.symbol] || 0) * a.price) + '</td><td class="sandbox-change ' + (a.change < 0 ? 'down' : 'up') + '">' + (a.change > 0 ? '+' : '') + a.change.toFixed(2) + '%</td></tr>').join('') + '</tbody></table></div>';
}
function balanceTable(state: SandboxState) {
  return '<div class="sandbox-balance-list">' + SANDBOX_ASSETS.map(a => '<div><span>' + a.symbol + '</span><strong>' + fmt(state.coins[a.symbol] || 0, 8) + '</strong><small>' + usd((state.coins[a.symbol] || 0) * a.price) + '</small></div>').join('') + '<div><span>USD</span><strong>' + usd(state.usd) + '</strong><small>Simulated quote balance</small></div></div>';
}
export function sandboxPage(path: string): string {
  return '<div class="sandbox-layout">' + nav(path) + '<main class="sandbox-main"><header class="sandbox-topbar"><div><p class="eyebrow">Invest Broker · isolated preview</p><h1>Wallet and trading flow</h1></div><button class="ghost" data-sandbox-action="reset">Reset sandbox</button></header><div class="sandbox-warning" role="status"><strong>TEST MODE ONLY</strong><span>Static prices · local browser storage · no real coins, deposits, transfers, exchange, or blockchain connection.</span></div>' + sandboxContent(path) + '<footer class="sandbox-footer">Resetting clears only this browser’s sandbox data. This preview is separate from Supabase account records.</footer></main></div>';
}
export function initSandbox(app: HTMLElement) {
  app.addEventListener('click', event => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-sandbox-action]');
    if (!target) return;
    const action = target.dataset.sandboxAction;
    if (action === 'trade') { location.hash = '/sandbox/trade'; return; }
    if (action === 'reset') {
      if (!window.confirm('Reset all local sandbox balances and activity? No live account data will be affected.')) return;
      localStorage.removeItem(SANDBOX_KEY);
      location.hash = '/sandbox/wallet';
      if (location.hash === '#/sandbox/wallet') app.innerHTML = sandboxPage('/sandbox/wallet');
    }
  });
  app.addEventListener('submit', event => {
    const form = event.target as HTMLFormElement;
    const kind = form.dataset.sandboxForm;
    if (kind !== 'trade' && kind !== 'transfer') return;
    event.preventDefault();
    const data = new FormData(form);
    const state = loadSandboxState();
    const symbol = String(data.get('symbol') || '');
    const amount = Number(data.get('amount'));
    const result = kind === 'trade'
      ? simulateTrade(state, String(data.get('side')) === 'sell' ? 'sell' : 'buy', symbol, amount)
      : simulateTransfer(state, symbol, amount, String(data.get('recipient') || ''));
    const message = form.querySelector<HTMLElement>('.sandbox-message');
    if (result.error) { if (message) message.textContent = result.error; return; }
    save(result.state);
    location.hash = '#/sandbox/activity';
    app.innerHTML = sandboxPage('/sandbox/activity');
  });
}
