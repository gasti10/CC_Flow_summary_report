# CC Projects Dashboard 1.1

Aplicación web moderna para visualizar reportes de proyectos de Cladding Creations, construida con React + Vite y conectada directamente a AppSheet API.

## 🚀 Características

- **Datos en tiempo real** desde AppSheet API
- **Interfaz moderna** con React + Vite
- **Cache inteligente** con React Query
- **Diseño responsivo** para todos los dispositivos
- **Actualización automática** de datos
- **Deploy automático** en GitHub Pages
- **Selector de proyectos** interactivo
- **Gráficos interactivos** con Chart.js
- **Tablas de materiales** con vistas resumida y detallada
- **Parámetros de URL** para compartir enlaces directos a proyectos

## 🛠️ Stack Tecnológico

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Estado**: React Query (TanStack Query)
- **Routing**: React Router DOM (HashRouter para GitHub Pages)
- **Gráficos**: Chart.js + react-chartjs-2
- **Estilos**: CSS Modules + Variables CSS
- **Fuentes**: Roboto (Google Fonts)
- **Deploy**: GitHub Pages + GitHub Actions

## 📦 Instalación

### Prerrequisitos

- Node.js 18+ 
- npm o yarn

### Pasos de instalación

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd cc-flow-dashboard
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
cp env.example .env.local
```

Editar `.env.local` con tus credenciales de AppSheet:
```env
VITE_APPSHEET_APP_ID=tu_app_id
VITE_APPSHEET_API_KEY=tu_api_key
```

4. **Ejecutar en desarrollo**
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 🏗️ Estructura del Proyecto

```
src/
├── components/
│   ├── ProjectSummary/     # Componente principal del proyecto ✅
│   ├── MaterialsTable/     # Tabla de materiales ✅
│   ├── Charts/            # Gráficos (Sheets, Trips) ✅
│   └── Common/            # Componentes reutilizables ✅
├── hooks/
│   ├── useProjectData.ts  # Hooks para datos del proyecto ✅
│   └── useCharts.ts       # Hooks para gráficos ✅
├── services/
│   └── appsheetApi.ts     # Servicio de AppSheet API ✅
├── types/
│   └── appsheet.ts        # Tipos TypeScript ✅
├── styles/
│   └── global.css         # Estilos globales ✅
└── App.tsx               # Componente principal ✅
```

## 🔧 Scripts Disponibles

- `npm run dev` - Servidor de desarrollo
- `npm run build` - Build para producción
- `npm run preview` - Preview del build
- `npm run lint` - Linting del código

## 📊 Funcionalidades Implementadas

### ✅ Fase 0: Análisis y Preparación
- [x] Auditoría del sistema actual
- [x] Configuración de entorno de desarrollo
- [x] Documentación de AppSheet API
- [x] Estructura de proyecto base

### ✅ Fase 1: Setup de React + Vite
- [x] Configuración de React Query
- [x] Servicio de AppSheet API completo
- [x] Hooks personalizados
- [x] Estilos globales
- [x] Componente ProjectSummary funcional
- [x] Routing básico

### ✅ Fase 2: Funcionalidades Core (Completada)
- [x] **ProjectSummary Component** - Información completa del proyecto
  - [x] Datos básicos del proyecto (nombre, estado, fechas, PM, supervisor)
  - [x] Información de corte con barras de progreso
  - [x] Estadísticas del proyecto (órdenes, materiales, hojas, etc.)
  - [x] Selector de proyectos interactivo
  - [x] Sistema de refresh de datos
- [x] **MaterialsTable Component** - Tabla de materiales completa
  - [x] Vista resumida de materiales por categorías
  - [x] Vista detallada con información completa
  - [x] Toggle entre vistas
  - [x] Agrupación por categorías (Top hat, Angles, Screws, etc.)
- [x] **Charts Components** - Gráficos interactivos
  - [x] **SheetsChart** - Comparación de hojas compradas vs usadas
  - [x] **TripsChart** - Gráfico de viajes en el tiempo con línea de tendencia
  - [x] Integración con Chart.js y react-chartjs-2
  - [x] Animaciones y interactividad
- [x] **Common Components** - Componentes reutilizables
  - [x] LoadingSpinner - Indicador de carga
  - [x] ProjectSelector - Selector de proyectos
- [x] **Sistema de Cache** - Optimización con React Query
  - [x] Cache de 10 minutos para datos del proyecto
  - [x] Cache de 30 minutos para datos generales
  - [x] Refetch automático y manual

### ✅ Fase 3: Sistema de Cache y Optimización (Completada)
- [x] Configuración optimizada de React Query
- [x] Manejo de errores robusto con ErrorBoundary
- [x] Estados de loading implementados
- [x] Optimizaciones de rendimiento avanzadas
  - [x] Hooks de optimización personalizados (useDebounce, useMemoizedArray, etc.)
  - [x] Configuración optimizada de Vite (bundle splitting, minificación)
  - [x] Lazy loading de componentes
  - [x] Performance monitoring en tiempo real
- [x] Error Boundaries completos
- [x] Data validation y testing funcional

### ⏳ Fases Pendientes
- [ ] Fase 4: Replicación de Estilos y UX
- [ ] Fase 5: Testing y Optimización
- [ ] Fase 6: Deploy y Configuración

## 🔌 API de AppSheet

### Credenciales
- **App ID**: `efcdb2a0-181f-4e43-bc65-6887dc279032`
- **API Key**: Configurada en variables de entorno

### Tablas Utilizadas
- `Projects` - Información principal del proyecto ✅
- `Orders` - Órdenes de materiales ✅
- `Items Request` - Solicitudes de ítems ✅
- `Items` - Catálogo de ítems ✅
- `Sheets` - Hojas de material ✅
- `Sheets Inventory` - Inventario de hojas ✅
- `People Allowance` - Asignaciones de personal ✅
- `Delivery_Dockets` - Comprobantes de entrega ✅
- `Vertical_Access` - Acceso vertical ✅

### Métodos API Implementados
- `getAllProjects()` - Obtener lista de proyectos ✅
- `getProjectData(projectName)` - Datos completos del proyecto ✅
- `getOrdersByProject(projectName)` - Órdenes por proyecto ✅
- `getMaterials(projectName)` - Materiales por proyecto ✅
- `getSheetsData(projectName)` - Datos de hojas ✅
- `getDeliveryDockets(projectName)` - Comprobantes de entrega ✅
- `getProjectData(projectName)` - Datos básicos del proyecto ✅
- `getOrdersByProject(projectName)` - Órdenes del proyecto ✅
- `getMaterials(projectName)` - Materiales del proyecto ✅
- `getSheetsData(projectName)` - Datos de hojas del proyecto ✅
- `getPeopleAllowances(projectName)` - Asignaciones del proyecto ✅
- `getDeliveryDockets(projectName)` - Dockets de entrega del proyecto ✅

## 🎨 Diseño

El diseño replica exactamente el sistema actual con:
- **Gradientes de fondo** idénticos ✅
- **Tipografía Roboto** ✅
- **Colores corporativos** de Cladding Creations ✅
- **Barras de progreso** animadas ✅
- **Responsive design** en progreso
- **Sistema de acordeones** para gráficos ✅

## 🚀 Deploy

### GitHub Pages
La aplicación está configurada para deploy automático en GitHub Pages:

1. **Build automático** en cada push a `main`
2. **Variables de entorno** seguras en GitHub Secrets
3. **Base path** configurado para el repositorio
4. **Routing SPA** con HashRouter para compatibilidad
5. **Parámetros de URL** para enlaces directos

### URLs de Acceso

#### URL Principal
```
https://gaston.github.io/cc-flow-dashboard/
```

#### URLs con Parámetros de Proyecto
```
https://gaston.github.io/cc-flow-dashboard/#/?project=NombreDelProyecto
```

**Ejemplos:**
- `https://gaston.github.io/cc-flow-dashboard/#/?project=Proyecto%20ABC`
- `https://gaston.github.io/cc-flow-dashboard/#/?project=Site%20Development`

### Funcionalidades de URL

#### ✅ Parámetros de Proyecto
- **Funcionalidad**: Al acceder con `?project=NombreDelProyecto` en la URL, el proyecto se selecciona automáticamente
- **Comportamiento**: 
  - La URL se actualiza automáticamente al seleccionar un proyecto
  - Los parámetros se mantienen al navegar
  - Compatible con bookmarking y compartir enlaces
  - Sincronización bidireccional entre URL y selector

#### ✅ Routing SPA
- **HashRouter**: Implementado para compatibilidad con GitHub Pages
- **404.html**: Maneja redirecciones para rutas no encontradas
- **Navegación**: Funciona correctamente con botones de navegación del navegador

### Deploy Manual

```bash
# Instalar dependencias
npm install

# Construir el proyecto
npm run build

# Deploy a GitHub Pages
npm run deploy
```

### Deploy Automático

El proyecto incluye un workflow de GitHub Actions que se ejecuta automáticamente en cada push a la rama `main`. Ver `DEPLOY.md` para instrucciones detalladas.

### Configuración para Otros Repositorios

Si tu repositorio no es `gaston/cc-flow-dashboard`, actualiza:

1. **package.json**:
```json
{
  "homepage": "https://TU_USUARIO.github.io/TU_REPOSITORIO"
}
```

2. **vite.config.ts**:
```typescript
base: '/TU_REPOSITORIO/',
```

3. **index.html** (ruta del favicon):
```html
<link rel="icon" type="image/png" href="/TU_REPOSITORIO/favicon.png" />
```

## 📝 Desarrollo

### Convenciones de Código
- **TypeScript** para tipado estático ✅
- **CSS Modules** para estilos ✅
- **React Query** para manejo de estado ✅
- **Hooks personalizados** para lógica reutilizable ✅

### Estructura de Commits
- `feat:` Nuevas funcionalidades
- `fix:` Correcciones de bugs
- `style:` Cambios de estilo
- `refactor:` Refactorización de código
- `docs:` Documentación

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto es privado para Cladding Creations.

## 👥 Equipo

- **Desarrollador**: [Tu nombre]
- **Cliente**: Cladding Creations
- **Contacto**: [Tu email]

---

**Versión**: 1.0.0  
**Última actualización**: Diciembre 2024  
**Estado**: Fase 2 completada - Funcionalidades core implementadas ✅

## 🎯 Próximos Pasos

### Inmediato
1. **Completar Fase 3** - Optimizaciones de rendimiento
2. **Testing funcional** - Validar datos con sistema actual
3. **Mejoras de UX** - Responsive design y accesibilidad

### Corto Plazo
1. **Fase 4** - Replicación completa de estilos
2. **Fase 5** - Testing exhaustivo y optimización
3. **Fase 6** - Deploy en producción

### Largo Plazo
1. **Mantenimiento** - Actualizaciones y mejoras continuas
2. **Nuevas funcionalidades** - Basadas en feedback de usuarios
3. **Escalabilidad** - Preparación para múltiples usuarios
