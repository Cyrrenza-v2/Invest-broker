# Invest Broker

This repository contains the Invest Broker customer account access app and the Slack AI workflow preview.

## Customer app configuration

Set the following environment variables in the deployment platform:

- `VITE_SUPABASE_URL`: Supabase project URL.
- `VITE_SUPABASE_ANON_KEY`: public anon/publishable key.

Use public client credentials only. Never put a Supabase service-role key into a `VITE_*` variable.

## Approved-user login behavior

1. Registration uses Supabase Auth and the database trigger provisions the customer profile.
2. If email confirmation is enabled, the customer must confirm their email address before password sign-in can succeed.
3. After sign-in, the app calls `/functions/v1/user-api/me` using the current access token.
4. The app only grants customer-area access when the backend profile says both `approval_status = approved` and `account_status = active`.
5. Pending accounts are kept out of the customer area and rechecked every eight seconds. Once the admin approves and activates the account, the page updates without creating another account.
6. Rejected or inactive accounts remain blocked.

The backend must continue to enforce authorization on every protected data route; frontend checks alone are not security controls.

## Local development

```sh
cp .env.example .env.local
# Replace the placeholder with the project's public anon/publishable key.
npm install
npm run dev
```

Run tests and build:

```sh
npm test
npm run build
```
