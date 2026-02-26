/**
 * Orquesta el "Approve & Release" del Work Order Planner.
 *
 * Pasos:
 *   1. Generar & descargar PDF  (ejecutado en el componente antes de llamar aquí)
 *   2. Crear Specification en AppSheet (texto plano)
 *   3. Actualizar Order en Supabase (status + spec + expected date)
 *   4. Actualizar Order en AppSheet (status + spec + expected date)
 *   5. Crear Stages en AppSheet → obtener IDs
 *   6. Crear Stages en Supabase con los mismos IDs
 *
 * El caller recibe progreso paso a paso vía onProgress callback.
 */
import { supabaseApi } from './supabaseApi'
import AppSheetAPI from './appsheetApi'
import { getStageById, type WorkflowStageItem } from '../components/WorkOrderPlanner/workflowConfig'
import { specToAppSheetPayload } from '../utils/specToText'
import type { Specification } from '../types/supabase'

const appSheetApi = new AppSheetAPI()

/* ─── Tipos públicos ─── */

export type ReleaseStepId =
  | 'pdf'
  | 'spec_appsheet'
  | 'order_supabase'
  | 'order_appsheet'
  | 'stages_appsheet'
  | 'stages_supabase'

export type ReleaseStepStatus = 'pending' | 'running' | 'done' | 'error'

export interface ReleaseStep {
  id: ReleaseStepId
  label: string
  status: ReleaseStepStatus
  error?: string
}

export type OnProgress = (stepId: ReleaseStepId, status: ReleaseStepStatus, error?: string) => void

export interface ReleaseParams {
  orderId: string
  workflowStages: WorkflowStageItem[]
  spec: Specification
  expectedDate?: string
  onProgress?: OnProgress
}

export interface ReleaseResult {
  success: boolean
  createdStageIds: string[]
  error?: string
}

/** Lista inicial de pasos para mostrar en la UI */
export function getInitialSteps(): ReleaseStep[] {
  return [
    { id: 'spec_appsheet', label: 'Syncing Specification to CC Flow 2026', status: 'pending' },
    { id: 'order_supabase', label: 'Updating Order in DB', status: 'pending' },
    { id: 'order_appsheet', label: 'Updating Order in CC Flow 2026', status: 'pending' },
    { id: 'stages_appsheet', label: 'Creating Stages in CC Flow 2026', status: 'pending' },
    { id: 'stages_supabase', label: 'Syncing Stages to DB', status: 'pending' }
  ]
}

/* ─── Helpers ─── */

function getStageIdFromRow(row: Record<string, unknown>): string | null {
  const id = row['Stage ID'] ?? row['stage_id'] ?? row['Stage_ID']
  return id != null ? String(id) : null
}

/* ─── Función principal ─── */

export async function releaseOrderToProduction(params: ReleaseParams): Promise<ReleaseResult> {
  const { orderId, workflowStages, spec, expectedDate, onProgress } = params

  if (workflowStages.length === 0) {
    return { success: false, createdStageIds: [], error: 'No stages to create' }
  }

  if (!spec.specification_id) {
    return { success: false, createdStageIds: [], error: 'Missing Specification. Select a Technical Specification before releasing.' }
  }

  // Determinar status inicial según primer stage
  const firstStageId = workflowStages[0].id
  const initialStatus = firstStageId === 'laser_press_fold' ? 'Press Fold' : 'CNC Machine'

  // Construir payload de stages
  const stagesPayload = workflowStages.map((stage, index) => {
    const def = getStageById(stage.id)
    return {
      Order: orderId,
      Action: def?.appSheetAction ?? 'Assembly',
      Name: stage.label,
      'Estimated time': stage.duration ?? '',
      'Number stage': index + 1,
      'Quality Control': false,
      Comment: stage.comment ?? '',
      External: stage.outsourced ?? false
    }
  })

  /* ─── Paso 1: Crear Specification en AppSheet ─── */
  onProgress?.('spec_appsheet', 'running')
  try {
    const textPayload = specToAppSheetPayload(spec)
    await appSheetApi.upsertSpecificationInAppSheet(textPayload)
    onProgress?.('spec_appsheet', 'done')
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    onProgress?.('spec_appsheet', 'error', msg)
    return { success: false, createdStageIds: [], error: `Failed to sync Specification to AppSheet: ${msg}` }
  }

  /* ─── Paso 2: Actualizar Order en Supabase ─── */
  onProgress?.('order_supabase', 'running')
  try {
    const fields: Record<string, unknown> = {
      Status: initialStatus,
      specification_id: spec.specification_id
    }
    if (expectedDate) fields['Expected to'] = expectedDate
    await supabaseApi.updateOrder(orderId, fields)
    onProgress?.('order_supabase', 'done')
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    onProgress?.('order_supabase', 'error', msg)
    return { success: false, createdStageIds: [], error: `Failed to update order in Supabase: ${msg}` }
  }

  /* ─── Paso 3: Actualizar Order en AppSheet ─── */
  onProgress?.('order_appsheet', 'running')
  try {
    const fields: Record<string, unknown> = {
      Status: initialStatus,
      Specification: spec.specification_id  // AppSheet usa 'Specification', no 'specification_id'
    }
    if (expectedDate) fields['Expected to'] = expectedDate
    await appSheetApi.updateOrderCut(orderId, fields)
    onProgress?.('order_appsheet', 'done')
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    onProgress?.('order_appsheet', 'error', msg)
    return { success: false, createdStageIds: [], error: `Failed to update order in AppSheet: ${msg}` }
  }

  /* ─── Paso 4: Crear Stages en AppSheet ─── */
  onProgress?.('stages_appsheet', 'running')
  let appSheetRows: Array<Record<string, unknown>>
  try {
    appSheetRows = await appSheetApi.createStages(stagesPayload)
    onProgress?.('stages_appsheet', 'done')
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    onProgress?.('stages_appsheet', 'error', msg)
    return { success: false, createdStageIds: [], error: `Failed to create stages in AppSheet: ${msg}` }
  }

  /* ─── Paso 5: Crear Stages en Supabase ─── */
  onProgress?.('stages_supabase', 'running')
  const createdStageIds: string[] = []
  const supabaseRows = stagesPayload.map((s, i) => {
    const appSheetId = getStageIdFromRow(appSheetRows[i] ?? {})
    const stage_id = appSheetId ?? `fallback-${orderId}-${i + 1}`
    if (appSheetId) createdStageIds.push(appSheetId)
    return {
      stage_id,
      Order: s.Order,
      Action: s.Action,
      Name: s.Name,
      'Estimated time': s['Estimated time'],
      'Number stage': s['Number stage'],
      'Quality Control': s['Quality Control'],
      'Comment': s.Comment ?? '',
      'External': s.External ?? false
    }
  })

  try {
    await supabaseApi.createStagesOrder(supabaseRows)
    onProgress?.('stages_supabase', 'done')
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    onProgress?.('stages_supabase', 'error', msg)
    return { success: false, createdStageIds: [], error: `Failed to create stages in Supabase: ${msg}` }
  }

  return { success: true, createdStageIds }
}
