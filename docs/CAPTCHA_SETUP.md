# Invest Broker CAPTCHA and deployment setup

Supabase Auth CAPTCHA is enabled. The Cloudflare Turnstile widget **Invest Broker Login CAPTCHA** has been created and its public site key is configured in the Preview and Production environment settings of both Cloudflare Pages projects.

## One required Supabase Auth step

In the Supabase Dashboard for project `rjgzvpkyccfpnpzlbcuc`, open Authentication → Sign In / Providers (or CAPTCHA settings, depending on the dashboard version). Select Cloudflare Turnstile and save the **Turnstile secret key** from the widget configuration. Never put this secret in a `VITE_*` variable, GitHub, or the browser. It must match the widget whose public site key is configured in Cloudflare Pages.

The current connected Supabase integration exposes project/database operations but not the Auth CAPTCHA secret setting, so that secret cannot be safely written from this connection. Do not turn off CAPTCHA as a workaround. Until the secret is saved in Supabase Auth, sign-in may still be rejected by the backend even though the missing-site-key message is fixed.

## Cloudflare Pages environment

The following variables are configured in both Preview and Production for `invest-broker-user` and `invest-broker-admin`:
- `VITE_CAPTCHA_PROVIDER=turnstile`
- `VITE_CAPTCHA_SITE_KEY` (public site key only)

Any environment-variable change takes effect in the next Pages build. Pushes to `main` update the permanent production URLs:
- Customer: https://invest-broker-user.pages.dev
- Admin: https://invest-broker-admin.pages.dev

The intended custom URLs are https://invest-broker.com and https://admin.invest-broker.com, but they are not permanent production links until Cloudflare reports their DNS/domain status as active. Branch-preview URLs are temporary previews and should not be used as the canonical links.

## Install on phone

Both portals include separate web app manifests, an Invest Broker SVG mark, and service-worker registration. Open the permanent HTTPS URL in Chrome, then use the browser menu → Install app / Add to Home screen when offered. Browser install prompts are controlled by the browser and may not appear in every in-app browser, including some embedded ChatGPT views. If no prompt appears, open the URL in Chrome. Do not cache login responses, tokens, customer records, or financial data in the service worker.

## Safety

Keep CEO-only server-side authorization and MFA/AAL2. Keep `financial_operations_enabled=false` until a separate production readiness review and explicit controlled activation. UI access alone is not proof of API authorization.
