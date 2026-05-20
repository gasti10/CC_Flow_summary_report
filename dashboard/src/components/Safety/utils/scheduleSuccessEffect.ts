import confetti from 'canvas-confetti'

/** Above Safety modals (z-index 50) so bursts remain visible over the backdrop. */
const CONFETTI_Z_INDEX = 1000

/** Valley greens and fresh accent — tuned for schedule launch / assignment dispatch. */
const SCHEDULE_CONFETTI_COLORS = ['#28501a', '#4d7c2a', '#7cb342', '#a3c76a', '#e5f4d0', '#ffffff']

function scheduleBurst(fn: () => void, delay: number, ids: number[]) {
  ids.push(window.setTimeout(fn, delay))
}

/** Schedule-created celebration: upward dispatch burst + soft canopy (not signature seal). */
export function runScheduleSuccessEffect(): number[] {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return []
  }

  const timeoutIds: number[] = []
  const base = { zIndex: CONFETTI_Z_INDEX }

  scheduleBurst(() => {
    confetti({
      ...base,
      particleCount: 70,
      angle: 90,
      spread: 62,
      origin: { x: 0.5, y: 0.92 },
      startVelocity: 42,
      colors: SCHEDULE_CONFETTI_COLORS,
      ticks: 140,
      gravity: 0.85,
      scalar: 1
    })
  }, 80, timeoutIds)

  scheduleBurst(() => {
    confetti({
      ...base,
      particleCount: 32,
      angle: 72,
      spread: 48,
      origin: { x: 0.26, y: 0.95 },
      startVelocity: 36,
      colors: ['#28501a', '#4d7c2a', '#7cb342', '#e5f4d0'],
      ticks: 120,
      gravity: 0.8,
      scalar: 0.9,
      drift: 0.35
    })
    confetti({
      ...base,
      particleCount: 32,
      angle: 108,
      spread: 48,
      origin: { x: 0.74, y: 0.95 },
      startVelocity: 36,
      colors: ['#28501a', '#4d7c2a', '#7cb342', '#e5f4d0'],
      ticks: 120,
      gravity: 0.8,
      scalar: 0.9,
      drift: -0.35
    })
  }, 220, timeoutIds)

  scheduleBurst(() => {
    confetti({
      ...base,
      particleCount: 40,
      spread: 360,
      origin: { x: 0.5, y: 0.38 },
      startVelocity: 16,
      colors: ['#e5f4d0', '#7cb342', '#ffffff', '#4d7c2a'],
      ticks: 100,
      gravity: 0.5,
      scalar: 0.65,
      shapes: ['circle']
    })
  }, 400, timeoutIds)

  return timeoutIds
}
