# Knotella🎀 design classification

The supplied storefront and admin references represent two coordinated products, not one continuous page set.

## 1. Storefront customer journey

| Journey | Reference pair/state | Implemented route |
| --- | --- | --- |
| Home discovery | `home_desktop` + `home_mobile` | `/` |
| Collection browsing | `sunflower_collection_desktop` + `sunflower_collection_mobile` | `/collections/sunflower` |
| Product detail | `giant_sunflower_bouquet_desktop` + `giant_sunflower_bouquet_mobile` | `/products/[slug]` |
| Shopping cart | `shopping_cart_desktop` + `shopping_cart_mobile` | `/cart` |
| Empty cart | `empty_cart_state_mobile` | `/cart` when the cart is empty |
| Filter state | `filters_drawer_mobile` | Catalog filter drawer from `/shop` or a collection |
| Checkout address | `checkout_address_selection_desktop` + `checkout_address_selection_mobile` | `/checkout` |
| Checkout payment | `checkout_payment_desktop` + `checkout_payment_mobile` | `/checkout/payment` |
| Custom commissions | `custom_order_request_desktop` + `custom_order_request_mobile` | `/custom-order` |
| Phone login | `login_phone_entry_mobile` | `/login` step 1 |
| OTP verification | `login_otp_verification_mobile` | `/login` step 2 |
| Profile completion | `login_complete_profile_mobile` | `/login` step 3 |
| Account dashboard | `user_account_dashboard_desktop` + `user_account_dashboard_mobile` | `/account` |
| Order history | `my_orders_desktop` + `my_orders_mobile` | `/account/orders` and `/orders` |
| Order confirmation | `order_confirmation_desktop` + `order_confirmation_mobile` | `/order-confirmation` |
| Tracking input | `order_tracking_input_desktop` + `order_tracking_input_mobile` | `/track-order` |
| Tracking result | `order_tracking_results_desktop` + `order_tracking_results_mobile` | `/track-order?order=...` and `/orders/[id]` |

### Storefront shell rules

- Standard customer pages use the warm cream canvas, translucent navigation, centered **Knotella🎀** wordmark, product search, account, cart badge, footer, and mobile bottom navigation.
- Checkout uses the simplified secure-checkout header and no bottom navigation.
- Login uses the centered auth header and no footer/bottom navigation.
- Tracking keeps the standard header/footer but omits bottom navigation so the timeline remains readable.
- The desktop/mobile pairs are one responsive component per journey, not duplicated markup.

## 2. Admin management portal

| Area | References | Implemented route |
| --- | --- | --- |
| Dashboard | `admin_dashboard_desktop` | `/admin` and `/admin/dashboard` |
| Orders board | `admin_order_management_kanban_desktop` + `admin_refined_order_management_desktop` | `/admin/orders` and `/admin/orders/workflow` |
| Product list | `admin_product_list_desktop` | `/admin/products` |
| Add product/basic info | `admin_add_product_form_desktop` | `/admin/products/new` |
| Product media | `admin_product_media_desktop` | `/admin/products/media` or `/admin/products/[id]/media` |
| Product pricing | `admin_product_pricing_desktop` | `/admin/products/pricing` or `/admin/products/[id]/pricing` |
| Product variants | `admin_product_variants_desktop` | `/admin/products/variants` or `/admin/products/[id]/variants` |
| Product SEO | `admin_product_seo_updated` | `/admin/products/seo` or `/admin/products/[id]/seo` |
| Product inventory | `admin_product_inventory_desktop` | `/admin/products/inventory` or `/admin/products/[id]/inventory` |
| Customers/pincodes | `admin_customer_pincode_management_desktop` | `/admin/customers` and `/admin/customers/pincodes` |

### Admin shell rules

- Admin pages use a dark fixed sidebar, sticky top bar, light dense workspace, active pink navigation, and no storefront footer/header.
- The sidebar becomes an accessible off-canvas menu below the desktop breakpoint.
- The refined order board is the source of truth for the two order-management iterations; the older kanban is represented as the alternate board/list view rather than a duplicated implementation.
- Product editor sections share one tab shell and preserve the visual hierarchy from the individual media, pricing, variants, SEO, and inventory references.
- The board uses explicit status actions and a detail drawer. True drag-and-drop is intentionally not faked; a supported DnD library can be added later if the workflow requires pointer/keyboard reordering.

## 3. Responsive contract

- Mobile: compact header, two-column product grids, stacked forms and summaries, horizontal chips/tabs/tables, bottom navigation where appropriate.
- Tablet: 2–3 column content grids, stacked editor sidebars, scroll-safe tables and order board.
- Desktop: 1280px centered storefront track, 240–256px admin sidebar, two-column detail/checkout layouts, sticky summaries and galleries.
- Shared tokens live in [`art.isticcore/app/globals.css`](./art.isticcore/app/globals.css); mock/API contracts live in [`art.isticcore/lib/mock-data.ts`](./art.isticcore/lib/mock-data.ts).
