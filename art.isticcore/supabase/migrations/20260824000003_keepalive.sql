-- ============================================================================
-- MIGRATION 4: Database keepalive (prevents free-tier 7-day inactivity pause)
-- ============================================================================
-- Schedules 3 lightweight jobs per day via pg_cron. Each job performs real
-- database work, which counts as activity for Supabase free-tier projects.
-- ============================================================================

create extension if not exists pg_cron;

create schema if not exists private;

create table if not exists private.keepalive_log (
  id         bigint generated always as identity primary key,
  ran_at     timestamptz not null default now()
);

-- Heartbeat: log a row, refresh a stats snapshot, prune old log rows.
create or replace function public.db_keepalive()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into private.keepalive_log default values;

  -- Touch real tables so planner/stats stay warm and rows are read.
  perform count(*) from public.products;
  perform count(*) from public.orders;

  -- Keep the log table tiny.
  delete from private.keepalive_log where ran_at < now() - interval '7 days';
end;
$$;

revoke all on function public.db_keepalive() from anon, authenticated;

-- Drop + recreate so re-running this file never duplicates schedules.
select cron.unschedule('artisticcore-keepalive-1')
where exists (select 1 from cron.job where jobname = 'artisticcore-keepalive-1');
select cron.unschedule('artisticcore-keepalive-2')
where exists (select 1 from cron.job where jobname = 'artisticcore-keepalive-2');
select cron.unschedule('artisticcore-keepalive-3')
where exists (select 1 from cron.job where jobname = 'artisticcore-keepalive-3');

-- 3x daily at 00:20 / 08:20 / 16:20 UTC
select cron.schedule('artisticcore-keepalive-1', '20 0 * * *', $$select public.db_keepalive();$$);
select cron.schedule('artisticcore-keepalive-2', '20 8 * * *', $$select public.db_keepalive();$$);
select cron.schedule('artisticcore-keepalive-3', '20 16 * * *', $$select public.db_keepalive();$$);
