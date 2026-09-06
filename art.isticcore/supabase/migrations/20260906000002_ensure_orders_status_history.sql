-- ============================================================
-- REPAIR: orders.status_history column missing
-- ============================================================
-- Symptom: every status move on the admin board fails with
--
--   record "new" has no field "status_history"
--
-- Cause: the audit trigger log_order_status_change() writes to
-- NEW.status_history, but the live orders table has no such column
-- (schema drift — a manual CREATE TABLE or a dropped column on the
-- live DB). The canonical schema always declared it:
--
--   status_history jsonb default '[]'::jsonb   (schema.sql / apply_all.sql)
--
-- This migration restores the column exactly as declared, so the
-- existing trigger resumes working. Idempotent — safe to re-run.

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name = 'status_history'
  ) then
    alter table public.orders
      add column status_history jsonb default '[]'::jsonb;
  end if;
end $$;