// Route configuration for different page behaviors
export interface RouteConfig {
  name: string;
  animationDuration: number;
  showDataPreloader: boolean;
  loadingText: string;
  showHeader: boolean;
  /** When true, show "prefer larger screen" notice on narrow viewports */
  preferLargeScreen?: boolean;
}

export const ROUTE_CONFIG: Record<string, RouteConfig> = {
  '/': {
    name: 'main',
    animationDuration: 4000,
    showDataPreloader: true,
    loadingText: 'Loading projects...',
    showHeader: true,
    preferLargeScreen: true
  },
  '/order-delivery': {
    name: 'order-delivery',
    animationDuration: 1200,
    showDataPreloader: false,
    loadingText: 'Loading...',
    showHeader: false,
    preferLargeScreen: false
  },
  '/analytics': {
    name: 'analytics',
    animationDuration: 1200,
    showDataPreloader: false,
    loadingText: 'Loading CC Analytics...',
    showHeader: false,
    preferLargeScreen: true
  },
  '/login': {
    name: 'login',
    animationDuration: 0,
    showDataPreloader: false,
    loadingText: '',
    showHeader: false,
    preferLargeScreen: false
  },
  '/creator-of-orders': {
    name: 'creator-of-orders',
    animationDuration: 1200,
    showDataPreloader: false,
    loadingText: 'Loading...',
    showHeader: false,
    preferLargeScreen: true
  },
  '/work-order-planner': {
    name: 'work-order-planner',
    animationDuration: 1200,
    showDataPreloader: false,
    loadingText: 'Loading CC Work Order Planner...',
    showHeader: false,
    preferLargeScreen: true
  },
  '/work-order-planner/:orderId': {
    name: 'work-order-planner-detail',
    animationDuration: 0,
    showDataPreloader: false,
    loadingText: 'Loading CC Work Order Detail...',
    showHeader: false,
    preferLargeScreen: true
  },
  '/site-orders-planner': {
    name: 'site-orders-planner',
    animationDuration: 1200,
    showDataPreloader: false,
    loadingText: 'Loading Site Orders Planner...',
    showHeader: false,
    preferLargeScreen: true
  },
  '/site-orders-planner/:planId': {
    name: 'site-orders-planner-detail',
    animationDuration: 0,
    showDataPreloader: false,
    loadingText: 'Loading Site Order Plan...',
    showHeader: false,
    preferLargeScreen: true
  },
  '/safety/documents': {
    name: 'safety-documents',
    animationDuration: 0,
    showDataPreloader: false,
    loadingText: 'Loading Safety Documents...',
    showHeader: false,
    preferLargeScreen: true
  },
  '/safety': {
    name: 'safety-home',
    animationDuration: 0,
    showDataPreloader: false,
    loadingText: 'Loading Safety Hub...',
    showHeader: false,
    preferLargeScreen: false
  },
  '/safety/documents/:documentId': {
    name: 'safety-document-detail',
    animationDuration: 0,
    showDataPreloader: false,
    loadingText: 'Loading Safety Document...',
    showHeader: false,
    preferLargeScreen: false
  },
  '/safety/projects': {
    name: 'safety-projects',
    animationDuration: 0,
    showDataPreloader: false,
    loadingText: 'Loading Safety Projects...',
    showHeader: false,
    preferLargeScreen: false
  },
  '/safety/projects/:projectName/members': {
    name: 'safety-project-members',
    animationDuration: 0,
    showDataPreloader: false,
    loadingText: 'Loading Project Members...',
    showHeader: false,
    preferLargeScreen: true
  },
  '/safety/people': {
    name: 'safety-people',
    animationDuration: 0,
    showDataPreloader: false,
    loadingText: 'Loading Safety People...',
    showHeader: false,
    preferLargeScreen: true
  },
  '/safety/projects/:projectName/schedules/new': {
    name: 'safety-schedule-create',
    animationDuration: 0,
    showDataPreloader: false,
    loadingText: 'Loading Schedule Creator...',
    showHeader: false,
    preferLargeScreen: false
  },
  '/safety/schedules/new': {
    name: 'safety-schedule-create',
    animationDuration: 0,
    showDataPreloader: false,
    loadingText: 'Loading Schedule Creator...',
    showHeader: false,
    preferLargeScreen: false
  },
  '/safety/schedules/:scheduleId': {
    name: 'safety-schedule-detail',
    animationDuration: 0,
    showDataPreloader: false,
    loadingText: 'Loading Safety Schedule...',
    showHeader: false,
    preferLargeScreen: false
  },
  '/safety/my-assignments': {
    name: 'safety-worker-assignments',
    animationDuration: 0,
    showDataPreloader: false,
    loadingText: 'Loading My Assignments...',
    showHeader: false,
    preferLargeScreen: false
  },
  '/safety/my-assignments/:scheduleWorkerId': {
    name: 'safety-worker-assignment-detail',
    animationDuration: 0,
    showDataPreloader: false,
    loadingText: 'Loading Assignment...',
    showHeader: false,
    preferLargeScreen: false
  },
  '/safety/pre-start': {
    name: 'safety-pre-start',
    animationDuration: 0,
    showDataPreloader: false,
    loadingText: 'Loading Pre-Start...',
    showHeader: false,
    preferLargeScreen: false
  },
  '/safety/pre-start/new': {
    name: 'safety-pre-start-new',
    animationDuration: 0,
    showDataPreloader: false,
    loadingText: 'Loading Pre-Start Form...',
    showHeader: false,
    preferLargeScreen: false
  },
  '/safety/toolbox-talk/new': {
    name: 'safety-toolbox-talk-new',
    animationDuration: 0,
    showDataPreloader: false,
    loadingText: 'Loading Toolbox Talk...',
    showHeader: false,
    preferLargeScreen: false
  },
  '/safety/projects/:projectName/series/:seriesId': {
    name: 'safety-series-detail',
    animationDuration: 0,
    showDataPreloader: false,
    loadingText: 'Loading Series...',
    showHeader: false,
    preferLargeScreen: false
  }
} as const;

// Helper function to get route configuration
export const getRouteConfig = (pathname: string): RouteConfig => {
  if (/^\/work-order-planner\/.+/.test(pathname)) {
    return ROUTE_CONFIG['/work-order-planner/:orderId'];
  }
  if (/^\/site-orders-planner\/.+/.test(pathname)) {
    return ROUTE_CONFIG['/site-orders-planner/:planId'];
  }
  if (/^\/safety\/documents\/.+/.test(pathname)) {
    return ROUTE_CONFIG['/safety/documents/:documentId'];
  }
  if (/^\/safety\/projects\/.+\/members/.test(pathname)) {
    return ROUTE_CONFIG['/safety/projects/:projectName/members'];
  }
  if (/^\/safety\/projects\/.+\/series\/.+/.test(pathname)) {
    return ROUTE_CONFIG['/safety/projects/:projectName/series/:seriesId'];
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
  if (pathname === '/safety/pre-start') {
    return ROUTE_CONFIG['/safety/pre-start'];
  }
  if (pathname === '/safety/pre-start/new') {
    return ROUTE_CONFIG['/safety/pre-start/new'];
  }
  if (pathname === '/safety/toolbox-talk/new') {
    return ROUTE_CONFIG['/safety/toolbox-talk/new'];
  }
  const map = ROUTE_CONFIG as Record<string, RouteConfig>
  return map[pathname] ?? ROUTE_CONFIG['/']
}
