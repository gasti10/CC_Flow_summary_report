/**
 * Configuración de workflows para Work Order Planner.
 * Basado en: Powder coated, Press folded, Press fold + powder coat,
 * Acrylic signage, Welded + painted, Standard, y variantes (weld>pack>deliver, etc.).
 */

/** Un stage que puede formar parte de un workflow */
export interface WorkflowStageDef {
  id: string
  label: string
  /** Duración por defecto (ej. "4h", "External") */
  duration?: string
  /** Si es proceso externalizado (muestra * en UI) */
  outsourced?: boolean
  /** Para crear Stages en AppSheet: Cut | Assembly | Packing | Press Folded | Powder Coat | Acrylic Application | Paint Application | Delivery */
  appSheetAction?: 'CNC Machine' | 'Assembly' | 'Packing' | 'Outsourced' | 'Delivery'
}

/** Stage seleccionado en el workflow (duration para AppSheet; comment para MANUFACTURE PROCESS) */
export interface WorkflowStageItem {
  id: string
  label: string
  duration?: string
  /** Comentario que se muestra en MANUFACTURE PROCESS como "Label - Comment" */
  comment?: string
  outsourced?: boolean
}

/** Icono Material Icons por stage (un solo color en la UI) */
export const STAGE_ICONS: Record<string, string> = {
  cnc: 'content_cut',
  laser_press_fold: 'precision_manufacturing',
  folds: 'view_column',
  tags: 'label',
  stiffeners: 'architecture',
  powder_coat: 'format_paint',
  acrylic_app: 'palette',
  paint_app: 'brush',
  weld: 'handyman',
  glue: 'merge_type',
  pack: 'inventory_2',
  deliver: 'local_shipping'
}

/** Catálogo de todos los stages disponibles para armar workflows */
export const WORKFLOW_STAGE_CATALOG: WorkflowStageDef[] = [
  { id: 'cnc', label: 'CNC', duration: '4h', appSheetAction: 'CNC Machine' },
  { id: 'laser_press_fold', label: 'Laser / Press Fold', duration: 'External', outsourced: true, appSheetAction: 'Outsourced' },
  { id: 'folds', label: 'Folds', duration: '4h', appSheetAction: 'Assembly' },
  { id: 'tags', label: 'Tags', duration: '2h', appSheetAction: 'Assembly' },
  { id: 'stiffeners', label: 'Stiffeners', duration: '2h', appSheetAction: 'Assembly' },
  { id: 'powder_coat', label: 'Powder Coat', duration: '3-5 days', outsourced: true, appSheetAction: 'Outsourced' },
  { id: 'acrylic_app', label: 'Acrylic Application', duration: 'External', outsourced: true, appSheetAction: 'Outsourced' },
  { id: 'paint_app', label: 'Paint Application', duration: 'External', outsourced: true, appSheetAction: 'Outsourced' },
  { id: 'weld', label: 'Weld', duration: '12h', appSheetAction: 'Assembly' },
  { id: 'glue', label: 'Glue', duration: '4h', appSheetAction: 'Assembly' },
  { id: 'pack', label: 'Pack', duration: '2h', appSheetAction: 'Packing' },
  { id: 'deliver', label: 'Deliver', appSheetAction: 'Delivery' },
]

/** Plantillas de workflow (orden de stage ids) */
export const WORKFLOW_TEMPLATES: { id: string; label: string; stageIds: string[] }[] = [
  {
    id: 'standard',
    label: 'Standard',
    stageIds: ['cnc', 'folds', 'tags', 'stiffeners', 'glue', 'pack', 'deliver'],
  },
  {
    id: 'powder_coated',
    label: 'Powder Coated',
    stageIds: ['cnc', 'folds', 'tags', 'stiffeners', 'powder_coat', 'glue', 'pack', 'deliver'],
  },
  {
    id: 'press_folded',
    label: 'Press Folded',
    stageIds: ['laser_press_fold', 'folds', 'tags', 'stiffeners', 'glue', 'pack', 'deliver'],
  },
  {
    id: 'press_fold_powder',
    label: 'Press Fold + Powder Coat',
    stageIds: ['laser_press_fold', 'folds', 'tags', 'stiffeners', 'powder_coat', 'glue', 'pack', 'deliver'],
  },
  {
    id: 'acrylic_signage',
    label: 'Acrylic Signage',
    stageIds: ['cnc', 'folds', 'tags', 'stiffeners', 'glue', 'acrylic_app', 'pack', 'deliver'],
  },
  {
    id: 'welded_painted',
    label: 'Welded + Painted',
    stageIds: ['cnc', 'weld', 'folds', 'tags', 'stiffeners', 'paint_app', 'glue', 'pack', 'deliver'],
  },
  {
    id: 'weld_pack_deliver',
    label: 'Weld > Pack > Deliver',
    stageIds: ['cnc', 'weld', 'pack', 'deliver'],
  },
  {
    id: 'custom',
    label: 'Custom (build from scratch)',
    stageIds: [],
  },
]

export function getStageById(id: string): WorkflowStageDef | undefined {
  return WORKFLOW_STAGE_CATALOG.find(s => s.id === id)
}

/** Busca un stage por su label (Name en Stages Order). Para mapear filas de Supabase a WorkflowStageItem. */
export function getStageByLabel(label: string): WorkflowStageDef | undefined {
  return WORKFLOW_STAGE_CATALOG.find(s => s.label === label)
}

export function getStageIcon(id: string): string {
  return STAGE_ICONS[id] ?? 'circle'
}

/** Status que tendrá la Order en este stage (según Action para AppSheet) */
export function getStageAction(id: string): string {
  const def = getStageById(id)
  return def?.appSheetAction ?? 'Assembly'
}

export function getStagesForTemplate(templateId: string): WorkflowStageItem[] {
  const template = WORKFLOW_TEMPLATES.find(t => t.id === templateId)
  if (!template || template.stageIds.length === 0) return []
  return template.stageIds.map(sid => {
    const def = getStageById(sid)
    return def ? { id: def.id, label: def.label, duration: '0', comment: '', outsourced: def.outsourced } : { id: sid, label: sid, duration: '0', comment: '', outsourced: false }
  }).filter(s => s.label)
}

/** Convierte filas de Stages Order (Supabase) a WorkflowStageItem para mostrar en modo solo lectura. */
export function stagesOrderRowsToWorkflowItems(rows: Array<{
  'Name': string
  'Action': string
  'Estimated time'?: string
  'Comment'?: string
  'External'?: boolean
}>): WorkflowStageItem[] {
  return rows.map(row => {
    const name = row['Name'] ?? ''
    const def = getStageByLabel(name)
    return {
      id: def?.id ?? name.toLowerCase().replace(/\s+/g, '_'),
      label: name,
      duration: row['Estimated time'] ?? '',
      comment: row['Comment'] ?? '',
      outsourced: row['External'] ?? def?.outsourced ?? false
    }
  })
}
