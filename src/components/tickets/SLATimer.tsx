'use client';
import React, { useState, useEffect } from 'react';
import { cn, getSLAInfo, formatCountdown } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Timer, AlertOctagon } from 'lucide-react';

interface SLATimerProps {
  createdAt: string;
  slaHours?: number;
  compact?: boolean;
}

export function SLATimer({ createdAt, slaHours = 48, compact = false }: SLATimerProps) {
  const [sla, setSla] = useState(() => getSLAInfo(createdAt, slaHours));

  // Live countdown — update every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setSla(getSLAInfo(createdAt, slaHours));
    }, 60_000);
    return () => clearInterval(interval);
  }, [createdAt, slaHours]);

  const barColor = sla.percentUsed >= 100
    ? 'bg-red-500'
    : sla.percentUsed >= 75
    ? 'bg-amber-500'
    : 'bg-emerald-500';

  if (compact) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className={cn('flex items-center gap-1 font-medium', sla.isOverdue ? 'text-red-600' : 'text-gray-500')}>
            {sla.isOverdue ? <AlertOctagon className="w-3 h-3" /> : <Timer className="w-3 h-3" />}
            {sla.isOverdue ? 'SLA BREACHED' : `${formatCountdown(sla.hoursRemaining)} remaining`}
          </span>
          <span className="text-gray-400">{Math.round(sla.percentUsed)}%</span>
        </div>
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className={cn('h-full rounded-full transition-all duration-500', barColor)}
            style={{ width: `${Math.min(sla.percentUsed, 100)}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'rounded-2xl border p-4 space-y-3',
      sla.isOverdue ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {sla.isOverdue
            ? <AlertOctagon className="w-5 h-5 text-red-500" />
            : <Timer className="w-5 h-5 text-blue-500" />
          }
          <span className={cn('font-semibold text-sm', sla.isOverdue ? 'text-red-700' : 'text-gray-700')}>
            SLA Timer ({slaHours}h window)
          </span>
        </div>
        <span className={cn(
          'text-sm font-bold font-mono',
          sla.isOverdue ? 'text-red-600' : sla.percentUsed >= 75 ? 'text-amber-600' : 'text-emerald-600'
        )}>
          {sla.isOverdue ? 'OVERDUE' : formatCountdown(sla.hoursRemaining)}
        </span>
      </div>

      <Progress
        value={Math.min(sla.percentUsed, 100)}
        className={cn(
          'h-3',
          sla.isOverdue ? '[&>div]:bg-red-500' : sla.percentUsed >= 75 ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500'
        )}
      />

      <div className="flex justify-between text-xs text-gray-500">
        <span>{Math.round(sla.hoursElapsed)}h elapsed</span>
        <span>{slaHours}h total SLA</span>
      </div>
    </div>
  );
}
