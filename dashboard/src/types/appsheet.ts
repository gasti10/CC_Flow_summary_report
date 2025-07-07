// Interfaces para los datos de AppSheet

export interface Project {
  _RowNumber?: string
  Name: string
  Number?: string
  Status?: string
  'Project ID'?: string
  'Start Date'?: string
  'Expected Completion Date'?: string
  'Finalization Date'?: string
  PM?: string
  'CC/Subcontractor'?: string
  'Site Supervisor'?: string
  'EBA/Non-EBA'?: string
  Contact?: string
  'Expected Square Meters'?: number
  'Deliveries Allowed'?: number
  'Allowed SQM to buy'?: number
  'Real Cut Square Meters'?: number
  'Real Cut Linear Meters'?: number
  'Total Orders'?: number
  'Total Materials'?: number
  'Total Sheets'?: number
  'Total Allowances'?: number
  'Total Deliveries'?: string
  'Total Inventory'?: string
  'Related Items Requests'?: string
  'Related Delivery_Dockets'?: string
  'Related People Allowances'?: string
}

export interface Order {
  _RowNumber: string
  'Order ID': string
  'Project ID': string
  'Delivery Location': string
  Type: string
  Priority: string
  Status: string
  'Due Date': string
  'Created Date': string
  'Created By': string
  Comments: string
  Image: string
  Printed: boolean
  Number: string
}

export interface ItemRequest {
  _RowNumber: string
  'Item Request ID': string
  'Order ID': string
  'Item ID': string
  Category: string
  'Sub Category': string
  'Description Material': string
  Description: string
  Status: string
  Quantity: number
  Image: string
  'Return Date': string
  Returned: boolean
  'Total Stock Available': number
  Project: string
  Name?: string
}

export interface Sheet {
  _RowNumber: string
  'Sheet ID': string
  Project: string
  Shelf: string
  'Quantity in Factory': string
  Dimension: string
  Colour: string
  Supplier: string
  Thickness: string
  Type: string
  'Off Cut': string
  Used: string
  'Quantity in Store': string
  Comment: string
  'Created at': string
  'Update at': string
  Material: string
  'Order Cut': string
  Sheet: string
  'Related Sheets Inventorys': string
  'Related Material_Incoming_details': string
  TotalReceived?: number
  TotalUsed?: number
}

export interface SheetInventory {
  _RowNumber: string
  sheet_inventory_id: string
  'Sheet ID': string
  sheet: string
  order: string
  qty: number
  change_time: string
  material_incoming_detail: string
}

export interface PeopleAllowance {
  _RowNumber: string
  allowance_id: string
  Project: string
  Type: string
  Category: string
  'Days Allowed': string
  'Days Used': string
}

export interface DeliveryDocket {
  _RowNumber: string
  'delivery_id': string
  'Project': string
  'Address': string
  'Order': string
  'Packaging': string
  'Ready at': string
  'Supervisor': string
  'PM': string
  'Stage': string
  'File': string
  'Image': string
  'Comments': string
  'Image2': string
  'Status': string
  'Related Delivery_details': string
  'Related Panels': string
}

export interface VerticalAccess {
  _RowNumber: string
  'Access ID': string
  'Project ID': string
  'Access Type': string
  'Access Location': string
  'Access Height': number
  'Access Width': number
  'Access Notes': string
  Status: string
  'Created Date': string
}

// Interfaces para las respuestas de la API
export type AppSheetResponse<T> = T[]

// Interfaces para los parámetros de consulta
export interface FindParams {
  [key: string]: string | number | boolean
}

// Interfaces para los datos agregados
export interface MaterialSummary {
  category: string
  subCategory: string
  totalQuantity: number
  totalValue: number
  items: ItemRequest[]
}

// Tipo para materiales enriquecidos (con datos de órdenes)
export interface EnrichedItemRequest extends ItemRequest {
  Name: string
  'Order Number': string
  'Order Date': string
  'Order Status': string
  'Request by': string
}

// Estructura de retorno para getMaterials
export interface MaterialsData {
  summary: Array<{
    category: string
    items: Array<{
      ItemID: string
      Name: string
      SubCategory: string
      Description: string
      Total: number
    }>
  }>
  details: Array<{
    category: string
    items: EnrichedItemRequest[]
  }>
}