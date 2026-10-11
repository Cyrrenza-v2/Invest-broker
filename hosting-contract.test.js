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
