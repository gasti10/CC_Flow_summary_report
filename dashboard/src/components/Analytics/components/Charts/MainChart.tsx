import React, { useRef, useEffect } from 'react';
import { Card } from '../Common/Card';
import { AnimatedTransition } from '../Common/AnimatedTransition';
import { getNextSyncTime } from '../../../../utils/syncScheduleUtils';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ProductivityData {
  date: string;
  cut: number;
  manufactured: number;
}

interface MainChartProps {
  data: ProductivityData[];
  title: string;
  loading?: boolean;
}

export const MainChart: React.FC<MainChartProps> = ({
  data,
  title,
  loading = false
}) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<ChartJS | null>(null);

  useEffect(() => {
    if (!chartRef.current || loading || !data || data.length === 0) return;

    // Destroy existing chart
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    // Calculate average cut for line chart
    const averageCut = data.length > 0 ? data.reduce((sum, item) => sum + item.cut, 0) / data.length : 0;
    const averageLineData = new Array(data.length).fill(averageCut);
    
    // Calculate point colors based on cut vs average
    const pointColors = data.map(item => 
      item.cut >= averageCut ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'
    );

    // Find peak production day
    const peakDay = data.length > 0 ? data.reduce((max, item) => 
      item.cut + item.manufactured > max.cut + max.manufactured ? item : max
    ) : { date: '', cut: 0, manufactured: 0 };

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    chartInstance.current = new ChartJS(ctx, {
      type: 'bar',
      data: {
        labels: data.map(item => {
          // Crear fecha local para evitar problemas de zona horaria
          const [year, month, day] = item.date.split('-').map(Number);
          const localDate = new Date(year, month - 1, day);
          return localDate.toLocaleDateString('en-AU', { 
            month: 'short', 
            day: 'numeric' 
          });
        }),
        datasets: [
          {
            label: 'SQM Cut',
            data: data.map(item => item.cut),
            backgroundColor: 'rgba(59, 130, 246, 0.5)',
            borderColor: 'rgb(59, 130, 246)',
            borderWidth: 1,
            order: 1,
            datalabels: {
                display: false
            }
          },
          {
            label: 'SQM Manufactured',
            data: data.map(item => item.manufactured),
            backgroundColor: 'rgba(34, 197, 94, 0.5)',
            borderColor: 'rgb(34, 197, 94)',
            borderWidth: 1,
            order: 1,
            datalabels: {
                display: false
            }
          },
          {
            label: 'Average Cut',
            data: averageLineData,
            type: 'line',
            borderColor: 'rgb(251, 191, 36)', // Yellow line
            backgroundColor: 'rgba(251, 191, 36, 0.1)',
            borderWidth: 2,
            fill: false,
            tension: 0.1,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: pointColors,
            pointBorderColor: pointColors,
            pointBorderWidth: 2,
            order: 0,
            datalabels: {
              display: false
            }
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top' as const,
            labels: {
              usePointStyle: true,
              padding: 20
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
              afterTitle: (context) => {
                const dataIndex = context[0].dataIndex;
                const currentDay = data[dataIndex];
                const isPeakDay = currentDay.date === peakDay.date;
                return isPeakDay ? ['🏆 Peak Production Day'] : [];
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
            }
          },
          y: {
            display: true,
            title: {
              display: true,
              text: 'SQM (m²)'
            },
            beginAtZero: true,
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

  if (!data || data.length === 0) {
    const nextSync = getNextSyncTime();
    
    return (
      <Card>
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-lg font-semibold mb-2">No Data Available Yet</h3>
          <p className="text-sm text-center mb-3">
            No productivity data available for the selected date range.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center max-w-sm">
            <p className="text-xs text-blue-500 font-medium italic mb-1">
              Next sync: {nextSync}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <AnimatedTransition direction="fade" delay={200}>
      <Card className="hover-lift">
        <div className="relative h-120 animate-chart-fade-in">
          <canvas ref={chartRef} />
        </div>

        {/* Peak Production Day Info */}
        <div className="mt-4 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200 animate-fade-in">
          <div className="flex items-center space-x-2">
            <span className="text-yellow-600">🏆</span>
            <span className="text-sm font-bold text-gray-700">
              Peak Production Day: {(() => {
                if (data.length === 0) return 'No data available';
                const peakItem = data.reduce((max, item) => 
                  item.cut + item.manufactured > max.cut + max.manufactured ? item : max
                );
                const peakDate = peakItem.date;
                const [year, month, day] = peakDate.split('-').map(Number);
                const localDate = new Date(year, month - 1, day);
                return localDate.toLocaleDateString('en-AU', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric' 
                });
              })()}
            </span>
          </div>
        </div>
      </Card>
    </AnimatedTransition>
  );
};
