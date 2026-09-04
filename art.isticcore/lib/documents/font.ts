import jsPDF from 'jspdf'
import { NOTO_SANS_BASE64, NOTO_SANS_VFS_NAME } from './font-data'

let registered = false

/**
 * Registers the bundled Noto Sans TTF (which includes the Indian Rupee U+20B9
 * glyph) into the jsPDF virtual file system so document renderers can render
 * ₹ correctly. jsPDF's built-in standard fonts (helvetica etc.) are ASCII-only
 * and render the rupee symbol as a broken/garbled character.
 *
 * The value passed to `addFileToVFS` must be a base64 string (or binary string);
 * jsPDF's TTF parser decodes it via atob().
 */
export function registerNotoSans(doc: jsPDF): jsPDF {
  if (!registered) {
    doc.addFileToVFS(NOTO_SANS_VFS_NAME, NOTO_SANS_BASE64)
    registered = true
  } else {
    // Ensure the file exists on this instance's VFS (instances share module
    // state for `registered` but each doc keeps its own vFS).
    if (!doc.existsFileInVFS?.(NOTO_SANS_VFS_NAME)) {
      doc.addFileToVFS(NOTO_SANS_VFS_NAME, NOTO_SANS_BASE64)
    }
  }
  doc.addFont(NOTO_SANS_VFS_NAME, 'NotoSans', 'normal', 'Identity-H')
  doc.addFont(NOTO_SANS_VFS_NAME, 'NotoSans', 'bold', 'Identity-H')
  return doc
}

/**
 * jsPDF renders bold by re-declaring the same face; since we only embed one
 * physical font, both normal/bold resolve to the same face so glyphs stay intact.
 */
export function useSans(doc: jsPDF, style: 'normal' | 'bold' = 'normal') {
  return doc.setFont('NotoSans', style)
}
