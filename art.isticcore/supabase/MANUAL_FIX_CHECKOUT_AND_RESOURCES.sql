-- ============================================================
-- MANUAL FIX: Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- Fixes: 1) order_status enum mismatch "pending" vs "PLACED"
--        2) Disables heavy keepalive cron jobs if not on free-tier
--        3) Verifies Realtime is enabled for orders
--        4) Checks for missing status_history + triggers
-- ============================================================

-- ── 1) Diagnose current enum ──────────────────────────────────
select enumlabel, enumsortorder from pg_enum where enumtypid = 'order_status'::regtype order by enumsortorder;
-- If you see UPPERCASE (PLACED, PAYMENT_PENDING, CONFIRMED...), you need the migration below.
-- If you see lowercase (pending, confirmed...), skip to section 3.

-- ── 2) Migrate enum from UPPERCASE -> lowercase pipeline ───────
-- This is the same logic as 20260826000000_state_machine_realtime_admin.sql
-- Safe to run even if already migrated (checks for old label PLACED).
do $$
begin
  if exists (select 1 from pg_enum where enumlabel = 'PLACED' and enumtypid = 'order_status'::regtype) then
    create type order_status_new as enum ('pending','confirmed','processing','ready_to_ship','shipped','out_for_delivery','delivered','cancelled','refunded');
    alter table public.orders alter column status type order_status_new using (
      case status::text
        when 'PLACED' then 'pending'::order_status_new
        when 'PAYMENT_PENDING' then 'pending'::order_status_new
        when 'CONFIRMED' then 'confirmed'::order_status_new
        when 'IN_PRODUCTION' then 'processing'::order_status_new
        when 'QUALITY_CHECK' then 'ready_to_ship'::order_status_new
        when 'PACKED' then 'ready_to_ship'::order_status_new
        when 'SHIPPED' then 'shipped'::order_status_new
        when 'OUT_FOR_DELIVERY' then 'out_for_delivery'::order_status_new
        when 'DELIVERED' then 'delivered'::order_status_new
        when 'CANCELLED' then 'cancelled'::order_status_new
        when 'REFUNDED' then 'refunded'::order_status_new
        else 'pending'::order_status_new
      end
    );
    drop type order_status;
    alter type order_status_new rename to order_status;
    raise notice 'Enum migrated to lowercase pipeline';
  else
    raise notice 'Enum already lowercase — skipping';
  end if;
end; $$;

-- Verify
select enumlabel from pg_enum where enumtypid = 'order_status'::regtype order by enumsortorder;

-- ── 3) Ensure status_history column + triggers exist ──────────
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='status_history') then
    alter table public.orders add column status_history jsonb default '[]'::jsonb;
  end if;
end; $$;

create or replace function public.log_order_status_change()
returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and old.status is distinct from new.status then
    new.status_history := coalesce(old.status_history, '[]'::jsonb) || jsonb_build_object('previous_status', old.status, 'new_status', new.status, 'changed_at', now(), 'changed_by', current_user);
  end if;
  return new;
end; $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname='order_status_change_audit') then
    create trigger order_status_change_audit before update on public.orders for each row when (old.status is distinct from new.status) execute function public.log_order_status_change();
  end if;
end; $$;

create or replace function public.enforce_order_status_transition()
returns trigger language plpgsql as $$
declare allowed text[];
begin
  if old.status is distinct from new.status then
    case old.status::text
      when 'pending' then allowed := array['confirmed','cancelled','refunded'];
      when 'confirmed' then allowed := array['processing','cancelled','refunded'];
      when 'processing' then allowed := array['ready_to_ship','cancelled','refunded'];
      when 'ready_to_ship' then allowed := array['shipped','cancelled','refunded'];
      when 'shipped' then allowed := array['out_for_delivery','cancelled'];
      when 'out_for_delivery' then allowed := array['delivered','cancelled'];
      else allowed := array[]::text[];
    end case;
    if not (new.status::text = any(allowed)) then
      raise exception 'Invalid transition % -> % Allowed: %', old.status, new.status, array_to_string(allowed, ', ');
    end if;
  end if;
  return new;
end; $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname='enforce_order_status_transition') then
    create trigger enforce_order_status_transition before update on public.orders for each row when (old.status is distinct from new.status) execute function public.enforce_order_status_transition();
  end if;
end; $$;

-- ── 4) Enable Realtime for orders (required for admin/user live sync) ──
do $$ begin
  begin alter publication supabase_realtime add table public.orders; exception when duplicate_object then null; end;
end; $$;

-- ── 5) RESOURCE CLEANUP — keepalive cron jobs ─────────────────
-- These 3 jobs run daily at 00:20/08:20/16:20 UTC and do count(*) on products/orders.
-- On paid Supabase plans they are unnecessary and waste compute. On free-tier they prevent 7-day pause.
-- To keep them: comment out the unschedule lines below.
-- To disable (recommended for paid plan / if you see "programs running at full resources"):
select cron.unschedule('artisticcore-keepalive-1') where exists (select 1 from cron.job where jobname='artisticcore-keepalive-1');
select cron.unschedule('artisticcore-keepalive-2') where exists (select 1 from cron.job where jobname='artisticcore-keepalive-2');
select cron.unschedule('artisticcore-keepalive-3') where exists (select 1 from cron.job where jobname='artisticcore-keepalive-3');

-- Optionally disable the function from being called by anon/authenticated (already revoked), and truncate log:
-- truncate private.keepalive_log;
-- If you want to re-enable later, re-run supabase/migrations/20260824000003_keepalive.sql

-- ── 6) Quick health checks ─────────────────────────────────────
-- Check for long-running queries / heavy programs
select pid, now() - query_start as duration, state, query from pg_stat_activity where state != 'idle' and query not like '%pg_stat_activity%' order by duration desc limit 10;

-- Check existing cron jobs
select jobname, schedule, command from cron.job;

-- Check current orders enum and recent order that failed
select id, order_number, status, pg_typeof(status) from public.orders order by created_at desc limit 5;

-- If you still see 22P02 after migration, run this to see which insert is failing:
-- select * from pg_enum where enumtypid='order_status'::regtype;
