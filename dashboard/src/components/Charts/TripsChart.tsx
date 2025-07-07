import React from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
} from 'chart.js'
import { Filler } from 'chart.js'
import 'chartjs-adapter-date-fns'
import { useProjectDeliveries } from '../../hooks/useCharts'
import { useProjectData } from '../../hooks/useProjectData'
import LoadingSpinner from '../Common/LoadingSpinner'
import './Charts.css'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler
)

interface TripsChartProps {
  projectName: string
}

const TripsChart: React.FC<TripsChartProps> = ({ projectName }) => {
  const { data: deliveriesData, isLoading: deliveriesLoading, error: deliveriesError } = useProjectDeliveries(projectName)
  const { data: projectData, isLoading: projectLoading } = useProjectData(projectName)

  if (deliveriesLoading || projectLoading) {
    return <LoadingSpinner />
  }

  if (deliveriesError) {
    return <div className="error-message">Error loading delivery data</div>
  }

  if (!deliveriesData || !projectData) {
    return <div className="no-data">No delivery data available</div>
  }

  const { sortedDates, dailyData, cumulativeData, totalDeliveries } = deliveriesData
  const deliveriesAllowed = projectData['Deliveries Allowed'] ? parseInt(projectData['Deliveries Allowed'].toString()) : 0

  const warningThreshold = 0.9;
  const isWarning = totalDeliveries >= Math.floor(deliveriesAllowed * warningThreshold) && totalDeliveries < deliveriesAllowed;
  const isDanger = totalDeliveries >= deliveriesAllowed && deliveriesAllowed > 0;

  const chartData = {
    labels: sortedDates,
    datasets: [
      {
        label: 'Trips per Day',
        data: dailyData,
        borderColor: '#4caf50',
        backgroundColor: 'rgba(76,175,80,0.2)',
        pointBackgroundColor: '#0af013',
        pointRadius: 6,
        fill: true,
        tension: 0.3
      },
      {
        label: 'Cumulative Trips',
        data: cumulativeData,
        borderColor: '#c1c536',
        backgroundColor: 'rgba(193,197,54,0.2)',
        pointBackgroundColor: '#ffc107',
        pointRadius: 6,
        fill: true,
        tension: 0.3
      },
      {
        label: 'Delivery Allowances',
        data: sortedDates.map(() => deliveriesAllowed),
        borderColor: '#cb4335',
        borderWidth: 4,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false
      }
    ]
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 2000,
      easing: 'easeInOutQuad' as const
    },
    plugins: {
      title: {
        display: true,
        text: 'Daily and Cumulative Trips',
        font: {
          size: 18,
          weight: 'bold' as const
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false
      },
      legend: {
        labels: {
          usePointStyle: true,
          font: {
            size: 14
          }
        }
      },
      datalabels: {
        display: false
      }
    },
    interaction: {
      mode: 'index' as const,
      intersect: false
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: 'day' as const
        },
        title: {
          display: true,
          text: 'Date',
          font: {
            size: 16,
            weight: 'bold' as const
          }
        }
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Number of Trips',
          font: {
            size: 16,
            weight: 'bold' as const
          }
        }
      }
    }
  }

  return (
    <div className="chart-container">
      <div className="chart-info">
        <div className="chart-stats trips-stats-row">
          <div className="stat-item">
            <span className="emoji">🚚</span>
            <span className="stat-label">Delivery Allowances:</span>
            <span className="stat-value">{deliveriesAllowed}</span>
          </div>
          <div className={`stat-item trips-made-stat${isDanger ? ' danger' : isWarning ? ' warning' : ''}`}>
            <span className="emoji">📦</span>
            <span className="stat-label">Trips Made:</span>
            <span className="stat-value">{totalDeliveries}</span>
            {isDanger && <span className="stat-alert" title="Exceeded delivery allowance">&#9888;</span>}
            {isWarning && !isDanger && <span className="stat-alert" title="Close to delivery allowance">&#9888;</span>}
          </div>
        </div>
      </div>
      <div className="chart-wrapper">
        <Line data={chartData} options={options} />
      </div>
    </div>
  )
}

export default TripsChart 