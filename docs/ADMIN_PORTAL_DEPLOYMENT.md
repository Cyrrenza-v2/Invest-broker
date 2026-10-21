# Invest Broker portal deployment checklist

## Hosting target
Deploy the customer and admin portals through Cloudflare Pages. Do not configure Vercel projects, Vercel analytics, or Vercel Git deployment hooks.

- Customer portal custom domain: `invest-broker.com`
- Admin portal custom domain: `admin.invest-broker.com`
- Cloudflare Pages project names: `invest-broker-user` and `invest-broker-admin`
- Build command: `npm run build`
- Build output directory: `dist`
- Customer build variable: `VITE_APP_ROLE=user`
- Admin build variable: `VITE_APP_ROLE=admin`

The two portals must be built separately so each bundle receives its intended role. The admin hostname is recognized by the frontend and must also be allowed by the backend CORS policy.

## Release gate
A successful build or reachable HTML page does not prove that authentication, navigation, data access, or authorization works end to end.

Before production certification, verify:
1. Customer sign-in, session expiry, and customer-only data access.
2. Admin sign-in with MFA/AAL2 and primary-CEO authorization.
3. Customer accounts cannot call admin APIs or view another customer's records.
4. Both portals' navigation routes and mobile layouts pass browser tests.
5. Backend CORS allows only the approved Cloudflare/custom domains and local development.
6. Cloudflare Pages deployment and custom-domain DNS/HTTPS are verified against the intended commit.
7. Financial operations remain disabled until the server-side controls, ledger idempotency, and audit trail have been independently verified.
8. Resolve the documented Supabase migration-history mismatch and review outstanding security warnings.

## Current verification limits
The automated browser smoke test checks unauthenticated welcome, login, and customer registration navigation. It does not sign in to real accounts, verify authenticated dashboards, or exercise financial operations. Do not describe the platform as production-ready until those separate tests pass.
