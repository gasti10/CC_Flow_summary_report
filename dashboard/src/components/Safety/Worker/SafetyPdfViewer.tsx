import { useCallback, useEffect, useRef, useState, type UIEvent } from 'react'
import { configureSafetyPdfJs, getDocument, type PDFDocumentProxy } from '../utils/configureSafetyPdfJs'

configureSafetyPdfJs()

interface SafetyPdfViewerProps {
  url: string
  title: string
  layout?: 'inline' | 'reading-mode'
  showReadingEndMarker?: boolean
  reachedEnd?: boolean
  onReachedEnd?: () => void
}

type ViewerMode = 'pdfjs' | 'iframe-fallback'

export default function SafetyPdfViewer({
  url,
  title,
  layout = 'inline',
  showReadingEndMarker = true,
  reachedEnd = false,
  onReachedEnd
}: SafetyPdfViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const pagesRef = useRef<HTMLDivElement>(null)
  const endMarkerRef = useRef<HTMLDivElement>(null)
  const renderGenerationRef = useRef(0)
  const reachedEndNotifiedRef = useRef(false)
  const checkScrollEndRef = useRef<() => void>(() => {})
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [viewerMode, setViewerMode] = useState<ViewerMode>('pdfjs')
  const [iframeReachedEnd, setIframeReachedEnd] = useState(false)

  const notifyReachedEnd = useCallback(() => {
    if (reachedEndNotifiedRef.current || reachedEnd || !onReachedEnd) return
    reachedEndNotifiedRef.current = true
    onReachedEnd()
  }, [onReachedEnd, reachedEnd])

  const checkScrollEnd = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 24
    if (atBottom) notifyReachedEnd()
  }, [notifyReachedEnd])

  checkScrollEndRef.current = checkScrollEnd

  useEffect(() => {
    if (reachedEnd) reachedEndNotifiedRef.current = true
  }, [reachedEnd])

  const handleIframeScroll = (event: UIEvent<HTMLDivElement>) => {
    if (iframeReachedEnd || reachedEnd) return
    const target = event.currentTarget
    const atBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 24
    if (atBottom) {
      setIframeReachedEnd(true)
      notifyReachedEnd()
    }
  }

  useEffect(() => {
    if (reachedEnd || !onReachedEnd || !showReadingEndMarker || status !== 'ready' || viewerMode !== 'pdfjs') return
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
  }, [notifyReachedEnd, onReachedEnd, reachedEnd, showReadingEndMarker, status, viewerMode])

  useEffect(() => {
    let cancelled = false
    const generation = ++renderGenerationRef.current

    async function renderPdf() {
      setStatus('loading')
      setErrorMessage(null)
      setPageCount(0)
      setViewerMode('pdfjs')
      setIframeReachedEnd(false)
      reachedEndNotifiedRef.current = false
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

        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
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
          window.requestAnimationFrame(() => checkScrollEndRef.current())
        }
      } catch (error) {
        if (!cancelled) {
          setViewerMode('iframe-fallback')
          setStatus('ready')
          setErrorMessage(
            error instanceof Error
              ? `${error.message} Showing browser PDF viewer instead.`
              : 'Could not render with the built-in viewer. Showing browser PDF viewer instead.'
          )
        }
      }
    }

    void renderPdf()
    return () => {
      cancelled = true
    }
  }, [url])

  const viewerWrapClassName = layout === 'reading-mode'
    ? 'safety-worker-viewer-wrap safety-worker-viewer-wrap--reading-mode'
    : 'safety-worker-viewer-wrap'

  if (viewerMode === 'iframe-fallback') {
    return (
      <div className="safety-worker-viewer-stack">
        {errorMessage ? (
          <div className="safety-alert safety-alert--error safety-pdf-viewer-status">
            <p>{errorMessage}</p>
          </div>
        ) : null}
        <div className={viewerWrapClassName} onScroll={handleIframeScroll}>
          <iframe
            src={url}
            className="safety-worker-viewer-frame-fallback"
            title={title}
          />
          {showReadingEndMarker ? (
            <div className="safety-worker-viewer-end">
              <span className="material-icons" aria-hidden>flag</span>
              You reached the end of the reading panel.
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      className={viewerWrapClassName}
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
