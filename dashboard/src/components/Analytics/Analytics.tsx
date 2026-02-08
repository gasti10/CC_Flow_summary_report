import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar/Sidebar';
import { Header } from './components/Common/Header';
import { MainView } from './views/MainView';
import { CutProcessView } from './views/CutProcessView';
import { ManufacturingView } from './views/ManufacturingView';
import { PageTransition } from './components/Common/AnimatedTransition';
import { useDateRange } from './hooks/useDateRange';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useAnalyticsExport } from './hooks/useAnalyticsExport';
import { getLogoPath } from '../../utils/assetUtils';
import './styles/animations.css';

export type ViewType = 'analytics' | 'cut-process' | 'manufacturing';

// Componente separado para manejar la animación del sidebar
const SidebarWithAnimation: React.FC<{
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  isOpen: boolean;
  onToggle: () => void;
}> = ({ currentView, onViewChange, isOpen, onToggle }) => {
  const [showHintAnimation, setShowHintAnimation] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowHintAnimation(true);
      
      // Stop animation after 2 seconds
      setTimeout(() => {
        setShowHintAnimation(false);
      }, 2000);
    }, 1000); // 1 segundo
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <Sidebar 
      currentView={currentView}
      onViewChange={onViewChange}
      isOpen={isOpen}
      onToggle={onToggle}
      showHintAnimation={showHintAnimation}
    />
  );
};

export const Analytics: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>('analytics');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { dateRange, setDateRange, setQuickRange } = useDateRange();
  const { handleExportCSV, canExport } = useAnalyticsExport(dateRange);
  
  // Set dynamic document title
  useDocumentTitle('CC Analytics Dashboard');

  const renderView = useCallback(() => {
    switch (currentView) {
      case 'analytics':
        return <MainView dateRange={dateRange} />;
      case 'cut-process':
        return <CutProcessView dateRange={dateRange} />;
      case 'manufacturing':
        return <ManufacturingView dateRange={dateRange} />;
      default:
        return <MainView dateRange={dateRange} />;
    }
  }, [currentView, dateRange]);

  const handleSidebarToggle = useCallback(() => {
    setSidebarOpen(!sidebarOpen);
  }, [sidebarOpen]);


  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <SidebarWithAnimation 
        currentView={currentView}
        onViewChange={setCurrentView}
        isOpen={sidebarOpen}
        onToggle={handleSidebarToggle}
      />
      
      {/* Main Content: padding izquierdo cuando el sidebar es fixed para que no tape el header */}
      <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300 pl-16 md:pl-0">
        <Header 
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          onQuickRangeChange={setQuickRange}
          onExportCSV={handleExportCSV}
          canExport={canExport}
        />
        
        <main className="flex-1 overflow-auto p-8">
          <PageTransition>
            {renderView()}
          </PageTransition>
        </main>
        
        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 px-8 py-6 sticky bottom-0">
          <div className="flex items-center justify-center space-x-3">
            {/* Decorative Line */}
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
            
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <img src={getLogoPath()} alt="CC Logo" className="h-10 w-auto" />
            </div>
            
            {/* Decorative Line */}
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

            {/* Developer Info */}
            <div className="text-center">
              <div className="text-sm text-gray-500 mb-1">
                Developed by{' '}
                <a 
                  href="https://www.gjouglard.com.ar" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-200 font-medium"
                >
                  GJ
                </a>
              </div>
            </div>
            
            {/* Decorative Line */}
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
          </div>
        </footer>
      </div>
    </div>
  );
};
