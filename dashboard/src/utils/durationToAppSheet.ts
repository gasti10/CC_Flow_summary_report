/**
 * Convierte duración en texto (ej. "4h", "External") al formato que espera AppSheet
 * para columnas tipo Duration: "HHH:MM:SS" (horas, minutos, segundos).
 * @see https://support.google.com/appsheet/answer/10106435 (Duration type)
 */
export function toAppSheetDuration(value: string | undefined): string {
  if (!value || !value.trim()) return '000:00:00'
  const v = value.trim()
  const hoursMatch = v.match(/^(\d+)\s*h/i) ?? v.match(/^(\d+)$/)
  if (hoursMatch) {
    const h = Math.max(0, parseInt(hoursMatch[1], 10))
    return `${String(h).padStart(3, '0')}:00:00`
  }
  const daysMatch = v.match(/(\d+)\s*d/i)
  if (daysMatch) {
    const d = parseInt(daysMatch[1], 10)
    const h = Math.max(0, d * 24)
    return `${String(h).padStart(3, '0')}:00:00`
  }
  // "External", "3-5 days", etc. -> cero para no fallar validación
  return '000:00:00'
}
