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
    }
  }
})
