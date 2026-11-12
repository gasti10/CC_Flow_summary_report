import { useState } from 'react'
import { useMatchMedia } from '../../hooks/useMatchMedia'
import './PreferDesktopNotice.css'

const STORAGE_KEY = 'cc-flow-prefer-desktop-dismissed'

type PreferDesktopNoticeProps = {
  enabled: boolean
}

function readDismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export default function PreferDesktopNotice({ enabled }: PreferDesktopNoticeProps) {
  const isNarrow = useMatchMedia('(max-width: 768px)')
  const [dismissed, setDismissed] = useState(readDismissed)

  if (!enabled || !isNarrow || dismissed) {
    return null
  }

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // ignore quota / private mode
    }
    setDismissed(true)
  }

  return (
    <div className="prefer-desktop-notice" role="status">
      <p className="prefer-desktop-notice__text">
        CC Flow Web Platform works best on a larger screen. Some features may be hard to use on this device.
      </p>
      <button
        type="button"
        className="prefer-desktop-notice__button"
        onClick={handleDismiss}
        aria-label="Dismiss larger screen suggestion"
      >
        Got it
      </button>
    </div>
  )
}
