# Plan de Migración: CC Flow Summary Report
## AppSheet + Google Apps Script → React + AppSheet API Directa

---

## **Resumen Ejecutivo**

### **Objetivo**
Migrar el sistema actual de reportes de proyectos de Cladding Creations desde una arquitectura basada en Google Apps Script hacia una aplicación web moderna con React y conexión directa a AppSheet API.

### **Beneficios Esperados**
- **Rendimiento mejorado**: Eliminación de capa intermedia (Google Apps Script)
- **Escalabilidad**: Arquitectura más robusta para múltiples usuarios
- **Mantenibilidad**: Código modular y moderno
- **Flexibilidad**: Independencia de la base de datos subyacente
- **UX mejorada**: Interfaz más responsiva y moderna

### **Stack Tecnológico**
- **Frontend**: React 18 + Vite
- **Estado**: React Query (TanStack Query)
- **Gráficos**: Chart.js + react-chartjs-2
- **Routing**: React Router DOM
- **Estilos**: CSS Modules + Variables CSS
- **Deploy**: GitHub Pages + GitHub Actions

---

## **Análisis del Sistema Actual**

### **Arquitectura Actual**
```
Usuario → AppSheet → Botón → Google Apps Script → AppSheet API → Google Sheets → HTML Estático → GitHub Pages
```

### **Componentes Identificados**
1. **Google Apps Script** (`google_script.js`)
   - Orquestador de APIs
   - Cache de datos
   - Transformaciones de datos
   - Filtros complejos

2. **Template HTML** (`Summary_Report_Template.html`)
   - Estructura de reporte
   - Estilos CSS
   - Integración con Chart.js
   - Sistema de acordeones

3. **Archivos JavaScript**
   - `materials_table.js`: Tablas de materiales
   - `trips_chart.js`: Gráficos de viajes
   - `sheets_chart.js`: Gráficos de hojas
   - `utility.js`: Configuración global

### **Funcionalidades Críticas**
- Información del proyecto (datos básicos, estado, fechas)
- Métricas de corte (metros cuadrados esperados vs reales)
- Asignaciones de recursos (drafting, factory, site)
- Tablas de materiales (vista resumida y detallada)
- Gráficos de sheets y viajes
- Sistema de refresh de datos

---

## **Arquitectura Propuesta**

### **Nueva Arquitectura**
```
Usuario → React App (Vite) → AppSheet API → Google Sheets → Usuario
```

### **Ventajas de la Nueva Arquitectura**
- ✅ **Una capa menos**: Eliminación de Google Apps Script
- ✅ **Mejor rendimiento**: Conexión directa a AppSheet API
- ✅ **Más escalable**: Sin límites de ejecución de Apps Script
- ✅ **Independencia de BD**: Si cambia la BD, AppSheet API sigue funcionando
- ✅ **Código moderno**: React con Vite (build ultra-rápido)
- ✅ **Dev Experience**: Hot Module Replacement instantáneo

---

## **Plan de Migración Detallado**

### **Fase 0: Análisis y Preparación**

#### **Objetivos**
- Documentar funcionalidades actuales
- Identificar dependencias
- Definir estructura de datos

#### **Tareas**

##### **1.1 Auditoría del Sistema Actual**
- [ ] Mapear todas las consultas en `google_script.js`
- [ ] Documentar estructura de datos de AppSheet
- [ ] Identificar filtros y transformaciones
- [ ] Listar todas las tablas utilizadas

##### **1.2 Definir Requerimientos Técnicos**
- [ ] Documentar relaciones entre tablas
- [ ] Identificar cálculos complejos
- [ ] Configurar entorno de desarrollo
- [ ] Preparar credenciales de AppSheet API

#### **Entregables**
- Documentación completa del sistema actual
- Lista de tablas y relaciones de AppSheet
- Configuración de entorno de desarrollo

---

### **Fase 1: Setup de React + Vite y Configuración Base**

#### **Objetivos**
- Configurar proyecto React con Vite
- Implementar conexión a AppSheet API
- Crear estructura de componentes base

#### **Tareas**

##### **1.1 Setup del Proyecto con Vite**
```bash
# Crear proyecto React con Vite
npm create vite@latest cc-flow-dashboard -- --template react

# Navegar al proyecto
cd cc-flow-dashboard

# Instalar dependencias base
npm install

# Instalar dependencias del proyecto
npm install chart.js react-chartjs-2
npm install @tanstack/react-query
npm install react-router-dom
npm install @fontsource/roboto
npm install date-fns
```

- [ ] Crear proyecto React con Vite
- [ ] Instalar dependencias necesarias
- [ ] Configurar estructura de carpetas
- [ ] Configurar herramientas de desarrollo
- [ ] Configurar Vite para GitHub Pages

##### **1.2 Configuración de Vite**
```javascript
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/CC_Flow_summary_report/', // Nombre del repositorio
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['chart.js', 'react-chartjs-2'],
          query: ['@tanstack/react-query']
        }
      }
    }
  }
})
```

- [ ] Configurar Vite para desarrollo
- [ ] Configurar build optimizado
- [ ] Configurar base path para GitHub Pages
- [ ] Optimizar bundle splitting

##### **1.3 Configuración de AppSheet API**
```javascript
// services/appsheetApi.js
class AppSheetAPI {
  constructor() {
    this.baseUrl = 'https://api.appsheet.com/api/v2/apps';
    this.appId = import.meta.env.VITE_APPSHEET_APP_ID;
    this.apiKey = import.meta.env.VITE_APPSHEET_API_KEY;
  }

  // Implementar métodos equivalentes a google_script.js
  async getProjectData(projectId) { /* ... */ }
  async getMaterials(orderIds) { /* ... */ }
  async getSheetsData(projectName) { /* ... */ }
  async getDeliveryData(projectId) { /* ... */ }
}
```

- [ ] Investigar documentación de AppSheet API
- [ ] Implementar clase AppSheetAPI
- [ ] Migrar métodos de `google_script.js`
- [ ] Configurar autenticación y headers
- [ ] Configurar variables de entorno con Vite

##### **1.4 Estructura de Componentes Base**
```
src/
├── components/
│   ├── ProjectSummary/
│   │   ├── ProjectSummary.jsx
│   │   ├── ProjectInfo.jsx
│   │   ├── ProgressBars.jsx
│   │   └── ProjectSummary.module.css
│   ├── MaterialsTable/
│   │   ├── MaterialsTable.jsx
│   │   ├── MaterialsSummary.jsx
│   │   ├── MaterialsDetails.jsx
│   │   └── MaterialsTable.module.css
│   ├── Charts/
│   │   ├── SheetsChart.jsx
│   │   ├── TripsChart.jsx
│   │   └── Charts.module.css
│   └── Common/
│       ├── LoadingSpinner.jsx
│       ├── ErrorBoundary.jsx
│       ├── RefreshButton.jsx
│       └── Common.module.css
├── services/
│   ├── appsheetApi.js
│   ├── cacheService.js
│   └── utils.js
├── hooks/
│   ├── useProjectData.js
│   ├── useMaterials.js
│   └── useCharts.js
├── styles/
│   ├── global.css
│   ├── variables.css
│   └── fonts.css
├── App.jsx
├── main.jsx
└── index.css
```

- [ ] Crear estructura de carpetas
- [ ] Crear componentes base
- [ ] Configurar routing con React Router
- [ ] Implementar layout principal
- [ ] Configurar CSS Modules

#### **Entregables**
- Proyecto React + Vite funcional
- Conexión a AppSheet API operativa
- Estructura de componentes base
- Configuración optimizada para GitHub Pages

---

### **Fase 2: Migración de Funcionalidades Core**

#### **Objetivos**
- Replicar funcionalidades principales
- Implementar sistema de cache con React Query
- Mantener diseño visual actual

#### **Tareas**

##### **2.1 Configuración de React Query**
```jsx
// src/main.jsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000, // 10 minutos
      cacheTime: 30 * 60 * 1000, // 30 minutos
      retry: 3,
      refetchOnWindowFocus: false
    }
  }
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>
)
```

- [ ] Configurar React Query
- [ ] Configurar cache por defecto
- [ ] Implementar React Query DevTools
- [ ] Configurar error handling global

##### **2.2 Componente ProjectSummary**
```jsx
// hooks/useProjectData.js
export const useProjectData = (projectId) => {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.getProjectData(projectId),
    enabled: !!projectId
  })
}

// components/ProjectSummary/ProjectSummary.jsx
const ProjectSummary = ({ projectId }) => {
  const { data, isLoading, error, refetch } = useProjectData(projectId)
  
  // Componente con datos en tiempo real
}
```

- [ ] Migrar datos básicos del proyecto
- [ ] Implementar barras de progreso
- [ ] Crear sistema de refresh
- [ ] Replicar cálculos de porcentajes
- [ ] Implementar indicadores de estado
- [ ] Crear hooks personalizados

##### **2.3 Componente MaterialsTable**
```jsx
// hooks/useMaterials.js
export const useMaterials = (orderIds) => {
  return useQuery({
    queryKey: ['materials', orderIds],
    queryFn: () => api.getMaterials(orderIds),
    enabled: orderIds.length > 0
  })
}
```

- [ ] Migrar vista resumida de materiales
- [ ] Migrar vista detallada de materiales
- [ ] Implementar filtros por categoría
- [ ] Replicar cálculos de totales
- [ ] Crear toggle entre vistas
- [ ] Implementar agrupación por categorías
- [ ] Optimizar renderizado con React.memo

##### **2.4 Componente Charts**
```jsx
// hooks/useCharts.js
export const useSheetsChart = (projectName) => {
  return useQuery({
    queryKey: ['sheets', projectName],
    queryFn: () => api.getSheetsData(projectName)
  })
}
```

- [ ] Migrar gráfico de Sheets
- [ ] Migrar gráfico de Trips
- [ ] Integrar Chart.js en React
- [ ] Replicar animaciones
- [ ] Implementar interactividad

#### **Entregables**
- Componente ProjectSummary funcional con React Query
- Componente MaterialsTable funcional
- Componente Charts funcional
- Sistema de cache completo con React Query

---

### **Fase 3: Sistema de Cache y Optimización**

#### **Objetivos**
- Optimizar React Query
- Optimizar rendimiento
- Manejar errores y estados de carga

#### **Tareas**

##### **3.1 Optimización de React Query**
```jsx
// Optimizaciones avanzadas
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['project', projectId],
  queryFn: () => api.getProjectData(projectId),
  staleTime: 10 * 60 * 1000,
  cacheTime: 30 * 60 * 1000,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  retry: (failureCount, error) => {
    if (error.status === 404) return false
    return failureCount < 3
  }
})
```

- [ ] Configurar staleTime y cacheTime optimizados
- [ ] Implementar prefetching de datos
- [ ] Configurar retry logic personalizada
- [ ] Optimizar refetch strategies

##### **3.2 Optimización de Rendimiento**
```jsx
// Optimizaciones de React
const ProjectSummary = React.memo(({ projectId }) => {
  // Componente optimizado
})

// Lazy loading
const MaterialsTable = lazy(() => import('./MaterialsTable'))
```

- [ ] Implementar React.memo para componentes
- [ ] Configurar lazy loading
- [ ] Optimizar re-renders
- [ ] Implementar virtualización para tablas grandes

##### **3.3 Error Handling y Loading States**
```jsx
// Error Boundary
class ErrorBoundary extends Component {
  // Manejo de errores a nivel de componente
}

// Loading states
const LoadingSpinner = () => {
  // Spinner optimizado con CSS
}
```

- [ ] Implementar Error Boundaries
- [ ] Crear estados de loading optimizados
- [ ] Implementar mensajes de error amigables
- [ ] Configurar retry automático

#### **Entregables**
- Sistema de cache optimizado
- Manejo de errores robusto
- Optimizaciones de rendimiento implementadas

---

### **Fase 4: Replicación de Estilos y UX**

#### **Objetivos**
- Mantener diseño visual actual
- Mejorar experiencia de usuario
- Implementar responsive design

#### **Tareas**

##### **4.1 Migración de Estilos con CSS Modules**
```css
/* ProjectSummary.module.css */
.container {
  font-family: 'Roboto', sans-serif;
  background: linear-gradient(to bottom, #feb47b, #86a8e7, #91eae4);
  padding: 20px;
  width: 80%;
  margin: 0 auto;
  text-align: center;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  background-color: rgba(255, 255, 255, 0.3);
  border-radius: 10px;
  animation: fadeIn 1.5s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

- [ ] Migrar gradientes de fondo
- [ ] Configurar tipografía Roboto
- [ ] Replicar colores y espaciado
- [ ] Migrar animaciones CSS
- [ ] Replicar barras de progreso
- [ ] Estilizar tablas con CSS Modules

##### **4.2 Mejoras de UX**
```jsx
// Mejoras de experiencia de usuario
- Indicadores de carga optimizados
- Transiciones suaves con CSS
- Feedback visual mejorado
- Responsive design completo
- Accesibilidad mejorada
```

- [ ] Implementar indicadores de carga optimizados
- [ ] Crear transiciones suaves
- [ ] Agregar feedback visual
- [ ] Implementar responsive design
- [ ] Mejorar accesibilidad

#### **Entregables**
- Diseño visual idéntico al actual
- Mejoras de UX implementadas
- Responsive design funcional
- CSS Modules implementado

---

### **Fase 5: Testing y Optimización**

#### **Objetivos**
- Validar funcionalidades
- Optimizar rendimiento
- Preparar para producción

#### **Tareas**

##### **5.1 Testing Funcional**
```javascript
// Validar todas las funcionalidades
- Comparar datos con sistema actual
- Verificar cálculos
- Probar diferentes proyectos
- Validar responsive design
```

- [ ] Comparar datos con sistema actual
- [ ] Verificar cálculos y fórmulas
- [ ] Probar con diferentes proyectos
- [ ] Validar responsive design
- [ ] Testing de edge cases
- [ ] Testing de performance

##### **5.2 Optimización de Build**
```javascript
// Optimizaciones de Vite
- Lazy loading de componentes
- Optimización de bundle
- Compresión de assets
- Cache de imágenes
```

- [ ] Implementar lazy loading
- [ ] Optimizar bundle size con Vite
- [ ] Comprimir assets
- [ ] Configurar cache de imágenes
- [ ] Optimizar queries de API

#### **Entregables**
- Testing completo realizado
- Optimizaciones de rendimiento implementadas
- Reporte de performance
- Build optimizado

---

### **Fase 6: Deploy y Configuración**

#### **Objetivos**
- Configurar GitHub Pages
- Configurar variables de entorno
- Documentar el sistema

#### **Tareas**

##### **6.1 Configuración de Deploy con Vite**
```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Build
        run: npm run build
      - name: Deploy
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

- [ ] Configurar GitHub Actions para Vite
- [ ] Configurar GitHub Pages
- [ ] Configurar variables de entorno
- [ ] Probar deploy automático

##### **6.2 Configuración de Variables de Entorno**
```bash
# .env.production
VITE_APPSHEET_APP_ID=tu_app_id
VITE_APPSHEET_API_KEY=tu_api_key
```

- [ ] Configurar variables de entorno con Vite
- [ ] Configurar secrets en GitHub
- [ ] Validar configuración de seguridad

##### **6.3 Documentación**
```markdown
# README.md
- Instrucciones de instalación
- Configuración de variables
- Estructura del proyecto
- Guía de desarrollo
```

- [ ] Crear README completo
- [ ] Documentar estructura del proyecto
- [ ] Crear guía de desarrollo
- [ ] Documentar proceso de deploy

#### **Entregables**
- Deploy automático configurado
- Variables de entorno configuradas
- Documentación completa

---

## **Riesgos y Mitigaciones**

### **Riesgos Identificados**

#### **Alto Riesgo**
1. **AppSheet API no documentada**
   - **Impacto**: Retraso en desarrollo
   - **Mitigación**: Sprint de investigación previo
   - **Plan B**: Mantener Google Apps Script como fallback

2. **Cambios en estructura de datos**
   - **Impacto**: Funcionalidades rotas
   - **Mitigación**: Validación continua durante desarrollo
   - **Plan B**: Sistema de versionado de API

#### **Medio Riesgo**
3. **Problemas de rendimiento**
   - **Impacto**: Experiencia de usuario degradada
   - **Mitigación**: Testing temprano de performance
   - **Plan B**: Optimizaciones progresivas

4. **Incompatibilidades de estilos**
   - **Impacto**: Diseño visual diferente
   - **Mitigación**: Replicación pixel-perfect
   - **Plan B**: Iteraciones de diseño

#### **Bajo Riesgo**
5. **Problemas de deploy**
   - **Impacto**: Retraso en lanzamiento
   - **Mitigación**: Testing de deploy en ambiente de desarrollo
   - **Plan B**: Deploy manual

### **Plan de Contingencia**
- **Backup del sistema actual** durante toda la migración
- **Rollback plan** en caso de problemas críticos
- **Testing continuo** en paralelo con desarrollo

---

## **Criterios de Éxito**

### **Funcional**
- ✅ Todas las funcionalidades actuales replicadas al 100%
- ✅ Datos consistentes con sistema actual
- ✅ Tiempo de carga < 3 segundos
- ✅ Sistema de refresh funcional

### **Técnico**
- ✅ Código modular y mantenible
- ✅ Cache eficiente (TTL 10 minutos)
- ✅ Manejo de errores robusto
- ✅ Performance optimizada
- ✅ Build optimizado con Vite

### **UX**
- ✅ Diseño visual idéntico al actual
- ✅ Responsive design en todos los dispositivos
- ✅ Experiencia de usuario mejorada
- ✅ Accesibilidad mejorada

### **Operacional**
- ✅ Deploy automático configurado
- ✅ Variables de entorno seguras
- ✅ Documentación completa
- ✅ Plan de mantenimiento

---

## **Recursos Necesarios**

### **Desarrollo**
- **Herramientas**: Node.js 18+, npm, Git, VS Code
- **APIs**: AppSheet API, Google Sheets API
- **Librerías**: React 18, Vite, Chart.js, React Query

### **Infraestructura**
- **Hosting**: GitHub Pages (gratuito)
- **CI/CD**: GitHub Actions (gratuito)
- **Variables de entorno**: GitHub Secrets

### **Documentación**
- **AppSheet API**: Investigación requerida
- **React**: Documentación oficial
- **Vite**: Documentación oficial
- **Chart.js**: Documentación oficial

---

## **Próximos Pasos**

### **Inmediato**
1. **Aprobación del plan** por stakeholders
2. **Configuración de entorno** de desarrollo
3. **Investigación de AppSheet API**
4. **Creación del repositorio** de desarrollo

### **Seguimiento**
- **Reuniones semanales** de progreso
- **Demo al final de cada fase**
- **Feedback continuo** de usuarios

---

## **Contacto y Responsabilidades**

### **Equipo de Desarrollo**
- **Desarrollador Principal**: [Nombre]
- **Revisor Técnico**: [Nombre]
- **Stakeholder**: [Nombre]

### **Comunicación**
- **Canal principal**: [Slack/Teams/Email]
- **Reuniones**: [Frecuencia y horario]
- **Reportes**: [Formato y frecuencia]

---

**Documento creado el:** [Fecha]
**Versión:** 2.0
**Última actualización:** [Fecha]
**Próxima revisión:** [Fecha]
**Cambios principales:** Migración a Vite, optimización de build, configuración de React Query 