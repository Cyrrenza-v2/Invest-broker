import { chromium } from 'playwright';

const customerUrl = process.env.CUSTOMER_PORTAL_URL || 'https://invest-broker-user.pages.dev';
const adminUrl = process.env.ADMIN_PORTAL_URL || 'https://invest-broker-admin.pages.dev';

async function checkPortal({ name, url, isAdmin }) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    if (!response || !response.ok()) {
      throw new Error(`${name}: initial page returned HTTP ${response?.status() ?? 'no response'}`);
    }

    await page.locator('h1').first().waitFor({ state: 'visible', timeout: 15000 });
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.getByRole('heading', { name: 'Welcome back' }).waitFor({ state: 'visible' });
    await page.locator('form[data-form="auth"][data-mode="login"]').waitFor({ state: 'visible' });

    if (isAdmin) {
      if (await page.getByRole('link', { name: 'Create an account' }).count()) {
        throw new Error('Admin portal exposes customer self-registration navigation.');
      }
      await page.getByRole('link', { name: 'Back to welcome' }).click();
      await page.getByRole('button', { name: 'Sign in', exact: true }).waitFor({ state: 'visible' });
    } else {
      await page.getByRole('link', { name: 'Create an account' }).click();
      await page.getByRole('heading', { name: 'Create your account' }).waitFor({ state: 'visible' });
      await page.locator('form[data-form="auth"][data-mode="register"]').waitFor({ state: 'visible' });
      await page.getByRole('link', { name: 'Already registered? Sign in' }).click();
      await page.getByRole('heading', { name: 'Welcome back' }).waitFor({ state: 'visible' });
    }

    if (errors.length) {
      throw new Error(`${name}: browser JavaScript errors: ${errors.join('; ')}`);
    }
    console.log(`PASS ${name}: welcome → login → ${isAdmin ? 'welcome' : 'register → login'}`);
  } finally {
    await browser.close();
  }
}

await checkPortal({ name: 'Customer portal', url: customerUrl, isAdmin: false });
await checkPortal({ name: 'Admin portal', url: adminUrl, isAdmin: true });
