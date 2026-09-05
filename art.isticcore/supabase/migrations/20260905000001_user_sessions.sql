-- ============================================================
-- UNUSED / DEPRECATED — custom session tokens (2026-09-05)
-- ============================================================
-- The custom per-browser session-token system was REMOVED on 2026-09-06 in
-- favour of Supabase's built-in cookie auth, which naturally supports
-- multiple tabs / browsers per account. The 1-hour absolute session timeout
-- is enforced by the `art_session_start` cookie (session-ttl.ts) in the proxy
-- middleware — no server-side lookup is needed.
--
-- This table is kept for reference only. Nothing reads or writes it anymore.
-- It is safe to drop:  DROP TABLE public.user_sessions;
-- ============================================================

create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  session_token text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists user_sessions_user_id_idx
  on public.user_sessions(user_id);

create index if not exists user_sessions_expires_at_idx
  on public.user_sessions(expires_at);