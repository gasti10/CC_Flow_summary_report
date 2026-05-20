import { GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs'
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'

let configured = false

export function configureSafetyPdfJs(): void {
  if (configured) return
  GlobalWorkerOptions.workerSrc = pdfWorkerUrl
  configured = true
}

export { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
export type { PDFDocumentProxy } from 'pdfjs-dist/legacy/build/pdf.mjs'
