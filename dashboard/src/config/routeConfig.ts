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
  }
} as const;

// Helper function to get route configuration
export const getRouteConfig = (pathname: string): RouteConfig => {
  return ROUTE_CONFIG[pathname] || ROUTE_CONFIG['/'];
}; 