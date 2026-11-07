import React from 'react';
import { getStatusBadgeStyle } from '../../lib/formatters.js';

interface BadgeProps {
  status: string;
  size?: 'sm' | 'md';
  customLabel?: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, size = 'sm', customLabel, className = '' }) => {
  const style = getStatusBadgeStyle(status);
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  const lightContrast = style.bg.includes('emerald')
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30'
    : style.bg.includes('amber')
    ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30'
    : style.bg.includes('rose')
    ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30'
    : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700/50';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${lightContrast} ${sizeClasses} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-70 animate-pulse" />
      {customLabel || style.label}
    </span>
  );
};

