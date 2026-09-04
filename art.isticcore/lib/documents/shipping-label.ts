import jsPDF from 'jspdf'
import QRCode from 'qrcode'
import type { OrderWithItems } from '@/types'
import { registerNotoSans, useSans } from './font'
import { PALETTE, paymentStatusLabel } from './shared'

export const LABEL_WIDTH_MM = 101.6 // 4 inches
export const LABEL_HEIGHT_MM = 152.4 // 6 inches

const M = 8

/**
 * Shipping / Delivery Label — outside package. High contrast, bold, zero
 * decoration. SHIP TO address is the dominant block; order info secondary.
 * Machine-readable QR for the tracking/order id is placed without competing
 * with the address. Handling indicators (FRAGILE etc.) are only rendered when
 * the underlying order/product data explicitly flags them — none today.
 */
export async function renderShippingLabel(doc: jsPDF, order: OrderWithItems): Promise<jsPDF> {
  registerNotoSans(doc)
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  let y = M + 2

  // ── Brand (compact, non-competing) ────────────────────────────────────────
  useSans(doc, 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...PALETTE.ink)
  doc.text('Art.isticcore', M, y)
  y += 4

  doc.setDrawColor(28, 27, 27)
  doc.setLineWidth(0.8)
  doc.line(M, y, pageWidth - M, y)
  y += 8

  // ── SHIP TO (dominant) ────────────────────────────────────────────────────
  useSans(doc, 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...PALETTE.faint)
  doc.text('SHIP TO', M, y)
  y += 7

  const addr = order.address
  if (addr) {
    useSans(doc, 'bold')
    doc.setFontSize(16) // largest element — name
    doc.setTextColor(...PALETTE.ink)
    doc.text(addr.full_name, M, y)
    y += 8

    useSans(doc, 'bold')
    doc.setFontSize(11)
    const addressLines = [
      addr.line1 || '',
      addr.line2 || '',
      `${addr.city}, ${addr.state}`,
      addr.pincode ? `PIN ${addr.pincode}` : '',
    ].filter(Boolean)
    addressLines.forEach((line) => {
      const wrapped = doc.splitTextToSize(line, pageWidth - M * 2)
      doc.text(wrapped, M, y)
      y += 6 * wrapped.length
    })
    y += 2

    // Phone is important for delivery agents
    if (addr.phone && !addr.phone.includes('@')) {
      useSans(doc, 'bold')
      doc.setFontSize(12)
      doc.text(`Ph: ${addr.phone}`, M, y)
      y += 8
    }
  } else {
    useSans(doc, 'normal')
    doc.setFontSize(11)
    doc.text('No address on file', M, y)
    y += 8
  }

  // ── Separation ────────────────────────────────────────────────────────────
  y += 2
  doc.setDrawColor(...PALETTE.line)
  doc.setLineWidth(0.3)
  doc.line(M, y, pageWidth - M, y)
  y += 6

  // ── COD / Prepaid badge ───────────────────────────────────────────────────
  const isCod = order.payment_method === 'cod'
  const isPrepaid = order.payment_status === 'paid'
  const label = isCod ? 'COD' : isPrepaid ? 'PREPAID' : 'PREPAID'
  const badgeColor: [number, number, number] = isCod ? [28, 27, 27] : [16, 185, 129]
  const badgeW = 28
  const badgeH = 7
  doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2])
  doc.roundedRect(pageWidth - M - badgeW, y - 5, badgeW, badgeH, 1.5, 1.5, 'F')
  useSans(doc, 'bold')
  doc.setFontSize(8)
  doc.setTextColor(255, 255, 255)
  doc.text(label, pageWidth - M - badgeW / 2, y, { align: 'center' })

  // ── Secondary order info ──────────────────────────────────────────────────
  useSans(doc, 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...PALETTE.ink)
  const infoLines: Array<[string, string]> = [
    ['Order', `#${order.order_number}`],
    ['Payment', isCod ? `COD · ${paymentStatusLabel(order.payment_status)}` : paymentStatusLabel(order.payment_status)],
  ]
  if (order.courier_name) infoLines.push(['Courier', order.courier_name])
  if (order.tracking_number) infoLines.push(['Tracking', order.tracking_number])
  infoLines.forEach(([k, v]) => {
    useSans(doc, 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...PALETTE.faint)
    doc.text(`${k}:`, M, y)
    const vWidth = pageWidth - M * 2 - 40
    const vWrapped = doc.splitTextToSize(v, vWidth)
    useSans(doc, 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...PALETTE.ink)
    doc.text(vWrapped, M + 22, y)
    y += 5 * Math.max(vWrapped.length, 1) + 2
  })
  y += 2

  // ── QR codes (bottom) ─────────────────────────────────────────────────────
  const qrSide = 24
  const qrGap = 4
  const qrBottom = pageHeight - M - qrSide
  const totalQrW = qrSide * 2 + qrGap
  const qrStartX = pageWidth - M - totalQrW

  // Machine-readable: tracking or order id
  const machineValue = order.tracking_number || order.order_number
  const machineQr = await QRCode.toDataURL(machineValue, { width: 140, margin: 1 })
  doc.addImage(machineQr, 'PNG', qrStartX, qrBottom, qrSide, qrSide)
  useSans(doc, 'normal')
  doc.setFontSize(6)
  doc.setTextColor(...PALETTE.faint)
  doc.text(order.tracking_number ? 'TRACKING' : 'ORDER', qrStartX + qrSide / 2, qrBottom + qrSide + 3, { align: 'center' })

  // Order-status QR (secondary position — bottom right, below machine QR label zone)
  const orderUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/orders/${order.id}`
  const statusQr = await QRCode.toDataURL(orderUrl, { width: 140, margin: 1 })
  const statusQrX = qrStartX + qrSide + qrGap
  doc.addImage(statusQr, 'PNG', statusQrX, qrBottom, qrSide, qrSide)
  doc.text('STATUS', statusQrX + qrSide / 2, qrBottom + qrSide + 3, { align: 'center' })

  // ── Footer strip ──────────────────────────────────────────────────────────
  doc.setDrawColor(...PALETTE.line)
  doc.setLineWidth(0.3)
  const footerY = pageHeight - M - 2
  doc.line(M, footerY - 4, pageWidth - M, footerY - 4)
  useSans(doc, 'normal')
  doc.setFontSize(6)
  doc.setTextColor(...PALETTE.faint)
  doc.text('Art.isticcore · Handcrafted with intention', M, footerY)

  return doc
}