import confetti from 'canvas-confetti'

const CONFETTI_Z_INDEX = 1000

/** Valley green, ink, and subtle stamp gold — tuned for Safety / document signing. */
const SIGNATURE_CONFETTI_COLORS = ['#28501a', '#4d7c2a', '#7cb342', '#1f2937', '#c4a35a', '#e5f4d0', '#ffffff']

function scheduleBurst(fn: () => void, delay: number, ids: number[]) {
  ids.push(window.setTimeout(fn, delay))
}

/** Document-signing celebration: soft seal burst + ink accents (not order fireworks). */
export function runSignatureSuccessEffect(): number[] {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return []
  }

  const timeoutIds: number[] = []
  const base = { zIndex: CONFETTI_Z_INDEX }

  scheduleBurst(() => {
    confetti({
      ...base,
      particleCount: 48,
      spread: 62,
      origin: { x: 0.5, y: 0.5 },
      startVelocity: 26,
      colors: SIGNATURE_CONFETTI_COLORS,
      ticks: 110,
      gravity: 0.82,
      scalar: 0.88
    })
  }, 0, timeoutIds)

  scheduleBurst(() => {
    confetti({
      ...base,
      particleCount: 22,
      angle: 75,
      spread: 38,
      origin: { x: 0.38, y: 0.72 },
      startVelocity: 22,
      colors: ['#28501a', '#1f2937', '#4d7c2a'],
      ticks: 90,
      gravity: 0.75,
      scalar: 0.72,
      drift: 0.4
    })
    confetti({
      ...base,
      particleCount: 22,
      angle: 105,
      spread: 38,
      origin: { x: 0.62, y: 0.72 },
      startVelocity: 22,
      colors: ['#28501a', '#1f2937', '#4d7c2a'],
      ticks: 90,
      gravity: 0.75,
      scalar: 0.72,
      drift: -0.4
    })
  }, 120, timeoutIds)

  scheduleBurst(() => {
    confetti({
      ...base,
      particleCount: 28,
      spread: 360,
      origin: { x: 0.5, y: 0.48 },
      startVelocity: 14,
      colors: ['#c4a35a', '#e5f4d0', '#7cb342'],
      ticks: 80,
      gravity: 0.65,
      scalar: 0.55,
      shapes: ['circle']
    })
  }, 280, timeoutIds)

  return timeoutIds
}
