// AppSheet API Service

import type {
  Project,
  Order,
  ItemRequest,
  Sheet,
  SheetInventory,
  PeopleAllowance,
  DeliveryDocket,
  AppSheetResponse,
  MaterialsData,
  EnrichedItemRequest,
} from '../types/appsheet'

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
        const filterExpression = `Filter(${tableName}, AND(${filterConditions.join(', ')}))`
        requestProperties = {
          ...requestProperties,
          Selector: filterExpression
        }
        requestRows = [] // Rows debe estar vacío cuando se usa Selector
      }
    }
    
    const requestBody = {
      Action: action,
      Properties: {
        Locale: 'en-AU',
        Location: '-28.0167, 153.4000',
        Timezone: 'E. Australia Standard Time',
        ...requestProperties
      },
      Rows: requestRows
    }

    try {
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

      const data = await response.json()
      return data as AppSheetResponse<T>
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

  // Obtener todos los proyectos (datos completos para cache)
  async getAllProjects(): Promise<Project[]> {
    const cacheKey = 'all-projects'
    const cached = this.getCachedData<Project[]>(cacheKey)
    if (cached) {
      console.log('✅ Using cached projects data')
      return cached
    }

    try {
      console.log('🔄 Fetching projects data from API...')
      // Usar Selector para obtener todos los campos necesarios
      const response = await this.makeRequest<Project>('projects_dashboard_summary_slice', 'Find', [], {})
      const projects: Project[] = response
      
      // Cache por 15 minutos para proyectos
      this.cache.set(cacheKey, {
        data: projects,
        timestamp: Date.now()
      })
      console.log(`✅ Cached ${projects.length} projects`)
      
      return projects
    } catch (error) {
      console.error('Error fetching all projects:', error)
      return []
    }
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
}

export default AppSheetAPI 