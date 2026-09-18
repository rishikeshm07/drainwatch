import React from 'react';
import { cn } from '@/lib/utils';
import { Zap, AlertTriangle, Info, Minus } from 'lucide-react';

interface SeverityBadgeProps {
  tag: string | null;
  confidence?: number | null;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

function getSeverityStyle(tag: string | null) {
  if (!tag) return { bg: 'bg-gray-100 border-gray-200', text: 'text-gray-600', icon: <Minus className="w-3 h-3" /> };
  const t = tag.toLowerCase();
  if (t.includes('critical') || t.includes('severe'))
    return { bg: 'bg-red-50 border-red-200',    text: 'text-red-700',    icon: <Zap className="w-3 h-3" /> };
  if (t.includes('moderate') || t.includes('high'))
    return { bg: 'bg-orange-50 border-orange-200', text: 'text-orange-700', icon: <AlertTriangle className="w-3 h-3" /> };
  if (t.includes('minor') || t.includes('low'))
    return { bg: 'bg-blue-50 border-blue-200',   text: 'text-blue-700',   icon: <Info className="w-3 h-3" /> };
  return { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', icon: <AlertTriangle className="w-3 h-3" /> };
}

export function SeverityBadge({ tag, confidence, size = 'md', showIcon = true }: SeverityBadgeProps) {
  const { bg, text, icon } = getSeverityStyle(tag);

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  };

  return (
    <span className={cn(
      'inline-flex items-center rounded-full border font-medium',
      bg, text, sizeClasses[size]
    )}>
      {showIcon && icon}
      <span>{tag ?? 'Unassessed'}</span>
      {confidence != null && (
        <span className="opacity-60 font-normal">
          {Math.round(confidence * 100)}%
        </span>
      )}
    </span>
  );
}

// AI assessment placeholder card shown on consumer portal
export function AIAssessmentCard({ tag, confidence }: { tag: string | null; confidence: number | null }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-violet-50 to-blue-50 border border-violet-100">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shrink-0">
        <Zap className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-violet-800">AI Severity Assessment</p>
        <SeverityBadge tag={tag} confidence={confidence} size="sm" />
      </div>
    </div>
  );
}
