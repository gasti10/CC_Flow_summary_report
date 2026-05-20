import { useCallback, useEffect, useRef, useState } from 'react'
import { getDocument, type PDFDocumentProxy } from 'pdfjs-dist'
import { configureSafetyPdfJs } from '../utils/configureSafetyPdfJs'

configureSafetyPdfJs()

interface SafetyPdfViewerProps {
  url: string
  title: string
  showReadingEndMarker?: boolean
  reachedEnd?: boolean
  onReachedEnd?: () => void
}

export default function SafetyPdfViewer({
  url,
  title,
  showReadingEndMarker = true,
  reachedEnd = false,
  onReachedEnd
}: SafetyPdfViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const pagesRef = useRef<HTMLDivElement>(null)
  const endMarkerRef = useRef<HTMLDivElement>(null)
  const renderGenerationRef = useRef(0)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [pageCount, setPageCount] = useState(0)

  const notifyReachedEnd = useCallback(() => {
    if (reachedEnd || !onReachedEnd) return
    onReachedEnd()
  }, [onReachedEnd, reachedEnd])

  const checkScrollEnd = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 24
    if (atBottom) notifyReachedEnd()
  }, [notifyReachedEnd])

  useEffect(() => {
    if (reachedEnd || !onReachedEnd || !showReadingEndMarker || status !== 'ready') return
    const marker = endMarkerRef.current
    const root = scrollRef.current
    if (!marker || !root) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) notifyReachedEnd()
      },
      { root, threshold: 0.4 }
    )
    observer.observe(marker)
    return () => observer.disconnect()
  }, [notifyReachedEnd, onReachedEnd, reachedEnd, showReadingEndMarker, status])

  useEffect(() => {
    let cancelled = false
    const generation = ++renderGenerationRef.current

    async function renderPdf() {
      setStatus('loading')
      setErrorMessage(null)
      setPageCount(0)
      if (pagesRef.current) pagesRef.current.replaceChildren()

      try {
        const pdf: PDFDocumentProxy = await getDocument({ url }).promise
        if (cancelled || generation !== renderGenerationRef.current) {
          await pdf.destroy()
          return
        }

        setPageCount(pdf.numPages)
        const container = pagesRef.current
        const scrollContainer = scrollRef.current
        if (!container || !scrollContainer) return

        const pixelRatio = window.devicePixelRatio || 1
        const contentWidth = Math.max(scrollContainer.clientWidth - 24, 280)

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
          if (cancelled) return
          const page = await pdf.getPage(pageNum)
          const baseViewport = page.getViewport({ scale: 1 })
          const scale = contentWidth / baseViewport.width
          const viewport = page.getViewport({ scale: scale * pixelRatio })

          const canvas = document.createElement('canvas')
          canvas.className = 'safety-pdf-page-canvas'
          canvas.width = viewport.width
          canvas.height = viewport.height
          canvas.style.width = `${viewport.width / pixelRatio}px`
          canvas.style.height = `${viewport.height / pixelRatio}px`

          const context = canvas.getContext('2d')
          if (!context) throw new Error('Could not render PDF page.')

          const pageWrap = document.createElement('div')
          pageWrap.className = 'safety-pdf-page'
          pageWrap.appendChild(canvas)
          container.appendChild(pageWrap)

          await page.render({ canvas, canvasContext: context, viewport }).promise
        }

        if (!cancelled) {
          setStatus('ready')
          window.requestAnimationFrame(checkScrollEnd)
        }
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
    }
  }, [checkScrollEnd, url])

  return (
    <div
      ref={scrollRef}
      className="safety-worker-viewer-wrap"
      onScroll={checkScrollEnd}
      aria-busy={status === 'loading'}
    >
      {status === 'loading' ? (
        <p className="safety-muted safety-pdf-viewer-status">Loading document…</p>
      ) : null}

      {status === 'error' ? (
        <div className="safety-alert safety-alert--error safety-pdf-viewer-status">
          <p>{errorMessage ?? 'Could not load PDF.'}</p>
        </div>
      ) : null}

      <div ref={pagesRef} className="safety-pdf-pages" aria-label={title} />

      {status === 'ready' && pageCount > 0 ? (
        <p className="safety-pdf-page-count safety-muted">{pageCount} page{pageCount === 1 ? '' : 's'}</p>
      ) : null}

      {showReadingEndMarker && status === 'ready' ? (
        <div ref={endMarkerRef} className="safety-worker-viewer-end">
          <span className="material-icons" aria-hidden>flag</span>
          You reached the end of the document.
        </div>
      ) : null}
    </div>
  )
}
