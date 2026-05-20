import { GlobalWorkerOptions } from 'pdfjs-dist'

let configured = false

export function configureSafetyPdfJs(): void {
  if (configured) return
  GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString()
  configured = true
}
