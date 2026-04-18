import type { MaterialPdfDeliveryMeta, MaterialPdfMeta } from '../../types/supabase'

/** Local calendar date as `YYYY-MM-DD` (for &lt;input type="date" /&gt;). */
export function todayLocalISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Normalize AppSheet / ISO-ish strings to `YYYY-MM-DD` for date inputs.
 * Returns '' if unparseable.
 */
export function parseDueDateToYmd(raw: string | undefined | null): string {
  if (!raw?.trim()) return ''
  const t = raw.trim()
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const parsed = new Date(t)
  if (Number.isNaN(parsed.getTime())) return ''
  const y = parsed.getFullYear()
  const m = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function emptyMaterialDelivery(): MaterialPdfDeliveryMeta {
  return {
    bigTruck: false,
    smallTruck: false,
    ute: false,
    pallet: false,
    aFrame: false,
    other: false,
    additionalInfo: ''
  }
}

function parseDeliveryDateYmd(raw: unknown): string | undefined {
  if (typeof raw !== 'string' || !raw.trim()) return undefined
  const m = raw.trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[1]}-${m[2]}-${m[3]}` : undefined
}

export function parseMaterialPdfMeta(raw: unknown): MaterialPdfMeta {
  if (!raw || typeof raw !== 'object') {
    return { area: '', partial_transfer: false, delivery: emptyMaterialDelivery() }
  }
  const r = raw as Record<string, unknown>
  const d =
    r.delivery && typeof r.delivery === 'object' ? (r.delivery as Record<string, unknown>) : {}
  return {
    area: typeof r.area === 'string' ? r.area : '',
    partial_transfer: r.partial_transfer === true,
    delivery_date: parseDeliveryDateYmd(r.delivery_date),
    delivery: {
      ...emptyMaterialDelivery(),
      bigTruck: !!d.bigTruck,
      smallTruck: !!d.smallTruck,
      ute: !!d.ute,
      pallet: !!d.pallet,
      aFrame: !!d.aFrame,
      other: !!d.other,
      additionalInfo: typeof d.additionalInfo === 'string' ? d.additionalInfo : ''
    }
  }
}
