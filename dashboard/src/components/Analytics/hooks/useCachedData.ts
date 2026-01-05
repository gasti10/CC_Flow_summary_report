import { useState, useEffect, useCallback } from 'react';
import { supabaseApi } from '../../../services/supabaseApi';
import { cacheManager, CACHE_PREFIXES, CACHE_TTL } from '../utils/CacheManager';
import type { MainMetrics, ProjectSummary, ProductivityData } from '../../../types/supabase';

interface UseCachedDataOptions {
  ttl?: number;
  forceRefresh?: boolean;
}

// Hook para métricas principales con cache
export const useCachedMainMetrics = (
  startDate: string, 
  endDate: string, 
  options: UseCachedDataOptions = {}
) => {
  const [data, setData] = useState<MainMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const cacheKey = { startDate, endDate };
    
    // Intentar obtener del cache primero
    if (!options.forceRefresh) {
      const cachedData = cacheManager.get<MainMetrics>(
        CACHE_PREFIXES.MAIN_METRICS, 
        cacheKey
      );
      
      if (cachedData) {
        setData(cachedData);
        setLoading(false);
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);

      const result = await supabaseApi.getMainMetrics(startDate, endDate);
      
      // Guardar en cache
      cacheManager.set(
        CACHE_PREFIXES.MAIN_METRICS,
        cacheKey,
        result,
        options.ttl || CACHE_TTL.MEDIUM
      );

      setData(result);
    } catch (err) {
      console.error('Error fetching main metrics:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, options.forceRefresh, options.ttl]);

  useEffect(() => {
    if (startDate && endDate) {
      fetchData();
    }
  }, [fetchData, startDate, endDate]);

  return { data, loading, error, refetch: fetchData };
};

// Hook para proyectos con cache
export const useCachedProjects = (
  startDate: string, 
  endDate: string, 
  options: UseCachedDataOptions = {}
) => {
  const [data, setData] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const cacheKey = { startDate, endDate };
    
    if (!options.forceRefresh) {
      const cachedData = cacheManager.get<ProjectSummary[]>(
        CACHE_PREFIXES.PROJECTS, 
        cacheKey
      );
      
      if (cachedData) {
        setData(cachedData);
        setLoading(false);
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);

      const result = await supabaseApi.getProjectsWithMetrics(startDate, endDate);
      
      cacheManager.set(
        CACHE_PREFIXES.PROJECTS,
        cacheKey,
        result,
        options.ttl || CACHE_TTL.MEDIUM
      );

      setData(result);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, options.forceRefresh, options.ttl]);

  useEffect(() => {
    if (startDate && endDate) {
      fetchData();
    }
  }, [fetchData, startDate, endDate]);

  return { data, loading, error, refetch: fetchData };
};

// Hook para productividad de corte con cache
export const useCachedCutProductivity = (
  startDate: string, 
  endDate: string, 
  options: UseCachedDataOptions = {}
) => {
  const [data, setData] = useState<ProductivityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const cacheKey = { startDate, endDate };
    
    if (!options.forceRefresh) {
      const cachedData = cacheManager.get<ProductivityData[]>(
        CACHE_PREFIXES.CUT_PRODUCTIVITY, 
        cacheKey
      );
      
      if (cachedData) {
        setData(cachedData);
        setLoading(false);
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);

      const result = await supabaseApi.getCutProductivityByResponsible(startDate, endDate);
      
      cacheManager.set(
        CACHE_PREFIXES.CUT_PRODUCTIVITY,
        cacheKey,
        result,
        options.ttl || CACHE_TTL.SHORT
      );

      setData(result);
    } catch (err) {
      console.error('Error fetching cut productivity:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, options.forceRefresh, options.ttl]);

  useEffect(() => {
    if (startDate && endDate) {
      fetchData();
    }
  }, [fetchData, startDate, endDate]);

  return { data, loading, error, refetch: fetchData };
};

// Hook para productividad de manufactura con cache
export const useCachedManufacturingProductivity = (
  startDate: string, 
  endDate: string, 
  options: UseCachedDataOptions = {}
) => {
  const [data, setData] = useState<ProductivityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const cacheKey = { startDate, endDate };
    
    if (!options.forceRefresh) {
      const cachedData = cacheManager.get<ProductivityData[]>(
        CACHE_PREFIXES.MANUFACTURING_PRODUCTIVITY, 
        cacheKey
      );
      
      if (cachedData) {
        setData(cachedData);
        setLoading(false);
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);

      const result = await supabaseApi.getManufacturingProductivityByResponsible(startDate, endDate);
      
      cacheManager.set(
        CACHE_PREFIXES.MANUFACTURING_PRODUCTIVITY,
        cacheKey,
        result,
        options.ttl || CACHE_TTL.SHORT
      );

      setData(result);
    } catch (err) {
      console.error('Error fetching manufacturing productivity:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, options.forceRefresh, options.ttl]);

  useEffect(() => {
    if (startDate && endDate) {
      fetchData();
    }
  }, [fetchData, startDate, endDate]);

  return { data, loading, error, refetch: fetchData };
};

// Hook para productividad CNC con cache
export const useCachedCNCProductivity = (
  startDate: string, 
  endDate: string, 
  options: UseCachedDataOptions = {}
) => {
  const [data, setData] = useState<ProductivityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const cacheKey = { startDate, endDate };
    
    if (!options.forceRefresh) {
      const cachedData = cacheManager.get<ProductivityData[]>(
        CACHE_PREFIXES.CNC_PRODUCTIVITY, 
        cacheKey
      );
      
      if (cachedData) {
        setData(cachedData);
        setLoading(false);
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);

      const result = await supabaseApi.getCutProductivityByCNC(startDate, endDate);
      
      cacheManager.set(
        CACHE_PREFIXES.CNC_PRODUCTIVITY,
        cacheKey,
        result,
        options.ttl || CACHE_TTL.SHORT
      );

      setData(result);
    } catch (err) {
      console.error('Error fetching CNC productivity:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, options.forceRefresh, options.ttl]);

  useEffect(() => {
    if (startDate && endDate) {
      fetchData();
    }
  }, [fetchData, startDate, endDate]);

  return { data, loading, error, refetch: fetchData };
};

// Hook para invalidar cache específico
export const useCacheInvalidation = () => {
  const invalidateMainMetrics = useCallback(() => {
    cacheManager.invalidate(CACHE_PREFIXES.MAIN_METRICS);
  }, []);

  const invalidateProjects = useCallback(() => {
    cacheManager.invalidate(CACHE_PREFIXES.PROJECTS);
  }, []);

  const invalidateCutData = useCallback(() => {
    cacheManager.invalidate(CACHE_PREFIXES.CUT_PRODUCTIVITY);
    cacheManager.invalidate(CACHE_PREFIXES.CUT_CHART);
  }, []);

  const invalidateManufacturingData = useCallback(() => {
    cacheManager.invalidate(CACHE_PREFIXES.MANUFACTURING_PRODUCTIVITY);
    cacheManager.invalidate(CACHE_PREFIXES.MANUFACTURING_CHART);
  }, []);

  const invalidateCNCData = useCallback(() => {
    cacheManager.invalidate(CACHE_PREFIXES.CNC_PRODUCTIVITY);
    cacheManager.invalidate(CACHE_PREFIXES.CNC_CHART);
  }, []);

  const invalidateAll = useCallback(() => {
    cacheManager.clear();
  }, []);

  const getCacheStats = useCallback(() => {
    return cacheManager.getStats();
  }, []);

  return {
    invalidateMainMetrics,
    invalidateProjects,
    invalidateCutData,
    invalidateManufacturingData,
    invalidateCNCData,
    invalidateAll,
    getCacheStats
  };
};
