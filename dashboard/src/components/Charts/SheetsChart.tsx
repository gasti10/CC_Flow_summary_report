import React from 'react'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import { Filler } from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import type { Sheet } from '../../types/appsheet'
import './Charts.css'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels,
  Filler
)

interface SheetsChartProps {
  sheets: Sheet[]
  isLoading?: boolean
}

const SheetsChart: React.FC<SheetsChartProps> = ({ sheets, isLoading = false }) => {
  if (isLoading) {
    return (
      <div className="chart-container">
        <h3>Comparison of Purchased vs Used Sheets</h3>
        <div className="loading-spinner" id="sheetsLoadingSpinner"></div>
        <p>Loading sheets data...</p>
      </div>
    )
  }

  if (!sheets || sheets.length === 0) {
    return (
      <div className="chart-container">
        <h3>Comparison of Purchased vs Used Sheets</h3>
        <p>No sheets data available for this project.</p>
      </div>
    )
  }

  // Calcular totales
  const totalSheets = sheets.length
  const totalReceived = sheets.reduce((sum, sheet) => sum + (sheet.TotalReceived || 0), 0)
  const totalUsed = sheets.reduce((sum, sheet) => sum + (sheet.TotalUsed || 0), 0)

  // Preparar datos para el gráfico usando los campos correctos
  const chartData = {
    labels: sheets.map(sheet => sheet.Sheet), // Usar el campo Sheet que contiene la descripción completa
    datasets: [
      {
        label: 'Total Received',
        data: sheets.map(sheet => sheet.TotalReceived || 0),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1
      },
      {
        label: 'Total Used',
        data: sheets.map(sheet => sheet.TotalUsed || 0),
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1
      }
    ]
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        bottom: 25
      }
    },
    plugins: {
      datalabels: {
        color: '#000',
        align: 'top' as const,
        anchor: 'end' as const,
        font: {
          size: 12,
          weight: 'bold' as const
        },
        formatter: function(value: number) {
          return value > 0 ? value.toString() : '0'
        }
      },
      legend: {
        position: 'top' as const,
        font: {
          size: 16,
          weight: 'bold' as const
        }
      },
      title: {
        display: true,
        text: 'Sheets Overview by Details',
        font: {
          size: 20,
          weight: 'bold' as const
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Sheets',
          font: {
            size: 16,
            weight: 'bold' as const
          }
        },
        ticks: {
          autoSkip: true,
          maxRotation: 45,
          minRotation: 0,
          font: {
            size: 12,
            weight: 'bold' as const
          }
        }
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Quantity',
          font: {
            size: 16,
            weight: 'bold' as const
          }
        },
        ticks: {
          font: {
            size: 14,
            weight: 'bold' as const
          }
        }
      }
    }
  }

  return (
    <div className="chart-container">
      <h3>Comparison of Purchased vs Used Sheets</h3>
      <div className="chart-wrapper">
        <Bar data={chartData} options={options} />
      </div>
      <div className="chart-info" style={{ 
        display: 'flex', 
        justifyContent: 'space-around', 
        marginTop: '20px',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <p><strong>Total Sheets:</strong> {totalSheets}</p>
        <p><strong>Total Received:</strong> {totalReceived}</p>
        <p><strong>Total Used:</strong> {totalUsed}</p>
      </div>
    </div>
  )
}

export default SheetsChart 