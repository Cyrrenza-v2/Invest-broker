# Invest Broker CAPTCHA setup

Supabase Auth CAPTCHA is enabled, so protected authentication requests must carry a valid provider token. The frontend now renders a CAPTCHA challenge and passes its token as `gotrue_meta_security.captcha_token` for sign-in and customer registration.

## Required Cloudflare Pages variables

Set these for both `invest-broker-user` and `invest-broker-admin` under Settings → Environment variables, for Preview and Production:

- `VITE_CAPTCHA_PROVIDER`: `turnstile` or `hcaptcha`, matching the provider selected in Supabase Auth.
- `VITE_CAPTCHA_SITE_KEY`: the provider's public site key authorized for deployed hostnames.

The secret key belongs only in the provider/Supabase server-side CAPTCHA configuration; never expose it as a `VITE_*` variable or commit it to GitHub. Register preview and production hostnames in the CAPTCHA provider, then rebuild both Pages projects.

If the site key is missing, authentication fails closed with a visible configuration message rather than retrying without a token or disabling CAPTCHA.

The portal styling follows the supplied Admin Control Center board: deep navy canvas, bright blue/cyan accents, branded logo mark, operations cards, compact data tables, and responsive mobile bottom navigation. Data still comes from authenticated Supabase APIs; the UI does not fabricate live balances or enable financial operations.
