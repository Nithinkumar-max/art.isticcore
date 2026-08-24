# Project Architecture Map: Knotella🎀

## Core Tech Stack
- **Store Name**: Knotella🎀 (Artisanal Handcrafted Crochet Store)
- **Framework**: Next.js 16.3.2 (App Router), React 19.2.8, TypeScript 5
- **Styling**: Tailwind CSS v4 (`@tailwindcss/postcss`)
- **State Management**: Zustand (`art.isticcore/store/`), React Query (`@tanstack/react-query`)
- **Authentication**: 100% native Supabase Auth OTP (`supabase.auth.signInWithOtp` & `supabase.auth.verifyOtp` — Email/SMS OTP handled entirely by Supabase)
- **Backend / Database**: Supabase (`@supabase/supabase-js`, `@supabase/ssr`), PostgreSQL schemas (`art.isticcore/supabase/schema.sql`)
- **Cache / Rate Limit**: Upstash Redis (`@upstash/redis`, `art.isticcore/lib/redis.ts`)
- **Object Storage**: Cloudflare R2 / AWS S3 SDK (`@aws-sdk/client-s3`, `art.isticcore/lib/r2.ts`)
- **Payments**: Razorpay (`art.isticcore/lib/razorpay.ts`)
- **Email**: Resend (`art.isticcore/lib/email.ts`)
- **Validation**: Zod (`art.isticcore/lib/validations.ts`)

## Directory Layout
- `art.isticcore/app/` : Next.js App Router (pages, layout, `api/` routes)
- `art.isticcore/components/` : Modular UI components (`cart/`, `home/`, `layout/`, `providers/`)
- `art.isticcore/lib/` : Shared utilities, clients (Supabase, Redis, R2, Razorpay, Resend, hooks, services)
- `art.isticcore/store/` : Zustand client stores
- `art.isticcore/supabase/` : DB schemas, migrations, RLS policies
- `art.isticcore/types/` : Shared TypeScript interfaces and database types
- `pages UI/` : Reference UI design system assets

## Development Rules
1. **Targeted Reading**: Trace only the caller -> handler -> data source flow.
2. **Minimal Delta**: Reuse existing utilities in `art.isticcore/lib/` before adding code.
3. **No New Dependencies**: Native Web APIs or existing dependencies must be used first.
4. **Preserve Guards**: Never compromise RLS, Zod validation, error handling, or a11y.
