// AppSheet API Service

import type {
  Project,
  Order,
  ItemRequest,
  Sheet,
  SheetInventory,
  PeopleAllowance,
  DeliveryDocket,
  Document,
  AppSheetResponse,
  MaterialsData,
  EnrichedItemRequest,
} from '../types/appsheet'
import { supabaseApi } from './supabaseApi'

interface AppSheetConfig {
  appId: string
  apiKey: string
  baseUrl: string
}

interface CacheEntry<T> {
  data: T
  timestamp: number
}

// Interfaz para items en cache
interface CachedItem {
  '_RowNumber': number
  'Item ID': string
  'Name': string
}

interface Item {
  '_RowNumber': number
  'Item ID': string
  'Name': string
}

class AppSheetAPI {
  private config: AppSheetConfig
  private cache: Map<string, CacheEntry<unknown>> = new Map()
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutos
  private readonly PROJECTS_CACHE_DURATION = 15 * 60 * 1000 // 15 minutos para proyectos

  constructor() {
    this.config = {
      appId: import.meta.env.VITE_APPSHEET_APP_ID || '',
      apiKey: import.meta.env.VITE_APPSHEET_API_KEY || '',
      baseUrl: 'https://www.appsheet.com/api/v2'
    }

    if (!this.config.appId || !this.config.apiKey) {
      console.warn('AppSheet credentials not configured. Please check your environment variables.')
    }
  }

  private async makeRequest<T>(
    tableName: string,
    action: string,
    rows?: Record<string, unknown>[],
    properties?: Record<string, unknown>
  ): Promise<AppSheetResponse<T>> {
    const url = `${this.config.baseUrl}/apps/${this.config.appId}/tables/${encodeURIComponent(tableName)}/Action`
    
    // Si se pasan rows con criterios de búsqueda, construir un Selector con Filter
    let requestProperties = properties || {}
    let requestRows = rows || []
    
    // Si se pasan criterios de búsqueda en rows, convertirlos a Selector
    if (rows && rows.length > 0 && action === 'Find') {
      const filterConditions: string[] = []
      
      rows.forEach(row => {
        Object.entries(row).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            // Escapar el valor correctamente para el filtro
            const escapedValue = typeof value === 'string' ? JSON.stringify(value) : value
            filterConditions.push(`[${key}]=${escapedValue}`)
          }
        })
      })
      
      if (filterConditions.length > 0) {
        // Si hay un solo criterio, no usar AND()
        const filterExpression = filterConditions.length === 1
          ? `Filter(${tableName}, ${filterConditions[0]})`
          : `Filter(${tableName}, AND(${filterConditions.join(', ')}))`
        requestProperties = {
          ...requestProperties,
          Selector: filterExpression
        }
        requestRows = [] // Rows debe estar vacío cuando se usa Selector
      }
    }
    
    // Handle custom AppSheet Actions
    let requestBody: Record<string, unknown>
    if (action !== 'Find' && action !== 'Edit' && action !== 'Add' && action !== 'Delete') {
      // Custom action structure as per AppSheet documentation
      requestBody = {
        Action: action,
        Properties: {
          Locale: 'en-US',
          Location: '-28.0167, 153.4000',
          Timezone: 'E. Australia Standard Time',
          ...requestProperties
        },
        Rows: requestRows
      }
    } else {
      // Standard action structure
      requestBody = {
        Action: action,
        Properties: {
          Locale: 'en-AU',
          Location: '-28.0167, 153.4000',
          Timezone: 'E. Australia Standard Time',
          ...requestProperties
        },
        Rows: requestRows
      }
    }

    try {
      /*console.log(`📤 Sending request to ${tableName}:`, {
        url,
        action,
        requestBody
      })*/
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ApplicationAccessKey': this.config.apiKey
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`HTTP error! status: ${response.status}, response: ${errorText}`)
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const responseText = await response.text()
      //console.log(`📡 Raw response from ${tableName}:`, responseText)
      
      if (!responseText || responseText.trim() === '') {
        console.warn(`⚠️ Empty response from ${tableName}`)
        return [] as AppSheetResponse<T>
      }

      try {
        const data = JSON.parse(responseText)
        
        // Handle different response structures
        if (data.Rows && Array.isArray(data.Rows)) {
          // Response has {Rows: [...]} structure
          return data.Rows as AppSheetResponse<T>
        } else if (Array.isArray(data)) {
          // Response is directly an array
          return data as AppSheetResponse<T>
        } else {
          // Single object response
          return [data] as AppSheetResponse<T>
        }
      } catch (parseError) {
        console.error(`❌ JSON parse error for ${tableName}:`, parseError)
        console.error(`📄 Response text:`, responseText)
        throw new Error(`Invalid JSON response from ${tableName}`)
      }
    } catch (error) {
      console.error(`Error making request to ${tableName}:`, error)
      throw new Error(`Failed to fetch data from ${tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key) as CacheEntry<T> | undefined
    if (cached) {
      // Usar cache específico para proyectos
      const cacheDuration = key === 'all-projects' ? this.PROJECTS_CACHE_DURATION : this.CACHE_DURATION
      if (Date.now() - cached.timestamp < cacheDuration) {
        return cached.data
      }
    }
    return null
  }

  private setCachedData<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
  }

  // Obtener todos los proyectos (estrategia híbrida: Supabase rápido + AppSheet completo)
  async getAllProjects(options?: { forceAppSheet?: boolean }): Promise<Project[]> {
    const CACHE_MAIN = 'all-projects'
    const CACHE_APPSHEET = 'all-projects-appsheet'
    const CACHE_SUPABASE = 'all-projects-supabase'
    
    // Si forceAppSheet, priorizar datos de AppSheet (desde cache o petición)
    if (options?.forceAppSheet) {
      // Verificar cache de AppSheet primero (instantáneo si ya respondió)
      const cachedAppSheet = this.getCachedData<Project[]>(CACHE_APPSHEET)
      if (cachedAppSheet && cachedAppSheet.length > 0) {
        console.log('✅ Using cached AppSheet data (instant, no request)')
        // Asegurar que all-projects tenga estos datos completos
        this.setCachedData(CACHE_MAIN, cachedAppSheet)
        return cachedAppSheet
      }
      
      // Si no hay cache, hacer petición a AppSheet
      console.log('🔄 Force fetching from AppSheet (no cache available)...')
      try {
        const response = await this.makeRequest<Project>('projects_dashboard_summary_slice', 'Find', [], {})
        const projects: Project[] = response
        this.setCachedData(CACHE_APPSHEET, projects)
        this.setCachedData(CACHE_MAIN, projects)
        console.log(`✅ Synced ${projects.length} projects from AppSheet`)
        return projects
      } catch (error) {
        console.error('Error fetching from AppSheet:', error)
        // Fallback: intentar usar cache principal si existe
        const mainCache = this.getCachedData<Project[]>(CACHE_MAIN)
        if (mainCache) return mainCache
        return []
      }
    }
    
    // Comportamiento normal: verificar cache principal primero
    const cached = this.getCachedData<Project[]>(CACHE_MAIN)
    if (cached) {
      console.log('✅ Using cached projects data')
      return cached
    }

    // Iniciar ambas peticiones en paralelo
    const supabasePromise = supabaseApi.getAllProjects().catch((error) => {
      console.log('⚠️ Supabase getAllProjects failed:', error)
      return []
    })
    
    const appsheetPromise = (async () => {
      try {
        console.log('🔄 Fetching projects from AppSheet API...')
        const response = await this.makeRequest<Project>('projects_dashboard_summary_slice', 'Find', [], {})
        const projects: Project[] = response
        
        // Actualizar cache de AppSheet
        this.setCachedData(CACHE_APPSHEET, projects)
        
        // SIEMPRE actualizar cache principal con datos de AppSheet (completos)
        this.setCachedData(CACHE_MAIN, projects)
        
        console.log(`✅ Cached ${projects.length} projects from AppSheet (complete data)`)
        return projects
      } catch (error) {
        console.error('Error fetching projects from AppSheet:', error)
        return []
      }
    })()

    // Usar respuesta de Supabase si llega primero
    try {
      const supabaseProjects = await supabasePromise
      
      if (supabaseProjects && supabaseProjects.length > 0) {
        console.log(`✅ Using ${supabaseProjects.length} projects from Supabase (fast response)`)
        
        // Actualizar cache de Supabase
        this.setCachedData(CACHE_SUPABASE, supabaseProjects)
        
        // Solo actualizar cache principal SI está vacía
        const mainCache = this.getCachedData<Project[]>(CACHE_MAIN)
        if (!mainCache || mainCache.length === 0) {
          this.setCachedData(CACHE_MAIN, supabaseProjects)
        }
        
        // Continuar actualizando en background con AppSheet
        appsheetPromise.catch(() => {
          console.log('⚠️ Background AppSheet update failed')
        })
        
        return supabaseProjects
      }
    } catch (error) {
      console.log('⚠️ Supabase failed, waiting for AppSheet...', error)
    }

    // Si Supabase falla, esperar AppSheet
    try {
      const appsheetProjects = await appsheetPromise
      if (appsheetProjects && appsheetProjects.length > 0) {
        console.log(`✅ Using ${appsheetProjects.length} projects from AppSheet (fallback)`)
        return appsheetProjects
      }
    } catch (error) {
      console.error('Error fetching projects from both sources:', error)
    }

    return []
  }

  // Obtener datos del proyecto desde el cache de getAllProjects (más rápido)
  async getProjectDataFromCache(projectName: string): Promise<Project | null> {
    try {
      // Obtener todos los proyectos (usará cache si está disponible)
      const allProjects = await this.getAllProjects()
      
      // Buscar el proyecto específico por nombre
      const project = allProjects.find(p => p.Name === projectName)
      
      if (project) {
        console.log(`✅ Project data found in cache for: ${projectName}`)
        return project
      } else {
        console.warn(`⚠️ Project not found in cache: ${projectName}`)
        return null
      }
    } catch (error) {
      console.error('Error getting project data from cache:', error)
      return null
    }
  }

  // Obtener todos los Items (datos globales) - Cache centralizado
  async getAllItems(): Promise<CachedItem[]> {
    const cacheKey = 'all-items'
    const cached = this.getCachedData<CachedItem[]>(cacheKey)
    if (cached) return cached

    try {
      const response = await this.makeRequest<Item>('items_dashboard_summary_slice', 'Find', [], {})
      this.setCachedData(cacheKey, response)
      return response
    } catch (error) {
      console.error('Error fetching all items:', error)
      return []
    }
  }

  // Obtener datos completos del proyecto por Name
  async getProjectData(projectName: string): Promise<Project | null> {
    const cacheKey = `project-${projectName}`
    const cached = this.getCachedData<Project>(cacheKey)
    if (cached) return cached

    try {
      // Buscar por Name en Projects usando Selector con Filter
      const projectFilter = `Filter(Projects, [Name]=${JSON.stringify(projectName)})`
      const response = await this.makeRequest<Project>('Projects', 'Find', [], {
        Selector: projectFilter
      })

      if (response.length > 0) {
        const project = response[0]
        this.setCachedData(cacheKey, project)
        return project
      }
      return null
    } catch (error) {
      console.error('Error fetching project data:', error)
      return null
    }
  }

  // Obtener órdenes por Project Name
  async getOrdersByProject(projectName: string): Promise<Order[]> {
    const cacheKey = `orders-${projectName}`
    const cached = this.getCachedData<Order[]>(cacheKey)
    if (cached) return cached

    try {
      // Usar Selector con Filter para obtener órdenes por Project Name
      const ordersFilter = `Filter(Orders, [Project ID]=${JSON.stringify(projectName)})`
      const response = await this.makeRequest<Order>('Orders', 'Find', [], {
        Selector: ordersFilter
      })

      this.setCachedData(cacheKey, response)
      return response
    } catch (error) {
      console.error('Error fetching orders:', error)
      return []
    }
  }

  // Obtener materiales por proyecto
  async getMaterials(projectName: string): Promise<MaterialsData> {
    const cacheKey = `materials-${projectName}`
    const cached = this.getCachedData<MaterialsData>(cacheKey)
    if (cached) return cached

    try {
      // Obtener Items Requests FILTRADO por Project Name
      const itemsRequests = await this.getItemsRequestsByProject(projectName)
      const orders = await this.getOrdersByProject(projectName)
      const itemDetails = await this.getAllItems()

      // Enriquecer Items Requests con detalles de Items
      const enrichedItemsRequests = itemsRequests.map(itemRequest => {
        const itemDetail = itemDetails.find(detail => detail['Item ID'] === itemRequest['Item ID'])
        const order = orders.find(order => order['Order ID'] === itemRequest['Order ID'])
        return {
          ...itemRequest,
          'Name': itemDetail ? itemDetail['Name'] : 'Unknown Item',
          'Order Number': order ? order['Number'] : '0',
          'Order Date': order ? order['Due Date'] : '',
          'Order Status': order ? order['Status'] : '',
          'Request by': order ? order['Created By'] : '',
        }
      })

      // Procesar datos para ambas vistas
      const summary = this.groupMaterialsForSummary(enrichedItemsRequests)
      const details = this.groupMaterialsForDetails(enrichedItemsRequests)

      const result = { summary, details }
      this.setCachedData(cacheKey, result)
      return result
    } catch (error) {
      console.error('Error fetching materials:', error)
      return { summary: [], details: [] }
    }
  }

    // Agrupar materiales para vista de resumen (suma totales por ItemID)
    private groupMaterialsForSummary(materials: EnrichedItemRequest[]): MaterialsData['summary'] {
      const categories: Record<string, Record<string, {
        Name: string
        SubCategory: string
        Description: string
        Total: number
      }>> = {
        'Top hat': {}, 'Angles': {}, 'Screws': {}, 
        'Caulking Glue': {}, 'Packers': {}, 'Tapes': {}, 'Others': {} 
      };
  
      materials.forEach(material => {
        const category = Object.prototype.hasOwnProperty.call(categories, material.Category) 
          ? material.Category 
          : 'Others';
        
        const itemID = material['Item ID'];
        
        if (!categories[category][itemID]) {
          categories[category][itemID] = {
            Name: material.Name || 'Unknown Item',
            SubCategory: material['Sub Category'] || '',
            Description: material['Description Material'] || '',
            Total: 0
          };
        }
  
        categories[category][itemID].Total += Number(material.Quantity) || 0;
      });
  
      // Convertir a formato MaterialsData['summary']
      const result: MaterialsData['summary'] = [];
      
      Object.entries(categories).forEach(([categoryName, items]) => {
        const categoryItems = Object.entries(items).map(([itemID, itemData]) => ({
          ItemID: itemID,
          Name: itemData.Name,
          SubCategory: itemData.SubCategory,
          Description: itemData.Description,
          Total: itemData.Total
        }));
        
        result.push({
          category: categoryName,
          items: categoryItems
        });
      });
  
      return result;
    }

    // Agrupar materiales para vista detallada (mantiene todos los registros individuales)
    private groupMaterialsForDetails(materials: EnrichedItemRequest[]): MaterialsData['details'] {
      const categories: Record<string, EnrichedItemRequest[]> = {
        'Top hat': [], 'Angles': [], 'Screws': [], 
        'Caulking Glue': [], 'Packers': [], 'Tapes': [], 'Others': [] 
      };
  
      materials.forEach(material => {
        const category = Object.prototype.hasOwnProperty.call(categories, material.Category) 
          ? material.Category 
          : 'Others';
        
        categories[category].push(material);
      });
  
      // Convertir a formato MaterialsData['details']
      const result: MaterialsData['details'] = [];
      
      Object.entries(categories).forEach(([categoryName, items]) => {
        result.push({
          category: categoryName,
          items: items
        });
      });
  
      return result;
    }

  // Obtener Items Requests por Project Name
  private async getItemsRequestsByProject(projectName: string): Promise<ItemRequest[]> {
    const cacheKey = `items-requests-${projectName}`
    const cached = this.getCachedData<ItemRequest[]>(cacheKey)
    if (cached) return cached

    try {
      // Usar Selector con Filter para obtener Items Requests por Project Name
      const itemsRequestFilter = `Filter(Items Request, [Project]=${JSON.stringify(projectName)})`
      
      const response = await this.makeRequest<ItemRequest>('Items Request', 'Find', [], {
        Selector: itemsRequestFilter
      })

      this.setCachedData(cacheKey, response)
      return response
    } catch (error) {
      console.error('Error fetching items requests by Project Name:', error)
      return []
    }
  }

  // Obtener datos de hojas por Project Name (con procesamiento de inventario)
  async getSheetsData(projectName: string): Promise<Sheet[]> {
    const cacheKey = `sheets-${projectName}`
    const cached = this.getCachedData<Sheet[]>(cacheKey)
    if (cached) return cached

    try {
      // Obtener hojas del proyecto usando el filtro correcto como en google_script.js
      const sheetsFilter = `Filter(Sheets, AND([Project]=${JSON.stringify(projectName)}, [Off Cut]=false))`
      const sheetsResponse = await this.makeRequest<Sheet>('Sheets', 'Find', [], {
        Selector: sheetsFilter
      })

      if (sheetsResponse.length === 0) {
        this.setCachedData(cacheKey, [])
        return []
      }

      // Obtener IDs de inventario relacionados (como en google_script.js)
      const sheetInventoryIds: string[] = []
      sheetsResponse.forEach(sheet => {
        if (sheet['Related Sheets Inventorys']) {
          const ids = sheet['Related Sheets Inventorys'].split(',').map((id: string) => id.trim()).filter((id: string) => id.length > 0)
          sheetInventoryIds.push(...ids)
        }
      })

      // Obtener datos de inventario por IDs (como en google_script.js)
      let sheetsInventory: SheetInventory[] = []
      if (sheetInventoryIds.length > 0) {
        // Construir filtro para inventario como en el original
        const filterConditions = sheetInventoryIds.map(id => `[sheet_inventory_id]=${JSON.stringify(id)}`).join(', ')
        const filterSheetsInventories = `Filter(Sheets Inventory, OR(${filterConditions}))`
        
        sheetsInventory = await this.makeRequest<SheetInventory>('Sheets Inventory', 'Find', [], {
          Selector: filterSheetsInventories
        })
      }

      // Procesar datos como en el original (google_script.js)
      const processedSheets = sheetsResponse.map(sheet => {
        // Filtrar inventario relacionado con esta hoja por sheet ID
        const relatedInventory = sheetsInventory.filter(item => item['sheet'] === sheet['Sheet ID'])
        
        let totalReceived = 0
        let totalUsed = 0

        if (relatedInventory.length > 0) {
          // Calcular totales como en el original (google_script.js)
          totalReceived = relatedInventory
            .filter(inv => Number(inv['qty']) > 0)
            .reduce((sum, inv) => sum + Number(inv['qty']), 0)
          
          totalUsed = relatedInventory
            .filter(inv => Number(inv['qty']) < 0)
            .reduce((sum, inv) => sum + Math.abs(Number(inv['qty'])), 0)
        } else {
          // Fallback: usar los campos de la tabla Sheets si no hay inventario
          const quantityInFactory = Number(sheet['Quantity in Factory']) || 0
          const quantityInStore = Number(sheet['Quantity in Store']) || 0
          
          // Si hay cantidad en fábrica, considerarla como recibida
          if (quantityInFactory > 0) {
            totalReceived = quantityInFactory
          }
          
          // Si hay cantidad negativa en store, considerarla como usada
          if (quantityInStore < 0) {
            totalUsed = Math.abs(quantityInStore)
          }
        }

        return {
          ...sheet,
          TotalReceived: totalReceived,
          TotalUsed: totalUsed
        }
      })

      this.setCachedData(cacheKey, processedSheets)
      return processedSheets
    } catch (error) {
      console.error('Error fetching sheets:', error)
      return []
    }
  }

  // Obtener sheets simples pensado para Creator of Orders
  async getSheetsByProject(projectName: string): Promise<Array<{
    'Sheet ID': string
    Dimension: string
    Colour: string
    'Quantity in Factory': number
    'Quantity in Store': number
    'Off Cut': string | boolean
    Comment: string
  }>> {
    try {
      console.log(`🔄 Fetching sheets from AppSheet for project: ${projectName}...`)
      
      // Obtener TODAS las sheets del proyecto (sin filtro de Off Cut)
      const sheetsFilter = `Filter(Sheets, [Project]=${JSON.stringify(projectName)})`
      
      const sheetsResponse = await this.makeRequest<Sheet>('Sheets', 'Find', [], {
        Selector: sheetsFilter
      })

      if (sheetsResponse.length === 0) {
        console.log(`✅ No sheets found for project: ${projectName}`)
        return []
      }

      // Mapear solo los campos necesarios para Step 2
      const simpleSheets = sheetsResponse.map(sheet => ({
        'Sheet ID': sheet['Sheet ID'] || '',
        Dimension: sheet.Dimension || '',
        Colour: sheet.Colour || '',
        'Quantity in Factory': Number(sheet['Quantity in Factory']) || 0,
        'Quantity in Store': Number(sheet['Quantity in Store']) || 0,
        'Off Cut': sheet['Off Cut'] == 'Y' ? true : false,
        Comment: sheet.Comment || ''
      }))

      return simpleSheets
    } catch (error) {
      console.error(`Error fetching sheets for project ${projectName}:`, error)
      return []
    }
  }

  // Obtener comprobantes de entrega por Project Name (usando Related Delivery_Dockets)
  async getDeliveryDockets(projectName: string): Promise<DeliveryDocket[]> {
    const cacheKey = `deliveries-${projectName}`
    const cached = this.getCachedData<DeliveryDocket[]>(cacheKey)
    if (cached) return cached

    try {
      // Obtener el proyecto para acceder a Related Delivery_Dockets
      const project = await this.getProjectData(projectName)
      if (!project || !project['Related Delivery_Dockets']) {
        return []
      }

      // Extraer IDs de Delivery Dockets del campo relacionado
      const deliveryIds = project['Related Delivery_Dockets']
        ?.split(',')
        .map((id: string) => id.trim())
        .filter((id: string) => id.length > 0) || []

      if (deliveryIds.length === 0) return []

      // Usar Selector con Filter para múltiples IDs
      const filterConditions = deliveryIds.map((id: string) => `[delivery_id]=${JSON.stringify(id)}`).join(', ')
      const deliveryFilter = `Filter(Delivery_Dockets, OR(${filterConditions}))`
      
      const response = await this.makeRequest<DeliveryDocket>('Delivery_Dockets', 'Find', [], {
        Selector: deliveryFilter
      })

      this.setCachedData(cacheKey, response)
      return response
    } catch (error) {
      console.error('Error fetching delivery dockets:', error)
      return []
    }
  }

  // Limpiar cache
  clearCache(): void {
    this.cache.clear()
  }

  // Limpiar cache específico
  clearCacheFor(key: string): void {
    this.cache.delete(key)
  }

  // Obtener asignaciones de personal por Project Name
  async getPeopleAllowances(projectName: string): Promise<PeopleAllowance[]> {
    const cacheKey = `allowances-${projectName}`
    const cached = this.getCachedData<PeopleAllowance[]>(cacheKey)
    if (cached) return cached

    try {
      // Filtrar por Project Name directamente
      const response = await this.makeRequest<PeopleAllowance>('People Allowance', 'Find', [], {
        Selector: `Filter(People Allowance, [Project]=${JSON.stringify(projectName)})`
      })

      console.log('🔍 People Allowances API Response:', response)
      this.setCachedData(cacheKey, response)
      return response
    } catch (error) {
      console.error('Error fetching people allowances:', error)
      return []
    }
  }

  // Mark order as delivered using AppSheet Action
  async markOrderAsDelivered(orderId: string): Promise<Order[]> {
    try {
      console.log(`🔄 Marking order ${orderId} as delivered...`)
      
      // Use AppSheet Action to mark order as delivered in Orders cut table
      const actionResponse = await this.makeRequest<Order>('Orders cut', 'Delivered', [{
        'Order ID': orderId
      }])

      if (actionResponse && actionResponse.length > 0) {
        console.log(`✅ Order ${orderId} marked as delivered successfully`)
        console.log(`📋 Updated order details:`, actionResponse[0])
        return actionResponse
      } else {
        console.error(`❌ Failed to mark order ${orderId} as delivered - empty response`)
        return []
      }
    } catch (error) {
      console.error(`Error marking order ${orderId} as delivered:`, error)
      return []
    }
  }

  // Get documents by project
  async getDocumentsByProject(projectName: string): Promise<Document[]> {
    try {
      console.log(`🔄 Fetching documents for project: ${projectName}...`)
      
      // Construir el filtro manualmente (sin AND porque es un solo criterio)
      const documentsFilter = `Filter(Documents, [Project]=${JSON.stringify(projectName)})`
      
      const response = await this.makeRequest<Document>('Documents', 'Find', [], {
        Selector: documentsFilter
      })

      if (response && response.length > 0) {
        console.log(`✅ Found ${response.length} documents for project ${projectName}`)
        return response
      } else {
        console.log(`ℹ️ No documents found for project ${projectName}`)
        return []
      }
    } catch (error) {
      console.error(`Error fetching documents for project ${projectName}:`, error)
      return []
    }
  }

  // Add a document to the Documents table
  async addDocument(document: {
    file: File
    'Project': string
    'Name': string
    'Orders': string
    'Comments'?: string
    'Category'?: string
  }): Promise<Document[]> {
    try {
      console.log(`🔄 Adding document to AppSheet...`)
      
      // Importar el servicio de upload dinámicamente para evitar dependencias circulares
      const { uploadDocumentToDrive } = await import('./uploadService')
      
      // 1. Subir archivo a Google Drive
      console.log(`📤 Uploading file to Google Drive...`)
      const filePath = await uploadDocumentToDrive(
        document.file,
        document['Project'],
        document['Orders'],
        document['Name']
      )
      
      console.log(`✅ File uploaded to Drive: ${filePath}`)
      
      // 2. Crear registro en AppSheet con la ruta del archivo
      console.log(`💾 Saving document record in AppSheet...`)
      const response = await this.makeRequest<Document>('Documents', 'Add', [{
        'Project': document['Project'],
        'Name': document['Name'],
        'File': filePath,
        'Orders': document['Orders'],
        'Comments': document['Comments'] || '',
        'Category': document['Category'] || '',
      }])

      if (response && response.length > 0) {
        console.log(`✅ Document added successfully`)
        return response
      } else {
        console.error(`❌ Failed to add document - empty response`)
        return []
      }
    } catch (error) {
      console.error(`Error adding document:`, error)
      throw error
    }
  }

  // Update document to link it to an order
  async linkDocumentToOrder(documentId: string, orderId: string): Promise<Document[]> {
    try {
      console.log(`🔄 Linking document ${documentId} to order ${orderId}...`)
      
      // First, get the current document
      const currentDoc = await this.makeRequest<Document>('Documents', 'Find', [{
        'Document ID': documentId
      }])

      if (!currentDoc || currentDoc.length === 0) {
        throw new Error(`Document with ID ${documentId} not found`)
      }

      const doc = currentDoc[0]
      const currentOrders = doc['Orders'] || ''
      
      // Parse the current orders - Orders is stored as comma-separated string
      let ordersList: string[] = []
      
      if (currentOrders) {
        if (typeof currentOrders === 'string') {
          // Parse comma-separated string into array
          ordersList = currentOrders
            .split(',')
            .map((id: string) => id.trim())
            .filter((id: string) => id.length > 0)
        } else if (Array.isArray(currentOrders)) {
          // If it comes as array, convert to string array
          ordersList = (currentOrders as unknown[])
            .map((id: unknown) => String(id).trim())
            .filter((id: string) => id.length > 0)
        }
      }
      
      // Ensure orderId is clean
      const cleanOrderId = orderId.trim()
      
      // Add the new order ID if it doesn't already exist
      if (cleanOrderId && !ordersList.includes(cleanOrderId)) {
        ordersList.push(cleanOrderId)
      }
      
      // Convert back to comma-separated string (as Orders field is text type, not EnumList Ref)
      const updatedOrders = ordersList.join(',')
      
      // Update the document - AppSheet Edit requires key fields
      // Orders is a text field storing comma-separated values, not an EnumList Ref
      const editPayload = {
        'Document ID': documentId,
        'Orders': updatedOrders, // Send as comma-separated string
        'Comments': doc['Comments'] || '',
        'Category': doc['Category'] || ''
      }
      
      const response = await this.makeRequest<Document>('Documents', 'Edit', [editPayload])

      if (response && response.length > 0) {
        console.log(`✅ Document ${documentId} linked to order ${orderId} successfully`)
        return response
      } else {
        console.error(`❌ Failed to link document - empty response`)
        return []
      }
    } catch (error) {
      console.error(`Error linking document to order:`, error)
      throw error
    }
  }

  // Crear stages en AppSheet (batch)
  async createStages(stages: Array<{
    Order: string
    Action: string
    'Quality Control': boolean
  }>): Promise<unknown[]> {
    if (stages.length === 0) {
      console.warn('⚠️ No stages to create')
      return []
    }

    try {
      console.log(`🔄 Creating ${stages.length} stages in AppSheet...`)
      const response = await this.makeRequest<unknown>('Stages Order', 'Add', stages)

      if (response && response.length > 0) {
        console.log(`✅ ${response.length} stages created successfully in AppSheet`)
        return response
      } else {
        console.error(`❌ Failed to create stages - empty response`)
        return []
      }
    } catch (error) {
      console.error('Error creating stages in AppSheet:', error)
      throw error
    }
  }

  // Crear paneles en AppSheet (batch)
  async createPanels(panels: Array<{
    Name: string
    Project: string
    Status: string
    Area: number
    'Cut Distance': number
    Order: string
    'Creation Date': string
    Comment: string
    Image: string
    Priority: string
    'Nest Number': string
    Sheet: string
  }>): Promise<unknown[]> {
    if (panels.length === 0) {
      console.warn('⚠️ No panels to create')
      return []
    }

    try {
      console.log(`🔄 Creating ${panels.length} panels in AppSheet...`)
      const response = await this.makeRequest<unknown>('Panels', 'Add', panels)

      if (response && response.length > 0) {
        console.log(`✅ ${response.length} panels created successfully in AppSheet`)
        return response
      } else {
        console.error(`❌ Failed to create panels - empty response`)
        return []
      }
    } catch (error) {
      console.error('Error creating panels in AppSheet:', error)
      throw error
    }
  }

  // Crear solo la orden de corte en AppSheet (sin stages ni panels)
  async addOrderCut(order: {
    'Order ID': string
    Project: string
    Responsable: string
    Status: string
    Colour: string
    Notification: boolean
    'Creation Date': string
  }): Promise<unknown[]> {
    try {
      console.log(`🔄 Creating order cut in AppSheet: ${order['Order ID']}`)
      const response = await this.makeRequest<unknown>('Orders cut', 'Add', [order])

      if (!response || response.length === 0) {
        throw new Error('Failed to create order cut in AppSheet - empty response')
      }

      console.log(`✅ Order cut created successfully in AppSheet`)
      return response
    } catch (error) {
      console.error('Error creating order cut in AppSheet:', error)
      throw error
    }
  }

  // Crear orden de corte completa en AppSheet (incluye stages y panels)
  async createOrderCut(
    order: {
      'Order ID': string
      Project: string
      Responsable: string
      Status: string
      Colour: string
      Notification: boolean
      'Creation Date': string
    },
    stages: Array<{
      Order: string
      Action: string
      'Quality Control': boolean
    }>,
    panels: Array<{
      Name: string
      Project: string
      Status: string
      Area: number
      'Cut Distance': number
      Order: string
      'Creation Date': string
      Comment: string
      Image: string
      Priority: string
      'Nest Number': string
      Sheet: string
    }>
  ): Promise<{
    order: unknown[]
    stages: unknown[]
    panels: unknown[]
  }> {
    try {
      console.log(`🔄 Creating order cut in AppSheet: ${order['Order ID']}`)

      // 1. Crear la orden
      console.log(`📝 Creating order...`)
      const orderResponse = await this.makeRequest<unknown>('Orders cut', 'Add', [order])

      if (!orderResponse || orderResponse.length === 0) {
        throw new Error('Failed to create order in AppSheet - empty response')
      }

      console.log(`✅ Order created successfully in AppSheet`)

      // 2. Crear stages
      console.log(`📝 Creating stages...`)
      let stagesResponse: unknown[] = []
      try {
        stagesResponse = await this.createStages(stages)
      } catch (error) {
        console.error('⚠️ Error creating stages, but continuing:', error)
        // Continuar aunque falle stages
      }

      // 3. Crear panels
      console.log(`📝 Creating panels...`)
      let panelsResponse: unknown[] = []
      try {
        panelsResponse = await this.createPanels(panels)
      } catch (error) {
        console.error('⚠️ Error creating panels, but continuing:', error)
        // Continuar aunque falle panels
      }

      console.log(`✅ Order cut creation completed in AppSheet`)

      return {
        order: orderResponse,
        stages: stagesResponse,
        panels: panelsResponse
      }
    } catch (error) {
      console.error('Error creating order cut in AppSheet:', error)
      throw error
    }
  }
}

export default AppSheetAPI 