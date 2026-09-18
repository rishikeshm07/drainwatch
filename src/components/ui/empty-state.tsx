import React from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  emoji?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function EmptyState({
  emoji = '🔍',
  title,
  description,
  action,
  className,
  size = 'md',
}: EmptyStateProps) {
  const emojiSizes = { sm: 'text-3xl', md: 'text-5xl', lg: 'text-7xl' };
  const titleSizes = { sm: 'text-sm',  md: 'text-base', lg: 'text-xl' };
  const paddings   = { sm: 'py-8',     md: 'py-12',     lg: 'py-16' };

  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center',
      paddings[size],
      className
    )}>
      <div className={cn('mb-4', emojiSizes[size])}>{emoji}</div>
      <h3 className={cn('font-bold text-gray-700 mb-1', titleSizes[size])}>{title}</h3>
      {description && (
        <p className="text-sm text-gray-400 max-w-xs leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
