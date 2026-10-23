# Admin Portal Deployment Checklist

## Deployment platform
Deploy the admin portal to Cloudflare Pages from the `Cyrrenza-v2/Invest-broker` GitHub repository. Keep the customer portal in its separate Cloudflare Pages project.

## Admin Pages project settings
- Repository: `Cyrrenza-v2/Invest-broker`
- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Build environment variable: `VITE_APP_ROLE=admin`
- Production branch: `main` (or an approved release branch)
- Custom domain: `admin.invest-broker.com`

The customer Pages project must use `VITE_APP_ROLE=user` and the customer domain `invest-broker.com`. Keep the customer and admin projects separate and do not use Vercel build hooks or deployments.

## Security and release gate
A successful Vite build is not proof that the portal is production-ready. Before production certification:
1. Verify administrator identity and role server-side on every privileged API request.
2. Verify admin endpoints use the production Supabase project and enforce authorization/RLS.
3. Verify customer and admin sessions cannot cross portal boundaries.
4. Keep ledger mutations server-authorized, idempotent, and audited.
5. Verify ordinary customers are denied admin access and admin-only actions.
6. Confirm admin MFA/AAL2 and the primary-admin restriction.
7. Confirm payment providers remain test-only and financial operations remain disabled until separately authorized.
8. Reconcile the documented Supabase migration-history mismatch before any production schema change.

## Release verification
- [ ] Cloudflare Pages project connected to the intended GitHub repository and production branch
- [ ] Admin build uses `VITE_APP_ROLE=admin`
- [ ] Customer build uses `VITE_APP_ROLE=user`
- [ ] Custom domains are verified and active in Cloudflare
- [ ] Admin login and server-side role checks pass
- [ ] Admin data loads from the intended Supabase project
- [ ] Customer access to admin-only routes and data is blocked
- [ ] Worker health and invalid-session rejection probes pass
- [ ] No Vercel deployment workflow, hook, or production trigger remains
