// Auto-generated types from the Supabase schema
// Re-run `npx supabase gen types typescript` after any schema changes

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type OrderStatus =
  | 'pending_review' | 'accepted' | 'in_progress' | 'finishing'
  | 'quality_check' | 'ready_for_delivery' | 'delivered'
  | 'cancelled' | 'refunded'

export type PaymentMethod = 'razorpay' | 'cod'

export type PaymentStatus =
  | 'pending' | 'paid' | 'failed' | 'refunded'
  | 'partially_refunded' | 'cod_pending' | 'cod_collected'

export type UserRole = 'CUSTOMER' | 'ADMIN' | 'SUPER_ADMIN'

export type CategorySection = 'trending' | 'shop_by_category' | 'weekly' | 'bestsellers'

export type ComplexityTier = 'simple' | 'standard' | 'complex' | 'masterwork'

// ─── Row types ────────────────────────────────────────────────────────────────

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  image_url: string | null
  display_order: number
  section: CategorySection
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ProductImage {
  id: string
  product_id: string
  url: string
  alt_text: string | null
  display_order: number
  is_primary: boolean
  created_at: string
}

export interface ProductVariant {
  id: string
  product_id: string
  name: string
  price: number
  discount_price: number | null
  lead_time_days: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  name: string
  slug: string
  description: string
  short_description: string | null
  base_price: number
  discount_price: number | null
  is_available: boolean
  is_active: boolean
  is_featured: boolean
  is_bestseller: boolean
  lead_time_days: number
  estimated_creation_days: number
  complexity_tier: ComplexityTier
  customization_allowed: boolean
  category_id: string
  rating_avg: number
  rating_count: number
  seo_title: string | null
  seo_description: string | null
  created_at: string
  updated_at: string
}

export interface ProductWithRelations extends Product {
  images: ProductImage[]
  variants: ProductVariant[]
  category: Category
}

export interface Address {
  id: string
  user_id: string
  full_name: string
  phone: string
  line1: string
  line2: string | null
  city: string
  state: string
  pincode: string
  landmark: string | null
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface CartItem {
  id: string
  cart_id: string
  product_id: string
  quantity: number
  custom_note: string | null
  created_at: string
  updated_at: string
  product?: ProductWithRelations
}

export interface Order {
  id: string
  order_number: string
  user_id: string
  address_id: string
  status: OrderStatus
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  subtotal: number
  discount: number
  shipping_fee: number
  total: number
  estimated_completion_date: string | null
  tracking_number: string | null
  tracking_url: string | null
  courier_name: string | null
  shipped_date: string | null
  delivered_date: string | null
  cod_collected: boolean
  customer_note: string | null
  admin_note: string | null
  is_custom_commission: boolean
  customization_details: Json | null
  status_history: Json | null
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  order_id: string
  gateway: string
  gateway_order_id: string | null
  gateway_payment_id: string | null
  gateway_signature: string | null
  amount: number
  currency: string
  status: PaymentStatus
  created_at: string
  updated_at: string
}

export interface OrderWithRelations extends Order {
  address: Address
  items: OrderItemWithRelations[]
  payment?: Payment | null
  user?: { id: string; name: string | null; email: string | null; phone: string | null } | null
}

export type OrderWithItems = OrderWithRelations

export type CartItemWithProduct = CartItem


export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  name: string
  image_url: string | null
  quantity: number
  price: number
  discount: number
  total: number
  custom_note: string | null
  created_at: string
}

export interface OrderItemWithRelations extends OrderItem {
  product: Product
}

export interface Review {
  id: string
  product_id: string
  user_id: string | null
  guest_name: string | null
  guest_phone: string | null
  rating: number
  title: string | null
  comment: string | null
  images: string[]
  is_approved: boolean
  is_verified_purchase: boolean
  helpful_count: number
  created_at: string
  updated_at: string
}

export interface ServiceablePincode {
  id: string
  pincode: string
  city: string
  state: string
  cod_available: boolean
  cod_max_amount: number
  estimated_days: number
  shipping_fee: number
  is_active: boolean
}

export interface SiteSetting {
  key: string
  value: string
  description: string | null
  category: string | null
  updated_at: string
}

export interface HomeBanner {
  id: string
  title: string | null
  subtitle: string | null
  image_url: string
  mobile_image_url: string | null
  link_url: string | null
  link_type: 'PRODUCT' | 'CATEGORY' | 'COLLECTION' | 'EXTERNAL'
  display_order: number
  is_active: boolean
}

export interface CustomDesignRequest {
  id: string
  name: string
  contact: string
  email: string | null
  description: string
  reference_images: string[]
  budget: number | null
  deadline: string | null
  status: 'NEW' | 'CONTACTED' | 'QUOTED' | 'IN_DISCUSSION' | 'CONVERTED' | 'COMPLETED' | 'REJECTED'
  admin_notes: string | null
  quoted_price: number | null
  created_at: string
  updated_at: string
}

// ─── Cart (client-side) ───────────────────────────────────────────────────────

export interface CartItemClient {
  id: string          // local id
  productId: string
  name: string
  price: number
  imageUrl: string
  quantity: number
  customNote: string | null
  leadTimeDays: number
}

// ─── API response wrappers ────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  data: T
  message?: string
}

export interface ApiError {
  error: string
  details?: unknown
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  count?: number
  page: number
  limit?: number
  pageSize?: number
  totalPages: number
}

// ─── Database stub (used by Supabase client generics) ─────────────────────────
// Replace with generated types from: npx supabase gen types typescript
export interface Database {
  public: {
    Tables: Record<string, { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }>
  }
}
