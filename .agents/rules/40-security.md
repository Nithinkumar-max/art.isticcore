---
description: Application Security, Auth, Validation, and Secrets Protection
globs: ["art.isticcore/middleware.ts", "art.isticcore/lib/validations.ts", "art.isticcore/lib/razorpay.ts", "art.isticcore/lib/supabase/**", "**/auth/**"]
alwaysApply: false
---

# Security Guidelines

1. **Authentication & OTP**:
   - Login & OTP verification are handled 100% natively by Supabase Auth (`supabase.auth.signInWithOtp` and `supabase.auth.verifyOtp`). No custom OTP generation or verification servers.
   - Enforce session verification in `art.isticcore/middleware.ts` and API route entry points.
   - Never trust client-supplied user IDs; retrieve user identity from verified Supabase session (`supabase.auth.getUser()`).
2. **Input Validation**:
   - Parse and validate all untrusted inputs using Zod before processing.
   - Sanitize rich text inputs to avoid XSS vulnerabilities.
3. **Secrets & Environment Variables**:
   - Never expose `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_SECRET`, `RESEND_API_KEY`, or `AWS_SECRET_ACCESS_KEY` in client bundles.
   - Access sensitive secrets only inside Server Components, Server Actions, or API Route handlers.
4. **Payment Integrity**:
   - Verify Razorpay signatures on webhook events and checkout callbacks before updating order status.
