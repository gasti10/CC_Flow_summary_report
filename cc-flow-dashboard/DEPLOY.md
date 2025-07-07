# 🚀 Deploy en GitHub Pages

Este documento contiene las instrucciones para desplegar el CC Flow Dashboard en GitHub Pages.

## 📋 Prerrequisitos

1. Tener un repositorio en GitHub
2. Tener Node.js instalado (versión 16 o superior)
3. Tener permisos de administrador en el repositorio

## 🔧 Configuración Inicial

### 1. Instalar dependencias

```bash
cd cc-flow-dashboard
npm install
```

### 2. Configurar GitHub Pages

1. Ve a tu repositorio en GitHub
2. Ve a **Settings** > **Pages**
3. En **Source**, selecciona **Deploy from a branch**
4. En **Branch**, selecciona **gh-pages** y **/(root)**
5. Haz clic en **Save**

### 3. Configurar el repositorio (si es necesario)

Si tu repositorio no es `gaston/cc-flow-dashboard`, actualiza la URL en `package.json`:

```json
{
  "homepage": "https://TU_USUARIO.github.io/TU_REPOSITORIO"
}
```

Y también actualiza la base en `vite.config.ts`:

```typescript
base: '/TU_REPOSITORIO/',
```

## 🚀 Deploy

### Deploy Manual

```bash
# Construir el proyecto
npm run build

# Deploy a GitHub Pages
npm run deploy
```

### Deploy Automático con GitHub Actions (Recomendado)

Crea un archivo `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout
      uses: actions/checkout@v3
      
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: |
        cd cc-flow-dashboard
        npm ci
        
    - name: Build
      run: |
        cd cc-flow-dashboard
        npm run build
        
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      if: github.ref == 'refs/heads/main'
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./cc-flow-dashboard/dist
```

## 🔗 URLs de Acceso

### URL Principal
```
https://gaston.github.io/cc-flow-dashboard/
```

### URLs con Parámetros de Proyecto
```
https://gaston.github.io/cc-flow-dashboard/#/?project=NombreDelProyecto
```

## 📱 Funcionalidades Implementadas

### ✅ Parámetros de URL
- **Funcionalidad**: Al acceder con `?project=NombreDelProyecto` en la URL, el proyecto se selecciona automáticamente
- **Ejemplo**: `https://gaston.github.io/cc-flow-dashboard/#/?project=Proyecto%20ABC`
- **Comportamiento**: 
  - La URL se actualiza automáticamente al seleccionar un proyecto
  - Los parámetros se mantienen al navegar
  - Compatible con bookmarking y compartir enlaces

### ✅ Routing SPA
- **HashRouter**: Implementado para compatibilidad con GitHub Pages
- **404.html**: Maneja redirecciones para rutas no encontradas
- **Navegación**: Funciona correctamente con botones de navegación del navegador

### ✅ Optimizaciones
- **Lazy Loading**: Componentes cargan bajo demanda
- **Code Splitting**: Bundles separados para mejor rendimiento
- **Caching**: Configuración optimizada para GitHub Pages

## 🛠️ Solución de Problemas

### Error 404 en rutas
- Verifica que el archivo `404.html` esté en la carpeta `public/`
- Asegúrate de que el script de redirección esté en `index.html`

### Assets no cargan
- Verifica que la `base` en `vite.config.ts` coincida con tu repositorio
- Asegúrate de que las rutas de assets usen rutas relativas

### Parámetros de URL no funcionan
- Verifica que el hook `useUrlParams` esté importado correctamente
- Asegúrate de que el `ProjectSelector` use el hook

### Deploy falla
- Verifica que tengas permisos de escritura en el repositorio
- Asegúrate de que la rama `gh-pages` esté habilitada en GitHub Pages

## 📞 Soporte

Si encuentras problemas durante el deploy:

1. Revisa los logs de GitHub Actions
2. Verifica la configuración en GitHub Pages
3. Asegúrate de que todas las dependencias estén instaladas
4. Verifica que la configuración de `base` sea correcta

## 🔄 Actualizaciones

Para actualizar el sitio después de cambios:

```bash
# Si usas deploy manual
npm run deploy

# Si usas GitHub Actions, solo haz push a main
git push origin main
```

El deploy automático se ejecutará en GitHub Actions. 