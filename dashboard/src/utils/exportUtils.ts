// Utilidades para exportación de datos

import type { CSVExportData } from '../types/supabase';

// Función para exportar a CSV
export const exportToCSV = (data: CSVExportData, filename: string) => {
  const csvContent = generateCSVContent(data)
  downloadFile(csvContent, `${filename}.csv`, 'text/csv')
}

// Generar contenido CSV
const generateCSVContent = (data: CSVExportData): string => {
  const lines: string[] = []
  
  // Header del archivo
  lines.push('=== FACTORY ANALYTICS REPORT ===')
  lines.push(`Generated: ${new Date(data.exportDate).toLocaleString('en-AU')}`)
  lines.push(`Date Range: ${data.dateRange.start} to ${data.dateRange.end}`)
  lines.push('Company: Cladding Creations')
  lines.push('')
  
  // Métricas principales
  lines.push('=== MAIN METRICS ===')
  lines.push('Metric,Value,Unit')
  lines.push(`Total SQM Cut,${data.metrics.totalCutArea.toFixed(2)},SQM`)
  lines.push(`Total SQM Manufactured,${data.metrics.totalManufacturedArea.toFixed(2)},SQM`)
  lines.push(`Total Projects,${data.projects.length},units`)
  lines.push(`Total Panels,${data.metrics.totalPanels},units`)
  lines.push('')
  
  // Resumen por proyecto
  if (data.projects && data.projects.length > 0) {
    lines.push('=== PROJECTS SUMMARY ===')
    lines.push('Project Number,Project Name,PM,Supervisor,Status,Real Total Cut SQM,Expected Total SQM,Progress %,Allowed SQM to Buy,Start Date,Expected Date,Finalization Date,SQM Cut,SQM Manufactured,Total Panels')
    
    data.projects.forEach((project) => {
      lines.push([
        `"${project.projectNumber}"`,
        `"${project.projectName}"`,
        `"${project.pm}"`,
        `"${project.supervisor}"`,
        `"${project.status}"`,
        project.realTotalCutSqm.toFixed(2),
        project.expectedTotalSqm.toFixed(2),
        project.progressPercentage,
        project.allowedSqmToBuy.toFixed(2),
        project.startDate,
        project.expectedDate,
        project.finalizationDate,
        project.cutSqm.toFixed(2),
        project.manufacturedSqm.toFixed(2),
        project.totalPanels
      ].join(','))
    })
    lines.push('')
  }
  
  // Productividad diaria
  if (data.chartData && data.chartData.length > 0) {
    lines.push('=== DAILY PRODUCTIVITY ===')
    lines.push('Date,SQM Cut,SQM Manufactured')
    
    data.chartData.forEach((item) => {
      lines.push([
        item.date,
        item.cutArea.toFixed(2),
        item.manufacturedArea.toFixed(2)
      ].join(','))
    })
  }
  
  return lines.join('\n')
}

// Función para descargar archivo
const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}

// Función para formatear fecha para nombre de archivo
export const formatDateForFilename = (date: Date): string => {
  return date.toISOString().split('T')[0]
}

// Función para generar nombre de archivo con timestamp
export const generateFilename = (prefix: string, startDate: string, endDate: string): string => {
  return `${prefix}_${startDate}_to_${endDate}`
}
