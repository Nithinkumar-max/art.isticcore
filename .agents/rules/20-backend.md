---
description: Backend API Routes, Server Actions, Services, and External Integrations
globs: ["art.isticcore/app/api/**/*.{ts,js}", "art.isticcore/lib/**/*.{ts,js}", "server/**", "api/**"]
alwaysApply: false
---

# Backend & API Guidelines

1. **Route Handlers (`app/api/**/route.ts`)**:
   - Validate incoming request body and query params with Zod (`art.isticcore/lib/validations.ts`).
   - Use proper HTTP status codes (200, 201, 400, 401, 403, 404, 429, 500) and consistent JSON responses `{ success, data?, error? }`.
2. **Database & External Services**:
   - Reuse existing clients: Supabase SSR (`art.isticcore/lib/supabase/`), Redis (`art.isticcore/lib/redis.ts`), R2 (`art.isticcore/lib/r2.ts`), Razorpay (`art.isticcore/lib/razorpay.ts`), Resend (`art.isticcore/lib/email.ts`).
   - Never instantiate duplicate client singletons.
3. **Error Handling**:
   - Wrap external API calls in targeted try/catch blocks with meaningful error messages and logging.
   - Do not leak internal stack traces or database schema details to client API responses.
4. **Rate Limiting & Caching**:
   - Use Upstash Redis for sensitive endpoints (auth, checkout, contact forms) via established patterns.
