import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import QRCode from 'qrcode'
import type { OrderWithItems } from '@/types'
import { registerNotoSans, useSans } from './font'
import { addressLines, formatDate, formatINR, isPaid, orderTrackingUrl, PALETTE, paymentStatusLabel } from './shared'

const M = 16 // page margin (mm)

/**
 * Customer Invoice — inside the package. Professional, minimal, handcrafted.
 * BILL TO / SHIP TO collapse when identical to avoid redundant rendering.
 */
export async function renderInvoice(doc: jsPDF, order: OrderWithItems): Promise<jsPDF> {
  registerNotoSans(doc)
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const contentWidth = pageWidth - M * 2
  let y = 0

  // ── Header ────────────────────────────────────────────────────────────────
  useSans(doc, 'bold')
  doc.setFontSize(26)
  doc.setTextColor(...PALETTE.ink)
  doc.text('Art.isticcore', M, y + 20)
  useSans(doc, 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...PALETTE.faint)
  doc.text('Handcrafted with intention', M, y + 26)

  // Title + meta block (right aligned)
  useSans(doc, 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...PALETTE.accent)
  doc.text('INVOICE', pageWidth - M, y + 20, { align: 'right' })
  useSans(doc, 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...PALETTE.muted)
  doc.text(`Order #${order.order_number}`, pageWidth - M, y + 26, { align: 'right' })
  doc.text(`Date: ${formatDate(order.created_at)}`, pageWidth - M, y + 32, { align: 'right' })

  y = 46
  doc.setDrawColor(...PALETTE.line)
  doc.setLineWidth(0.4)
  doc.line(M, y, pageWidth - M, y)
  y += 8

  // ── Addresses ─────────────────────────────────────────────────────────────
  // The order model carries a single delivery address (address_id). There is no
  // separate billing address, so BILL TO and SHIP TO are unified to avoid
  // redundant blocks. Structure is preserved for future split billing/shipping.
  const shipTo = addressLines(order.address)
  const renderDirectedAddress = (title: string, lines: string[]) => {
    useSans(doc, 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...PALETTE.ink)
    doc.text(title, M, y)
    useSans(doc, 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...PALETTE.muted)
    doc.text(lines, M, y + 7)
    y += 12 + (lines.length + 1) * 5
  }

  renderDirectedAddress('BILL TO / SHIP TO', shipTo)

  // ── Line items table ──────────────────────────────────────────────────────
  const items = order.items ?? []
  const hasNote = items.some((i) => i.custom_note)

  const columns = ['#', 'Product', 'Qty', 'Unit Price', 'Line Total']
  const colStyles: Record<number, { halign: 'left' | 'center' | 'right'; cellWidth?: number }> = {
    0: { halign: 'center', cellWidth: 12 },
    1: { halign: 'left' },
    2: { halign: 'center', cellWidth: 16 },
    3: { halign: 'right', cellWidth: 34 },
    4: { halign: 'right', cellWidth: 34 },
  }

  if (hasNote) {
    columns.push('Note')
    colStyles[5] = { halign: 'left', cellWidth: 45 }
  }

  const body = items.map((item, idx) => {
    const row = [
      String(idx + 1),
      item.name,
      String(item.quantity),
      formatINR(item.price),
      formatINR(item.total),
    ]
    if (hasNote) row.push(item.custom_note || '')
    return row
  })

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [columns],
    body: body as string[][],
    styles: {
      font: 'NotoSans',
      fontSize: 9,
      cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
      textColor: PALETTE.ink as unknown as string,
      lineColor: [233, 231, 231] as [number, number, number],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [250, 240, 245] as [number, number, number],
      textColor: PALETTE.accent as unknown as string,
      fontStyle: 'bold',
      halign: 'left',
    },
    columnStyles: colStyles,
    alternateRowStyles: { fillColor: [253, 251, 250] as [number, number, number] },
  })

  const lastTable = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
  y = (lastTable?.finalY ?? y) + 10

  // ── Totals ────────────────────────────────────────────────────────────────
  const totalsX = M + contentWidth * 0.45
  const rows: Array<[string, number | string]> = [['Subtotal', order.subtotal]]
  if (order.discount && order.discount > 0) rows.push(['Discount', -Math.abs(order.discount)])
  rows.push(['Shipping', order.shipping_fee ?? 0])
  // Tax/GST — derived from data only; order model has no tax line, so omit.

  const drawTotals = (fromY: number) => {
    let ty = fromY
    const valueX = pageWidth - M
    const labelX = totalsX
    rows.forEach(([label, value]) => {
      useSans(doc, 'normal')
      doc.setFontSize(10)
      doc.setTextColor(...PALETTE.muted)
      doc.text(label, labelX, ty)
      const signed = typeof value === 'number' && value < 0 ? `-${formatINR(Math.abs(value))}` : formatINR(value as number)
      doc.text(signed, valueX, ty, { align: 'right' })
      ty += 6
    })
    useSans(doc, 'bold')
    doc.setFontSize(12)
    doc.setTextColor(...PALETTE.ink)
    doc.text('Grand Total', labelX, ty + 2)
    doc.text(formatINR(order.total), valueX, ty + 2, { align: 'right' })
    return ty + 8
  }

  // If totals would collide with table bottom of page, add page
  if (y + rows.length * 6 + 24 > pageHeight - 40) {
    doc.addPage('a4', 'portrait')
    registerNotoSans(doc)
    y = 24
  }
  const totalsEnd = drawTotals(y + 2)

  // ── Payment info ──────────────────────────────────────────────────────────
  const paymentText = `PAYMENT: ${order.payment_method.toUpperCase()} · ${paymentStatusLabel(order.payment_status)}`
  useSans(doc, 'normal')
  doc.setFontSize(9)
  const paymentColor: [number, number, number] = isPaid(order) ? [16, 185, 129] : PALETTE.faint
  doc.setTextColor(paymentColor[0], paymentColor[1], paymentColor[2])
  doc.text(paymentText, M, totalsEnd + 4)

  // ── QR + footer ───────────────────────────────────────────────────────────
  const orderUrl = orderTrackingUrl(order.id)
  const qrDataUrl = await QRCode.toDataURL(orderUrl, { width: 140, margin: 1 })
  const qrSize = 28
  const qrX = M
  const qrY = pageHeight - 20 - qrSize
  doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize)
  useSans(doc, 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...PALETTE.faint)
  doc.text('Scan to view order status', qrX, qrY + qrSize + 4)

  // Footer
  doc.setFontSize(8)
  doc.setTextColor(...PALETTE.faint)
  doc.text('Thank you for supporting handmade.', pageWidth / 2, pageHeight - 10, { align: 'center' })

  return doc
}