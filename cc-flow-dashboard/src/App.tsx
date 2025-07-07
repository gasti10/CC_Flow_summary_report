import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ErrorBoundary from './components/Common/ErrorBoundary'
import ProjectSummary from './components/ProjectSummary/ProjectSummary'
import ProgressiveLoader from './components/Common/ProgressiveLoader'
import './styles/global.css'
import './styles/layout-optimizations.css'
import './styles/mobile-optimizations.css'
import './App.css'

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
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <Router>
          <div className="App">
            <ProgressiveLoader>
              <header className="main-header">
                <div className="header-left">
                  <img src="/CC-logo-NEW_1.webp" alt="Decorative CC Logo" className="header-deco" />
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
                <Route path="/project/:projectId" element={<ProjectSummary />} />
              </Routes>
            </ProgressiveLoader>
          </div>
        </Router>
      </ErrorBoundary>
    </QueryClientProvider>
  )
}

export default App
