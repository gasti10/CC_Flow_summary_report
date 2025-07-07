import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// Configuración específica para producción
export default defineConfig({
  plugins: [react()],
  base: '/cc-flow-dashboard/',
  build: {
    outDir: 'dist',
    target: 'es2015',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['chart.js', 'react-chartjs-2'],
          query: ['@tanstack/react-query'],
          router: ['react-router-dom']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'chart.js', 'react-chartjs-2']
  },
  // Configuraciones específicas para producción
  define: {
    'process.env.NODE_ENV': '"production"'
  }
}) 