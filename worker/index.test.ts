import { afterEach, describe, expect, it } from "vitest";
import { env } from "cloudflare:workers";
import { SELF, evictDurableObject } from "cloudflare:test";

const TOKEN = "unit-test-only-token";
const headers = {
  authorization: `Bearer ${TOKEN}`,
  "content-type": "application/json",
};

function operation(accountId: string, idempotencyKey: string, overrides: Record<string, unknown> = {}) {
  return {
    accountId,
    idempotencyKey,
    operationType: "deposit",
    amountMinor: 250_000,
    currency: "NGN",
    ...overrides,
  };
}

async function postOperation(body: unknown) {
  return SELF.fetch("https://invest-broker.test/api/v1/operations", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

afterEach(async () => {
  // Each test has isolated Worker storage; eviction tests explicitly exercise restart recovery.
});

describe("Invest Broker Worker API", () => {
  it("exposes a public health endpoint without exposing secrets", async () => {
    const response = await SELF.fetch("https://invest-broker.test/health");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "ok",
      service: "invest-broker-api",
      mode: "test",
    });
  });

  it("rejects unauthenticated API requests", async () => {
    const response = await SELF.fetch("https://invest-broker.test/api/v1/summary?accountId=auth-test", {
      headers: { "content-type": "application/json" },
    });
    expect(response.status).toBe(401);
  });

  it("records an operation once and returns the same record for a duplicate", async () => {
    const body = operation("idempotency-test", "deposit-ref-0001");
    const first = await postOperation(body);
    const second = await postOperation(body);

    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect((await first.json() as any).duplicate).toBe(false);
    expect((await second.json() as any).duplicate).toBe(true);

    const summary = await SELF.fetch("https://invest-broker.test/api/v1/summary?accountId=idempotency-test", { headers });
    expect((await summary.json() as any).totalOperations).toBe(1);
  });

  it("rejects reuse of an idempotency key with different operation data", async () => {
    const first = await postOperation(operation("conflict-test", "operation-ref-0001"));
    const second = await postOperation(operation("conflict-test", "operation-ref-0001", { amountMinor: 999_999 }));
    expect(first.status).toBe(201);
    expect(second.status).toBe(409);
  });

  it("serializes concurrent duplicate requests without double-recording", async () => {
    const body = operation("concurrent-test", "concurrent-ref-001");
    const responses = await Promise.all(Array.from({ length: 20 }, () => postOperation(body)));
    const statuses = responses.map((response) => response.status);
    expect(statuses.filter((status) => status === 201)).toHaveLength(1);
    expect(statuses.filter((status) => status === 200)).toHaveLength(19);

    const summary = await SELF.fetch("https://invest-broker.test/api/v1/summary?accountId=concurrent-test", { headers });
    expect((await summary.json() as any).totalOperations).toBe(1);
  });

  it("preserves SQLite records after the Durable Object instance is evicted and restarted", async () => {
    const body = operation("restart-test", "restart-ref-001");
    const created = await postOperation(body);
    expect(created.status).toBe(201);

    const stub = env.LEDGER.getByName("restart-test");
    await evictDurableObject(stub);

    const read = await SELF.fetch(
      "https://invest-broker.test/api/v1/operations/restart-ref-001?accountId=restart-test",
      { headers },
    );
    expect(read.status).toBe(200);
    const result = await read.json() as any;
    expect(result.operation.idempotency_key).toBe("restart-ref-001");
    expect(result.operation.mode).toBe("test");
  });

  it("validates operation amount, currency, and idempotency key", async () => {
    const badAmount = await postOperation(operation("validation-test", "validation-ref-001", { amountMinor: -1 }));
    const badCurrency = await postOperation(operation("validation-test", "validation-ref-002", { currency: "NGN-NGN" }));
    const badKey = await postOperation(operation("validation-test", "short"));
    expect(badAmount.status).toBe(400);
    expect(badCurrency.status).toBe(400);
    expect(badKey.status).toBe(400);
  });
});
