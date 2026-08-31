import { Resend } from 'resend'
import { formatPrice, formatDate } from './utils'
import type { OrderWithItems } from '@/types'

export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : (null as unknown as Resend)

const FROM_EMAIL = process.env.EMAIL_FROM || 'Art.isticcore <orders@artisticcore.in>'

/**
 * Send the self-generated login code (bypasses Supabase SMTP entirely).
 */
export async function sendLoginCodeEmail({
  email,
  code,
}: {
  email: string
  code: string
}) {
  if (!resend) {
    console.warn('[Resend] API key not configured. Cannot deliver login code.')
    return { success: false, reason: 'unconfigured' }
  }

  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Your Art.isticcore login code</title></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fafafa; margin: 0; padding: 24px; color: #171717;">
        <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e5e5e5; padding: 32px; text-align: center;">
          <h1 style="font-size: 22px; font-weight: 700; margin: 0; color: #ac2a5d; letter-spacing: 1px;">ARTISTICCORE🎀</h1>
          <p style="margin: 4px 0 24px 0; font-size: 12px; color: #737373; text-transform: uppercase; letter-spacing: 2px;">Handcrafted Crochet</p>
          <p style="font-size: 14px; color: #525252; margin: 0;">Use this code to sign in:</p>
          <div style="margin: 20px 0;">
            <span style="display: inline-block; background: #fff0f5; border: 1px dashed #f3c1d3; border-radius: 12px; padding: 16px 28px; font-size: 34px; font-weight: 800; letter-spacing: 10px; color: #ac2a5d;">${code}</span>
          </div>
          <p style="font-size: 12px; color: #737373; margin: 0;">This code expires in 10 minutes. If you didn't request it, you can safely ignore this email.</p>
        </div>
      </body>
    </html>
  `

  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Your Art.isticcore login code: ${code}`,
      html: emailHtml,
    })
    return { success: true, data }
  } catch (error) {
    console.error('[Resend] Failed to send login code:', error)
    return { success: false, error }
  }
}

/**
 * Send order confirmation email
 */
export async function sendOrderConfirmationEmail({
  order,
  customerEmail,
  customerName,
}: {
  order: OrderWithItems
  customerEmail: string
  customerName: string
}) {
  if (!resend) {
    console.warn('[Resend] API key not configured. Skipping confirmation email.')
    return { success: false, reason: 'unconfigured' }
  }

  const itemsHtml = (order.items || [])
    .map(
      (item: { name: string; custom_note?: string | null; quantity: number; total: number }) => `
      <tr style="border-bottom: 1px solid #f0f0f0;">
        <td style="padding: 12px 0;">
          <p style="margin: 0; font-weight: 600; color: #1a1a1a;">${item.name}</p>
          ${item.custom_note ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: #737373;">Note: ${item.custom_note}</p>` : ''}
        </td>
        <td style="padding: 12px 0; text-align: center; color: #525252;">x${item.quantity}</td>
        <td style="padding: 12px 0; text-align: right; font-weight: 500; color: #1a1a1a;">${formatPrice(item.total)}</td>
      </tr>
    `
    )
    .join('')

  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation - ${order.order_number}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fafafa; margin: 0; padding: 24px; color: #171717;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e5e5e5; overflow: hidden; padding: 32px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="font-size: 24px; font-weight: 700; margin: 0; color: #991b1b; letter-spacing: 1px;">ARTISTICCORE🎀</h1>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #737373; text-transform: uppercase; letter-spacing: 2px;">Handcrafted Crochet</p>
          </div>

          <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 8px;">Thank you for your order, ${customerName}!</h2>
          <p style="color: #525252; font-size: 14px; line-height: 1.5; margin-top: 0;">
            We've received your order <strong>#${order.order_number}</strong> and our artisans will begin handcrafting your pieces shortly.
          </p>

          <div style="background-color: #fcf8f6; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px dashed #e7c8b8;">
            <p style="margin: 0; font-size: 13px; color: #8c4a27;">
              ✨ <strong>Estimated Completion:</strong> Each piece is meticulously handmade. Expected completion by <strong>${order.estimated_completion_date ? formatDate(order.estimated_completion_date) : '10-14 business days'}</strong>.
            </p>
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin: 24px 0;">
            <thead>
              <tr style="border-bottom: 2px solid #e5e5e5; text-align: left; color: #737373; font-size: 12px; text-transform: uppercase;">
                <th style="padding-bottom: 8px;">Item</th>
                <th style="padding-bottom: 8px; text-align: center;">Qty</th>
                <th style="padding-bottom: 8px; text-align: right;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div style="border-top: 1px solid #e5e5e5; padding-top: 16px; margin-top: 8px; font-size: 14px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #525252;">
              <span>Subtotal</span>
              <span>${formatPrice(order.subtotal)}</span>
            </div>
            ${
              order.discount > 0
                ? `<div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #16a34a;">
                    <span>Discount</span>
                    <span>-${formatPrice(order.discount)}</span>
                  </div>`
                : ''
            }
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #525252;">
              <span>Shipping</span>
              <span>${order.shipping_fee === 0 ? 'Free' : formatPrice(order.shipping_fee)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: 700; color: #171717; margin-top: 12px; padding-top: 12px; border-top: 1px dashed #e5e5e5;">
              <span>Total</span>
              <span>${formatPrice(order.total)}</span>
            </div>
          </div>

          <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #737373; text-align: center;">
            <p style="margin: 0;">Have questions about your order? Reply directly to this email or reach us on WhatsApp at +91 98765 43210.</p>
          </div>
        </div>
      </body>
    </html>
  `

  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: customerEmail,
      subject: `Order Confirmed: #${order.order_number} — Art.isticcore Handcrafted`,
      html: emailHtml,
    })
    return { success: true, data }
  } catch (error) {
    console.error('[Resend] Failed to send order confirmation:', error)
    return { success: false, error }
  }
}

/**
 * Send order shipping / tracking update email
 */
export async function sendOrderShippingEmail({
  order,
  customerEmail,
  customerName,
}: {
  order: OrderWithItems
  customerEmail: string
  customerName: string
}) {
  if (!resend) return { success: false, reason: 'unconfigured' }

  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"><title>Your Art.isticcore Order has Shipped!</title></head>
      <body style="font-family: sans-serif; background-color: #fafafa; padding: 24px; color: #171717;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e5e5e5;">
          <h2 style="color: #991b1b;">Your Order is On Its Way! 📦</h2>
          <p>Hi ${customerName}, your handcrafted piece from order <strong>#${order.order_number}</strong> has passed our quality check and is now shipped.</p>
          ${
            order.tracking_number
              ? `<div style="background: #f4f4f5; padding: 16px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; font-size: 14px;"><strong>Courier:</strong> ${order.courier_name || 'Express Courier'}</p>
                  <p style="margin: 4px 0 0 0; font-size: 14px;"><strong>Tracking No:</strong> ${order.tracking_number}</p>
                  ${order.tracking_url ? `<a href="${order.tracking_url}" style="display: inline-block; margin-top: 12px; background: #18181b; color: #fff; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 13px;">Track Package</a>` : ''}
                </div>`
              : ''
          }
          <p style="font-size: 14px; color: #525252;">Thank you for supporting slow fashion and artisan handmade craftsmanship.</p>
        </div>
      </body>
    </html>
  `

  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: customerEmail,
      subject: `Order Shipped: #${order.order_number} — Art.isticcore`,
      html: emailHtml,
    })
    return { success: true, data }
  } catch (error) {
    console.error('[Resend] Failed to send shipping email:', error)
    return { success: false, error }
  }
}
