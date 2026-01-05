import React from 'react';
import type { ViewType } from '../../Analytics';
import { AnimatedTransition, HoverAnimation } from '../Common/AnimatedTransition';
import { getLogoPath, getFaviconPath } from '../../../../utils/assetUtils';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  isOpen: boolean;
  onToggle: () => void;
  showHintAnimation?: boolean;
}

const navigationItems = [
  {
    id: 'analytics' as ViewType,
    label: 'Analytics',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )
  },
  {
    id: 'cut-process' as ViewType,
    label: 'Cut Process',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243zm5.758-9.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
      </svg>
    )
  },
  {
    id: 'manufacturing' as ViewType,
    label: 'Manufacturing',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2zm5-18v2M7 7h2v5a1 1 0 01-1 1H7V7z" />
      </svg>
    )
  }
];

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, 
  onViewChange, 
  isOpen, 
  onToggle,
  showHintAnimation = false
}) => {
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 bg-white shadow-lg transform transition-all duration-300 ease-in-out
        ${isOpen ? 'w-64' : 'w-16'}
        md:relative md:z-50
      `}>
        <div className="flex flex-col h-full">
          {/* Logo and Toggle Button */}
          <div className="flex items-center justify-between p-4 border-b border-gray-400">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 flex items-center justify-center">
                <img src={getFaviconPath()} alt="CC Logo" className="w-8 h-8" />
              </div>
              {isOpen && (
                <span className="text-xl font-bold text-gray-900 whitespace-nowrap">
                  Cladding Creations
                </span>
              )}
            </div>
            <button
              onClick={onToggle}
              className={`p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 ${
                showHintAnimation ? 'animate-sidebar-hint animate-sidebar-wiggle animate-sidebar-glow' : ''
              }`}
              title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              <svg 
                className={`w-5 h-5 text-white transition-transform duration-200 ${
                  isOpen ? 'rotate-180' : 'rotate-0'
                }`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navigationItems.map((item, index) => (
              <AnimatedTransition 
                key={item.id}
                direction="left" 
                delay={index * 100}
                className="w-full"
              >
                <HoverAnimation scale={true} glow={true} color="blue">
                  <button
                    onClick={() => onViewChange(item.id)}
                    className={`
                      w-full flex items-center rounded-sm text-left transition-all duration-200 group micro-bounce relative z-10
                      ${isOpen ? 'px-4 py-3 space-x-3' : 'px-3 py-3 justify-center'}
                      ${currentView === item.id
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                    title={!isOpen ? item.label : undefined}
                  >
                    <div className="flex-shrink-0">
                      {item.icon}
                    </div>
                    {isOpen && (
                      <span className="font-medium whitespace-nowrap">{item.label}</span>
                    )}
                  </button>
                </HoverAnimation>
              </AnimatedTransition>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-8 border-t border-gray-600">
            <div className={`flex items-center text-sm text-gray-600 ${
              isOpen ? 'space-x-3' : 'justify-center'
            }`}>
              {isOpen && <img src={getLogoPath()} alt="CC Logo" className="w-4/5" />}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};