'use client'

import { useProductFormStore } from '@/store/productFormStore'

export function ProductPreviewCard() {
  const { name, slug, base_price, discount_price, short_description, images } = useProductFormStore()

  const displayPrice = discount_price ?? base_price
  const hasDiscount = discount_price != null && base_price != null && discount_price < base_price
  const primaryImage = images.find((img) => img.is_primary)?.url || images[0]?.url || null

  return (
    <div className="rounded-3xl border border-admin-border bg-surface p-5 admin-shadow">
      <p className="label-caps text-on-surface-variant">Live preview</p>
      <div className="mt-4 overflow-hidden rounded-2xl border border-admin-border">
        {primaryImage ? (
          <img src={primaryImage} alt={name || 'Product preview'} className="aspect-[4/5] w-full object-cover" />
        ) : (
          <div className="flex aspect-[4/5] w-full items-center justify-center bg-surface-container-low text-on-surface-variant/50">
            <span className="font-serif text-2xl">No image</span>
          </div>
        )}
      </div>
      <div className="mt-4 space-y-1">
        <h4 className="font-serif text-xl leading-tight">{name || 'Product name'}</h4>
        {slug ? <p className="font-mono text-xs text-outline">/{slug}</p> : null}
        {short_description ? (
          <p className="mt-1 line-clamp-2 text-sm text-on-surface-variant">{short_description}</p>
        ) : null}
        {displayPrice != null ? (
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-serif text-lg">₹{displayPrice}</span>
            {hasDiscount ? (
              <span className="text-sm text-on-surface-variant line-through">₹{base_price}</span>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-sm text-on-surface-variant/60">Set a price</p>
        )}
      </div>
    </div>
  )
}
