/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module 'canvas-confetti' {
  interface Options {
    particleCount?: number
    angle?: number
    spread?: number
    origin?: { x?: number; y?: number }
    startVelocity?: number
    colors?: string[]
    ticks?: number
    gravity?: number
    scalar?: number
    drift?: number
    shapes?: Array<'square' | 'circle'>
    zIndex?: number
  }
  function confetti(options?: Options): Promise<null>
  export default confetti
}
