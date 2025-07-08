# 🔗 Parámetros de URL - CC Flow Dashboard

Este documento explica cómo funcionan los parámetros de URL en el CC Flow Dashboard y cómo utilizarlos.

## 📋 Funcionalidad

El dashboard soporta parámetros de URL que permiten:
- **Selección automática de proyectos** al cargar la página
- **Compartir enlaces directos** a proyectos específicos
- **Bookmarking** de proyectos favoritos
- **Navegación directa** sin necesidad de seleccionar manualmente

## 🎯 Parámetros Disponibles

### `project`
Selecciona automáticamente un proyecto específico.

**Formato:**
```
https://gaston.github.io/cc-flow-dashboard/#/?project=NombreDelProyecto
```

**Ejemplos:**
```
https://gaston.github.io/cc-flow-dashboard/#/?project=Site%20Development
https://gaston.github.io/cc-flow-dashboard/#/?project=Commercial%20Building%20A
https://gaston.github.io/cc-flow-dashboard/#/?project=Residential%20Complex%20B
```

## 🔧 Cómo Funciona

### 1. Carga Inicial
Cuando se accede a una URL con parámetros:
1. El hook `useUrlParams` lee los parámetros de la URL
2. Si existe `project`, busca el proyecto en la lista
3. Si encuentra el proyecto, lo selecciona automáticamente
4. Los datos del proyecto se cargan inmediatamente

### 2. Navegación
Cuando se selecciona un proyecto manualmente:
1. La URL se actualiza automáticamente con el parámetro `project`
2. El historial del navegador se actualiza
3. Los botones de navegación (atrás/adelante) funcionan correctamente

### 3. Sincronización
- **Bidireccional**: Los cambios en el selector actualizan la URL y viceversa
- **Persistente**: Los parámetros se mantienen al navegar
- **Compatible**: Funciona con bookmarking y compartir enlaces

## 💻 Implementación Técnica

### Hook Personalizado: `useUrlParams`

```typescript
const { projectParam, updateUrlWithProject, clearProjectParam } = useUrlParams();
```

**Funciones disponibles:**
- `projectParam`: Valor actual del parámetro project
- `updateUrlWithProject(projectName)`: Actualiza la URL con un proyecto
- `clearProjectParam()`: Limpia el parámetro de la URL

### Integración en ProjectSelector

```typescript
// Efecto para sincronizar con parámetros de URL al cargar
useEffect(() => {
  if (projectParam && projects.length > 0) {
    const projectFromUrl = projects.find(p => p.Name === projectParam);
    if (projectFromUrl) {
      setSelectedProjectName(projectParam);
      onProjectSelect(projectFromUrl);
    }
  }
}, [projectParam, projects, onProjectSelect]);

// Actualizar URL al seleccionar proyecto
const handleProjectChange = async (projectId: string) => {
  updateUrlWithProject(projectId);
  // ... resto de la lógica
};
```

## 🚀 Casos de Uso

### 1. Compartir Enlaces Directos
**Escenario:** Quieres compartir un proyecto específico con tu equipo.

**Solución:**
1. Selecciona el proyecto en el dashboard
2. Copia la URL del navegador
3. Comparte el enlace

**Resultado:** Al abrir el enlace, el proyecto se selecciona automáticamente.

### 2. Bookmarking de Proyectos
**Escenario:** Tienes proyectos que revisas frecuentemente.

**Solución:**
1. Navega al proyecto deseado
2. Guarda la URL como bookmark
3. Usa el bookmark para acceso directo

### 3. Integración con Sistemas Externos
**Escenario:** Tu sistema de gestión de proyectos quiere enlazar directamente al dashboard.

**Solución:**
```javascript
// Ejemplo de integración
const projectName = "Site Development";
const dashboardUrl = `https://gaston.github.io/dashboard/#/?project=${encodeURIComponent(projectName)}`;
window.open(dashboardUrl, '_blank');
```

## 🛠️ Generación de Enlaces

### Script Automático
El proyecto incluye un script para generar enlaces de prueba:

```bash
npm run generate-links
```

### Generación Manual
Para generar enlaces manualmente:

```javascript
const baseUrl = 'https://gaston.github.io/dashboard/#/?project=';
const projectName = 'Mi Proyecto';
const encodedProject = encodeURIComponent(projectName);
const fullUrl = baseUrl + encodedProject;
```

## 🔍 Debugging

### Verificar Parámetros
Para verificar que los parámetros funcionan:

1. Abre las herramientas de desarrollador (F12)
2. Ve a la consola
3. Ejecuta: `new URLSearchParams(window.location.search).get('project')`

### Logs de Debug
El hook incluye logs de debug (en desarrollo):

```typescript
console.log('URL Parameter:', projectParam);
console.log('Projects loaded:', projects.length);
console.log('Project found:', projectFromUrl);
```

## ⚠️ Consideraciones

### Caracteres Especiales
- Los espacios se codifican como `%20`
- Los caracteres especiales se codifican automáticamente
- Usar `encodeURIComponent()` para codificación manual

### Compatibilidad
- Funciona en todos los navegadores modernos
- Compatible con GitHub Pages
- Sincronización con historial del navegador

### Rendimiento
- No afecta el rendimiento de carga
- Los parámetros se procesan de forma asíncrona
- Cache de React Query se mantiene

## 📞 Soporte

Si encuentras problemas con los parámetros de URL:

1. Verifica que el proyecto existe en la lista
2. Asegúrate de que el nombre del proyecto coincida exactamente
3. Revisa la consola del navegador para errores
4. Verifica que el hook `useUrlParams` esté importado correctamente

## 🔄 Futuras Mejoras

- **Múltiples parámetros**: Soporte para filtros adicionales
- **Estado persistente**: Guardar preferencias del usuario
- **Analytics**: Tracking de enlaces compartidos
- **Validación**: Verificación de parámetros válidos 