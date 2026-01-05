// Supabase API Service para Factory Analytics

import type {
  ProductivityData,
  MainMetrics,
  ProjectSummary,
  OrderSummary,
  ProjectFilters
} from '../types/supabase'

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

  // Limpiar cache
  clearCache(): void {
    this.cache.clear()
  }
}

// Instancia singleton
export const supabaseApi = new SupabaseAPI()
