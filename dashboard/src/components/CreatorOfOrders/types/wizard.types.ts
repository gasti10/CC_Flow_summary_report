// Types para el wizard de creación de órdenes

// Tipo para las sheets simplificadas (usado en Step 2)
export type SimpleSheet = {
  'Sheet ID': string
  Dimension: string
  Colour: string
  'Quantity in Factory': number
  'Quantity in Store': number
  'Off Cut': string | boolean
  Comment: string
}

// Datos del formulario del wizard
export interface OrderFormData {
  // Step 1: Order Information
  project: string
  orderId: string
  status: string
  responsable: string
  expectedTo: string // ISO date string
  priority: string
  
  // Step 2: Sheets Selection (calculados internamente)
  selectedSheets: SelectedSheet[]
  sheets: string // Formato: "Dimension - Colour" (ej: "850x1575 - Traffic White")
  colour: string // De la primera sheet seleccionada
  
  // Step 3: Panels Import
  panels: ProcessedPanel[]
  csvFile: File | null
  orderComment: string // Comentario general para la orden
  
  // Metadata
  creationDate?: string
}

// Sheet seleccionada con cantidad
export interface SelectedSheet {
  sheetId: string
  dimension: string
  colour: string
  qty: number
  sheetData: SimpleSheet // Datos simplificados de la sheet
}

// Panel procesado del CSV
export interface ProcessedPanel {
  name: string
  area: number
  cutDistance: number
  sheetName: string
  nestNumber: string
  comment: string
}

// Estado de validación por step
export interface ValidationState {
  step1: {
    isValid: boolean
    errors: string[]
  }
  step2: {
    isValid: boolean
    errors: string[]
  }
  step3: {
    isValid: boolean
    errors: string[]
  }
  step4: {
    isValid: boolean
    errors: string[]
  }
}

// Estado del wizard
export interface WizardState {
  currentStep: number
  formData: OrderFormData
  validation: ValidationState
  isLoading: boolean
  error: string | null
  success: boolean
}

// Opciones para dropdowns
export interface DropdownOption {
  value: string
  label: string
}

// Datos para crear la orden
export interface OrderCreationData {
  order: {
    'Order ID': string
    Project: string
    Status: string
    Sheets: string
    Responsable: string
    'Expected to': string
    'Creation Date': string
    Colour: string
    Priority: string
    Notification: boolean
    Comment?: string // Comentario general de la orden
  }
  stages: Array<{
    Order: string
    Action: string
    'Quality Control': boolean
  }>
  panels: Array<{
    Name: string
    Project: string
    Area: number
    'Cut Distance': number
    Order: string
    Sheet: string
    'Nest Number': string
    Comment: string
    'Creation Date': string
  }>
  sheetsInventory: Array<{
    sheet: string
    order: string
    qty: number
    change_time: string
  }>
}
