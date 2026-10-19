-- Restrict privileged reads to the single Admin CEO configured in platform_control.
-- Remove legacy manager-role policies and prevent direct service-role ledger mutation.
CREATE SCHEMA IF NOT EXISTS ib_internal AUTHORIZATION postgres;
REVOKE ALL ON SCHEMA ib_internal FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA ib_internal TO authenticated, service_role;

CREATE OR REPLACE FUNCTION ib_internal.is_primary_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.platform_control AS pc
    WHERE pc.singleton IS TRUE
      AND pc.primary_admin_user_id = (SELECT auth.uid())
  );
$function$;

REVOKE ALL ON FUNCTION ib_internal.is_primary_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION ib_internal.is_primary_admin() TO authenticated, service_role;

DROP POLICY IF EXISTS audit_logs_manager_read_only ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_admin_read_only ON public.audit_logs;
CREATE POLICY audit_logs_primary_admin_read_only
  ON public.audit_logs FOR SELECT TO authenticated
  USING (ib_internal.is_primary_admin());

DROP POLICY IF EXISTS compliance_cases_admin_only ON public.compliance_cases;
CREATE POLICY compliance_cases_primary_admin_only
  ON public.compliance_cases FOR ALL TO authenticated
  USING (ib_internal.is_primary_admin())
  WITH CHECK (ib_internal.is_primary_admin());

DROP POLICY IF EXISTS deposits_read_owner_or_admin ON public.deposits;
CREATE POLICY deposits_read_owner_or_primary_admin
  ON public.deposits FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR ib_internal.is_primary_admin());

DROP POLICY IF EXISTS plans_read_active_or_admin ON public.investment_plans;
CREATE POLICY plans_read_active_or_primary_admin
  ON public.investment_plans FOR SELECT TO authenticated
  USING (is_active OR ib_internal.is_primary_admin());

DROP POLICY IF EXISTS investments_read_owner_or_admin ON public.investments;
CREATE POLICY investments_read_owner_or_primary_admin
  ON public.investments FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR ib_internal.is_primary_admin());

DROP POLICY IF EXISTS ledger_accounts_read_owner_or_admin ON public.ledger_accounts;
CREATE POLICY ledger_accounts_read_owner_or_primary_admin
  ON public.ledger_accounts FOR SELECT TO authenticated
  USING (owner_user_id = (SELECT auth.uid()) OR ib_internal.is_primary_admin());

DROP POLICY IF EXISTS ledger_read_owner_or_admin ON public.ledger_entries;
CREATE POLICY ledger_entries_read_owner_or_primary_admin
  ON public.ledger_entries FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR ib_internal.is_primary_admin());

DROP POLICY IF EXISTS ledger_transactions_read_admin_or_owner ON public.ledger_transactions;
CREATE POLICY ledger_transactions_read_primary_admin_or_owner
  ON public.ledger_transactions FOR SELECT TO authenticated
  USING (
    ib_internal.is_primary_admin()
    OR EXISTS (
      SELECT 1 FROM public.ledger_entries AS le
      WHERE le.transaction_id = ledger_transactions.id
        AND le.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS profiles_read_self_or_admin ON public.profiles;
CREATE POLICY profiles_read_self_or_primary_admin
  ON public.profiles FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()) OR ib_internal.is_primary_admin());

DROP POLICY IF EXISTS support_messages_read_owner_or_admin ON public.support_messages;
CREATE POLICY support_messages_read_owner_or_primary_admin
  ON public.support_messages FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR ib_internal.is_primary_admin());

DROP POLICY IF EXISTS treasury_accounts_admin_only ON public.treasury_accounts;
CREATE POLICY treasury_accounts_primary_admin_only
  ON public.treasury_accounts FOR SELECT TO authenticated
  USING (ib_internal.is_primary_admin());

DROP POLICY IF EXISTS user_bank_accounts_read_owner_or_manager ON public.user_bank_accounts;
DROP POLICY IF EXISTS bank_accounts_read_owner_or_manager ON public.user_bank_accounts;
CREATE POLICY user_bank_accounts_read_owner_or_primary_admin
  ON public.user_bank_accounts FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR ib_internal.is_primary_admin());

DROP POLICY IF EXISTS complaints_read_owner_or_manager ON public.user_complaints;
CREATE POLICY complaints_read_owner_or_primary_admin
  ON public.user_complaints FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR ib_internal.is_primary_admin());

DROP POLICY IF EXISTS documents_read_owner_or_manager ON public.user_documents;
CREATE POLICY documents_read_owner_or_primary_admin
  ON public.user_documents FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR ib_internal.is_primary_admin());

DROP POLICY IF EXISTS notifications_read_owner_or_manager ON public.user_notifications;
CREATE POLICY notifications_read_owner_or_primary_admin
  ON public.user_notifications FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR ib_internal.is_primary_admin());

DROP POLICY IF EXISTS wallets_read_self_or_admin ON public.wallets;
CREATE POLICY wallets_read_self_or_primary_admin
  ON public.wallets FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR ib_internal.is_primary_admin());

DROP POLICY IF EXISTS withdrawals_read_owner_or_admin ON public.withdrawals;
CREATE POLICY withdrawals_read_owner_or_primary_admin
  ON public.withdrawals FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR ib_internal.is_primary_admin());

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.ledger_entries, public.ledger_transactions, public.ledger_accounts, public.audit_logs
  FROM anon, authenticated, service_role;

COMMENT ON FUNCTION ib_internal.is_primary_admin()
  IS 'True only when auth.uid() matches the single primary Admin CEO configured in public.platform_control.';
