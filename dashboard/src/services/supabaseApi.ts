// Supabase API Service para Factory Analytics

import type {
  ProductivityData,
  MainMetrics,
  ProjectSummary,
  OrderSummary,
  ProjectFilters,
  SiteOrderPlan,
  SiteOrderCuttingLine,
  SiteOrderManufactureStep,
  MaterialPdfMeta
} from '../types/supabase'
import type { Project } from '../types/appsheet'
import type { Specification } from '../types/supabase'
import { supabaseClient } from './supabaseClient'

interface SupabaseConfig {
  url: string
  anonKey: string
}

export interface SiteOrderCuttingLineInput {
  item_id?: string | null
  item_request_id?: string | null
  description: string
  thickness?: string | null
  size_length: string
  uom: string
  qty: number
  unit: string
}

export interface SiteOrderManufactureStepInput {
  step_no: number
  stage_key: string
  comment: string
}

export interface SiteOrderPlanPayload {
  order_id?: string | null
  project: string
  created_by?: string | null
  document_id?: string | null
  notes?: string | null
  material_pdf_meta?: MaterialPdfMeta | null
  cutting_lines: SiteOrderCuttingLineInput[]
  manufacture_steps: SiteOrderManufactureStepInput[]
}

export interface SiteOrderPlanDetails {
  plan: SiteOrderPlan
  cutting_lines: SiteOrderCuttingLine[]
  manufacture_steps: SiteOrderManufactureStep[]
}

class SupabaseAPI {
  private config: SupabaseConfig
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map()
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

  constructor() {
    this.config = {
      url: import.meta.env.VITE_SUPABASE_URL || '',
      anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || ''
    }
  }


  private getCacheKey(endpoint: string, params: Record<string, string> = {}): string {
    return `${endpoint}_${JSON.stringify(params)}`
  }

  private getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data as T
    }
    return null
  }

  private setCachedData<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() })
  }


  // ===== MÉTODOS PARA GRÁFICOS DE PRODUCTIVIDAD =====

  // Llamar a la función RPC para corte por responsable
  async getCutProductivityByResponsible(
    startDate: string, 
    endDate: string
  ): Promise<ProductivityData[]> {
    const cacheKey = this.getCacheKey('cut_productivity_responsible', { startDate, endDate })
    const cached = this.getCachedData<ProductivityData[]>(cacheKey)
    if (cached) return cached

    const response = await fetch(`${this.config.url}/rest/v1/rpc/get_cut_productivity_by_responsible`, {
      method: 'POST',
      headers: {
        'apikey': this.config.anonKey,
        'Authorization': `Bearer ${this.config.anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        start_date: startDate,
        end_date: endDate
      })
    })

    if (!response.ok) {
      throw new Error(`Supabase RPC error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    this.setCachedData(cacheKey, data)
    return data
  }

  // Llamar a la función RPC para corte por CNC
  async getCutProductivityByCNC(
    startDate: string, 
    endDate: string
  ): Promise<ProductivityData[]> {
    const cacheKey = this.getCacheKey('cut_productivity_cnc', { startDate, endDate })
    const cached = this.getCachedData<ProductivityData[]>(cacheKey)
    if (cached) return cached

    const response = await fetch(`${this.config.url}/rest/v1/rpc/get_cut_productivity_by_cnc`, {
      method: 'POST',
      headers: {
        'apikey': this.config.anonKey,
        'Authorization': `Bearer ${this.config.anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        start_date: startDate,
        end_date: endDate
      })
    })

    if (!response.ok) {
      throw new Error(`Supabase RPC error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    this.setCachedData(cacheKey, data)
    return data
  }

  // Llamar a la función RPC para manufactura por responsable
  async getManufacturingProductivityByResponsible(
    startDate: string, 
    endDate: string
  ): Promise<ProductivityData[]> {
    const cacheKey = this.getCacheKey('manufacturing_productivity_responsible', { startDate, endDate })
    const cached = this.getCachedData<ProductivityData[]>(cacheKey)
    if (cached) return cached

    const response = await fetch(`${this.config.url}/rest/v1/rpc/get_manufacturing_productivity_by_responsible`, {
      method: 'POST',
      headers: {
        'apikey': this.config.anonKey,
        'Authorization': `Bearer ${this.config.anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        start_date: startDate,
        end_date: endDate
      })
    })

    if (!response.ok) {
      throw new Error(`Supabase RPC error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    this.setCachedData(cacheKey, data)
    return data
  }


  // ===== MÉTODOS PARA NUEVA ESTRUCTURA DE DASHBOARD =====

  // Obtener métricas principales
  async getMainMetrics(startDate: string, endDate: string): Promise<MainMetrics> {
    const cacheKey = this.getCacheKey('main_metrics', { startDate, endDate })
    const cached = this.getCachedData<MainMetrics>(cacheKey)
    if (cached) return cached

    const response = await fetch(`${this.config.url}/rest/v1/rpc/get_main_metrics_factory_analytics`, {
      method: 'POST',
      headers: {
        'apikey': this.config.anonKey,
        'Authorization': `Bearer ${this.config.anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        start_date: startDate,
        end_date: endDate
      })
    })

    if (!response.ok) {
      throw new Error(`Supabase RPC error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    // La RPC devuelve un array, necesitamos el primer elemento
    const result = Array.isArray(data) && data.length > 0 ? data[0] : data
    this.setCachedData(cacheKey, result)
    return result
  }

  // Obtener proyectos con métricas
  async getProjectsWithMetrics(
    startDate: string, 
    endDate: string, 
    filters: ProjectFilters = {}
  ): Promise<ProjectSummary[]> {
    const cacheKey = this.getCacheKey('projects_with_metrics', { startDate, endDate, ...filters })
    const cached = this.getCachedData<ProjectSummary[]>(cacheKey)
    if (cached) return cached

    const response = await fetch(`${this.config.url}/rest/v1/rpc/get_projects_with_metrics`, {
      method: 'POST',
      headers: {
        'apikey': this.config.anonKey,
        'Authorization': `Bearer ${this.config.anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        start_date: startDate,
        end_date: endDate,
        pm_filter: filters.pm || null,
        status_filter: filters.status || null
      })
    })

    if (!response.ok) {
      throw new Error(`Supabase RPC error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    this.setCachedData(cacheKey, data)
    return data
  }

  // Obtener órdenes por proyecto
  async getOrdersByProject(
    projectName: string,
    startDate: string,
    endDate: string
  ): Promise<OrderSummary[]> {
    const cacheKey = this.getCacheKey('orders_by_project', { projectName, startDate, endDate })
    const cached = this.getCachedData<OrderSummary[]>(cacheKey)
    if (cached) return cached

    const response = await fetch(`${this.config.url}/rest/v1/rpc/get_orders_by_project`, {
      method: 'POST',
      headers: {
        'apikey': this.config.anonKey,
        'Authorization': `Bearer ${this.config.anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project_name: projectName,
        start_date: startDate,
        end_date: endDate
      })
    })

    if (!response.ok) {
      throw new Error(`Supabase RPC error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    this.setCachedData(cacheKey, data)
    return data
  }

  // Obtener todos los proyectos desde Supabase (rápido, datos básicos)
  async getAllProjects(): Promise<Project[]> {
    const CACHE_SUPABASE = 'all-projects-supabase'
    const CACHE_MAIN = 'all-projects'
    
    // Verificar cache de Supabase primero
    const cached = this.getCachedData<Project[]>(CACHE_SUPABASE)
    if (cached) {
      console.log('✅ Using cached projects data from Supabase')
      return cached
    }

    try {
      console.log('🔄 Fetching projects from Supabase...')
      // Query all columns but exclude results where Number is null
      const { data, error } = await supabaseClient
        .from('Projects')
        .select('*')
        .order('Name')
        .not('Number', 'is', null)

      if (error) throw error

      // Mapear datos de Supabase al formato Project de AppSheet
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const projects: Project[] = (data || []).map((row: any) => ({
        _RowNumber: undefined,
        Name: row.Name || '',
        Number: row.Number?.toString() || '',
        Status: row.Status || '',
        'Project ID': row['Project ID'] || '',
        Address: row.Address || '',
        'Start Date': row['Start Date'] || '',
        'Expected Completion Date': row['Expected Completion Date'] || '',
        'Finalization Date': row['Finalization Date'] || '',
        PM: row.PM || '',
        'CC/Subcontractor': row['CC/Subcontractor'] || '',
        'Site Supervisor': row['Site Supervisor'] || '',
        'EBA/Non-EBA': row['EBA/Non-EBA'] || '',
        Contact: row.Contact || '',
        'Expected Square Meters': row['Expected Square Meters'] 
          ? Number(row['Expected Square Meters']) 
          : undefined,
        'Deliveries Allowed': row['Deliveries Allowed'] 
          ? Number(row['Deliveries Allowed']) 
          : undefined,
        'Allowed SQM to buy': row['Allowed SQM to buy'] 
          ? Number(row['Allowed SQM to buy']) 
          : undefined,
        // Campos calculados (si existen en Supabase se usan, si no quedan undefined)
        // y se completan con AppSheet cuando corresponda.
        'Real Cut Square Meters': row['Real Cut Square Meters'] !== null && row['Real Cut Square Meters'] !== undefined
          ? Number(row['Real Cut Square Meters'])
          : undefined,
        'Real Cut Linear Meters': row['Real Cut Linear Meters'] !== null && row['Real Cut Linear Meters'] !== undefined
          ? Number(row['Real Cut Linear Meters'])
          : undefined,
        'Total Orders': undefined,
        'Total Materials': undefined,
        'Total Sheets': undefined,
        'Total Allowances': undefined,
        'Total Deliveries': undefined,
        'Total Inventory': undefined,
        'Related Items Requests': undefined,
        'Related Delivery_Dockets': undefined,
        'Related People Allowances': undefined
      }))

      // Actualizar cache de Supabase
      this.setCachedData(CACHE_SUPABASE, projects)
      
      // Solo actualizar cache principal SI está vacía
      const mainCache = this.getCachedData<Project[]>(CACHE_MAIN)
      if (!mainCache || mainCache.length === 0) {
        this.setCachedData(CACHE_MAIN, projects)
      }
      
      console.log(`✅ Cached ${projects.length} projects from Supabase`)
      return projects
    } catch (error) {
      console.error('Error fetching projects from Supabase:', error)
      return []
    }
  }

  // Obtener órdenes de corte por proyecto desde la tabla 'Orders cut'
  async getOrdersCutByProject(projectName: string): Promise<Array<{
    'Order ID': string
    Status?: string
    Priority?: string
    'Creation Date'?: string
    Responsable?: string
  }>> {
    const cacheKey = `orders-cut-${projectName}`
    const cached = this.getCachedData<Array<{ 'Order ID': string }>>(cacheKey)
    if (cached) {
      console.log(`✅ Using cached orders for project: ${projectName}`)
      return cached
    }

    try {
      console.log(`🔄 Fetching orders from Supabase for project: ${projectName}...`)
      
      // La tabla se llama 'Orders cut' (con espacio)
      // Ordenar por Creation Date descendente (más reciente primero)
      const { data, error } = await supabaseClient
        .from('Orders cut')
        .select('"Order ID", "Creation Date", "Status", "Priority", "Responsable", "Colour"')
        .eq('Project', projectName)
        .order('"Creation Date"', { ascending: false })

      if (error) throw error

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const orders = (data || []).map((order: any) => ({
        'Order ID': order['Order ID'] || '',
        Status: order['Status'] || '',
        Priority: order['Priority'] || '',
        Colour: order['Colour'] || '',
        'Creation Date': order['Creation Date'] || '',
        Responsable: order['Responsable'] || ''
      }))

      this.setCachedData(cacheKey, orders)
      console.log(`✅ Cached ${orders.length} orders for project: ${projectName} (sorted by Creation Date)`)
      return orders
    } catch (error) {
      console.error(`Error fetching orders from Supabase for project ${projectName}:`, error)
      return []
    }
  }

  /** Órdenes con status Draft (para Work Order Planner), enriquecidas con Project Manager desde Projects */
  async getDraftOrders(): Promise<Array<{
    'Order ID': string
    Project: string
    Status: string
    Priority?: string
    'Creation Date'?: string
    Responsable?: string
    Colour?: string
    Comment?: string
    specification_id?: string | null
    /** Project Manager (desde Projects.PM) */
    ProjectManager?: string
  }>> {
    const cacheKey = 'orders-cut-draft'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cached = this.getCachedData<any[]>(cacheKey)
    if (cached) return cached

    try {
      const [ordersRes, projects] = await Promise.all([
        supabaseClient
          .from('Orders cut')
          .select('"Order ID", Project, Status, Priority, "Creation Date", Responsable, Colour, Comment, specification_id')
          .eq('Status', 'Draft')
          .order('"Creation Date"', { ascending: false }),
        this.getAllProjects()
      ])

      if (ordersRes.error) throw ordersRes.error
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = (ordersRes.data || []) as any[]
      const projectByName = new Map(projects.map(p => [p.Name, p]))
      const list = rows.map(row => ({
        ...row,
        ProjectManager: projectByName.get(row.Project)?.PM ?? undefined
      }))
      this.setCachedData(cacheKey, list)
      return list
    } catch (error) {
      console.error('Error fetching draft orders:', error)
      return []
    }
  }

  /** Obtener una orden por ID, con Project Manager y Project Address desde Projects */
  async getOrderById(orderId: string): Promise<{
    'Order ID': string
    Project: string
    Status: string
    Priority?: string
    'Creation Date'?: string
    Responsable?: string
    Colour?: string
    Comment?: string
    specification_id?: string | null
    /** Expected delivery (Orders cut) */
    'Expected to'?: string
    /** Project Manager (desde Projects.PM) */
    ProjectManager?: string
    /** Project Address (desde Projects.Address) */
    ProjectAddress?: string
    /** Dimensiones de sheets (desde Orders cut.Sheets) */
    Sheets?: string
  } | null> {
    const cacheKey = `order-${orderId}`
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cached = this.getCachedData<any>(cacheKey)
    if (cached) return cached

    try {
      const { data, error } = await supabaseClient
        .from('Orders cut')
        .select('*')
        .eq('Order ID', orderId)
        .maybeSingle()

      if (error) throw error
      if (!data) return null

      const projects = await this.getAllProjects()
      const project = projects.find(p => p.Name === (data as { Project?: string }).Project)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const order = { ...(data as any), ProjectManager: project?.PM, ProjectAddress: project?.Address }
      this.setCachedData(cacheKey, order)
      return order
    } catch (error) {
      console.error(`Error fetching order ${orderId}:`, error)
      return null
    }
  }

  /** Actualizar Expected to (delivery date) de una orden */
  async updateOrderExpectedDate(orderId: string, date: string): Promise<void> {
    const { error } = await supabaseClient
      .from('Orders cut')
      .update({ 'Expected to': date })
      .eq('Order ID', orderId)

    if (error) throw new Error(`Supabase error updating expected date: ${error.message}`)
    this.cache.delete(`order-${orderId}`)
    this.cache.delete('orders-cut-draft')
  }

  /** Actualizar specification_id de una orden (Work Order Planner) */
  async updateOrderSpecification(orderId: string, specificationId: string | null): Promise<void> {
    const { error } = await supabaseClient
      .from('Orders cut')
      .update({ specification_id: specificationId })
      .eq('Order ID', orderId)

    if (error) throw new Error(`Supabase error updating order spec: ${error.message}`)
    this.cache.delete('orders-cut-draft')
  }

  /** Actualizar Status de una orden (Work Order Planner: Draft -> CNC Machine | Press Fold | etc.) */
  async updateOrderStatus(orderId: string, status: string): Promise<void> {
    const { error } = await supabaseClient
      .from('Orders cut')
      .update({ Status: status })
      .eq('Order ID', orderId)

    if (error) throw new Error(`Supabase error updating order status: ${error.message}`)
    this.cache.delete('orders-cut-draft')
    this.cache.delete(`order-${orderId}`)
  }

  /**
   * Actualiza múltiples campos de una orden de una sola vez (Status, specification_id, Expected to, etc.).
   * Se usa en el Release para hacer un solo UPDATE en vez de varios.
   */
  async updateOrder(orderId: string, fields: Record<string, unknown>): Promise<void> {
    const { error } = await supabaseClient
      .from('Orders cut')
      .update(fields)
      .eq('Order ID', orderId)

    if (error) throw new Error(`Supabase error updating order: ${error.message}`)
    this.cache.delete('orders-cut-draft')
    this.cache.delete(`order-${orderId}`)
  }

  /** Crear stages en Supabase (Work Order Planner: Release). stage_id = AppSheet Stage ID para que coincidan. */
  async createStagesOrder(stages: Array<{
    stage_id: string
    'Order': string
    'Action': string
    'Name'?: string
    'Estimated time'?: string
    'Number stage'?: number
    'Quality Control'?: boolean
    'Comment'?: string
    'External'?: boolean
  }>): Promise<void> {
    if (stages.length === 0) return
    const rows = stages.map(s => ({
      stage_id: s.stage_id,
      'Order': s['Order'],
      'Action': s['Action'],
      'Name': s['Name'] ?? '',
      'Estimated time': s['Estimated time'] ?? '',
      'Number stage': s['Number stage'] ?? 0,
      'Quality Control': s['Quality Control'] ?? false,
      'Comment': s['Comment'] ?? '',
      'External': s['External'] ?? false
    }))
    const { error } = await supabaseClient
      .from('Stages Order')
      .insert(rows)

    if (error) throw new Error(`Supabase error creating stages: ${error.message}`)
  }

  /** Stages de una orden (Stages Order), ordenados por Number stage. Usado en Work Order Detail cuando la orden ya no es Draft. */
  async getStagesByOrderId(orderId: string): Promise<Array<{
    stage_id: string
    'Order': string
    'Action': string
    'Name': string
    'Estimated time': string
    'Number stage': number
    'Quality Control': boolean
    'Comment': string
    'External': boolean
  }>> {
    const { data, error } = await supabaseClient
      .from('Stages Order')
      .select('stage_id, "Order", "Action", "Name", "Estimated time", "Number stage", "Quality Control", "Comment", "External"')
      .eq('Order', orderId)
      .order('"Number stage"', { ascending: true })

    if (error) throw new Error(`Supabase error fetching stages: ${error.message}`)
    return (data ?? []) as unknown as Array<{
      stage_id: string
      'Order': string
      'Action': string
      'Name': string
      'Estimated time': string
      'Number stage': number
      'Quality Control': boolean
      'Comment': string
      'External': boolean
    }>
  }

  /** Specifications por proyecto */
  async getSpecificationsByProject(projectName: string): Promise<Specification[]> {
    const cacheKey = this.getCacheKey('specifications', { projectName })
    const cached = this.getCachedData<Specification[]>(cacheKey)
    if (cached) return cached

    try {
      const { data, error } = await supabaseClient
        .from('Specifications')
        .select('*')
        .eq('Project', projectName)

      if (error) {
        console.warn(`Specifications query failed: ${error.message}`)
        return []
      }
      const list = (data || []) as Specification[]
      if (list.length > 0) this.setCachedData(cacheKey, list)
      return list
    } catch {
      return []
    }
  }

  async getSpecificationById(specificationId: string): Promise<Specification | null> {
    const { data, error } = await supabaseClient
      .from('Specifications')
      .select('*')
      .eq('specification_id', specificationId)
      .maybeSingle()

    if (error) throw new Error(`Supabase error: ${error.message}`)
    return data as Specification | null
  }

  async createSpecification(spec: Omit<Specification, 'specification_id' | 'created_at' | 'updated_at'>): Promise<Specification> {
    const { data, error } = await supabaseClient
      .from('Specifications')
      .insert([spec])
      .select()
      .single()

    if (error) throw new Error(`Supabase error creating specification: ${error.message}`)
    this.cache.delete(this.getCacheKey('specifications', { projectName: spec['Project'] }))
    return data as Specification
  }

  async updateSpecification(specificationId: string, spec: Partial<Omit<Specification, 'specification_id'>>): Promise<Specification> {
    const { data, error } = await supabaseClient
      .from('Specifications')
      .update(spec)
      .eq('specification_id', specificationId)
      .select()
      .single()

    if (error) throw new Error(`Supabase error updating specification: ${error.message}`)
    if (data && (data as Specification)['Project']) {
      this.cache.delete(this.getCacheKey('specifications', { projectName: (data as Specification)['Project'] }))
    }
    return data as Specification
  }

  // Verificar si un Order ID ya existe en la tabla 'Orders cut'
  async checkOrderIdExists(orderId: string): Promise<boolean> {
    if (!orderId || !orderId.trim()) return false
    
    try {
      const { data, error } = await supabaseClient
        .from('Orders cut')
        .select('"Order ID"')
        .eq('Order ID', orderId.trim())
        .limit(1)
        .maybeSingle()

      if (error) throw error
      
      // Si data es null, el Order ID no existe (válido)
      // Si data existe, el Order ID ya existe (inválido)
      return data !== null
    } catch (error) {
      console.error(`Error checking Order ID existence: ${orderId}`, error)
      // En caso de error, asumimos que no existe para no bloquear al usuario
      return false
    }
  }

  /** Cantidad de paneles de una orden */
  async getPanelCountByOrderId(orderId: string): Promise<number> {
    if (!orderId?.trim()) return 0
    try {
      const { data, error } = await supabaseClient
        .from('Panels')
        .select('Name')
        .eq('Order', orderId)

      if (error) return 0
      return (data || []).length
    } catch {
      return 0
    }
  }

  // Verificar paneles existentes en Supabase por nombre
  async checkExistingPanels(panelNames: string[]): Promise<Array<{
    Name: string
    Order: string | null
    Status: string | null
  }>> {
    if (panelNames.length === 0) return []

    const cacheKey = this.getCacheKey('existing-panels', { names: panelNames.sort().join(',') })
    const cached = this.getCachedData<Array<{ Name: string; Order: string | null; Status: string | null }>>(cacheKey)
    if (cached) return cached

    try {
      const response = await supabaseClient
        .from('Panels')
        .select('Name, Order, Status')
        .in('Name', panelNames)

      if (response.error) {
        throw new Error(`Supabase error: ${response.error.message}`)
      }

      const data = response.data || []
      this.setCachedData(cacheKey, data)
      return data
    } catch (error) {
      console.error('Error checking existing panels:', error)
      throw error
    }
  }

  // Crear orden de corte completa en Supabase (incluye panels)
  async createOrderCut(
    order: {
      'Order ID': string
      Project: string
      Responsable: string
      Status: string
      Colour: string
      Notification: boolean
      'Creation Date': string
    },
    panels: Array<{
      Name: string
      Project: string
      Status: string
      Area: number
      'Cut Distance': number
      Order: string
      'Creation Date': string
      Comment: string
      Image: string
      Priority: string
      'Nest Number': string
      Sheet: string
    }>
  ): Promise<void> {
    try {
      // 1. Crear la orden
      console.log(`🔄 Creating order cut in Supabase: ${order['Order ID']}`)
      const { error: orderError } = await supabaseClient
        .from('Orders cut')
        .insert([order])

      if (orderError) {
        throw new Error(`Supabase error creating order: ${orderError.message}`)
      }

      console.log(`✅ Order cut created in Supabase`)

      // 2. Crear panels
      if (panels.length > 0) {
        await this.createPanels(panels)
      } else {
        console.warn('⚠️ No panels to create for this order')
      }
    } catch (error) {
      console.error('Error creating order cut in Supabase:', error)
      throw error
    }
  }

  // Crear paneles en Supabase (batch)
  async createPanels(panels: Array<{
    Name: string
    Project: string
    Status: string
    Area: number
    'Cut Distance': number
    Order: string
    'Creation Date': string
    Comment: string
    Image: string
    Priority: string
    'Nest Number': string
    Sheet: string
  }>): Promise<void> {
    if (panels.length === 0) {
      console.warn('⚠️ No panels to create')
      return
    }

    try {
      // Insertar en lotes si hay muchos paneles (Supabase tiene límite de 1000 por defecto)
      const batchSize = 1000
      for (let i = 0; i < panels.length; i += batchSize) {
        const batch = panels.slice(i, i + batchSize)
        const { error } = await supabaseClient
          .from('Panels')
          .insert(batch)

        if (error) {
          throw new Error(`Supabase error inserting panels batch ${Math.floor(i / batchSize) + 1}: ${error.message}`)
        }
      }

      console.log(`✅ ${panels.length} panels created in Supabase`)
    } catch (error) {
      console.error('Error creating panels in Supabase:', error)
      throw error
    }
  }

  // Limpiar cache
  clearCache(): void {
    this.cache.clear()
  }

  private async fetchSiteOrderPlanDetailsByPlanId(planId: string): Promise<SiteOrderPlanDetails | null> {
    const cleanId = planId.trim()
    if (!cleanId) return null

    const { data: planRow, error: planError } = await supabaseClient
      .from('site_order_plans')
      .select('*')
      .eq('plan_id', cleanId)
      .maybeSingle()

    if (planError) throw new Error(`Supabase error fetching site order plan: ${planError.message}`)
    if (!planRow) return null

    const plan = planRow as SiteOrderPlan
    const [cuttingRes, stepsRes] = await Promise.all([
      supabaseClient
        .from('site_order_cutting_lines')
        .select('*')
        .eq('plan_id', plan.plan_id),
      supabaseClient
        .from('site_order_manufacture_steps')
        .select('*')
        .eq('plan_id', plan.plan_id)
        .order('step_no', { ascending: true })
    ])

    if (cuttingRes.error) throw new Error(`Supabase error fetching cutting lines: ${cuttingRes.error.message}`)
    if (stepsRes.error) throw new Error(`Supabase error fetching manufacture steps: ${stepsRes.error.message}`)

    return {
      plan,
      cutting_lines: (cuttingRes.data ?? []) as SiteOrderCuttingLine[],
      manufacture_steps: (stepsRes.data ?? []) as SiteOrderManufactureStep[]
    }
  }

  /** Single plan by primary key (detail screen). */
  async getSiteOrderPlanByPlanId(planId: string): Promise<SiteOrderPlanDetails | null> {
    return this.fetchSiteOrderPlanDetailsByPlanId(planId)
  }

  /** All saved plans for a project (hub: combined queue). */
  async listSiteOrderPlansByProject(project: string): Promise<SiteOrderPlan[]> {
    const p = project.trim()
    if (!p) return []

    const { data, error } = await supabaseClient
      .from('site_order_plans')
      .select('*')
      .eq('project', p)
      .order('updated_at', { ascending: false })

    if (error) throw new Error(`Supabase error listing site order plans: ${error.message}`)
    return (data ?? []) as SiteOrderPlan[]
  }

  /** All plans linked to an AppSheet order id. */
  async listSiteOrderPlansByOrderId(orderId: string): Promise<SiteOrderPlan[]> {
    const clean = orderId.trim()
    if (!clean) return []

    const { data, error } = await supabaseClient
      .from('site_order_plans')
      .select('*')
      .eq('order_id', clean)
      .order('updated_at', { ascending: false })

    if (error) throw new Error(`Supabase error listing site order plans by order: ${error.message}`)
    return (data ?? []) as SiteOrderPlan[]
  }

  /**
   * D7-A: empty plan row so the client can navigate to /site-orders-planner/:planId immediately.
   */
  async insertSiteOrderPlanDraft(payload: {
    project: string
    order_id?: string | null
    created_by?: string | null
  }): Promise<SiteOrderPlanDetails> {
    const project = payload.project.trim()
    if (!project) throw new Error('Project is required')

    const { data: planData, error: planError } = await supabaseClient
      .from('site_order_plans')
      .insert([{
        project,
        order_id: payload.order_id?.trim() || null,
        created_by: payload.created_by ?? null,
        document_id: null,
        notes: null,
        material_pdf_meta: {}
      }])
      .select('*')
      .single()

    if (planError) throw new Error(`Supabase error creating site order plan draft: ${planError.message}`)
    const plan = planData as SiteOrderPlan

    const details = await this.fetchSiteOrderPlanDetailsByPlanId(plan.plan_id)
    if (!details) throw new Error('Site order plan draft created but could not be reloaded')
    return details
  }

  async createSiteOrderPlan(payload: SiteOrderPlanPayload): Promise<SiteOrderPlanDetails> {
    const {
      order_id: rawOrderId,
      project,
      created_by = null,
      document_id = null,
      notes = null,
      cutting_lines,
      manufacture_steps
    } = payload

    const order_id = rawOrderId?.trim() || null

    const { data: planData, error: planError } = await supabaseClient
      .from('site_order_plans')
      .insert([{
        order_id,
        project,
        created_by,
        document_id,
        notes,
        material_pdf_meta: payload.material_pdf_meta ?? {}
      }])
      .select('*')
      .single()

    if (planError) throw new Error(`Supabase error creating site order plan: ${planError.message}`)
    const plan = planData as SiteOrderPlan

    if (cutting_lines.length > 0) {
      const linesPayload = cutting_lines.map(line => ({
        plan_id: plan.plan_id,
        item_id: line.item_id ?? null,
        item_request_id: line.item_request_id ?? null,
        description: line.description,
        thickness: line.thickness ?? null,
        size_length: line.size_length,
        uom: line.uom,
        qty: line.qty,
        unit: line.unit
      }))
      const { error: linesError } = await supabaseClient
        .from('site_order_cutting_lines')
        .insert(linesPayload)
      if (linesError) throw new Error(`Supabase error creating cutting lines: ${linesError.message}`)
    }

    if (manufacture_steps.length > 0) {
      const stepsPayload = manufacture_steps.map(step => ({
        plan_id: plan.plan_id,
        step_no: step.step_no,
        stage_key: step.stage_key,
        comment: step.comment
      }))
      const { error: stepsError } = await supabaseClient
        .from('site_order_manufacture_steps')
        .insert(stepsPayload)
      if (stepsError) throw new Error(`Supabase error creating manufacture steps: ${stepsError.message}`)
    }

    const details = await this.fetchSiteOrderPlanDetailsByPlanId(plan.plan_id)
    if (!details) throw new Error('Site order plan created but could not be reloaded')
    return details
  }

  /** Full replace of lines/steps; header fields include optional order_id (user may attach/detach order). */
  async updateSiteOrderPlanByPlanId(
    planId: string,
    payload: Omit<SiteOrderPlanPayload, 'order_id'> & { order_id?: string | null }
  ): Promise<SiteOrderPlanDetails> {
    const cleanPlanId = planId.trim()
    if (!cleanPlanId) throw new Error('Plan ID is required')

    const existing = await this.fetchSiteOrderPlanDetailsByPlanId(cleanPlanId)
    if (!existing) {
      throw new Error('Site order plan not found')
    }

    const order_id = payload.order_id !== undefined
      ? (payload.order_id?.trim() || null)
      : existing.plan.order_id

    const { error: updateError } = await supabaseClient
      .from('site_order_plans')
      .update({
        project: payload.project,
        order_id,
        created_by: payload.created_by ?? existing.plan.created_by ?? null,
        document_id: payload.document_id ?? existing.plan.document_id ?? null,
        notes: payload.notes ?? null,
        material_pdf_meta: payload.material_pdf_meta !== undefined
          ? (payload.material_pdf_meta ?? {})
          : (existing.plan.material_pdf_meta ?? {}),
        updated_at: new Date().toISOString()
      })
      .eq('plan_id', existing.plan.plan_id)
    if (updateError) throw new Error(`Supabase error updating site order plan: ${updateError.message}`)

    const [deleteLinesRes, deleteStepsRes] = await Promise.all([
      supabaseClient
        .from('site_order_cutting_lines')
        .delete()
        .eq('plan_id', existing.plan.plan_id),
      supabaseClient
        .from('site_order_manufacture_steps')
        .delete()
        .eq('plan_id', existing.plan.plan_id)
    ])
    if (deleteLinesRes.error) throw new Error(`Supabase error replacing cutting lines: ${deleteLinesRes.error.message}`)
    if (deleteStepsRes.error) throw new Error(`Supabase error replacing manufacture steps: ${deleteStepsRes.error.message}`)

    if (payload.cutting_lines.length > 0) {
      const linesPayload = payload.cutting_lines.map(line => ({
        plan_id: existing.plan.plan_id,
        item_id: line.item_id ?? null,
        item_request_id: line.item_request_id ?? null,
        description: line.description,
        thickness: line.thickness ?? null,
        size_length: line.size_length,
        uom: line.uom,
        qty: line.qty,
        unit: line.unit
      }))
      const { error: linesError } = await supabaseClient
        .from('site_order_cutting_lines')
        .insert(linesPayload)
      if (linesError) throw new Error(`Supabase error updating cutting lines: ${linesError.message}`)
    }

    if (payload.manufacture_steps.length > 0) {
      const stepsPayload = payload.manufacture_steps.map(step => ({
        plan_id: existing.plan.plan_id,
        step_no: step.step_no,
        stage_key: step.stage_key,
        comment: step.comment
      }))
      const { error: stepsError } = await supabaseClient
        .from('site_order_manufacture_steps')
        .insert(stepsPayload)
      if (stepsError) throw new Error(`Supabase error updating manufacture steps: ${stepsError.message}`)
    }

    const details = await this.fetchSiteOrderPlanDetailsByPlanId(cleanPlanId)
    if (!details) throw new Error('Site order plan updated but could not be reloaded')
    return details
  }
}

// Instancia singleton
export const supabaseApi = new SupabaseAPI()
