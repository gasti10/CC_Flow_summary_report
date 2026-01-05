import React, { useState } from 'react';
import { Card } from '../Common/Card';
import { Button } from '../Common/Button';
import { ProjectOrders } from './ProjectOrders';
import type { OrderSummary } from '../../../../types/supabase';

interface Project {
  id: string;
  name: string;
  number: string;        // Project number
  pm: string;           // Project Manager
  supervisor: string;   // Site Supervisor
  status: 'To Do' | 'In Progress' | 'Done' | 'Defects';
  sqmCut: number;
  sqmManufactured: number;
  progress: number;
  startDate: string;
  endDate: string;
  expectedCompletionDate: string;
  details: {
    panels: number;
    materials: string[];
    priority: 'high' | 'medium' | 'low';
  };
  orders?: OrderSummary[]; // Orders for this project
}

interface ProjectsTableProps {
  projects: Project[];
  loading?: boolean;
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

export const ProjectsTable: React.FC<ProjectsTableProps> = ({ projects, loading = false, dateRange }) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (projectId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedRows(newExpanded);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Progress':
        return 'bg-green-100 text-green-800';
      case 'Done':
        return 'bg-blue-100 text-blue-800';
      case 'To Do':
        return 'bg-yellow-100 text-yellow-800';
      case 'Defects':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getProjectDashboardUrl = (projectName: string) => {
    const isProduction = window.location.hostname === 'gasti10.github.io';
    
    if (isProduction) {
      return `https://gasti10.github.io/CC_Flow_summary_report/?project=${encodeURIComponent(projectName)}`;
    } else {
      // Development - assuming localhost:3000 or similar
      return `http://localhost:3000/?project=${encodeURIComponent(projectName)}`;
    }
  };

  const handleProjectDashboard = (projectName: string) => {
    const url = getProjectDashboardUrl(projectName);
    window.open(url, '_blank');
  };


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

  return (
    <Card>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Projects</h3>
        <p className="text-sm text-gray-600">Worked on projects during the selected period</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-300 bg-gray-50">
              <th className="text-center py-4 px-6 font-semibold text-gray-800 text-sm">Name</th>
              <th className="text-center py-4 px-4 font-semibold text-gray-800 text-sm">Number</th>
              <th className="text-center py-4 px-4 font-semibold text-gray-800 text-sm">PM</th>
              <th className="text-center py-4 px-4 font-semibold text-gray-800 text-sm">Supervisor</th>
              <th className="text-center py-4 px-4 font-semibold text-gray-800 text-sm">Status</th>
              <th className="text-center py-4 px-4 font-semibold text-gray-800 text-sm">Progress</th>
              <th className="text-center py-4 px-4 font-semibold text-gray-800 text-sm">SQM Cut</th>
              <th className="text-center py-4 px-4 font-semibold text-gray-800 text-sm">SQM Manufactured</th>
              <th className="text-center py-4 px-6 font-semibold text-gray-800 text-sm">Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <React.Fragment key={project.id}>
                <tr className="border-b border-gray-200 hover:bg-blue-50 transition-colors duration-200">
                  <td className="py-6 px-6">
                    <div className="space-y-2">
                      <div className="font-semibold text-gray-900 text-base">{project.name}</div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center space-x-4 justify-center">
                          <span className="flex items-center">
                            <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                            Start: {project.startDate ? new Date(project.startDate).toLocaleDateString('en-AU') : 'N/A'}
                          </span>
                          <span className="flex items-center">
                            <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></span>
                            Expected: {project.expectedCompletionDate ? new Date(project.expectedCompletionDate).toLocaleDateString('en-AU') : 'N/A'}
                          </span>
                          <span className="flex items-center">
                            <span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>
                            End: {project.endDate ? new Date(project.endDate).toLocaleDateString('en-AU') : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-6 px-4 text-center">
                    <span className="inline-flex items-center justify-center w-12 h-8 bg-blue-100 text-blue-800 text-sm font-bold rounded-lg">
                      #{project.number}
                    </span>
                  </td>
                  <td className="py-6 px-4 text-center">
                    <div className="text-sm font-medium text-gray-800">{project.pm || 'N/A'}</div>
                  </td>
                  <td className="py-6 px-4 text-center">
                    <div className="text-sm font-medium text-gray-800">{project.supervisor || 'N/A'}</div>
                  </td>
                  <td className="py-6 px-4">
                    <span className={`inline-flex px-3 py-1.5 text-xs font-semibold rounded-full ${getStatusColor(project.status)}`}>
                      {project.status.replace('-', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="py-6 px-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-20 bg-gray-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all duration-500 ${
                            project.progress >= 100 
                              ? 'bg-gradient-to-r from-red-500 to-red-600'
                              : project.progress >= 85
                                ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' 
                                : 'bg-gradient-to-r from-blue-500 to-blue-600'
                          }`}
                          style={{ width: `${Math.min(project.progress, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold text-gray-700 min-w-[3rem]">{project.progress}%</span>
                    </div>
                  </td>
                  <td className="py-6 px-4 text-center">
                    <div className="text-sm font-semibold text-blue-700">{project.sqmCut.toLocaleString()} m²</div>
                  </td>
                  <td className="py-6 px-4 text-center">
                    <div className="text-sm font-semibold text-green-700">{project.sqmManufactured.toLocaleString()} m²</div>
                  </td>
                  <td className="py-6 px-6">
                    <div className="flex flex-col space-y-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleProjectDashboard(project.name)}
                        className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                      >
                        Project Dashboard ➡️
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleRow(project.id)}
                        className="px-4 py-2 text-sm font-medium"
                      >
                        {expandedRows.has(project.id) ? '🔼 Hide Orders' : '🔽 Show Orders'}
                      </Button>
                    </div>
                  </td>
                </tr>
                
                {/* Expanded Row */}
                {expandedRows.has(project.id) && (
                  <tr className="bg-gradient-to-r from-gray-50 to-blue-50">
                    <td colSpan={9} className="py-8 px-8">
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <ProjectOrders 
                          projectName={project.name}
                          startDate={dateRange.startDate}
                          endDate={dateRange.endDate}
                        />
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
