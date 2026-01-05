import React, { useRef, useEffect } from 'react';
import { Card } from '../Common/Card';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface CNCData {
  date: string;
  cnc: string;
  cut: number;
}

interface CNCChartProps {
  data: CNCData[];
  title: string;
  loading?: boolean;
}

export const CNCChart: React.FC<CNCChartProps> = ({
  data,
  title,
  loading = false
}) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<ChartJS | null>(null);

  useEffect(() => {
    if (!chartRef.current || loading) return;

    // Destroy existing chart
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    // Group data by date and CNC machine
    const groupedData = data.reduce((acc, item) => {
      if (!acc[item.date]) {
        acc[item.date] = {};
      }
      if (!acc[item.date][item.cnc]) {
        acc[item.date][item.cnc] = 0;
      }
      acc[item.date][item.cnc] += item.cut;
      return acc;
    }, {} as Record<string, Record<string, number>>);

    // Get all unique dates and CNC machines
    const dates = Object.keys(groupedData).sort();
    const cncMachines = Array.from(new Set(data.map(item => item.cnc)));

    // Generate colors for each CNC machine
    const colors = [
      'rgb(59, 130, 246)',   // Blue
      'rgb(34, 197, 94)',    // Green
      'rgb(251, 191, 36)',   // Yellow
      'rgb(239, 68, 68)',    // Red
      'rgb(168, 85, 247)',   // Purple
      'rgb(236, 72, 153)',   // Pink
    ];

    // Create datasets for each CNC machine
    const datasets = cncMachines.map((cnc, index) => ({
      label: cnc,
      data: dates.map(date => groupedData[date][cnc] || 0),
      backgroundColor: colors[index % colors.length],
      borderColor: colors[index % colors.length],
      borderWidth: 1,
      datalabels: {
        display: false
      }
    }));

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    chartInstance.current = new ChartJS(ctx, {
      type: 'bar',
      data: {
        labels: dates.map(date => {
          // Crear fecha local para evitar problemas de zona horaria
          const [year, month, day] = date.split('-').map(Number);
          const localDate = new Date(year, month - 1, day);
          return localDate.toLocaleDateString('en-AU', { 
            month: 'short', 
            day: 'numeric' 
          });
        }),
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top' as const,
            labels: {
              usePointStyle: true,
              padding: 20,
              font: {
                size: 12
              }
            }
          },
          title: {
            display: true,
            text: title,
            font: {
              size: 25,
              weight: 'bold'
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              title: (context) => {
                const date = dates[context[0].dataIndex];
                // Crear fecha local para evitar problemas de zona horaria
                const [year, month, day] = date.split('-').map(Number);
                const localDate = new Date(year, month - 1, day);
                return localDate.toLocaleDateString('en-AU', { 
                  weekday: 'long',
                  month: 'long', 
                  day: 'numeric' 
                });
              },
              label: (context) => {
                const cnc = context.dataset.label;
                const value = context.parsed.y;
                return `${cnc}: ${value.toLocaleString()} m²`;
              },
              footer: (context) => {
                const total = context.reduce((sum, item) => sum + item.parsed.y, 0);
                return `Total: ${total.toLocaleString()} m²`;
              }
            }
          }
        },
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: 'Date'
            },
            grid: {
              display: false
            },
            stacked: true
          },
          y: {
            display: true,
            title: {
              display: true,
              text: 'SQM Cut (m²)'
            },
            beginAtZero: true,
            stacked: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            }
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        }
      }
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data, title, loading]);

  if (loading) {
    return (
      <Card>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="relative h-96">
        <canvas ref={chartRef} />
      </div>
    </Card>
  );
};
