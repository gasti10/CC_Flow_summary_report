import React, { type ReactNode } from 'react';

interface AnimatedTransitionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'fade' | 'scale';
  stagger?: number;
  index?: number;
}

export const AnimatedTransition: React.FC<AnimatedTransitionProps> = ({
  children,
  className = '',
  delay = 0,
  duration = 300,
  direction = 'fade',
  stagger = 0,
  index = 0
}) => {
  const getAnimationClasses = () => {
    const baseClasses = 'transition-all ease-out';
    
    const directionClasses = {
      up: 'opacity-0 animate-slide-up',
      down: 'opacity-0 animate-slide-down',
      left: 'opacity-0 animate-slide-left',
      right: 'opacity-0 animate-slide-right',
      fade: 'opacity-0 animate-fade-in',
      scale: 'opacity-0 animate-scale-in'
    };

    return `${baseClasses} ${directionClasses[direction]}`;
  };

  const getAnimationStyle = () => {
    const totalDelay = delay + (stagger * index);
    return {
      animationDelay: `${totalDelay}ms`,
      animationDuration: `${duration}ms`,
      animationFillMode: 'forwards' as const
    };
  };

  return (
    <div 
      className={`${getAnimationClasses()} ${className}`}
      style={{
        ...getAnimationStyle(),
        contain: 'layout style paint'
      }}
    >
      {children}
    </div>
  );
};

// Componente para animaciones de entrada escalonada
interface StaggeredAnimationProps {
  children: ReactNode[];
  className?: string;
  staggerDelay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'fade' | 'scale';
  duration?: number;
}

export const StaggeredAnimation: React.FC<StaggeredAnimationProps> = ({
  children,
  className = '',
  staggerDelay = 100,
  direction = 'up',
  duration = 300
}) => {
  return (
    <div className={className}>
      {children.map((child, index) => (
        <AnimatedTransition
          key={index}
          direction={direction}
          delay={0}
          duration={duration}
          stagger={staggerDelay}
          index={index}
        >
          {child}
        </AnimatedTransition>
      ))}
    </div>
  );
};

// Componente para animaciones de loading
interface LoadingAnimationProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'gray' | 'green' | 'red';
  text?: string;
}

export const LoadingAnimation: React.FC<LoadingAnimationProps> = ({
  size = 'md',
  color = 'blue',
  text
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const colorClasses = {
    blue: 'text-blue-600',
    gray: 'text-gray-600',
    green: 'text-green-600',
    red: 'text-red-600'
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-3">
      <div className={`${sizeClasses[size]} ${colorClasses[color]} animate-spin`}>
        <svg className="w-full h-full" fill="none" viewBox="0 0 24 24">
          <circle 
            className="opacity-25" 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="4"
          />
          <path 
            className="opacity-75" 
            fill="currentColor" 
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
      {text && (
        <p className={`text-sm ${colorClasses[color]} animate-pulse`}>
          {text}
        </p>
      )}
    </div>
  );
};

// Componente para animaciones de hover
interface HoverAnimationProps {
  children: ReactNode;
  className?: string;
  scale?: boolean;
  glow?: boolean;
  color?: 'blue' | 'green' | 'purple' | 'orange';
}

export const HoverAnimation: React.FC<HoverAnimationProps> = ({
  children,
  className = '',
  scale = true,
  glow = false,
  color = 'blue'
}) => {
  const scaleClasses = scale ? 'hover:scale-105' : '';
  const glowClasses = glow ? `hover:shadow-lg hover:shadow-${color}-200` : 'hover:shadow-md';
  
  return (
    <div className={`transition-all duration-200 ease-in-out ${scaleClasses} ${glowClasses} ${className}`}>
      {children}
    </div>
  );
};

// Componente para animaciones de entrada de página
interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  className = ''
}) => {
  return (
    <div className={`animate-page-enter ${className}`}>
      {children}
    </div>
  );
};
