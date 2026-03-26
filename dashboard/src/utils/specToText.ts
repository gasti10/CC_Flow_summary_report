/**
 * Convierte una Specification (JSON de Supabase) a campos de texto plano
 * para crear la fila en la tabla Specifications de AppSheet.
 *
 * AppSheet columns: specification_id, Panel, Z-Tags, CNC, Rivet, Fold,
 *                   Stiffener, Material, Delivery, Image, project
 *
 * Todos los campos salvo specification_id, project e image son LongText.
 */
import type { Specification } from '../types/supabase'
import { TAG_TYPE_OPTIONS, STIFFENER_TYPE_OPTIONS } from '../components/WorkOrderPlanner/workOrderFormOptions'

/** Extrae keys con valor true de un Record<string, boolean> */
function selectedKeys(obj: unknown, upperCase = false): string[] {
  if (!obj || typeof obj !== 'object') return []
  return Object.entries(obj as Record<string, boolean>)
    .filter(([, v]) => v === true)
    .map(([k]) => upperCase ? k.toUpperCase() : k)
}

/** Une keys seleccionados con coma */
function joinSelected(obj: unknown, upperCase = false): string {
  return selectedKeys(obj, upperCase).join(', ')
}

/** Formatea depth evitando duplicar "mm" */
function fmtDepth(v: unknown): string {
  if (!v) return ''
  const s = String(v).trim()
  return /mm/i.test(s) ? s : `${s}mm`
}

/** Convierte el bloque Material a texto */
function materialToText(mat: Record<string, unknown>): string {
  const parts: string[] = []
  const types = joinSelected(mat.type, true)
  if (types) parts.push(`Type: ${types}`)

  const thickness = joinSelected(mat.thickness)
  if (thickness) parts.push(`Thickness: ${thickness}`)

  if (mat.colourFinish) parts.push(`Colour/Finish: ${String(mat.colourFinish)}`)
  if (mat.materialSize) parts.push(`Size: ${String(mat.materialSize)}`)

  return parts.join('\n')
}

/** Convierte el bloque Rivet a texto */
function rivetToText(rivet: Record<string, boolean>): string {
  const items = selectedKeys(rivet, true)
  return items.length ? items.join(', ') : 'N/A'
}

/** Convierte el bloque CNC a texto */
function cncToText(cnc: Record<string, unknown>): string {
  const lines: string[] = []
  if (cnc.standardGroove) lines.push(`Standard Groove: YES${cnc.depthMm ? ` (${fmtDepth(cnc.depthMm)} depth)` : ''}`)
  if (cnc.specialVGroove) lines.push('Special V-Groove: YES')
  if (cnc.overfold) lines.push(`Overfold: YES${cnc.overfoldDepth ? ` (depth ${fmtDepth(cnc.overfoldDepth)})` : ''}`)
  if (cnc.rotatePanel) lines.push(`Rotate Panel: ${String(cnc.rotatePanel)}`)
  if (cnc.bridges) lines.push('Bridges: YES')
  else if (cnc.bridgesNo) lines.push('Bridges: NO')
  if (cnc.trimSticker) {
    let ts = `Trim Sticker: ${String(cnc.trimSticker)}`
    if ((cnc.trimSticker === 'YES' || cnc.trimSticker === 'HEIGHT') && cnc.trimStickerHeight) ts += ` (${String(cnc.trimStickerHeight)})`
    lines.push(ts)
  }
  if (cnc.secureSmallParts) lines.push('Secure Small Parts: YES')
  else if (cnc.secureSmallPartsNo) lines.push('Secure Small Parts: NO')
  if (cnc.additionalInfo) lines.push(`Additional: ${String(cnc.additionalInfo)}`)
  return lines.join('\n') || 'N/A'
}

/** Convierte el bloque Fold a texto */
function foldToText(fold: Record<string, unknown>): string {
  const lines: string[] = []
  if (fold.foldReturn) lines.push('Fold Return: YES')
  else if (fold.foldReturnNo) lines.push('Fold Return: NO')
  if (fold.foldPanel) lines.push('Fold Panel: YES')
  else if (fold.foldPanelNo) lines.push('Fold Panel: NO')
  if (fold.overfold) lines.push('Special Fold: OVERFOLD')
  if (fold.upfold) lines.push('Special Fold: UPFOLD')
  if (fold.foldNa) lines.push('Special Fold: N/A')
  if (fold.flushCut) lines.push('Special Cut: FLUSH CUT')
  if (fold.capRoute) lines.push('Special Cut: CAP ROUTE')
  if (fold.factoryEdge) lines.push('Special Cut: FACTORY EDGE')
  if (fold.additionalInfo) lines.push(`Additional: ${String(fold.additionalInfo)}`)
  return lines.join('\n') || 'N/A'
}

/** Convierte el bloque Tag a texto (campo "Z-Tags" en AppSheet) */
function tagToText(tag: Record<string, unknown>): string {
  const lines: string[] = []
  if (tag.tagType) {
    const opt = TAG_TYPE_OPTIONS.find(o => o.id === String(tag.tagType))
    lines.push(`Tag Type: ${opt?.label ?? String(tag.tagType)}`)
  }
  const thickness = joinSelected(tag.tagThickness)
  if (thickness) lines.push(`Tag Thickness: ${thickness}`)
  if (tag.additionalInfo) lines.push(`Additional: ${String(tag.additionalInfo)}`)
  return lines.join('\n') || 'N/A'
}

/** Convierte el bloque Stiffener a texto */
function stiffenerToText(stiffener: Record<string, unknown>): string {
  const lines: string[] = []
  const types = stiffener.stiffenerTypes as Record<string, boolean> | undefined
  if (types) {
    const selected = Object.entries(types)
      .filter(([, v]) => v)
      .map(([k]) => {
        const opt = STIFFENER_TYPE_OPTIONS.find(o => o.id === k)
        return opt?.label ?? k
      })
    if (selected.length) lines.push(`Type: ${selected.join(', ')}`)
  }
  if (stiffener.angleSize) lines.push(`Angle Size: ${String(stiffener.angleSize)}`)
  if (stiffener.additionalInfo) lines.push(`Additional: ${String(stiffener.additionalInfo)}`)
  return lines.join('\n') || 'N/A'
}

/** Convierte el bloque Delivery a texto */
function deliveryToText(delivery: Record<string, unknown>): string {
  const items: string[] = []
  if (delivery.bigTruck) items.push('Big Truck')
  if (delivery.smallTruck) items.push('Small Truck')
  if (delivery.ute) items.push('UTE')
  if (delivery.pallet) items.push('Pallet')
  if (delivery.aFrame) items.push('A-Frame')
  if (delivery.other) items.push('Other')
  let text = items.length ? items.join(', ') : 'N/A'
  if (delivery.additionalInfo) text += `\nAdditional: ${String(delivery.additionalInfo)}`
  return text
}

/**
 * Convierte una Specification completa a un payload de texto plano
 * para la tabla Specifications de AppSheet.
 *
 * Retorna un objeto con las columnas exactas de AppSheet.
 */
export function specToAppSheetPayload(spec: Specification): Record<string, string> {
  const mat = (spec.material ?? {}) as Record<string, unknown>
  const rivet = (spec.rivet ?? {}) as Record<string, boolean>
  const cnc = (spec.cnc ?? {}) as Record<string, unknown>
  const fold = (spec.fold ?? {}) as Record<string, unknown>
  const tag = (spec.tag ?? {}) as Record<string, unknown>
  const stiffener = (spec.stiffener ?? {}) as Record<string, unknown>
  const delivery = (spec.delivery ?? {}) as Record<string, unknown>

  return {
    'specification_id': spec.specification_id,
    'Panel': spec.Panel ?? '',
    'project': spec.Project,
    'Material': materialToText(mat),
    'Rivet': rivetToText(rivet),
    'CNC': cncToText(cnc),
    'Fold': foldToText(fold),
    'Z-Tags': tagToText(tag),
    'Stiffener': stiffenerToText(stiffener),
    'Delivery': deliveryToText(delivery),
    'Image': spec.image ?? ''
  }
}
