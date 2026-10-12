import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { adminAuthorizationFailure } from "./supabase/functions/admin-api/authorization.js";

const config = JSON.parse(readFileSync(new URL("./vercel.json", import.meta.url), "utf8"));
const userManifest = JSON.parse(readFileSync(new URL("./public/user.webmanifest", import.meta.url), "utf8"));
const adminManifest = JSON.parse(readFileSync(new URL("./public/admin.webmanifest", import.meta.url), "utf8"));

test("admin routes rewrite to the admin entry point on the single Vercel project", () => {
  assert.ok(config.rewrites.some(item => item.source === "/admin" && item.destination === "/admin.html"));
  assert.ok(config.rewrites.some(item => item.source === "/admin/:path*" && item.destination === "/admin.html"));
});

test("user routes rewrite to the customer entry point on the single Vercel project", () => {
  assert.ok(config.rewrites.some(item => item.source === "/:path*" && item.destination === "/index.html"));
});

test("the Vercel routing no longer depends on the retired two-host deployment", () => {
  assert.equal(config.redirects, undefined);
  assert.ok(config.rewrites.every(item => !item.has?.some(condition => condition.type === "host")));
});

test("customer and admin PWAs have separate start routes and scopes", () => {
  assert.equal(userManifest.scope, "/");
  assert.equal(userManifest.start_url, "/dashboard?source=pwa-user");
  assert.equal(adminManifest.scope, "/admin/");
  assert.equal(adminManifest.start_url, "/admin/dashboard?source=pwa-admin");
});

test("admin service-worker fallback selects the admin shell by path on the shared host", () => {
  const sw = readFileSync(new URL("./public/sw.js", import.meta.url), "utf8");
  assert.match(sw, /url\.pathname\.startsWith\(["']\/admin["']\)/);
  assert.match(sw, /caches\.match\(url\.pathname\.startsWith/);
});

test("customer portal contains an explicit administrator-session rejection", () => {
  const source = readFileSync(new URL("./src/main.jsx", import.meta.url), "utf8");
  assert.match(source, /roleIsAdmin\(session\.user\)/);
  assert.match(source, /Administrator accounts must use the dedicated admin portal/);
});

test("admin authorization accepts only the active approved primary admin with MFA", () => {
  const user = { id: "primary", app_metadata: { role: "admin" } };
  const claims = { aal: "aal2" };
  const profile = { account_status: "active", approval_status: "approved" };
  assert.equal(adminAuthorizationFailure({ user, claims, profile, primaryAdminId: "primary" }), null);
});

test("admin authorization denies missing or stale sessions", () => {
  assert.equal(adminAuthorizationFailure({ user: null, claims: null, profile: null, primaryAdminId: null })?.status, 401);
});

test("admin authorization denies customer or manager roles", () => {
  const claims = { aal: "aal2" };
  const profile = { account_status: "active", approval_status: "approved" };
  for (const role of ["customer", "manager", undefined]) {
    const user = { id: "primary", app_metadata: role ? { role } : {} };
    assert.equal(adminAuthorizationFailure({ user, claims, profile, primaryAdminId: "primary" })?.status, 403);
  }
});

test("admin authorization requires MFA assurance level AAL2", () => {
  const user = { id: "primary", app_metadata: { role: "admin" } };
  const profile = { account_status: "active", approval_status: "approved" };
  for (const aal of ["aal1", undefined]) {
    assert.equal(adminAuthorizationFailure({ user, claims: { aal }, profile, primaryAdminId: "primary" })?.status, 403);
  }
});

test("admin authorization denies suspended, restricted, or unapproved accounts", () => {
  const now = Date.parse("2026-10-11T22:00:00Z");
  const claims = { aal: "aal2" };
  const profile = { account_status: "active", approval_status: "approved" };
  const suspended = { id: "primary", app_metadata: { role: "admin" }, banned_until: "2026-10-11T23:00:00Z" };
  assert.equal(adminAuthorizationFailure({ user: suspended, claims, profile, primaryAdminId: "primary", now })?.status, 403);
  for (const badProfile of [
    { account_status: "restricted", approval_status: "approved" },
    { account_status: "active", approval_status: "pending" },
    null
  ]) {
    assert.equal(adminAuthorizationFailure({ user: { id: "primary", app_metadata: { role: "admin" } }, claims, profile: badProfile, primaryAdminId: "primary", now })?.status, 403);
  }
});

test("admin authorization denies non-primary admins and missing owner assignment", () => {
  const user = { id: "other-admin", app_metadata: { role: "admin" } };
  const claims = { aal: "aal2" };
  const profile = { account_status: "active", approval_status: "approved" };
  assert.equal(adminAuthorizationFailure({ user, claims, profile, primaryAdminId: "primary" })?.status, 403);
  assert.equal(adminAuthorizationFailure({ user, claims, profile, primaryAdminId: null })?.status, 503);
});

test("admin API delegates access decisions to the tested authorization helper", () => {
  const source = readFileSync(new URL("./supabase/functions/admin-api/index.ts", import.meta.url), "utf8");
  assert.match(source, /import \{ adminAuthorizationFailure \} from "\.\/authorization\.js"/);
  assert.match(source, /adminAuthorizationFailure\(\{user,claims:claimsData\?\.claims,profile:adminProfile,primaryAdminId:control\?\.primary_admin_user_id\}\)/);
});

test("Supabase config keeps gateway JWT verification enabled for protected functions", () => {
  const config = readFileSync(new URL("./supabase/config.toml", import.meta.url), "utf8");
  for (const name of ["admin-api", "admin-bootstrap", "user-api"]) {
    assert.match(config, new RegExp("\\[functions\\." + name + "\\]\\s+verify_jwt = true"));
  }
});

test("platform ownership control remains inaccessible to browser database roles", () => {
  const migration = readFileSync(new URL("./supabase/migrations/20261011221200_platform_control_deny_client_access.sql", import.meta.url), "utf8");
  assert.match(migration, /for all\s+to anon, authenticated\s+using \(false\)\s+with check \(false\)/i);
});

test("ledger posting rejects partially posted or already-posted lines", () => {
  const migration = readFileSync(new URL("./supabase/migrations/20261011222000_ledger_posting_requires_all_pending_lines.sql", import.meta.url), "utf8");
  assert.match(migration, /status\s*<>\s*'pending'\s+or\s+posted_at\s+is\s+not\s+null/i);
  assert.match(migration, /A ledger transaction requires at least two entries/);
  assert.match(migration, /Ledger transaction is not balanced by currency/);
  assert.match(migration, /group by currency[\s\S]*?sum\(debit_amount\)\s*<>\s*sum\(credit_amount\)/i);
  assert.match(migration, /grant execute on function public\.post_ledger_transaction\(uuid\) to service_role/i);
});
