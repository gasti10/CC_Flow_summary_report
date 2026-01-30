// Servicio orquestador para la creación de órdenes de corte
// Coordina la creación en Supabase y AppSheet

import { supabaseApi } from './supabaseApi'
import { supabaseClient } from './supabaseClient'
import AppSheetAPI from './appsheetApi'
import { getBrisbaneDateTime } from '../utils/dateUtils'
import type { OrderFormData } from '../components/CreatorOfOrders/types/wizard.types'

const appSheetApi = new AppSheetAPI()

export interface CreateOrderProgress {
  step: number
  totalSteps: number
  message: string
  status: 'pending' | 'in-progress' | 'completed' | 'error'
}

export interface CreateOrderResult {
  success: boolean
  orderId: string
  errors: string[]
  warnings: string[]
}

/**
 * Crea una orden de corte completa con sus stages y panels
 * @param formData - Datos del formulario del wizard
 * @param qualityControl - Si la orden requiere quality control
 * @param notification - Si la orden debe enviar notificaciones
 * @param onProgress - Callback opcional para reportar progreso
 * @returns Resultado de la creación con errores y warnings
 */
export async function createOrder(
  formData: OrderFormData,
  qualityControl: boolean,
  notification: boolean = true,
  onProgress?: (progress: CreateOrderProgress) => void
): Promise<CreateOrderResult> {
  const errors: string[] = []
  const warnings: string[] = []
  const creationDate = getBrisbaneDateTime()
  
  // Calcular documentos pendientes
  const pendingNewDocuments = formData.documents.filter(doc => !doc.uploaded || !doc.saved)
  const pendingExistingDocuments = formData.selectedExistingDocuments.filter(doc => !doc.linked)
  const hasPendingDocuments = pendingNewDocuments.length > 0 || pendingExistingDocuments.length > 0
  
  // Total de pasos: 7 básicos + documentos si hay
  const baseSteps = 7
  const documentSteps = hasPendingDocuments 
    ? (pendingNewDocuments.length > 0 ? 1 : 0) + (pendingExistingDocuments.length > 0 ? 1 : 0)
    : 0
  const totalSteps = baseSteps + documentSteps

  try {
    // Paso 1: Preparar datos de la orden
    onProgress?.({
      step: 1,
      totalSteps,
      message: 'Preparing order data...',
      status: 'in-progress'
    })

    const order = {
      'Order ID': formData.orderId,
      Project: formData.project,
      Responsable: formData.responsable,
      Status: formData.status,
      Colour: formData.colour,
      Notification: notification,
      'Creation Date': creationDate
    }

    // Preparar stages (solo para AppSheet)
    const stages = [
      { Order: formData.orderId, Action: 'Cut', 'Quality Control': qualityControl },
      { Order: formData.orderId, Action: 'Manufacturing', 'Quality Control': qualityControl },
      { Order: formData.orderId, Action: 'Packaging', 'Quality Control': qualityControl }
    ]

    // Preparar paneles
    const panels = formData.panels.map(panel => ({
      Name: panel.name,
      Project: formData.project,
      Status: 'Ready to cut',
      Area: panel.area,
      'Cut Distance': panel.cutDistance,
      Order: formData.orderId,
      'Creation Date': creationDate,
      Comment: panel.comment || '',
      Image: '',
      Priority: formData.priority,
      'Nest Number': panel.nestNumber,
      Sheet: panel.sheetName
    }))

    onProgress?.({
      step: 1,
      totalSteps,
      message: 'Order data prepared',
      status: 'completed'
    })

    // Paso 2: Crear orden en Supabase
    onProgress?.({
      step: 2,
      totalSteps,
      message: 'Creating order in DB...',
      status: 'in-progress'
    })

    try {
      const { error: orderError } = await supabaseClient
        .from('Orders cut')
        .insert([order])

      if (orderError) {
        throw new Error(`Supabase error creating order: ${orderError.message}`)
      }

      onProgress?.({
        step: 2,
        totalSteps,
        message: 'Order created in DB',
        status: 'completed'
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      errors.push(`Failed to create order in Supabase: ${errorMessage}`)
      onProgress?.({
        step: 2,
        totalSteps,
        message: `Error: ${errorMessage}`,
        status: 'error'
      })
      throw error // Detener si falla Supabase
    }

    // Paso 3: Crear panels en Supabase
    onProgress?.({
      step: 3,
      totalSteps,
      message: `Creating panels in DB (${panels.length} panels)...`,
      status: 'in-progress'
    })

    try {
      if (panels.length > 0) {
        await supabaseApi.createPanels(panels)
        onProgress?.({
          step: 3,
          totalSteps,
          message: `Panels created in DB (${panels.length} panels)`,
          status: 'completed'
        })
      } else {
        onProgress?.({
          step: 3,
          totalSteps,
          message: 'No panels to create',
          status: 'completed'
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      errors.push(`Failed to create panels in Supabase: ${errorMessage}`)
      onProgress?.({
        step: 3,
        totalSteps,
        message: `Error: ${errorMessage}`,
        status: 'error'
      })
      throw error
    }

    // Paso 4: Crear orden en AppSheet
    onProgress?.({
      step: 4,
      totalSteps,
      message: 'Creating order in CC Flow 2026...',
      status: 'in-progress'
    })

    try {
      await appSheetApi.addOrderCut(order)
      onProgress?.({
        step: 4,
        totalSteps,
        message: 'Order created in CC Flow 2026',
        status: 'completed'
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      warnings.push(`Failed to create order in AppSheet: ${errorMessage}`)
      onProgress?.({
        step: 4,
        totalSteps,
        message: `Warning: ${errorMessage}`,
        status: 'error'
      })
      // Continuar aunque falle AppSheet (ya está en Supabase)
    }

    // Paso 5: Crear stages en AppSheet
    onProgress?.({
      step: 5,
      totalSteps,
      message: 'Creating stages in CC Flow 2026 (3 stages)...',
      status: 'in-progress'
    })

    try {
      await appSheetApi.createStages(stages)
      onProgress?.({
        step: 5,
        totalSteps,
        message: 'Stages created in CC Flow 2026 (3 stages)',
        status: 'completed'
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      warnings.push(`Failed to create stages in AppSheet: ${errorMessage}`)
      onProgress?.({
        step: 5,
        totalSteps,
        message: `Warning: ${errorMessage}`,
        status: 'error'
      })
      // Continuar aunque falle stages
    }

    // Paso 6: Crear panels en AppSheet
    onProgress?.({
      step: 6,
      totalSteps,
      message: `Creating panels in CC Flow 2026 (${panels.length} panels)...`,
      status: 'in-progress'
    })

    try {
      if (panels.length > 0) {
        await appSheetApi.createPanels(panels)
        onProgress?.({
          step: 6,
          totalSteps,
          message: `Panels created in CC Flow 2026 (${panels.length} panels)`,
          status: 'completed'
        })
      } else {
        onProgress?.({
          step: 6,
          totalSteps,
          message: 'No panels to create',
          status: 'completed'
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      warnings.push(`Failed to create panels in AppSheet: ${errorMessage}`)
      onProgress?.({
        step: 6,
        totalSteps,
        message: `Warning: ${errorMessage}`,
        status: 'error'
      })
      // Continuar aunque falle panels
    }

    // Paso 7: Crear Sheets Inventory en AppSheet
    onProgress?.({
      step: 7,
      totalSteps,
      message: `Updating sheets inventory in CC Flow 2026 (${formData.selectedSheets.length} sheets)...`,
      status: 'in-progress'
    })

    try {
      if (formData.selectedSheets.length > 0) {
        // Preparar registros de Sheets Inventory
        const sheetsInventoryRecords = formData.selectedSheets.map(sheet => ({
          'Sheet ID': sheet.sheetId,
          order: formData.orderId,
          qty: -sheet.qty, // Negativo porque representa salida/reducción
          change_time: creationDate
        }))

        await appSheetApi.createSheetsInventory(sheetsInventoryRecords)
        onProgress?.({
          step: 7,
          totalSteps,
          message: `Sheets inventory updated in CC Flow 2026 (${formData.selectedSheets.length} sheets)`,
          status: 'completed'
        })
      } else {
        onProgress?.({
          step: 7,
          totalSteps,
          message: 'No sheets to update in inventory',
          status: 'completed'
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      warnings.push(`Failed to update sheets inventory in AppSheet: ${errorMessage}`)
      onProgress?.({
        step: 7,
        totalSteps,
        message: `Warning: ${errorMessage}`,
        status: 'error'
      })
      // Continuar aunque falle sheets inventory
    }

    // Procesar documentos si hay pendientes
    if (hasPendingDocuments) {
      let currentStep = baseSteps

      // Paso 8: Subir documentos nuevos
      if (pendingNewDocuments.length > 0) {
        currentStep++
        onProgress?.({
          step: currentStep,
          totalSteps,
          message: `Uploading ${pendingNewDocuments.length} new document(s)...`,
          status: 'in-progress'
        })

        for (let i = 0; i < pendingNewDocuments.length; i++) {
          const doc = pendingNewDocuments[i]
          
          // Validar que tenga categoría
          if (!doc.category || !doc.category.trim()) {
            warnings.push(`Document "${doc.name}" skipped: Category is required`)
            continue
          }

          try {
            await appSheetApi.addDocument({
              file: doc.file,
              'Project': formData.project,
              'Name': doc.name,
              'Orders': formData.orderId,
              'Comments': doc.comments || '',
              'Category': doc.category || ''
            })
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            warnings.push(`Failed to upload document "${doc.name}": ${errorMessage}`)
          }
        }

        onProgress?.({
          step: currentStep,
          totalSteps,
          message: `Uploaded ${pendingNewDocuments.length} new document(s)`,
          status: 'completed'
        })
      }

      // Paso 9: Vincular documentos existentes
      if (pendingExistingDocuments.length > 0) {
        currentStep++
        onProgress?.({
          step: currentStep,
          totalSteps,
          message: `Linking ${pendingExistingDocuments.length} existing document(s)...`,
          status: 'in-progress'
        })

        for (let i = 0; i < pendingExistingDocuments.length; i++) {
          const doc = pendingExistingDocuments[i]
          
          try {
            await appSheetApi.linkDocumentToOrder(doc.documentId, formData.orderId)
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            warnings.push(`Failed to link document "${doc.name}": ${errorMessage}`)
          }
        }

        onProgress?.({
          step: currentStep,
          totalSteps,
          message: `Linked ${pendingExistingDocuments.length} existing document(s)`,
          status: 'completed'
        })
      }
    }

    return {
      success: errors.length === 0,
      orderId: formData.orderId,
      errors,
      warnings
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      orderId: formData.orderId,
      errors: [...errors, errorMessage],
      warnings
    }
  }
}
