import React from 'react';
import { useProjectOrders } from '../../hooks/useProjectOrders';

interface ProjectOrdersProps {
  projectName: string;
  startDate: string;
  endDate: string;
}

export const ProjectOrders: React.FC<ProjectOrdersProps> = ({ 
  projectName, 
  startDate, 
  endDate 
}) => {
  const { orders, loading, error } = useProjectOrders(projectName, startDate, endDate);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string | null | undefined) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    
    switch (status.toLowerCase()) {
      case 'delivered':
      case 'entregado':
        return 'bg-green-100 text-green-800';
      case 'delivering':
        return 'bg-yellow-100 text-yellow-800';
      case 'manufacturing':
      case 'fabricando':
        return 'bg-gray-100 text-gray-800';
      case 'cutting':
      case 'cortando':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-48 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-32"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-red-600">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading orders</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm">No orders found for this project in the selected period</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center border-b border-gray-200 pb-4 mb-8">
        <div className="flex items-center space-x-3">
          <h4 className="text-xl font-bold text-gray-900">Orders</h4>
          <div className="w-16 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            {orders.length} orders
          </span>
        </div>
      </div>
      <div className="w-full border-t border-gray-100 my-4"></div>

      <div className="space-y-4">
        {orders.map((order, index) => (
          <div key={order.order_id} className="bg-gradient-to-r from-white to-gray-50 border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-blue-300 transition-all duration-300">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="flex items-center justify-center w-10 h-10 bg-blue-100 text-blue-800 text-lg font-bold rounded-lg">
                  {index + 1}
                </div>
                <div>
                  <span className="text-lg font-bold text-gray-900">Order #{order.order_id}</span>
                  <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ml-3 ${getStatusColor(order.status)}`}>
                    {(order.status || 'Unknown').toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Created</div>
                <div className="font-medium text-gray-900">{formatDate(order.creation_date)}</div>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="text-center p-4 bg-white rounded-lg border border-gray-100">
                <div className="text-sm font-medium text-gray-500 mb-2">Total Area</div>
                <div className="text-2xl font-bold text-gray-900">{(order.total_area || 0).toFixed(2)} m²</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-sm font-medium text-blue-600 mb-2">Cut SQM</div>
                <div className="text-2xl font-bold text-blue-700">{(order.cut_sqm || 0).toFixed(2)} m²</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-sm font-medium text-green-600 mb-2">Manufactured SQM</div>
                <div className="text-2xl font-bold text-green-700">{(order.manufactured_sqm || 0).toFixed(2)} m²</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="text-sm font-medium text-purple-600 mb-2">Panels</div>
                <div className="text-2xl font-bold text-purple-700">{order.panels_count || 0}</div>
              </div>
            </div>

            {/* Dates */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-6">
                {order.expected_date && (
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 bg-yellow-400 rounded-full"></span>
                    <span className="text-sm font-medium text-gray-700">Expected: {formatDate(order.expected_date)}</span>
                  </div>
                )}
                {order.delivered_date && (
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 bg-green-400 rounded-full"></span>
                    <span className="text-sm font-medium text-gray-700">Delivered: {formatDate(order.delivered_date)}</span>
                  </div>
                )}
              </div>
              <div className="text-sm text-gray-500">
                Order #{order.order_id}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
