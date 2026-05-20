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
  },
  '/safety/documents': {
    name: 'safety-documents',
    animationDuration: 0,
    showDataPreloader: false,
    loadingText: 'Loading Safety Documents...',
    showHeader: false
  },
  '/safety': {
    name: 'safety-home',
    animationDuration: 0,
    showDataPreloader: false,
    loadingText: 'Loading Safety Hub...',
    showHeader: false
  },
  '/safety/documents/:documentId': {
    name: 'safety-document-detail',
    animationDuration: 0,
    showDataPreloader: false,
    loadingText: 'Loading Safety Document...',
    showHeader: false
  },
  '/safety/projects': {
    name: 'safety-projects',
    animationDuration: 0,
    showDataPreloader: false,
    loadingText: 'Loading Safety Projects...',
    showHeader: false
  },
  '/safety/projects/:projectName/members': {
    name: 'safety-project-members',
    animationDuration: 0,
    showDataPreloader: false,
    loadingText: 'Loading Project Members...',
    showHeader: false
  },
  '/safety/projects/:projectName/schedules/new': {
    name: 'safety-schedule-create',
    animationDuration: 0,
    showDataPreloader: false,
    loadingText: 'Loading Schedule Creator...',
    showHeader: false
  },
  '/safety/schedules/new': {
    name: 'safety-schedule-create',
    animationDuration: 0,
    showDataPreloader: false,
    loadingText: 'Loading Schedule Creator...',
    showHeader: false
  },
  '/safety/schedules/:scheduleId': {
    name: 'safety-schedule-detail',
    animationDuration: 0,
    showDataPreloader: false,
    loadingText: 'Loading Safety Schedule...',
    showHeader: false
  },
  '/safety/my-assignments': {
    name: 'safety-worker-assignments',
    animationDuration: 0,
    showDataPreloader: false,
    loadingText: 'Loading My Assignments...',
    showHeader: false
  },
  '/safety/my-assignments/:scheduleWorkerId': {
    name: 'safety-worker-assignment-detail',
    animationDuration: 0,
    showDataPreloader: false,
    loadingText: 'Loading Assignment...',
    showHeader: false
  }
} as const;

// Helper function to get route configuration
export const getRouteConfig = (pathname: string): RouteConfig => {
  if (/^\/site-orders-planner\/.+/.test(pathname)) {
    return ROUTE_CONFIG['/site-orders-planner/:planId'];
  }
  if (/^\/safety\/documents\/.+/.test(pathname)) {
    return ROUTE_CONFIG['/safety/documents/:documentId'];
  }
  if (/^\/safety\/projects\/.+\/members/.test(pathname)) {
    return ROUTE_CONFIG['/safety/projects/:projectName/members'];
  }
  if (/^\/safety\/projects\/.+\/schedules\/new/.test(pathname)) {
    return ROUTE_CONFIG['/safety/projects/:projectName/schedules/new'];
  }
  if (pathname === '/safety/schedules/new') {
    return ROUTE_CONFIG['/safety/schedules/new'];
  }
  if (/^\/safety\/schedules\/.+/.test(pathname)) {
    return ROUTE_CONFIG['/safety/schedules/:scheduleId'];
  }
  if (pathname === '/safety/my-assignments') {
    return ROUTE_CONFIG['/safety/my-assignments'];
  }
  if (/^\/safety\/my-assignments\/.+/.test(pathname)) {
    return ROUTE_CONFIG['/safety/my-assignments/:scheduleWorkerId'];
  }
  const map = ROUTE_CONFIG as Record<string, RouteConfig>
  return map[pathname] ?? ROUTE_CONFIG['/']
} 