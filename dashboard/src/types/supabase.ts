// Interfaces para los datos de Supabase - Factory Analytics

export interface Panel {
  Name: string
  Project?: string
  Status?: string
  Area?: number
  'Cut Distance'?: number
  Order?: string
  'Creation Date'?: string
  Comment?: string
  Image?: string
  Priority?: string
  'Nest Number'?: string
  Sheet?: string
}

export interface CutProcess {
  'Process ID': string
  Stage?: string
  Panel?: string
  Responsable?: string
  'Is correct'?: boolean
  Comment?: string
  Image?: string
  CNC?: string
  Date?: string
  'OFFCUT Saved'?: boolean
  'OFFCUT Dimension'?: string
}

export interface ManufacturingProcess {
  'Process ID': string
  Stage?: string
  Panel?: string
  Responsable?: string
  'Is correct'?: boolean
  'Corners Check'?: boolean
  'Structural Silicone'?: boolean
  'Stiffner Attachment'?: boolean
  'Colour Check'?: boolean
  Comment?: string
  Image?: string
  Date?: string
  'Type Packaging'?: string
  Location?: string
  Side?: string
  'Returns Check'?: boolean
  Image2?: string
  Image3?: string
}

export interface PackagingProcess {
  'Process ID': string
  Stage?: string
  Panel?: string
  Type?: string
  Location?: string
  Date?: string
  Responsable?: string
  Side?: string
}

// Tipos para las métricas calculadas
export interface FactoryMetrics {
  totalCutArea: number
  totalManufacturedArea: number
  totalPanels: number
  cutPanels: number
  manufacturedPanels: number
  dateRange: {
    start: string
    end: string
  }
}

export interface DetailedOrder {
  order: string
  project: string
  panels: Panel[]
  cutProcesses: CutProcess[]
  manufacturingProcesses: ManufacturingProcess[]
  packagingProcesses: PackagingProcess[]
  totalArea: number
  cutArea: number
  manufacturedArea: number
  status: 'pending' | 'cut' | 'manufactured' | 'packaged' | 'completed'
}

export interface FactoryAnalyticsData {
  metrics: FactoryMetrics
  detailedOrders: DetailedOrder[]
  summary: {
    byProject: Record<string, {
      totalArea: number
      cutArea: number
      manufacturedArea: number
      panelCount: number
    }>
    byDate: Record<string, {
      cutArea: number
      manufacturedArea: number
      panelCount: number
    }>
  }
}

// Tipos para exportación
export interface ExportData {
  metrics: FactoryMetrics
  orders: DetailedOrder[]
  summary: FactoryAnalyticsData['summary']
  exportDate: string
  dateRange: {
    start: string
    end: string
  }
}

// Tipos para gráficos de productividad
export interface ProductivityData {
  fecha: string
  responsable?: string
  cnc?: string
  panel_count: number
  total_area: number
}

export interface ChartDataset {
  label: string
  data: number[]
  backgroundColor: string
  borderColor: string
  borderWidth: number
}

export interface StackedBarData {
  labels: string[]
  datasets: ChartDataset[]
}

export interface ProductivityChartsData {
  cutByResponsible: StackedBarData | null
  cutByCNC: StackedBarData | null
  manufacturingByResponsible: StackedBarData | null
  loading: boolean
  error: string | null
}

// Tipos para la nueva estructura de dashboard
export interface MainMetrics {
  total_sqm_cut: number
  total_sqm_manufactured: number
}

export interface ProjectSummary {
  project_name: string
  project_number: number
  pm: string
  site_supervisor: string
  project_start_date: string
  expected_completion_date: string
  finalization_date: string
  status: string
  total_sqm_cut: number
  total_sqm_manufactured: number
  total_panels: number
  total_orders: number
  real_cut_square_meters: number
  progress_percentage: number
  expected_square_meters: number
  allowed_sqm_to_buy: number
}

export interface OrderSummary {
  order_id: string
  status: string
  total_area: number
  cut_sqm: number
  manufactured_sqm: number
  panels_count: number
  creation_date: string  // TIMESTAMP se convierte a string en JSON
  expected_date: string  // TIMESTAMP se convierte a string en JSON
  delivered_date?: string  // TIMESTAMP se convierte a string en JSON
}

export interface ProjectFilters {
  pm?: string
  status?: string
}

// Interface para datos de exportación CSV
export interface CSVExportData {
  metrics: {
    totalCutArea: number;
    totalManufacturedArea: number;
    totalPanels: number;
  };
  projects: Array<{
    projectNumber: string;
    projectName: string;
    pm: string;
    supervisor: string;
    status: string;
    realTotalCutSqm: number;
    expectedTotalSqm: number;
    progressPercentage: number;
    allowedSqmToBuy: number;
    startDate: string;
    expectedDate: string;
    finalizationDate: string;
    cutSqm: number;
    manufacturedSqm: number;
    totalPanels: number;
  }>;
  chartData: Array<{
    date: string;
    cutArea: number;
    manufacturedArea: number;
  }>;
  exportDate: string;
  dateRange: {
    start: string;
    end: string;
  };
}