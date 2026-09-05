-- ============================================================
-- SINGLE-SESSION TOKENS — 2026-09-05
-- Every sign-in mints an opaque session token mirrored by an
-- httpOnly cookie. Rows live ~60 minutes; a new login on any
-- device deletes the account's older rows first, so exactly one
-- browser is active per account at a time. Anything else is a
-- "superseded" session and is signed out on its next request.
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