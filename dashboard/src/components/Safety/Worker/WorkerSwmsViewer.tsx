import { useEffect, useRef, useState, type UIEvent } from 'react'
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

GlobalWorkerOptions.workerSrc = pdfjsWorker

interface WorkerSwmsViewerProps {
  pdfUrl: string
  showEndMarker?: boolean
  onScroll?: (event: UIEvent<HTMLDivElement>) => void
}

export default function WorkerSwmsViewer({ pdfUrl, showEndMarker = false, onScroll }: WorkerSwmsViewerProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const pagesHostRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let pdfDoc: PDFDocumentProxy | null = null

    async function renderPdf() {
      setStatus('loading')
      setErrorMessage(null)
      const host = pagesHostRef.current
      if (!host) return
      host.replaceChildren()

      try {
        pdfDoc = await getDocument({ url: pdfUrl, withCredentials: false }).promise
        if (cancelled) return

        const containerWidth = Math.max(host.clientWidth - 24, 280)
        for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum += 1) {
          if (cancelled) return
          const page = await pdfDoc.getPage(pageNum)
          const baseViewport = page.getViewport({ scale: 1 })
          const scale = containerWidth / baseViewport.width
          const viewport = page.getViewport({ scale })
          const canvas = document.createElement('canvas')
          canvas.width = Math.floor(viewport.width)
          canvas.height = Math.floor(viewport.height)
          canvas.className = 'safety-worker-pdf-page'
          const context = canvas.getContext('2d')
          if (!context) continue

          await page.render({ canvas, canvasContext: context, viewport }).promise

          const pageWrap = document.createElement('div')
          pageWrap.className = 'safety-worker-pdf-page-wrap'
          pageWrap.appendChild(canvas)
          host.appendChild(pageWrap)
        }

        if (!cancelled) setStatus('ready')
      } catch (error) {
        if (!cancelled) {
          setStatus('error')
          setErrorMessage(error instanceof Error ? error.message : 'Could not load PDF.')
        }
      }
    }

    void renderPdf()

    return () => {
      cancelled = true
      void pdfDoc?.destroy()
    }
  }, [pdfUrl])

  return (
    <div ref={wrapRef} className="safety-worker-viewer-wrap" onScroll={onScroll}>
      {status === 'loading' ? (
        <p className="safety-muted safety-worker-viewer-status">Loading document…</p>
      ) : null}
      {status === 'error' ? (
        <div className="safety-alert safety-alert--error">
          <p>{errorMessage ?? 'Could not load PDF.'}</p>
        </div>
      ) : null}
      <div ref={pagesHostRef} className="safety-worker-pdf-pages" />
      {showEndMarker && status === 'ready' ? (
        <div className="safety-worker-viewer-end">
          <span className="material-icons" aria-hidden>flag</span>
          You reached the end of the reading panel.
        </div>
      ) : null}
    </div>
  )
}
