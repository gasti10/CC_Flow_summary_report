import React from 'react';

interface SectionDividerProps {
  title?: string;
  icon?: string;
  variant?: 'default' | 'charts' | 'performance' | 'projects' | 'cnc';
  className?: string;
}

export const SectionDivider: React.FC<SectionDividerProps> = ({
  title,
  icon,
  variant = 'default',
  className = ''
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'charts':
        return {
          lineColor: 'from-blue-400 to-blue-600',
          iconBg: 'from-blue-500 to-blue-700',
          iconColor: 'text-white',
          icon: '📊',
          label: 'Charts'
        };
      case 'performance':
        return {
          lineColor: 'from-green-400 to-green-600',
          iconBg: 'from-green-500 to-green-700',
          iconColor: 'text-white',
          icon: '📈',
          label: 'Performance'
        };
      case 'projects':
        return {
          lineColor: 'from-purple-400 to-purple-600',
          iconBg: 'from-purple-500 to-purple-700',
          iconColor: 'text-white',
          icon: '📋',
          label: 'Projects'
        };
      case 'cnc':
        return {
          lineColor: 'from-orange-400 to-orange-600',
          iconBg: 'from-orange-500 to-orange-700',
          iconColor: 'text-white',
          icon: '🤖',
          label: 'CNC'
        };
      default:
        return {
          lineColor: 'from-gray-400 to-gray-600',
          iconBg: 'from-gray-500 to-gray-700',
          iconColor: 'text-white',
          icon: '●',
          label: 'Section'
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className={`flex items-center justify-center py-12 ${className}`}>
      <div className="relative group">
        <div className="flex items-center space-x-6">
          {/* Left Line */}
          <div className={`w-20 h-px bg-gradient-to-r from-transparent via-${styles.lineColor.split('-')[1]}-400 to-${styles.lineColor.split('-')[3]}-600 transform group-hover:scale-x-150 transition-all duration-500`}></div>
          
          {/* Center Icon */}
          <div className="relative">
            <div className={`w-12 h-12 bg-gradient-to-br ${styles.iconBg} rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300`}>
              <span className={`${styles.iconColor} text-lg`}>
                {icon || styles.icon}
              </span>
            </div>
            <div className={`absolute -inset-3 bg-${styles.lineColor.split('-')[1]}-200 rounded-full opacity-0 group-hover:opacity-30 group-hover:animate-ping transition-all duration-300`}></div>
          </div>
          
          {/* Right Line */}
          <div className={`w-20 h-px bg-gradient-to-l from-transparent via-${styles.lineColor.split('-')[1]}-400 to-${styles.lineColor.split('-')[3]}-600 transform group-hover:scale-x-150 transition-all duration-500`}></div>
        </div>
        
        {/* Hover Label */}
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <div className={`bg-${styles.lineColor.split('-')[1]}-600 text-white text-xs font-medium px-3 py-1 rounded-full shadow-lg`}>
            {title || styles.label}
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente de espaciado más simple pero efectivo
interface SpacerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Spacer: React.FC<SpacerProps> = ({
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'py-8',
    md: 'py-12',
    lg: 'py-16',
    xl: 'py-20'
  };

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
    </div>
  );
};

// Componente de sección con espaciado automático
interface SectionProps {
  children: React.ReactNode;
  title?: string;
  icon?: string;
  variant?: 'default' | 'charts' | 'performance' | 'projects' | 'cnc';
  className?: string;
}

export const Section: React.FC<SectionProps> = ({
  children,
  title,
  icon,
  variant = 'default',
  className = ''
}) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {children}
      <SectionDivider title={title} icon={icon} variant={variant} />
    </div>
  );
};
