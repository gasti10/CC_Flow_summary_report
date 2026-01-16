// Servicio para subir archivos a Google Drive mediante Google Apps Script

/**
 * Convierte un archivo a base64
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = error => reject(error)
  })
}

/**
 * Interfaz para la respuesta del servicio de upload
 */
export interface UploadResponse {
  success: boolean
  filePath?: string
  error?: string
}

/**
 * Sube un archivo a Google Drive y retorna la ruta relativa
 * 
 * @param file - Archivo a subir
 * @param project - Nombre del proyecto
 * @param orderId - ID de la orden
 * @param documentName - Nombre del documento (opcional)
 * @returns Ruta relativa del archivo para usar en AppSheet
 */
export async function uploadDocumentToDrive(
  file: File,
  project: string,
  orderId: string,
  documentName?: string
): Promise<string> {
  // Obtener la URL del Web App desde variables de entorno
  const WEB_APP_URL = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_UPLOAD_URL

  if (!WEB_APP_URL) {
    throw new Error(
      'VITE_GOOGLE_APPS_SCRIPT_UPLOAD_URL is not configured. Please set it in your .env file.'
    )
  }

  // Convertir archivo a base64
  const base64 = await fileToBase64(file)

  // Remover el prefijo "data:mime/type;base64," si existe
  const base64Content = base64.includes(',') ? base64.split(',')[1] : base64

  // Preparar el payload
  const payload = {
    action: 'uploadDocument',
    file: {
      name: file.name,
      content: base64Content,
      mimeType: file.type || 'application/octet-stream'
    },
    project: project,
    orderId: orderId,
    documentName: documentName || file.name
  }

  // Hacer la petición
  // Enviar como text/plain para evitar preflight de CORS en Apps Script
  const response = await fetch(WEB_APP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify(payload)
  })

  // Verificar si la respuesta es exitosa
  if (!response.ok) {
    // Si la respuesta no es OK, podría ser un error de autenticación
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        'Authentication required. Please sign in with your Google account.'
      )
    }
    const errorText = await response.text()
    throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
  }

  // Parsear la respuesta
  const result: UploadResponse = await response.json()

  if (result.success && result.filePath) {
    return result.filePath
  } else {
    throw new Error(result.error || 'Failed to upload file')
  }
}
