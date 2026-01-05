interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface CacheOptions {
  ttl?: number; // Default TTL in milliseconds
  maxSize?: number; // Maximum number of entries
}

class CacheManager {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private defaultTTL: number;
  private maxSize: number;

  constructor(options: CacheOptions = {}) {
    this.defaultTTL = options.ttl || 5 * 60 * 1000; // 5 minutes default
    this.maxSize = options.maxSize || 100; // 100 entries max
  }

  // Generar clave de cache basada en parámetros
  private generateKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    return `${prefix}:${sortedParams}`;
  }

  // Obtener datos del cache
  get<T>(prefix: string, params: Record<string, any>): T | null {
    const key = this.generateKey(prefix, params);
    const entry = this.memoryCache.get(key);

    if (!entry) {
      return null;
    }

    // Verificar si ha expirado
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.memoryCache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  // Guardar datos en el cache
  set<T>(prefix: string, params: Record<string, any>, data: T, ttl?: number): void {
    const key = this.generateKey(prefix, params);
    
    // Limpiar cache si excede el tamaño máximo
    if (this.memoryCache.size >= this.maxSize) {
      this.cleanup();
    }

    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    });
  }

  // Invalidar cache por prefijo
  invalidate(prefix: string): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(`${prefix}:`)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.memoryCache.delete(key));
  }

  // Limpiar entradas expiradas
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.memoryCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.memoryCache.delete(key));

    // Si aún excede el tamaño, eliminar las entradas más antiguas
    if (this.memoryCache.size >= this.maxSize) {
      const entries = Array.from(this.memoryCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = entries.slice(0, Math.floor(this.maxSize / 2));
      toRemove.forEach(([key]) => this.memoryCache.delete(key));
    }
  }

  // Limpiar todo el cache
  clear(): void {
    this.memoryCache.clear();
  }

  // Obtener estadísticas del cache
  getStats() {
    const now = Date.now();
    let expired = 0;
    let active = 0;

    for (const entry of this.memoryCache.values()) {
      if (now - entry.timestamp > entry.ttl) {
        expired++;
      } else {
        active++;
      }
    }

    return {
      total: this.memoryCache.size,
      active,
      expired,
      maxSize: this.maxSize
    };
  }
}

// Instancia global del cache manager
export const cacheManager = new CacheManager({
  ttl: 5 * 60 * 1000, // 5 minutos
  maxSize: 50 // 50 entradas máximo
});

// Prefijos para diferentes tipos de datos
export const CACHE_PREFIXES = {
  MAIN_METRICS: 'main_metrics',
  PROJECTS: 'projects',
  CUT_PRODUCTIVITY: 'cut_productivity',
  MANUFACTURING_PRODUCTIVITY: 'manufacturing_productivity',
  CNC_PRODUCTIVITY: 'cnc_productivity',
  MAIN_CHART: 'main_chart',
  CUT_CHART: 'cut_chart',
  MANUFACTURING_CHART: 'manufacturing_chart',
  CNC_CHART: 'cnc_chart',
  ORDERS_BY_PROJECT: 'orders_by_project'
} as const;

// Utilidades para TTL específicos
export const CACHE_TTL = {
  SHORT: 2 * 60 * 1000, // 2 minutos - para datos que cambian frecuentemente
  MEDIUM: 5 * 60 * 1000, // 5 minutos - para datos estándar
  LONG: 15 * 60 * 1000, // 15 minutos - para datos que cambian poco
  VERY_LONG: 60 * 60 * 1000 // 1 hora - para datos estáticos
} as const;
