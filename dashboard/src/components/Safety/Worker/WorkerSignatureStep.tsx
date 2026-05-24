import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'

interface SignaturePoint {
  x: number
  y: number
  t: number
}

interface SignatureStroke {
  points: SignaturePoint[]
}

interface WorkerSignatureStepProps {
  disabled: boolean
  isSubmitting: boolean
  initialSignedName?: string
  lockReason?: string
  onLockedClick?: () => void
  onSignedNameCommit?: (fullName: string) => Promise<void>
  onSubmit: (payload: {
    signed_name: string
    consent_accepted: boolean
    signature_payload: Record<string, unknown>
  }) => Promise<void>
}

const CANVAS_HEIGHT = 220

export default function WorkerSignatureStep({
  disabled,
  isSubmitting,
  initialSignedName,
  lockReason,
  onLockedClick,
  onSignedNameCommit,
  onSubmit
}: WorkerSignatureStepProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [signedName, setSignedName] = useState(initialSignedName ?? '')
  const [strokes, setStrokes] = useState<SignatureStroke[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [savingName, setSavingName] = useState(false)
  const [hasTypedName, setHasTypedName] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ratio = Math.max(window.devicePixelRatio || 1, 1)
    const width = canvas.clientWidth
    canvas.width = Math.floor(width * ratio)
    canvas.height = Math.floor(CANVAS_HEIGHT * ratio)

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(ratio, ratio)
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.lineWidth = 2
    ctx.strokeStyle = '#1f2937'
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }, [])

  useEffect(() => {
    if (hasTypedName) return
    setSignedName(initialSignedName ?? '')
  }, [initialSignedName, hasTypedName])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const ratio = Math.max(window.devicePixelRatio || 1, 1)
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    ctx.clearRect(0, 0, canvas.clientWidth, CANVAS_HEIGHT)

    for (const stroke of strokes) {
      if (!stroke.points.length) continue
      ctx.beginPath()
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
      for (let i = 1; i < stroke.points.length; i += 1) {
        const point = stroke.points[i]
        ctx.lineTo(point.x, point.y)
      }
      ctx.stroke()
    }
  }, [strokes])

  const appendPoint = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top
    const nextPoint: SignaturePoint = { x, y, t: Date.now() }
    setStrokes(prev => {
      if (prev.length === 0) return [{ points: [nextPoint] }]
      const clone = [...prev]
      const last = clone[clone.length - 1]
      if (!last) return [{ points: [nextPoint] }]
      clone[clone.length - 1] = { points: [...last.points, nextPoint] }
      return clone
    })
  }

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (disabled || isSubmitting) return
    event.currentTarget.setPointerCapture(event.pointerId)
    setFeedback(null)
    setIsDrawing(true)
    const point: SignaturePoint = {
      x: event.nativeEvent.offsetX,
      y: event.nativeEvent.offsetY,
      t: Date.now()
    }
    setStrokes(prev => [...prev, { points: [point] }])
  }

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || disabled || isSubmitting) return
    appendPoint(event.clientX, event.clientY)
  }

  const handlePointerUp = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    event.currentTarget.releasePointerCapture(event.pointerId)
    setIsDrawing(false)
  }

  const clearSignature = () => {
    setStrokes([])
    setFeedback(null)
  }

  const isValid = strokes.some(stroke => stroke.points.length > 1)
    && signedName.trim().length > 1
    && !disabled

  const submit = async () => {
    if (disabled) {
      setFeedback(lockReason || 'Complete the reading step first to unlock signature.')
      return
    }
    if (!isValid) {
      const checks: string[] = []
      if (signedName.trim().length <= 1) checks.push('full name')
      if (!strokes.some(stroke => stroke.points.length > 1)) checks.push('signature stroke')
      setFeedback(`Please complete: ${checks.join(' and ')}.`)
      return
    }
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    await onSubmit({
      signed_name: signedName.trim(),
      consent_accepted: true,
      signature_payload: {
        data_url: dataUrl,
        strokes
      }
    })
  }

  const commitName = async () => {
    if (!onSignedNameCommit) return
    const value = signedName.trim()
    if (!value) return
    try {
      setSavingName(true)
      await onSignedNameCommit(value)
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Could not save full name.')
    } finally {
      setSavingName(false)
    }
  }

  const handleLockedClick = () => {
    if (!disabled) return
    onLockedClick?.()
  }

  const handleLockedKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!disabled) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onLockedClick?.()
    }
  }

  return (
    <section
      className={`safety-card safety-worker-signature-card${disabled ? ' is-locked' : ''}`}
      onClick={disabled ? handleLockedClick : undefined}
      onKeyDown={disabled ? handleLockedKeyDown : undefined}
      role={disabled ? 'button' : undefined}
      tabIndex={disabled ? 0 : undefined}
      aria-label={
        disabled
          ? 'Signature locked. Go to reading confirmation to unlock.'
          : undefined
      }
    >
      <h3 className="safety-section-heading">Signature step</h3>
      <p className="safety-muted">Sign with finger/stylus and submit evidence.</p>

      {disabled ? (
        <div className="safety-signature-lock-banner" role="status" aria-live="polite">
          <span className="material-icons safety-signature-lock-banner-icon" aria-hidden>
            lock
          </span>
          <p>
            {lockReason || 'Complete reading first to unlock full name and signature.'}
          </p>
        </div>
      ) : null}

      <label className="safety-label" htmlFor="worker-signed-name">Full name</label>
      <input
        id="worker-signed-name"
        className="safety-input"
        value={signedName}
        onChange={(event) => {
          setHasTypedName(true)
          setSignedName(event.target.value)
        }}
        onBlur={commitName}
        placeholder="Type your full name"
        disabled={disabled || isSubmitting}
      />
      {savingName ? <p className="safety-muted">Saving name...</p> : null}

      <label className="safety-label">Signature</label>
      <div className="safety-worker-signature-canvas-wrap">
        <canvas
          ref={canvasRef}
          className={`safety-worker-signature-canvas${disabled ? ' is-disabled' : ''}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => setIsDrawing(false)}
          aria-label="Signature canvas"
          aria-disabled={disabled}
        />
        {disabled ? (
          <div className="safety-worker-signature-lock-overlay" aria-hidden>
            <div className="safety-signature-lock-badge">
              <span className="material-icons safety-signature-lock-overlay-icon">lock</span>
            </div>
            <span className="safety-signature-lock-label">Locked</span>
          </div>
        ) : null}
      </div>

      <div className="safety-modal-footer">
        <button type="button" className="safety-btn-secondary" onClick={clearSignature} disabled={isSubmitting || disabled}>
          Clear
        </button>
      </div>

      {feedback ? (
        <div className="safety-alert safety-alert--error">
          <p>{feedback}</p>
        </div>
      ) : null}

      <div className="safety-modal-footer safety-modal-footer--center">
        <button
          type="button"
          className={`safety-btn-primary safety-btn-sign${isSubmitting ? ' is-signing' : ''}${disabled ? ' is-locked' : ''}`}
          onClick={(event) => {
            if (disabled) {
              event.stopPropagation()
              handleLockedClick()
              return
            }
            void submit()
          }}
          disabled={isSubmitting}
          aria-disabled={disabled || isSubmitting}
        >
          <span className="safety-btn-sign-icon-wrap" aria-hidden>
            <span className="material-icons">
              {isSubmitting ? 'hourglass_top' : disabled ? 'lock' : 'draw'}
            </span>
            {!isSubmitting && !disabled ? (
              <>
                <span className="safety-btn-sign-scribble" />
                <span className="safety-btn-sign-spark" />
              </>
            ) : null}
          </span>
          <span className="safety-btn-sign-label">
            {isSubmitting ? 'Signing...' : disabled ? 'Signature locked' : 'Sign assignment'}
          </span>
        </button>
      </div>
    </section>
  )
}
