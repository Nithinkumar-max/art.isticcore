import { z } from 'zod'

// ─── Auth (Supabase OTP) ──────────────────────────────────────────────────────

export const SendOtpSchema = z.object({
  email: z.string().email('Enter a valid email address').optional(),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number')
    .optional(),
}).refine((data) => data.email || data.phone, {
  message: 'Either email or phone number is required',
})

export const VerifyOtpSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  token: z.string().length(6, 'Enter 6-digit OTP code'),
  type: z.enum(['email', 'sms']).default('email'),
})

export type SendOtpFormValues = z.infer<typeof SendOtpSchema>
export type VerifyOtpFormValues = z.infer<typeof VerifyOtpSchema>

export const LoginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
})

export const ProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
})

export type ProfileFormValues = z.infer<typeof ProfileSchema>

// ─── Address ─────────────────────────────────────────────────────────────────

export const AddressSchema = z.object({
  full_name: z.string().min(2, 'Name required'),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
  line1: z.string().min(5, 'Address line required'),
  line2: z.string().optional(),
  city: z.string().min(2, 'City required'),
  state: z.string().min(2, 'State required'),
  pincode: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit pincode'),
  landmark: z.string().optional(),
  is_default: z.boolean().default(false),
})

export type AddressFormValues = z.infer<typeof AddressSchema>

// ─── Checkout ────────────────────────────────────────────────────────────────

export const CheckoutSchema = z.object({
  address_id: z.string().uuid('Select a delivery address'),
  payment_method: z.enum(['ONLINE', 'COD']),
  customer_note: z.string().max(500).optional(),
})

export type CheckoutFormValues = z.infer<typeof CheckoutSchema>

// ─── Custom Design Request ────────────────────────────────────────────────────

export const CustomDesignSchema = z.object({
  name: z.string().min(2, 'Name required'),
  contact: z
    .string()
    .min(5, 'Phone or email required'),
  email: z.string().email().optional().or(z.literal('')),
  description: z.string().min(20, 'Please describe your design in detail (min 20 chars)'),
  budget: z.coerce.number().positive().optional(),
  deadline: z.string().optional(),
})

export type CustomDesignFormValues = z.infer<typeof CustomDesignSchema>

// ─── Review ──────────────────────────────────────────────────────────────────

export const ReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(100).optional(),
  comment: z.string().max(1000).optional(),
  guest_name: z.string().optional(),
  guest_phone: z
    .string()
    .regex(/^[6-9]\d{9}$/)
    .optional()
    .or(z.literal('')),
})

export type ReviewFormValues = z.infer<typeof ReviewSchema>

// ─── Pincode waitlist ─────────────────────────────────────────────────────────

export const PincodeWaitlistSchema = z.object({
  pincode: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit pincode'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/)
    .optional()
    .or(z.literal('')),
}).refine(
  (data) => data.email || data.phone,
  { message: 'Provide at least an email or phone number', path: ['email'] }
)

// ─── Admin: Product ───────────────────────────────────────────────────────────

export const ProductSchema = z.object({
  name: z.string().min(3, 'Product name required'),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug must be lowercase with hyphens'),
  description: z.string().min(20, 'Description required'),
  short_description: z.string().max(200).optional(),
  base_price: z.coerce.number().positive('Price must be positive'),
  discount_price: z.coerce.number().positive().optional(),
  category_id: z.string().uuid('Select a category'),
  lead_time_days: z.coerce.number().int().min(1).default(12),
  is_orderable: z.boolean().default(true),
  is_active: z.boolean().default(true),
  is_featured: z.boolean().default(false),
  is_bestseller: z.boolean().default(false),
  seo_title: z.string().max(70).optional(),
  seo_description: z.string().max(160).optional(),
})

export type ProductFormValues = z.infer<typeof ProductSchema>

// ─── Order tracking ───────────────────────────────────────────────────────────

export const TrackOrderSchema = z.object({
  order_number: z.string().min(5, 'Enter your order number'),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Enter the 10-digit mobile used at checkout'),
})

export type TrackOrderFormValues = z.infer<typeof TrackOrderSchema>
