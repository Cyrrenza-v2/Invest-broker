-- Production financial safety gate: closed by default.
-- This migration deliberately blocks money-moving states until an owner
-- independently verifies transaction workflows, ledger reconciliation,
-- provider custody/settlement, and audit evidence.

ALTER TABLE public.platform_control
  ADD COLUMN IF NOT EXISTS financial_operations_enabled boolean NOT NULL DEFAULT false;

UPDATE public.platform_control
SET financial_operations_enabled = false,
    updated_at = now()
WHERE singleton = true;

CREATE OR REPLACE FUNCTION ib_internal.enforce_financial_safety_gate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, ib_internal
AS $$
DECLARE
  gate_open boolean := false;
  new_row jsonb;
  old_row jsonb;
  field record;
BEGIN
  SELECT pc.financial_operations_enabled
    INTO gate_open
  FROM public.platform_control AS pc
  WHERE pc.singleton = true;

  gate_open := COALESCE(gate_open, false);

  IF gate_open THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Financial safety gate is closed: financial records cannot be deleted'
      USING ERRCODE = '55000';
  END IF;

  new_row := to_jsonb(NEW);
  IF TG_OP = 'UPDATE' THEN
    old_row := to_jsonb(OLD);
  END IF;

  IF TG_TABLE_NAME = 'ledger_transactions'
     AND lower(COALESCE(new_row->>'status', '')) IN
       ('posted','settled','completed','released','paid','credited','finalized') THEN
    RAISE EXCEPTION 'Financial safety gate is closed: ledger posting is disabled'
      USING ERRCODE = '55000';
  END IF;

  IF TG_TABLE_NAME = 'ledger_entries'
     AND (
       lower(COALESCE(new_row->>'status', '')) IN
         ('posted','settled','completed','released','paid','credited','finalized')
       OR NULLIF(new_row->>'posted_at', '') IS NOT NULL
     ) THEN
    RAISE EXCEPTION 'Financial safety gate is closed: posted ledger entries are disabled'
      USING ERRCODE = '55000';
  END IF;

  IF TG_TABLE_NAME = 'deposits'
     AND lower(COALESCE(new_row->>'status', '')) IN
       ('approved','processing','confirmed','completed','settled','released','paid','credited') THEN
    RAISE EXCEPTION 'Financial safety gate is closed: deposit confirmation/settlement is disabled'
      USING ERRCODE = '55000';
  END IF;

  IF TG_TABLE_NAME = 'withdrawals'
     AND lower(COALESCE(new_row->>'status', '')) IN
       ('approved','processing','confirmed','completed','settled','released','paid','sent') THEN
    RAISE EXCEPTION 'Financial safety gate is closed: withdrawal approval/release is disabled'
      USING ERRCODE = '55000';
  END IF;

  IF TG_TABLE_NAME = 'payment_intents'
     AND (
       lower(COALESCE(new_row->>'status', '')) IN
         ('processing','confirmed','completed','settled','released','paid','credited')
       OR lower(COALESCE(new_row->>'provider_verified', 'false')) = 'true'
       OR NULLIF(new_row->>'credited_at', '') IS NOT NULL
     ) THEN
    RAISE EXCEPTION 'Financial safety gate is closed: provider verification and wallet credit are disabled'
      USING ERRCODE = '55000';
  END IF;

  IF TG_TABLE_NAME = 'wallets' THEN
    IF TG_OP = 'INSERT' THEN
      FOR field IN SELECT key, value FROM jsonb_each(new_row)
        WHERE key ~* '(balance|available|reserved|locked|equity)'
      LOOP
        IF NULLIF(trim(both '"' from field.value::text), '') IS NOT NULL
           AND trim(both '"' from field.value::text) NOT IN ('0','0.0','0.00','false','null') THEN
          RAISE EXCEPTION 'Financial safety gate is closed: non-zero wallet balances cannot be created'
            USING ERRCODE = '55000';
        END IF;
      END LOOP;
    ELSE
      FOR field IN SELECT key FROM jsonb_each(old_row)
        WHERE key ~* '(balance|available|reserved|locked|equity)'
      LOOP
        IF (old_row -> field.key) IS DISTINCT FROM (new_row -> field.key) THEN
          RAISE EXCEPTION 'Financial safety gate is closed: wallet balance changes are disabled'
            USING ERRCODE = '55000';
        END IF;
      END LOOP;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION ib_internal.enforce_financial_safety_gate() FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS financial_safety_gate_deposits ON public.deposits;
CREATE TRIGGER financial_safety_gate_deposits
  BEFORE INSERT OR UPDATE OR DELETE ON public.deposits
  FOR EACH ROW EXECUTE FUNCTION ib_internal.enforce_financial_safety_gate();

DROP TRIGGER IF EXISTS financial_safety_gate_withdrawals ON public.withdrawals;
CREATE TRIGGER financial_safety_gate_withdrawals
  BEFORE INSERT OR UPDATE OR DELETE ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION ib_internal.enforce_financial_safety_gate();

DROP TRIGGER IF EXISTS financial_safety_gate_payment_intents ON public.payment_intents;
CREATE TRIGGER financial_safety_gate_payment_intents
  BEFORE INSERT OR UPDATE OR DELETE ON public.payment_intents
  FOR EACH ROW EXECUTE FUNCTION ib_internal.enforce_financial_safety_gate();

DROP TRIGGER IF EXISTS financial_safety_gate_ledger_transactions ON public.ledger_transactions;
CREATE TRIGGER financial_safety_gate_ledger_transactions
  BEFORE INSERT OR UPDATE OR DELETE ON public.ledger_transactions
  FOR EACH ROW EXECUTE FUNCTION ib_internal.enforce_financial_safety_gate();

DROP TRIGGER IF EXISTS financial_safety_gate_ledger_entries ON public.ledger_entries;
CREATE TRIGGER financial_safety_gate_ledger_entries
  BEFORE INSERT OR UPDATE OR DELETE ON public.ledger_entries
  FOR EACH ROW EXECUTE FUNCTION ib_internal.enforce_financial_safety_gate();

DROP TRIGGER IF EXISTS financial_safety_gate_wallets ON public.wallets;
CREATE TRIGGER financial_safety_gate_wallets
  BEFORE INSERT OR UPDATE OR DELETE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION ib_internal.enforce_financial_safety_gate();

-- Even the service-role API cannot invoke the posting RPC while the safety
-- gate is closed. Re-enabling requires a privileged database-owner action.
REVOKE EXECUTE ON FUNCTION public.post_ledger_transaction(uuid)
  FROM PUBLIC, anon, authenticated, service_role;

REVOKE UPDATE (financial_operations_enabled)
  ON public.platform_control
  FROM PUBLIC, anon, authenticated, service_role;
