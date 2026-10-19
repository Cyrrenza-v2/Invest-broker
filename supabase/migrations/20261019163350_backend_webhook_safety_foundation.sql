-- Server-only, idempotent inbox for verified payment-provider webhook processing.
-- Store only a payload digest; this table does not authorize ledger postings.
CREATE TABLE IF NOT EXISTS public.provider_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (length(btrim(provider)) BETWEEN 1 AND 80),
  provider_event_id text NOT NULL CHECK (length(btrim(provider_event_id)) BETWEEN 1 AND 200),
  event_type text NOT NULL CHECK (length(btrim(event_type)) BETWEEN 1 AND 160),
  payload_sha256 text NOT NULL CHECK (payload_sha256 ~ '^[a-fA-F0-9]{64}$'),
  status text NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'processing', 'processed', 'ignored', 'failed')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  last_error_code text,
  last_error_at timestamptz,
  CONSTRAINT provider_webhook_events_provider_event_id_key UNIQUE (provider, provider_event_id)
);

CREATE INDEX IF NOT EXISTS provider_webhook_events_status_received_idx
  ON public.provider_webhook_events (status, received_at);
CREATE INDEX IF NOT EXISTS provider_webhook_events_provider_received_idx
  ON public.provider_webhook_events (provider, received_at);

ALTER TABLE public.provider_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_webhook_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS provider_webhook_events_deny_client_access ON public.provider_webhook_events;
CREATE POLICY provider_webhook_events_deny_client_access
  ON public.provider_webhook_events
  FOR ALL TO anon, authenticated
  USING (false)
  WITH CHECK (false);

REVOKE ALL ON TABLE public.provider_webhook_events FROM anon, authenticated;
GRANT ALL ON TABLE public.provider_webhook_events TO service_role;

COMMENT ON TABLE public.provider_webhook_events IS
  'Server-only webhook idempotency inbox. Store payload digests, not raw provider payloads. This table does not itself authorize ledger postings or move funds.';
