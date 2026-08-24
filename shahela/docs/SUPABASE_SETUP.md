# Art.isticcore — Supabase Backend Setup Guide (Phase 1)

## 1. Run the database migrations

Option A — Dashboard:
1. Open your project → **SQL Editor** → New query.
2. Paste and run, in order:
   1. `supabase/migrations/20260824000000_init.sql`
   2. `supabase/migrations/20260824000001_storage.sql`
   3. `supabase/seed.sql`

Option B — CLI:
```bash
supabase link --project-ref <ref>
supabase db push          # applies both migration files in order
supabase db execute -f supabase/seed.sql   # seed is NOT part of push
```

Verify: Table Editor shows 21 tables; `payments`, `custom_design_requests`,
`pincode_waitlist` all show "RLS enabled". Storage shows 3 buckets.

## 2. Authentication (Dashboard → Authentication)

| Setting | Value |
|---|---|
| Email provider | Enabled, **Confirm email = ON** |
| Password policy | Min length 8, require number + symbol |
| Access token TTL | 3600 s (1 h) |
| Refresh token rotation | ON (default) |
| Google OAuth | Enable → paste Client ID/Secret from Google Cloud Console; redirect URL shown on the same page |
| Site URL | `http://localhost:3000` (dev) / production domain |

Roles are **never** taken from signup metadata: `handle_new_user()`
always inserts `CUSTOMER`. Promote staff with SQL (service role /
SQL editor only):

```sql
update public.users set role = 'ADMIN' where email = 'you@artisticcore.in';
```

Client-side role checks read `public.users.role` via RLS-protected
selects (`current_role()` helper exists for policies). Middleware/API
must verify against the DB, not `user_metadata`.

## 3. Storage & image transformation

Buckets, 5 MB / 10 MB limits, and MIME allow-lists are created by
migration 2. For on-the-fly resizing (thumb 400 / medium 800 / large
1200, WebP, q80):

1. Dashboard → Storage → **Settings** → enable *Image Transformations*.
2. Request variants via
   `/storage/v1/render/image/public/product-images/<path>?width=400&quality=80&format=webp`.
3. Upload layout: `product-images/products/{productId}/{size}.webp`.

## 4. Razorpay webhooks

Dashboard → Settings → Webhooks:
- URL: `https://<your-domain>/api/webhooks/razorpay`
- Events: `payment.captured`, `payment.failed`, `order.paid`, `refund.processed`
- Copy the generated secret into `RAZORPAY_WEBHOOK_SECRET`.

## 5. Environment

Copy `.env.example` → `.env.local` and fill values. Note the two
Razorpay key vars: `RAZORPAY_KEY_ID` (server SDK) and
`NEXT_PUBLIC_RAZORPAY_KEY_ID` (client Checkout.js) — both required.

## Deliberate deviations from the original spec

| Spec said | Implemented | Why |
|---|---|---|
| Vite + vanilla JS frontend (Phase 3.1) | Existing Next.js 15 App Router app kept; API routes act as the Node backend | Audited service layer (Supabase/Razorpay/cart/orders) already works; a rewrite would discard tested payment plumbing |
| `price_cents` integers | `numeric(10,2)` INR rupees | Matches entire existing codebase + audit found no float issue |
| `public.profiles` | `public.users` | Existing services reference it; renaming = churn with no benefit |
| Edge Functions backend | Next.js Route Handlers | Same "zero infra" benefit without Deno split-brain; secrets stay server-side |
| `payment_method` incl. UPI/CASHFREE | Enum narrowed to `RAZORPAY` \| `COD` | Razorpay Checkout itself aggregates UPI/cards/netbanking/wallets |
| Guest carts via anon-writable rows | Guest carts only through server API (service role), RLS owner-only | Closes world-writable guest cart hole from audit |
