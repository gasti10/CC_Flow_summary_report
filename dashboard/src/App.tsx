import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import ErrorBoundary from './components/Common/ErrorBoundary'
import './App.css'
import ProgressiveLoader from './components/Common/ProgressiveLoader'
import ProjectSummary from './components/ProjectSummary/ProjectSummary'
import OrderDelivery from './components/OrderDelivery/OrderDelivery'
import DataPreloader from './components/Common/DataPreloader'
import LogoMenu from './components/Common/LogoMenu'
import { getRouteConfig } from './config/routeConfig'
import { useState, useEffect } from 'react'

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
    }
  ];

  // Efecto para manejar la animación de entrada dramática
  useEffect(() => {
    const { animationDuration } = currentRouteConfig;
    
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
                <Route path="/" element={
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
                } />
                <Route path="/order-delivery" element={<OrderDelivery />} />
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
      <Router>
        <AppContent />
      </Router>
      
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

export default App
