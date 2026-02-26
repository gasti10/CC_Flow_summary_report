// Utility functions for handling asset paths in different environments

export const getAssetPath = (assetName: string): string => {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return `/${assetName}`;
  }
  return `/CC_Flow_summary_report/${assetName}`;
};

export const getLogoPath = (): string => {
  return getAssetPath('CC-logo-NEW_1.webp');
};

export const getFaviconPath = (): string => {
  return getAssetPath('favicon.png');
};

/**
 * Convierte una imagen (webp, jpg, png) en PNG base64 data URI usando canvas.
 * Útil para @react-pdf/renderer que no soporta webp.
 * Retorna null si falla.
 */
export async function imageUrlToPngDataUri(url: string): Promise<string | null> {
  try {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Image load failed'))
      img.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(img, 0, 0)
    return canvas.toDataURL('image/png')
  } catch {
    return null
  }
}

/**
 * Construye URL absoluta para assets en public/work-order-form/.
 * Para uso en @react-pdf/renderer Image src (requiere URL absoluta, no relativa).
 */
export function getWorkOrderFormImageUrl(filename: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  return `${base}${getAssetPath(`work-order-form/${filename}`)}`
}
