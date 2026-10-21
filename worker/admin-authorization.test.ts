import { describe, expect, it } from "vitest";
import { adminAuthorizationFailure } from "../supabase/functions/admin-api/authorization.js";

const user = { id: "ceo-1", app_metadata: { role: "admin" } };
const profile = { account_status: "active", approval_status: "approved" };
const claims = { aal: "aal2" };

describe("CEO/admin authorization gate", () => {
  it("allows only the configured primary admin with AAL2 and an active approved profile", () => {
    expect(adminAuthorizationFailure({
      user, claims, profile, primaryAdminId: "ceo-1", now: 1_000
    })).toBeNull();
  });

  it("rejects a customer account even when the session has AAL2", () => {
    expect(adminAuthorizationFailure({
      user: { id: "customer-1", app_metadata: { role: "user" } },
      claims, profile, primaryAdminId: "customer-1", now: 1_000
    })).toMatchObject({ status: 403 });
  });

  it("rejects admin sessions without verified MFA/AAL2", () => {
    expect(adminAuthorizationFailure({
      user, claims: { aal: "aal1" }, profile, primaryAdminId: "ceo-1", now: 1_000
    })).toMatchObject({ status: 403, message: "Verified MFA (AAL2) is required" });
  });

  it("rejects an admin who is not the configured single primary administrator", () => {
    expect(adminAuthorizationFailure({
      user: { id: "other-admin", app_metadata: { role: "admin" } },
      claims, profile, primaryAdminId: "ceo-1", now: 1_000
    })).toMatchObject({ status: 403, message: "This account is not the assigned primary administrator." });
  });

  it("rejects inactive or unapproved administrator profiles", () => {
    expect(adminAuthorizationFailure({
      user, claims, profile: { account_status: "suspended", approval_status: "approved" },
      primaryAdminId: "ceo-1", now: 1_000
    })).toMatchObject({ status: 403 });
  });

  it("rejects suspended administrator accounts", () => {
    expect(adminAuthorizationFailure({
      user: { ...user, banned_until: new Date(2_000).toISOString() },
      claims, profile, primaryAdminId: "ceo-1", now: 1_000
    })).toMatchObject({ status: 403, message: "Administrator account is suspended" });
  });

  it("fails closed when no primary administrator is configured", () => {
    expect(adminAuthorizationFailure({
      user, claims, profile, primaryAdminId: null, now: 1_000
    })).toMatchObject({ status: 503 });
  });
});
