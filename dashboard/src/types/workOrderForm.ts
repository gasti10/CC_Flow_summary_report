/**
 * Tipos para el Work Order Form (página 1).
 * Reflejan la estructura del PDF "Creator of Orders - Work Order Form"
 * para uso en formulario de especificaciones y generación de PDF.
 */

/** Encabezado del Work Order: proyecto, fecha, dirección, PM, descripción */
export interface WorkOrderHeader {
  project?: string
  deliveryDate?: string
  projectAddress?: string
  projectManager?: string
  projectDescription?: string
}

/** ORDER DETAILS: número de orden, cantidad, área, transfer parcial */
export interface WorkOrderOrderDetails {
  orderNumber?: string
  totalQty?: string
  area?: string
  partialTransfer?: boolean
}

/** MATERIAL TYPE: checkboxes SAP, NCP, SS, MILL FINISH */
export interface MaterialTypeSpec {
  sap?: boolean
  ncp?: boolean
  ss?: boolean
  millFinish?: boolean
}

/** MATERIAL THICKNESS: 2mm–8mm */
export type MaterialThicknessKey = '2mm' | '3mm' | '4mm' | '5mm' | '6mm' | '7mm' | '8mm'

export interface MaterialSpec {
  type?: MaterialTypeSpec
  thickness?: Partial<Record<MaterialThicknessKey, boolean>>
  colourFinish?: string
  materialSize?: string
}

export interface RivetSpec {
  aluminium?: boolean
  stainless?: boolean
  steel?: boolean
  domeHead?: boolean
  cSunk?: boolean
  flange?: boolean
  diameter32?: boolean
  diameter4?: boolean
  diameter48?: boolean
  diameter5?: boolean
}

export type ManufactureProcessSpec = [string, string, string, string, string, string, string, string, string, string]

export type YesNoNa = 'YES' | 'NO' | 'N/A'

export interface CncSpec {
  standardGroove?: boolean
  depthMm?: string
  specialVGroove?: boolean
  overfold?: boolean
  overfoldDepth?: string
  rotatePanel?: YesNoNa
  bridges?: boolean
  bridgesNo?: boolean
  trimSticker?: 'YES' | 'N/A'
  trimStickerHeight?: string
  secureSmallParts?: boolean
  secureSmallPartsNo?: boolean
  additionalInfo?: string
}

/** FOLD DETAILS — SPECIAL FOLD: OVERFOLD | UPFOLD | N/A; luego Fold Return, Special Cut, Fold Panel */
export interface FoldSpec {
  overfold?: boolean
  upfold?: boolean
  foldNa?: boolean
  foldReturn?: boolean
  foldReturnNo?: boolean
  flushCut?: boolean
  capRoute?: boolean
  factoryEdge?: boolean
  foldPanel?: boolean
  foldPanelNo?: boolean
  additionalInfo?: string
}

/** TAG THICKNESS: 0mm, 1.6mm, 3mm (checkboxes) */
export type TagThicknessKey = '0mm' | '1.6mm' | '3mm'

export interface TagSpec {
  /** Tipo de tag seleccionado (uno de tres, por imagen) */
  tagType?: string
  /** Grosores seleccionados (checkboxes) */
  tagThickness?: Partial<Record<TagThicknessKey, boolean>>
  additionalInfo?: string
}

/** STIFFENER TYPE: varios tipos con imagen, selección múltiple */
export interface StiffenerSpec {
  /** Tipos de stiffener seleccionados (varios posibles) */
  stiffenerTypes?: Record<string, boolean>
  angleSize?: string
  additionalInfo?: string
}

export interface DeliverySpec {
  bigTruck?: boolean
  smallTruck?: boolean
  ute?: boolean
  pallet?: boolean
  aFrame?: boolean
  other?: boolean
  additionalInfo?: string
}

export interface WorkOrderForm {
  header?: WorkOrderHeader
  orderDetails?: WorkOrderOrderDetails
  material?: MaterialSpec
  rivet?: RivetSpec
  manufactureProcess?: ManufactureProcessSpec
  cnc?: CncSpec
  fold?: FoldSpec
  tag?: TagSpec
  stiffener?: StiffenerSpec
  delivery?: DeliverySpec
}
