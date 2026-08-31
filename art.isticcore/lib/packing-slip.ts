import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import QRCode from 'qrcode'
import type { OrderWithItems } from '@/types'

export async function generatePackingSlip(order: OrderWithItems): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()

  // Branding header
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('Art.isticcore', 15, 20)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(120, 120, 120)
  doc.text('Handcrafted with intention', 15, 26)

  // Order info
  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.text(`Order #${order.order_number}`, pageWidth - 15, 20, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.text(`Date: ${new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`, pageWidth - 15, 26, { align: 'right' })
  doc.text(`Status: ${order.status.replace(/_/g, ' ').toUpperCase()}`, pageWidth - 15, 32, { align: 'right' })

  // Divider
  doc.setDrawColor(200, 200, 200)
  doc.line(15, 38, pageWidth - 15, 38)

  // Buyer details
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Ship to', 15, 46)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const addr = order.address
  if (addr) {
    const addressLines = [
      addr.full_name,
      addr.line1,
      addr.line2 ?? '',
      `${addr.city}, ${addr.state} - ${addr.pincode}`,
      `Phone: ${addr.phone}`,
    ].filter((line): line is string => Boolean(line))
    doc.text(addressLines, 15, 53)
  } else {
    doc.text('No address on file', 15, 53)
  }

  // Items table
  const items = order.items ?? []
  const tableBody = items.map((item, idx) => [
    String(idx + 1),
    item.name,
    String(item.quantity),
    `₹${item.price.toLocaleString('en-IN')}`,
    `₹${item.total.toLocaleString('en-IN')}`,
    item.custom_note || '—',
  ])

  autoTable(doc, {
    startY: addr ? 75 : 55,
    head: [['#', 'Item', 'Qty', 'Price', 'Total', 'Notes']],
    body: tableBody,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [153, 27, 27], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 10 },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 40 },
    },
  })

  // Totals
  const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Subtotal:', pageWidth - 70, finalY)
  doc.text(`₹${order.subtotal.toLocaleString('en-IN')}`, pageWidth - 15, finalY, { align: 'right' })
  doc.text('Shipping:', pageWidth - 70, finalY + 6)
  doc.text(order.shipping_fee === 0 ? 'FREE' : `₹${order.shipping_fee.toLocaleString('en-IN')}`, pageWidth - 15, finalY + 6, { align: 'right' })
  if (order.discount > 0) {
    doc.text('Discount:', pageWidth - 70, finalY + 12)
    doc.text(`-₹${order.discount.toLocaleString('en-IN')}`, pageWidth - 15, finalY + 12, { align: 'right' })
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Total:', pageWidth - 70, finalY + (order.discount > 0 ? 18 : 12))
  doc.text(`₹${order.total.toLocaleString('en-IN')}`, pageWidth - 15, finalY + (order.discount > 0 ? 18 : 12), { align: 'right' })

  // Customer note
  if (order.customer_note) {
    const noteY = finalY + (order.discount > 0 ? 30 : 24)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Customer note:', 15, noteY)
    doc.setFont('helvetica', 'normal')
    const noteLines = doc.splitTextToSize(order.customer_note, pageWidth - 30)
    doc.text(noteLines, 15, noteY + 6)
  }

  // QR code
  const orderUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/orders/${order.id}`
  const qrDataUrl = await QRCode.toDataURL(orderUrl, { width: 120, margin: 1 })
  const qrSize = 30
  doc.addImage(qrDataUrl, 'PNG', 15, 260, qrSize, qrSize)
  doc.setFontSize(7)
  doc.setTextColor(120, 120, 120)
  doc.text('Scan for order status', 15, 260 + qrSize + 3)

  // Footer
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text('Thank you for supporting handmade.', pageWidth / 2, 290, { align: 'center' })

  doc.save(`packing-slip-${order.order_number}.pdf`)
}
