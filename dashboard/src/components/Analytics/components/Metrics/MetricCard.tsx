import React from 'react';
import { HoverAnimation } from '../Common/AnimatedTransition';
import { Card } from '../Common/Card';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
  };
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  icon,
  trend = 'stable',
  className = ''
}) => {
  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getChangeColor = (type: string) => {
    switch (type) {
      case 'increase':
        return 'text-green-600 bg-green-50';
      case 'decrease':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <HoverAnimation scale={true} glow={true} color="blue">
      <Card className={`${className} hover-lift`}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {change && (
              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-2 ${getChangeColor(change.type)}`}>
                <span className="mr-1">
                  {change.type === 'increase' ? '↗' : change.type === 'decrease' ? '↘' : '→'}
                </span>
                {Math.abs(change.value)}%
              </div>
            )}
          </div>
          {icon && (
            <div className={`rounded-lg ${getTrendColor(trend)}`}>
              {icon}
            </div>
          )}
        </div>
      </Card>
    </HoverAnimation>
  );
};
