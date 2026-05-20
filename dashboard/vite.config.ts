import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Base path diferente según el entorno
  const base = mode === 'production' 
    ? '/CC_Flow_summary_report/' 
    : '/'

  return {
    plugins: [react(), tailwindcss()],
    css: {
      postcss: {
        plugins: []
      }
    },
    base,
    server: {
      port: 3000,
      open: true,
      host: true,
      // Configuración para manejar rutas SPA
      historyApiFallback: true
    },
    build: {
      outDir: 'dist',
      target: 'es2015',
      minify: 'esbuild',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/pdfjs-dist')) {
              return 'pdfjs'
            }
            if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
              return 'vendor'
            }
            if (id.includes('node_modules/chart.js') || id.includes('node_modules/react-chartjs-2')) {
              return 'charts'
            }
            if (id.includes('node_modules/@tanstack/react-query')) {
              return 'query'
            }
            if (id.includes('node_modules/react-router-dom') || id.includes('node_modules/react-router/')) {
              return 'router'
            }
          }
        }
      }
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'chart.js', 'react-chartjs-2', 'pdfjs-dist']
    }
  }
})
