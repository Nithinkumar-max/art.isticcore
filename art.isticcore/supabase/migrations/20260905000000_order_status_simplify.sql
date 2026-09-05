-- ============================================================
-- SIMPLIFIED ORDER WORKFLOW — 2026-09-05
-- Art.isticcore responsibility ends when the parcel is handed to
-- the delivery agent. Customer-facing pipeline collapses to:
--
--   confirmed -> preparing -> ready_for_dispatch -> handed_over
--
-- cancelled / refunded remain terminal off-board states.
-- No manual "delivered" step: final delivery is India Post's job.
-- ============================================================

-- 1) Rebuild order_status enum as the 4-stage pipeline (+ terminals).
--    Postgres cannot drop enum values, so we create the new type,
--    cast existing rows through a legacy-label map, swap types.
do $$
declare
  has_legacy boolean;
begin
  -- Only rebuild when the enum still contains any legacy label. Idempotent:
  -- once simplified, this block is a no-op.
  select exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'order_status'
      and e.enumlabel in (
        'PLACED', 'PAYMENT_PENDING', 'CONFIRMED', 'IN_PRODUCTION',
        'QUALITY_CHECK', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED',
        'CANCELLED', 'REFUNDED',
        'pending', 'confirmed', 'processing', 'ready_to_ship', 'shipped',
        'out_for_delivery',
        'pending_review', 'accepted', 'in_progress', 'finishing',
        'quality_check', 'ready_for_delivery'
      )
  ) into has_legacy;

  if has_legacy then
    create type public.order_status_simplified as enum (
      'confirmed', 'preparing', 'ready_for_dispatch', 'handed_over',
      'cancelled', 'refunded'
    );

    alter table public.orders
      alter column status drop default,
      alter column status type public.order_status_simplified using (
        case status::text
          -- Live app enum family (pending_review/accepted/...)
          when 'pending_review'   then 'confirmed'::public.order_status_simplified
          when 'accepted'         then 'confirmed'::public.order_status_simplified
          when 'in_progress'      then 'preparing'::public.order_status_simplified
          when 'finishing'        then 'preparing'::public.order_status_simplified
          when 'quality_check'    then 'preparing'::public.order_status_simplified
          when 'ready_for_delivery' then 'ready_for_dispatch'::public.order_status_simplified
          when 'delivered'        then 'handed_over'::public.order_status_simplified
          -- schema.sql / apply_all.sql family (pending/confirmed/processing)
          when 'pending'          then 'confirmed'::public.order_status_simplified
          when 'confirmed'        then 'confirmed'::public.order_status_simplified
          when 'processing'       then 'preparing'::public.order_status_simplified
          when 'ready_to_ship'    then 'ready_for_dispatch'::public.order_status_simplified
          when 'shipped'          then 'handed_over'::public.order_status_simplified
          when 'out_for_delivery' then 'handed_over'::public.order_status_simplified
          -- Init migration family (PLACED/CONFIRMED/...)
          when 'PLACED'           then 'confirmed'::public.order_status_simplified
          when 'PAYMENT_PENDING'  then 'confirmed'::public.order_status_simplified
          when 'CONFIRMED'        then 'confirmed'::public.order_status_simplified
          when 'IN_PRODUCTION'    then 'preparing'::public.order_status_simplified
          when 'QUALITY_CHECK'    then 'preparing'::public.order_status_simplified
          when 'PACKED'           then 'ready_for_dispatch'::public.order_status_simplified
          when 'SHIPPED'          then 'handed_over'::public.order_status_simplified
          when 'OUT_FOR_DELIVERY' then 'handed_over'::public.order_status_simplified
          when 'DELIVERED'        then 'handed_over'::public.order_status_simplified
          when 'CANCELLED'        then 'cancelled'::public.order_status_simplified
          when 'REFUNDED'         then 'refunded'::public.order_status_simplified
          else 'confirmed'::public.order_status_simplified
        end
      );

    drop type public.order_status;
    alter type public.order_status_simplified rename to order_status;

    alter table public.orders
      alter column status set default 'confirmed'::public.order_status;
  end if;
end; $$;

-- 2) Strict state-machine enforcement — updated transitions.
create or replace function public.enforce_order_status_transition()
returns trigger language plpgsql as $$
declare allowed text[];
begin
  if old.status is distinct from new.status then
    case old.status::text
      when 'confirmed'          then allowed := array['preparing','cancelled','refunded'];
      when 'preparing'          then allowed := array['ready_for_dispatch','cancelled','refunded'];
      when 'ready_for_dispatch' then allowed := array['handed_over','cancelled','refunded'];
      when 'handed_over'        then allowed := array['refunded'];
      when 'cancelled'          then allowed := array[]::text[];
      when 'refunded'           then allowed := array[]::text[];
      else allowed := array[]::text[];
    end case;
    if not (new.status::text = any(allowed)) then
      raise exception 'Invalid order status transition % -> % . Allowed: %', old.status, new.status, array_to_string(allowed, ', ');
    end if;
  end if;
  return new;
end; $$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname='enforce_order_status_transition') then
    create trigger enforce_order_status_transition
      before update on public.orders
      for each row when (old.status is distinct from new.status)
      execute function public.enforce_order_status_transition();
  end if;
end; $$;