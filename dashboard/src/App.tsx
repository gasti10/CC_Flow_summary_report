import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import ErrorBoundary from './components/Common/ErrorBoundary'
import './App.css'
import ProgressiveLoader from './components/Common/ProgressiveLoader'
import ProjectSummary from './components/ProjectSummary/ProjectSummary'
import OrderDelivery from './components/OrderDelivery/OrderDelivery'
import { Analytics } from './components/Analytics'
import DataPreloader from './components/Common/DataPreloader'
import LogoMenu from './components/Common/LogoMenu'
import { getRouteConfig } from './config/routeConfig'
import { useState, useEffect } from 'react'
import { AuthProvider } from './context/AuthContext'
import Login from './components/Auth/Login'
import ProtectedRoute from './components/Auth/ProtectedRoute'
import CreatorOfOrders from './components/CreatorOfOrders/CreatorOfOrders'
import WorkOrderPlanner from './components/WorkOrderPlanner/WorkOrderPlanner'
import WorkOrderDetail from './components/WorkOrderPlanner/WorkOrderDetail'
import SiteOrdersPlannerHub from './components/SiteOrdersPlanner/SiteOrdersPlannerHub'
import SiteOrderPlanDetail from './components/SiteOrdersPlanner/SiteOrderPlanDetail'
import SafetyHomePage from './components/Safety/SafetyHomePage'
import DocumentsListPage from './components/Safety/Documents/DocumentsListPage'
import DocumentDetailPage from './components/Safety/Documents/DocumentDetailPage'
import ProjectsSchedulesPage from './components/Safety/Projects/ProjectsSchedulesPage'
import ProjectMembersPage from './components/Safety/Projects/ProjectMembersPage'
import ScheduleCreatePage from './components/Safety/Schedules/ScheduleCreatePage'
import ScheduleDetailPage from './components/Safety/Schedules/ScheduleDetailPage'
import WorkerHomePage from './components/Safety/Worker/WorkerHomePage'
import WorkerAssignmentPage from './components/Safety/Worker/WorkerAssignmentPage'

// Configurar QueryClient con optimizaciones
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000, // 10 minutos
      gcTime: 30 * 60 * 1000, // 30 minutos
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    },
  },
})

const sections = [
  { id: 'cutting-information', label: 'Cutting Information' },
  { id: 'sheets', label: 'Sheets' },
  { id: 'project-allowances-section', label: 'Allowances' },
  { id: 'material-tables', label: 'Material' },
  { id: 'trips-over-time', label: 'Trips' },
];

const scrollToSection = (id: string) => {
  const el = document.getElementById(id);
  const header = document.querySelector('.main-header');
  if (el && header) {
    const headerHeight = (header as HTMLElement).offsetHeight;
    const y = el.getBoundingClientRect().top + window.scrollY - headerHeight - 8;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }
};

// Componente interno para manejar la lógica de rutas
function AppContent() {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);
  const [animationPhase, setAnimationPhase] = useState(0);
  
  // Obtener configuración de la ruta actual
  const currentRouteConfig = getRouteConfig(location.pathname);
  
  // Ruta de la imagen dinámicamente según el entorno
  const getLogoPath = () => {
    // En desarrollo (localhost), usar ruta relativa
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return '/CC-logo-NEW_1.webp';
    }
    // En producción (GitHub Pages), usar ruta completa
    return '/CC_Flow_summary_report/CC-logo-NEW_1.webp';
  };
  
  const logoPath = getLogoPath();

  // Definir elementos del menú
  const menuItems = [
    {
      id: 'order-delivery',
      label: 'Order Delivery',
      path: '/order-delivery',
      icon: '🚛'
    },
    {
      id: 'analytics',
      label: 'CC Analytics',
      path: '/analytics',
      icon: '📈'
    },
    {
      id: 'work-order-planner',
      label: 'Work Order Planner',
      path: '/work-order-planner',
      icon: '📋'
    },
    {
      id: 'safety-swms',
      label: 'Safety/SWMS',
      path: '/safety',
      icon: '🦺'
    }
  ];

  // Efecto para manejar la animación de entrada dramática
  useEffect(() => {
    const { animationDuration } = currentRouteConfig;
    
    // Saltar animaciones para rutas de autenticación
    if (animationDuration === 0) {
      setIsLoading(false);
      setShowContent(true);
      return;
    }
    
    // Calcular tiempos de animación basados en la duración configurada
    const phase1Time = animationDuration * 0.25;
    const phase2Time = animationDuration * 0.5;
    const phase3Time = animationDuration * 0.75;
    const finalTime = animationDuration;
    
    const phase1 = setTimeout(() => {
      setAnimationPhase(1);
    }, phase1Time);

    const phase2 = setTimeout(() => {
      setAnimationPhase(2);
    }, phase2Time);

    const phase3 = setTimeout(() => {
      setAnimationPhase(3);
    }, phase3Time);

    const final = setTimeout(() => {
      setIsLoading(false);
      setTimeout(() => {
        setShowContent(true);
      }, 200);
    }, finalTime);

    return () => {
      clearTimeout(phase1);
      clearTimeout(phase2);
      clearTimeout(phase3);
      clearTimeout(final);
    };
  }, [currentRouteConfig]);

  return (
    <div className={`App ${isLoading ? 'loading' : 'loaded'}`}>
      <ErrorBoundary>
        {/* Precargar datos en background según configuración de ruta */}
        {currentRouteConfig.showDataPreloader && <DataPreloader />}
        
        {/* Pantalla de carga inicial */}
        {isLoading && (
          <div className={`loading-screen phase-${animationPhase}`}>
            <div className="loading-content">
              <img src={logoPath} alt="CC Logo" className="loading-logo" />
              <div className="loading-subtitle">
                {currentRouteConfig.loadingText}
              </div>
            </div>
          </div>
        )}

        {/* Contenido principal */}
        {showContent && (
          <>
            <ProgressiveLoader>
              <Routes>
                {/* Ruta principal protegida (ProjectSummary) */}
                <Route path="/" element={
                  <ProtectedRoute>
                    <>
                      {currentRouteConfig.showHeader && (
                        <header className="main-header">
                          <div className="header-left">
                            <LogoMenu logoPath={logoPath} menuItems={menuItems} />
                          </div>
                          <nav className="header-nav">
                            {sections.map((section) => (
                              <button key={section.id} className="nav-link" onClick={() => scrollToSection(section.id)}>
                                {section.label}
                              </button>
                            ))}
                          </nav>
                        </header>
                      )}
                      <ProjectSummary />
                    </>
                  </ProtectedRoute>
                } />
                <Route path="/order-delivery" element={<OrderDelivery />} />
                <Route path="/analytics" element={<Analytics />} />
                
                {/* Rutas de autenticación */}
                <Route path="/login" element={<Login />} />
                
                {/* Rutas protegidas */}
                <Route 
                  path="/creator-of-orders" 
                  element={
                    <ProtectedRoute>
                      <CreatorOfOrders />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/work-order-planner" 
                  element={
                    <ProtectedRoute>
                      <WorkOrderPlanner />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/work-order-planner/:orderId" 
                  element={
                    <ProtectedRoute>
                      <WorkOrderDetail />
                    </ProtectedRoute>
                  } 
                />
                <Route
                  path="/site-orders-planner"
                  element={
                    <ProtectedRoute>
                      <SiteOrdersPlannerHub />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/site-orders-planner/:planId"
                  element={
                    <ProtectedRoute>
                      <SiteOrderPlanDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/safety"
                  element={
                    <ProtectedRoute>
                      <SafetyHomePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/safety/documents"
                  element={
                    <ProtectedRoute>
                      <DocumentsListPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/safety/documents/:documentId"
                  element={
                    <ProtectedRoute>
                      <DocumentDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/safety/projects"
                  element={
                    <ProtectedRoute>
                      <ProjectsSchedulesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/safety/projects/:projectName/members"
                  element={
                    <ProtectedRoute>
                      <ProjectMembersPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/safety/projects/:projectName/schedules/new"
                  element={
                    <ProtectedRoute>
                      <ScheduleCreatePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/safety/schedules/new"
                  element={
                    <ProtectedRoute>
                      <ScheduleCreatePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/safety/schedules/:scheduleId"
                  element={
                    <ProtectedRoute>
                      <ScheduleDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/safety/my-assignments"
                  element={
                    <ProtectedRoute>
                      <WorkerHomePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/safety/my-assignments/:scheduleWorkerId"
                  element={
                    <ProtectedRoute>
                      <WorkerAssignmentPage />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </ProgressiveLoader>
          </>
        )}
      </ErrorBoundary>
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
        
        <ReactQueryDevtools initialIsOpen={false} />
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
