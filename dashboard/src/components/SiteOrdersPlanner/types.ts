import type { ItemCatalog, ItemRequest, Order, Project } from '../../types/appsheet'

export interface SiteOrderOption extends Order {
  displayLabel: string
}

/** Orders cut (Supabase) — opciones para enlazar el PDF en AppSheet */
export interface OrderCutPdfOption {
  'Order ID': string
  displayLabel: string
}

export interface CuttingLineDraft {
  id: string
  item_id?: string
  item_request_id?: string
  description: string
  thickness: string
  size_length: string
  uom: string
  qty: string
  unit: string
  source: 'prefill' | 'manual'
}

export interface ManufactureStepDraft {
  id: string
  step_no: string
  stage_key: string
  comment: string
  source: 'prefill' | 'manual'
}

export interface SitePlannerValidationResult {
  blockingErrors: string[]
  warnings: string[]
  fieldErrors: Record<string, string>
}

export interface SitePlannerSavePayload {
  project: string
  orderId: string
  notes: string
  cuttingLines: CuttingLineDraft[]
  manufactureSteps: ManufactureStepDraft[]
}

export interface ProjectOrderSelectionState {
  projects: Project[]
  selectedProject: string
  pendingOrders: SiteOrderOption[]
  selectedOrderId: string
  itemsRequest: ItemRequest[]
  itemsCatalog: ItemCatalog[]
}
