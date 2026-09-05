-- ============================================================
-- NO REFUND AFTER HANDOVER — 2026-09-06
-- ============================================================
-- Art.isticcore's responsibility ends when the parcel is handed to
-- the delivery agent. There is no refund stage: handed_over is now the
-- terminal state. cancelled remains the off-board exception allowed
-- before handover. 'refunded' is kept in the enum purely as legacy
-- display for any pre-existing rows; nothing can move TO it anymore.
--
-- Idempotent: safe to run multiple times (CREATE OR REPLACE).
-- ============================================================

create or replace function public.enforce_order_status_transition()
returns trigger language plpgsql as $$
declare allowed text[];
begin
  if old.status is distinct from new.status then
    case old.status::text
      when 'confirmed'          then allowed := array['preparing','cancelled'];
      when 'preparing'          then allowed := array['ready_for_dispatch','cancelled'];
      when 'ready_for_dispatch' then allowed := array['handed_over','cancelled'];
      when 'handed_over'        then allowed := array[]::text[];
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