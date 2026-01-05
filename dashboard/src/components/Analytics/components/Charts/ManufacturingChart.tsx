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

interface ManufacturingData {
  date: string;
  responsible: string;
  manufactured: number;
}

interface ManufacturingChartProps {
  data: ManufacturingData[];
  title: string;
  loading?: boolean;
}

export const ManufacturingChart: React.FC<ManufacturingChartProps> = ({
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

    // Group data by date and responsible
    const groupedData = data.reduce((acc, item) => {
      if (!acc[item.date]) {
        acc[item.date] = {};
      }
      if (!acc[item.date][item.responsible]) {
        acc[item.date][item.responsible] = 0;
      }
      acc[item.date][item.responsible] += item.manufactured;
      return acc;
    }, {} as Record<string, Record<string, number>>);

    // Get all unique dates and responsibles
    const dates = Object.keys(groupedData).sort();
    const responsibles = Array.from(new Set(data.map(item => item.responsible)));

    // Generate distinct colors for each responsible
    const generateDistinctColors = (count: number) => {
      // 10 base colors maximally distant from each other in the color spectrum
      const baseColors = [
        'rgb(239, 68, 68)',    // Red (0°)
        'rgb(251, 146, 60)',   // Orange (30°)
        'rgb(251, 191, 36)',   // Yellow (60°)
        'rgb(132, 204, 22)',   // Lime (90°)
        'rgb(34, 197, 94)',    // Green (120°)
        'rgb(16, 185, 129)',   // Teal (150°)
        'rgb(6, 182, 212)',    // Cyan (180°)
        'rgb(59, 130, 246)',   // Blue (210°)
        'rgb(147, 51, 234)',   // Indigo (240°)
        'rgb(168, 85, 247)',   // Purple (270°)
      ];
      
      // If we need more colors than base colors, generate additional ones
      if (count > baseColors.length) {
        const additionalColors = [];
        for (let i = baseColors.length; i < count; i++) {
          // Generate HSL colors with different hues, starting from 300°
          const baseHue = 300 + (i - baseColors.length) * 36; // 36° separation for good distribution
          const hue = baseHue % 360;
          const saturation = 75 + (i % 2) * 15; // 75% or 90% saturation
          const lightness = 50 + (i % 3) * 8; // 50%, 58%, or 66% lightness
          additionalColors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
        }
        return [...baseColors, ...additionalColors];
      }
      
      return baseColors.slice(0, count);
    };

    const colors = generateDistinctColors(responsibles.length);

    // Create datasets for each responsible
    const datasets = responsibles.map((responsible, index) => ({
      label: responsible,
      data: dates.map(date => groupedData[date][responsible] || 0),
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
                const responsible = context.dataset.label;
                const value = context.parsed.y;
                return `${responsible}: ${value.toLocaleString()} m²`;
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
              text: 'SQM Manufactured (m²)'
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
