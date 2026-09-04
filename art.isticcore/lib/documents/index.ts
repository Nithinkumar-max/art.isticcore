import jsPDF from 'jspdf'
import type { OrderWithItems } from '@/types'
import { renderInvoice } from './invoice'
import { renderPackingSlip } from './packing-slip'
import { renderShippingLabel, LABEL_WIDTH_MM, LABEL_HEIGHT_MM } from './shipping-label'

export type DocumentType = 'invoice' | 'packing' | 'label' | 'all'

export interface GeneratedDocument {
  buffer: ArrayBuffer
  filename: string
  contentType: string
}

const A4_W = 210
const A4_H = 297

function filenameFor(order: OrderWithItems, suffix: string): string {
  return `${suffix}-${order.order_number}.pdf`
}

/**
 * Generate a PDF document (or combined "all" pack) for an order.
 *
 * The renderers draw onto the current page of the provided doc. For `type=all`
 * we render all three into one jsPDF instance, using addPage() between them so
 * the output is a single multi-page PDF with mixed page sizes (A4 invoice,
 * A4 packing slip, 4x6 label) that prints cleanly end-to-end.
 */
export async function generateOrderDocument(order: OrderWithItems, type: DocumentType): Promise<GeneratedDocument> {
  switch (type) {
    case 'invoice': {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      await renderInvoice(doc, order)
      return {
        buffer: doc.output('arraybuffer'),
        filename: filenameFor(order, 'invoice'),
        contentType: 'application/pdf',
      }
    }
    case 'packing': {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      renderPackingSlip(doc, order)
      return {
        buffer: doc.output('arraybuffer'),
        filename: filenameFor(order, 'packing-slip'),
        contentType: 'application/pdf',
      }
    }
    case 'label': {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [LABEL_WIDTH_MM, LABEL_HEIGHT_MM] })
      await renderShippingLabel(doc, order)
      return {
        buffer: doc.output('arraybuffer'),
        filename: filenameFor(order, 'shipping-label'),
        contentType: 'application/pdf',
      }
    }
    case 'all': {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      await renderInvoice(doc, order) // page 1 — A4
      doc.addPage([A4_W, A4_H], 'portrait')
      renderPackingSlip(doc, order) // page 2 — A4
      doc.addPage([LABEL_WIDTH_MM, LABEL_HEIGHT_MM], 'portrait')
      await renderShippingLabel(doc, order) // page 3 — 4x6 label
      return {
        buffer: doc.output('arraybuffer'),
        filename: filenameFor(order, 'order-documents'),
        contentType: 'application/pdf',
      }
    }
  }
}