import { useState, useEffect, useCallback } from 'react';
import { supabaseApi } from '../../../services/supabaseApi';
import { cacheManager, CACHE_PREFIXES, CACHE_TTL } from '../utils/CacheManager';
import type { OrderSummary } from '../../../types/supabase';

interface UseProjectOrdersOptions {
  ttl?: number;
  forceRefresh?: boolean;
}

export const useProjectOrders = (
  projectName: string,
  startDate: string,
  endDate: string,
  options: UseProjectOrdersOptions = {}
) => {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!projectName || !startDate || !endDate) {
      setOrders([]);
      return;
    }

    const cacheKey = { projectName, startDate, endDate };
    
    if (!options.forceRefresh) {
      const cachedOrders = cacheManager.get<OrderSummary[]>(
        CACHE_PREFIXES.ORDERS_BY_PROJECT,
        cacheKey
      );
      
      if (cachedOrders) {
        setOrders(cachedOrders);
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);

      const result = await supabaseApi.getOrdersByProject(projectName, startDate, endDate);
      
      cacheManager.set(
        CACHE_PREFIXES.ORDERS_BY_PROJECT,
        cacheKey,
        result,
        options.ttl || CACHE_TTL.MEDIUM
      );

      setOrders(result);
    } catch (err) {
      console.error('Error fetching project orders:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [projectName, startDate, endDate, options.forceRefresh, options.ttl]);

  useEffect(() => {
    if (projectName && startDate && endDate) {
      fetchOrders();
    }
  }, [fetchOrders, projectName, startDate, endDate]);

  return { 
    orders, 
    loading, 
    error, 
    refetch: fetchOrders 
  };
};
