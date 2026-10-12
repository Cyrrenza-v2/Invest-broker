import { DurableObject } from "cloudflare:workers";

export interface Env {
  LEDGER: DurableObjectNamespace;
  API_TOKEN?: string;
  APP_MODE?: string;
}

type OperationType = "deposit" | "withdrawal" | "investment" | "return" | "adjustment";

type OperationInput = {
  accountId: string;
  idempotencyKey: string;
  operationType: OperationType;
  amountMinor: number;
  currency: string;
};

type OperationRecord = {
  idempotency_key: string;
  operation_type: OperationType;
  amount_minor: number;
  currency: string;
  status: "recorded";
  mode: "test";
  created_at: string;
};

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function validAccountId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(value);
}

function validOperation(value: unknown): value is OperationInput {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<OperationInput>;
  return (
    validAccountId(item.accountId) &&
    typeof item.idempotencyKey === "string" &&
    /^[A-Za-z0-9._:-]{8,128}$/.test(item.idempotencyKey) &&
    ["deposit", "withdrawal", "investment", "return", "adjustment"].includes(item.operationType ?? "") &&
    Number.isSafeInteger(item.amountMinor) &&
    (item.amountMinor ?? 0) > 0 &&
    typeof item.currency === "string" &&
    /^[A-Z]{3}$/.test(item.currency)
  );
}

function sameOperation(existing: OperationRecord, input: OperationInput): boolean {
  return (
    existing.operation_type === input.operationType &&
    existing.amount_minor === input.amountMinor &&
    existing.currency === input.currency
  );
}

export class LedgerDurableObject extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // The database belongs to this Durable Object and survives instance eviction/restart.
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS operations (
        idempotency_key TEXT PRIMARY KEY,
        operation_type TEXT NOT NULL,
        amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
        currency TEXT NOT NULL CHECK (length(currency) = 3),
        status TEXT NOT NULL CHECK (status = 'recorded'),
        mode TEXT NOT NULL CHECK (mode = 'test'),
        created_at TEXT NOT NULL
      )
    `);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/operations") {
      let input: unknown;
      try {
        input = await request.json();
      } catch {
        return json({ error: "invalid_json" }, 400);
      }

      if (!validOperation(input)) return json({ error: "invalid_operation" }, 400);

      // No await occurs between the read and insert, so a single object serializes
      // the idempotency decision before another request can interleave.
      const existing = this.ctx.storage.sql
        .exec<OperationRecord>(
          "SELECT idempotency_key, operation_type, amount_minor, currency, status, mode, created_at FROM operations WHERE idempotency_key = ?",
          input.idempotencyKey,
        )
        .toArray()[0];

      if (existing) {
        if (!sameOperation(existing, input)) {
          return json({ error: "idempotency_conflict", message: "This key was already used for a different operation." }, 409);
        }
        return json({ operation: existing, duplicate: true }, 200);
      }

      const record: OperationRecord = {
        idempotency_key: input.idempotencyKey,
        operation_type: input.operationType,
        amount_minor: input.amountMinor,
        currency: input.currency,
        status: "recorded",
        mode: "test",
        created_at: new Date().toISOString(),
      };

      this.ctx.storage.sql.exec(
        "INSERT INTO operations (idempotency_key, operation_type, amount_minor, currency, status, mode, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        record.idempotency_key,
        record.operation_type,
        record.amount_minor,
        record.currency,
        record.status,
        record.mode,
        record.created_at,
      );

      return json({ operation: record, duplicate: false }, 201);
    }

    if (request.method === "GET" && url.pathname === "/operations") {
      const rows = this.ctx.storage.sql
        .exec<OperationRecord>(
          "SELECT idempotency_key, operation_type, amount_minor, currency, status, mode, created_at FROM operations ORDER BY created_at DESC LIMIT 100",
        )
        .toArray();
      return json({ operations: rows, mode: "test" });
    }

    if (request.method === "GET" && url.pathname.startsWith("/operations/")) {
      const key = decodeURIComponent(url.pathname.slice("/operations/".length));
      const record = this.ctx.storage.sql
        .exec<OperationRecord>(
          "SELECT idempotency_key, operation_type, amount_minor, currency, status, mode, created_at FROM operations WHERE idempotency_key = ?",
          key,
        )
        .toArray()[0];

      return record ? json({ operation: record }) : json({ error: "not_found" }, 404);
    }

    if (request.method === "GET" && url.pathname === "/summary") {
      const rows = this.ctx.storage.sql
        .exec<{ operation_type: string; count: number }>(
          "SELECT operation_type, COUNT(*) AS count FROM operations GROUP BY operation_type ORDER BY operation_type",
        )
        .toArray();
      const total = this.ctx.storage.sql.exec<{ count: number }>("SELECT COUNT(*) AS count FROM operations").toArray()[0]?.count ?? 0;
      return json({ totalOperations: total, byType: rows, mode: "test" });
    }

    return json({ error: "not_found" }, 404);
  }
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return json({ status: "ok", service: "invest-broker-api", mode: "test" });
    }

    if (!url.pathname.startsWith("/api/v1/")) return json({ error: "not_found" }, 404);
    if (!env.API_TOKEN) return json({ error: "service_not_configured" }, 503);

    const authorization = request.headers.get("authorization") ?? "";
    if (authorization !== `Bearer ${env.API_TOKEN}`) {
      return json({ error: "unauthorized" }, 401);
    }

    if (request.method === "POST" && url.pathname === "/api/v1/operations") {
      let input: unknown;
      try {
        input = await request.clone().json();
      } catch {
        return json({ error: "invalid_json" }, 400);
      }
      if (!input || typeof input !== "object" || !validAccountId((input as Partial<OperationInput>).accountId)) {
        return json({ error: "invalid_account_id" }, 400);
      }
      const accountId = (input as OperationInput).accountId;
      const stub = env.LEDGER.getByName(accountId);
      return stub.fetch(new Request("https://ledger.internal/operations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      }));
    }

    if ((request.method === "GET" && url.pathname === "/api/v1/operations") ||
        (request.method === "GET" && url.pathname === "/api/v1/summary")) {
      const accountId = url.searchParams.get("accountId");
      if (!validAccountId(accountId)) return json({ error: "invalid_account_id" }, 400);
      const stub = env.LEDGER.getByName(accountId);
      const targetPath = url.pathname.endsWith("/summary") ? "/summary" : "/operations";
      return stub.fetch(new Request(`https://ledger.internal${targetPath}`));
    }

    const operationMatch = url.pathname.match(/^\/api\/v1\/operations\/([^/]+)$/);
    if (request.method === "GET" && operationMatch) {
      const accountId = url.searchParams.get("accountId");
      if (!validAccountId(accountId)) return json({ error: "invalid_account_id" }, 400);
      const stub = env.LEDGER.getByName(accountId);
      return stub.fetch(new Request(`https://ledger.internal/operations/${encodeURIComponent(operationMatch[1])}`));
    }

    return json({ error: "not_found" }, 404);
  },
};

export default worker;
