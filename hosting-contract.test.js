import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const config = JSON.parse(readFileSync(new URL("./vercel.json", import.meta.url), "utf8"));
const userManifest = JSON.parse(readFileSync(new URL("./public/user.webmanifest", import.meta.url), "utf8"));
const adminManifest = JSON.parse(readFileSync(new URL("./public/admin.webmanifest", import.meta.url), "utf8"));

test("stable admin hostname serves the admin entry point", () => {
  const route = config.rewrites.find(item => item.has?.some(condition =>
    condition.type === "host" && condition.value === "admin-invest-broker.vercel.app"
  ));
  assert.equal(route?.destination, "/admin.html");
});

test("stable customer hostname serves the customer entry point", () => {
  const route = config.rewrites.find(item => item.has?.some(condition =>
    condition.type === "host" && condition.value === "invest-broker.vercel.app"
  ));
  assert.equal(route?.destination, "/index.html");
});

test("customer admin paths are redirected to the dedicated admin hostname", () => {
  const redirects = config.redirects.filter(item => item.has?.some(condition =>
    condition.type === "host" && condition.value === "invest-broker.vercel.app"
  ));
  assert.ok(redirects.some(item => item.source === "/admin"));
  assert.ok(redirects.some(item => item.source === "/admin/:path*"));
  assert.ok(redirects.some(item => item.source === "/admin.html"));
  assert.ok(redirects.some(item => item.source === "/admin.webmanifest"));
  assert.ok(redirects.every(item => item.destination.startsWith("https://admin-invest-broker.vercel.app/")));
});

test("admin host redirects direct customer entry files back into the admin app", () => {
  const redirects = config.redirects.filter(item => item.has?.some(condition =>
    condition.type === "host" && condition.value === "admin-invest-broker.vercel.app"
  ));
  assert.ok(redirects.some(item => item.source === "/index.html" && item.destination === "/admin/dashboard"));
  assert.ok(redirects.some(item => item.source === "/user.webmanifest" && item.destination === "/admin/dashboard"));
});

test("customer and admin PWAs have separate start routes and scopes", () => {
  assert.equal(userManifest.scope, "/");
  assert.equal(userManifest.start_url, "/dashboard?source=pwa-user");
  assert.equal(adminManifest.scope, "/admin/");
  assert.equal(adminManifest.start_url, "/admin/dashboard?source=pwa-admin");
});

test("admin service-worker fallback never selects the customer entry point on admin host", () => {
  const sw = readFileSync(new URL("./public/sw.js", import.meta.url), "utf8");
  assert.match(sw, /self\.location\.hostname\s*===\s*["']admin-invest-broker\.vercel\.app["']/);
});

test("customer portal contains an explicit administrator-session rejection", () => {
  const source = readFileSync(new URL("./src/main.jsx", import.meta.url), "utf8");
  assert.match(source, /roleIsAdmin\(session\.user\)/);
  assert.match(source, /Administrator accounts must use the dedicated admin portal/);
});

test("admin API requires role, MFA, active approved account, and primary-admin assignment", () => {
  const source = readFileSync(new URL("./supabase/functions/admin-api/index.ts", import.meta.url), "utf8");
  assert.match(source, /user\.app_metadata\?\.role\s*!==\s*["']admin["']/);
  assert.match(source, /claims\?\.aal\s*!==\s*["']aal2["']/);
  assert.match(source, /adminProfile\.account_status\s*!==\s*["']active["']/);
  assert.match(source, /adminProfile\.approval_status\s*!==\s*["']approved["']/);
  assert.match(source, /control\.primary_admin_user_id\s*!==\s*user\.id/);
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
