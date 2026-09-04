import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { OrderWithItems } from '@/types'
import { registerNotoSans, useSans } from './font'
import { addressLines, formatDate, PALETTE, statusLabel } from './shared'

const M = 16
const MARGIN_TOP = 14

/**
 * Packing Slip — internal fulfillment checklist. NO prices/totals/payment data.
 * Items are laid out with a checked checkbox column for the packer.
 */
export function renderPackingSlip(doc: jsPDF, order: OrderWithItems): jsPDF {
  registerNotoSans(doc)
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  let y = MARGIN_TOP

  // ── Header ────────────────────────────────────────────────────────────────
  useSans(doc, 'bold')
  doc.setFontSize(22)
  doc.setTextColor(...PALETTE.ink)
  doc.text('Art.isticcore', M, y + 14)
  useSans(doc, 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...PALETTE.faint)
  doc.text('Handcrafted with intention', M, y + 20)
  y += 24

  useSans(doc, 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...PALETTE.accent)
  doc.text('PACKING SLIP', pageWidth - M, y - 4, { align: 'right' })
  useSans(doc, 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...PALETTE.muted)
  doc.text(`Order #${order.order_number}`, pageWidth - M, y + 4, { align: 'right' })
  doc.text(`Date: ${formatDate(order.created_at)}`, pageWidth - M, y + 10, { align: 'right' })
  y += 20

  doc.setDrawColor(...PALETTE.line)
  doc.setLineWidth(0.4)
  doc.line(M, y, pageWidth - M, y)
  y += 10

  // ── Customer / shipping destination (no phone, minimal) ───────────────────
  useSans(doc, 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...PALETTE.ink)
  doc.text('SHIPPING TO', M, y)
  useSans(doc, 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...PALETTE.muted)
  const lines = addressLines(order.address)
  // Packing slip's purpose is to identify the box destination — strip phone &
  // full street detail is kept but compact; show name + city/state/pin.
  const compact = order.address
    ? ([
        order.address.full_name,
        order.address.line1,
        order.address.line2,
        `${order.address.city}, ${order.address.state}${order.address.pincode ? ` - ${order.address.pincode}` : ''}`,
      ].filter(Boolean) as string[])
    : lines
  doc.text(compact, M, y + 7)
  y += 12 + (compact.length + 1) * 5

  // ── Packing table ─────────────────────────────────────────────────────────
  const items = order.items ?? []
  const hasSku = items.some((i) => Boolean((i as { sku?: string | null }).sku))
  const columns = hasSku ? ['Check', 'Item', 'SKU', 'Qty'] : ['Check', 'Item', 'Qty']
  const colStyles: Record<number, { halign: 'left' | 'center' | 'right'; cellWidth?: number }> = {
    0: { halign: 'center', cellWidth: 12 },
    1: { halign: 'left' },
    2: { halign: 'center', cellWidth: 30 },
  }
  if (hasSku) {
    colStyles[3] = { halign: 'center', cellWidth: 18 }
  }

  const body = items.map((item) => {
    const row = ['', item.name, String(item.quantity)]
    if (hasSku) row.splice(2, 0, (item as { sku?: string | null }).sku || '')
    return row
  })

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [columns],
    body: body as string[][],
    styles: {
      font: 'NotoSans',
      fontSize: 10,
      cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
      textColor: PALETTE.ink as unknown as string,
      lineColor: [233, 231, 231] as [number, number, number],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [250, 240, 245] as [number, number, number],
      textColor: PALETTE.accent as unknown as string,
      fontStyle: 'bold',
    },
    columnStyles: colStyles,
    alternateRowStyles: { fillColor: [253, 251, 250] as [number, number, number] },
  })

  const lastTable = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
  y = (lastTable?.finalY ?? y) + 14

  // ── Footer note ───────────────────────────────────────────────────────────
  if (order.customer_note) {
    useSans(doc, 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...PALETTE.ink)
    doc.text('Customer note', M, y)
    useSans(doc, 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...PALETTE.muted)
    const noteLines = doc.splitTextToSize(order.customer_note, pageWidth - M * 2)
    doc.text(noteLines, M, y + 7)
    y += 12 + noteLines.length * 5
  }

  useSans(doc, 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...PALETTE.faint)
  doc.text(`Status: ${statusLabel(order.status)}`, M, pageHeight - 20)

  // Signature line
  doc.setDrawColor(...PALETTE.line)
  doc.setLineWidth(0.3)
  const sigY = pageHeight - 24
  doc.line(pageWidth - M - 70, sigY, pageWidth - M, sigY)
  useSans(doc, 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...PALETTE.faint)
  doc.text('Checked by', pageWidth - M - 70, sigY - 3)

  return doc
}