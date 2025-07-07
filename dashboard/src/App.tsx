import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import ProjectSelector from './components/Common/ProjectSelector'
import ErrorBoundary from './components/Common/ErrorBoundary'
import './App.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="App">
          <ErrorBoundary>
            <header className="App-header">
              <h1>CC Projects Dashboard</h1>
            </header>
            
            <main className="App-main">
              <Routes>
                <Route path="/" element={
                  <div className="dashboard-container">
                    <ProjectSelector onProjectSelect={(project) => {
                      // Handle project selection
                      console.log('Selected project:', project)
                    }} />
                    
                    <div className="dashboard-content">
                      <p>Dashboard content will be loaded here...</p>
                    </div>
                  </div>
                } />
              </Routes>
            </main>
          </ErrorBoundary>
        </div>
      </Router>
      
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

export default App
