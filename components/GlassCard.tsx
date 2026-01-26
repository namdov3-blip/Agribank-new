import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverEffect?: boolean;
  style?: React.CSSProperties;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', onClick, hoverEffect = false, style }) => {
  return (
    <div
      onClick={onClick}
      style={style}
      className={`
        bg-white 
        backdrop-blur-xl 
        border border-slate-200 
        shadow-sm 
        rounded-xl 
        p-6 
        transition-all 
        duration-300
        ${hoverEffect ? 'hover:bg-white hover:shadow-md hover:border-slate-300 cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};