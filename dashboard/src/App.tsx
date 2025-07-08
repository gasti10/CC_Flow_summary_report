import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import ErrorBoundary from './components/Common/ErrorBoundary'
import './App.css'
import ProgressiveLoader from './components/Common/ProgressiveLoader'
import ProjectSummary from './components/ProjectSummary/ProjectSummary'
import DataPreloader from './components/Common/DataPreloader'
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

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);
  const [animationPhase, setAnimationPhase] = useState(0);

  // Determinar el basename automáticamente basado en la URL actual
  const getBasename = () => {
    const pathname = window.location.pathname;
    if (pathname.includes('/CC_Flow_summary_report/dashboard')) {
      return '/CC_Flow_summary_report/dashboard';
    }
    return '';
  };
  
  const basename = getBasename();
  
  // Determinar la ruta de la imagen automáticamente
  const getLogoPath = () => {
    const pathname = window.location.pathname;
    if (pathname.includes('/CC_Flow_summary_report/dashboard')) {
      return '/CC_Flow_summary_report/dashboard/CC-logo-NEW_1.webp';
    }
    return '/CC-logo-NEW_1.webp';
  };
  
  const logoPath = getLogoPath();

  // Efecto para manejar la animación de entrada dramática
  useEffect(() => {
    // Fase 1: Oscuro (0-2s)
    const phase1 = setTimeout(() => {
      setAnimationPhase(1);
    }, 1000);

    // Fase 2: Naranja (2-4s)
    const phase2 = setTimeout(() => {
      setAnimationPhase(2);
    }, 2000);

    // Fase 3: Oscuro (4-6s)
    const phase3 = setTimeout(() => {
      setAnimationPhase(3);
    }, 3000);

    // Fase 4: Naranja (6-7.5s)
    const phase4 = setTimeout(() => {
      setAnimationPhase(4);
    }, 4000);

    // Final: Mostrar contenido (7.5s)
    const final = setTimeout(() => {
      setIsLoading(false);
      setTimeout(() => {
        setShowContent(true);
      }, 500);
    }, 4000);

    return () => {
      clearTimeout(phase1);
      clearTimeout(phase2);
      clearTimeout(phase3);
      clearTimeout(phase4);
      clearTimeout(final);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Router basename={basename}>
        <div className={`App ${isLoading ? 'loading' : 'loaded'}`}>
          <ErrorBoundary>
            {/* Precargar datos en background */}
            <DataPreloader />
            
            {/* Pantalla de carga inicial */}
            {isLoading && (
              <div className={`loading-screen phase-${animationPhase}`}>
                <div className="loading-content">
                  <img src={logoPath} alt="CC Logo" className="loading-logo" />
                  <div className="loading-subtitle">Loading projects...</div>
                </div>
              </div>
            )}

            {/* Contenido principal */}
            {showContent && (
              <>
                <ProgressiveLoader>
                  <header className="main-header">
                    <div className="header-left">
                      <img src={logoPath} alt="Decorative CC Logo" className="header-deco" />
                    </div>
                    <nav className="header-nav">
                      {sections.map((section) => (
                        <button key={section.id} className="nav-link" onClick={() => scrollToSection(section.id)}>
                          {section.label}
                        </button>
                      ))}
                    </nav>
                  </header>
                  <Routes>
                    <Route path="/" element={<ProjectSummary />} />
                  </Routes>
                </ProgressiveLoader>
              </>
            )}
          </ErrorBoundary>
        </div>
      </Router>
      
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

export default App
