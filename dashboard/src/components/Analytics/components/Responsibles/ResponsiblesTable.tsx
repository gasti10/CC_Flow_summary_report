import React from 'react';
import { Card } from '../Common/Card';

interface ResponsibleData {
  responsible: string;
  totalPanels: number;
  totalSqm: number;
  efficiency: number;
}

interface ResponsiblesTableProps {
  data: ResponsibleData[];
  loading?: boolean;
  title: string;
}

export const ResponsiblesTable: React.FC<ResponsiblesTableProps> = ({
  data,
  loading = false,
  title
}) => {
  if (loading) {
    return (
      <Card>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
          <p className="text-gray-500">No data available for the selected period</p>
        </div>
      </Card>
    );
  }

  // Sort by total SQM descending
  const sortedData = [...data].sort((a, b) => b.totalSqm - a.totalSqm);

  return (
    <Card>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-center py-3 px-4 font-medium text-gray-700">Responsible</th>
              <th className="text-center py-3 px-4 font-medium text-gray-700">Total Panels</th>
              <th className="text-center py-3 px-4 font-medium text-gray-700">Total SQM</th>
              <th className="text-center py-3 px-4 font-medium text-gray-700">Avg SQM/Panel</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((item, index) => {
              const avgSqmPerPanel = item.totalPanels > 0 ? (item.totalSqm / item.totalPanels) : 0;
              const isTopPerformer = index === 0;
              
              return (
                <tr 
                  key={item.responsible} 
                  className={`
                    border-b border-gray-100 hover:bg-gray-50 transition-colors duration-200
                    ${isTopPerformer ? 'bg-yellow-50' : ''}
                  `}
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-3">
                      <div className={`
                        w-8 h-8 flex items-center justify-center text-white text-sm font-medium`}>
                        {isTopPerformer ? '👑' : ''}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {item.responsible || 'Unknown'}
                        </div>
                        {isTopPerformer && (
                          <div className="text-xs text-yellow-600 font-medium">Top Performer</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-sm text-gray-900 font-medium">
                      {item.totalPanels.toLocaleString()}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-sm text-gray-900 font-medium">
                      {item.totalSqm.toFixed(2)} m²
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-sm text-gray-900 font-medium">
                      {avgSqmPerPanel.toFixed(2)} m²
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {data.reduce((sum, item) => sum + item.totalPanels, 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total Panels</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {data.reduce((sum, item) => sum + item.totalSqm, 0).toFixed(2)} m²
            </div>
            <div className="text-sm text-gray-600">Total SQM</div>
          </div>
        </div>
      </div>
    </Card>
  );
};
