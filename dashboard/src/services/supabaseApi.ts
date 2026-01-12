// Supabase API Service para Factory Analytics

import type {
  ProductivityData,
  MainMetrics,
  ProjectSummary,
  OrderSummary,
  ProjectFilters
} from '../types/supabase'
import type { Project } from '../types/appsheet'
import { supabaseClient } from './supabaseClient'

interface SupabaseConfig {
  url: string
  anonKey: string
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
        // Campos calculados de AppSheet (requieren datos de AppSheet)
        // Estos se actualizarán en background cuando AppSheet responda
        'Real Cut Square Meters': undefined,
        'Real Cut Linear Meters': undefined,
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
  async getOrdersCutByProject(projectName: string): Promise<Array<{ 'Order ID': string }>> {
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
        .select('"Order ID", "Creation Date"')
        .eq('Project', projectName)
        .order('"Creation Date"', { ascending: false })

      if (error) throw error

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const orders = (data || []).map((order: any) => ({
        'Order ID': order['Order ID'] || ''
      }))

      this.setCachedData(cacheKey, orders)
      console.log(`✅ Cached ${orders.length} orders for project: ${projectName} (sorted by Creation Date)`)
      return orders
    } catch (error) {
      console.error(`Error fetching orders from Supabase for project ${projectName}:`, error)
      return []
    }
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

  // Limpiar cache
  clearCache(): void {
    this.cache.clear()
  }
}

// Instancia singleton
export const supabaseApi = new SupabaseAPI()
