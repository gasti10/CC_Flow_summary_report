/// <reference types="vite/client" />

declare module 'canvas-confetti' {
  interface Options {
    particleCount?: number
    spread?: number
    origin?: { x?: number; y?: number }
    startVelocity?: number
    colors?: string[]
    ticks?: number
    gravity?: number
    scalar?: number
    drift?: number
  }
  function confetti(options?: Options): Promise<null>
  export default confetti
}
