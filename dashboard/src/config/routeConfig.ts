// Route configuration for different page behaviors
export interface RouteConfig {
  name: string;
  animationDuration: number;
  showDataPreloader: boolean;
  loadingText: string;
  showHeader: boolean;
}

export const ROUTE_CONFIG: Record<string, RouteConfig> = {
  '/': {
    name: 'main',
    animationDuration: 4000,
    showDataPreloader: true,
    loadingText: 'Loading projects...',
    showHeader: true
  },
  '/order-delivery': {
    name: 'order-delivery',
    animationDuration: 1200,
    showDataPreloader: false,
    loadingText: 'Loading...',
    showHeader: false
  },
  '/analytics': {
    name: 'analytics',
    animationDuration: 1200,
    showDataPreloader: false,
    loadingText: 'Loading CC Analytics...',
    showHeader: false
  },
  '/login': {
    name: 'login',
    animationDuration: 0,
    showDataPreloader: false,
    loadingText: '',
    showHeader: false
  },
  '/creator-of-orders': {
    name: 'creator-of-orders',
    animationDuration: 1200,
    showDataPreloader: false,
    loadingText: 'Loading...',
    showHeader: false
  },
  '/work-order-planner': {
    name: 'work-order-planner',
    animationDuration: 1200,
    showDataPreloader: false,
    loadingText: 'Loading CC Work Order Planner...',
    showHeader: false
  },
  '/work-order-planner/:orderId': {
    name: 'work-order-planner-detail',
    animationDuration: 0,
    showDataPreloader: false,
    loadingText: 'Loading CC Work Order Detail...',
    showHeader: false
  },
  '/site-orders-planner': {
    name: 'site-orders-planner',
    animationDuration: 1200,
    showDataPreloader: false,
    loadingText: 'Loading Site Orders Planner...',
    showHeader: false
  },
  '/site-orders-planner/:planId': {
    name: 'site-orders-planner-detail',
    animationDuration: 0,
    showDataPreloader: false,
    loadingText: 'Loading Site Order Plan...',
    showHeader: false
  }
} as const;

// Helper function to get route configuration
export const getRouteConfig = (pathname: string): RouteConfig => {
  if (/^\/site-orders-planner\/.+/.test(pathname)) {
    return ROUTE_CONFIG['/site-orders-planner/:planId'];
  }
  const map = ROUTE_CONFIG as Record<string, RouteConfig>
  return map[pathname] ?? ROUTE_CONFIG['/']
} 