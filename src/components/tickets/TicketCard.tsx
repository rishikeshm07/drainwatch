'use client';
import React from 'react';
import Link from 'next/link';
import { MapPin, Clock, User, ArrowUpRight, AlertOctagon } from 'lucide-react';
import { cn, STATUS_CONFIG, PRIORITY_CONFIG, formatTimeAgo, getSLAInfo } from '@/lib/utils';
import { SeverityBadge } from './SeverityBadge';
import { SLATimer } from './SLATimer';
import type { Ticket } from '@/types';

interface TicketCardProps {
  ticket: Ticket;
  variant?: 'consumer' | 'gov';
  onClick?: () => void;
  isSelected?: boolean;
  draggable?: boolean;
}

export function TicketCard({ ticket, variant = 'consumer', onClick, isSelected, draggable }: TicketCardProps) {
  const statusCfg = STATUS_CONFIG[ticket.status];
  const priorityCfg = PRIORITY_CONFIG[ticket.priority];
  const sla = getSLAInfo(ticket.created_at, ticket.sla_hours);

  return (
    <div
      onClick={onClick}
      draggable={draggable}
      className={cn(
        'group relative rounded-2xl border bg-white shadow-sm transition-all duration-200 cursor-pointer',
        'hover:shadow-md hover:-translate-y-0.5',
        isSelected && 'ring-2 ring-blue-500 shadow-blue-100',
        ticket.status === 'escalated' && 'border-purple-300 bg-purple-50/30',
        sla.isOverdue && ticket.status !== 'resolved' && 'border-red-300'
      )}
    >
      {/* Escalation banner */}
      {ticket.status === 'escalated' && (
        <div className="flex items-center gap-1.5 px-4 py-1.5 bg-purple-600 rounded-t-2xl text-white text-xs font-semibold">
          <AlertOctagon className="w-3.5 h-3.5" />
          ESCALATED — Routed to higher authority
        </div>
      )}

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-gray-400">{ticket.ticket_number}</span>
              <span className={cn('inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border', statusCfg.bg, statusCfg.color)}>
                <span className={cn('w-1.5 h-1.5 rounded-full', statusCfg.dot)} />
                {statusCfg.label}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">{ticket.title}</h3>
          </div>
          <span className={cn('shrink-0 text-xs font-semibold px-2 py-0.5 rounded-lg', priorityCfg.bg, priorityCfg.color)}>
            {priorityCfg.label}
          </span>
        </div>

        {/* AI severity */}
        {ticket.ai_severity_tag && (
          <div className="mb-2">
            <SeverityBadge tag={ticket.ai_severity_tag} confidence={ticket.ai_confidence} size="sm" />
          </div>
        )}

        {/* Meta info */}
        <div className="space-y-1">
          {ticket.address && (
            <div className="flex items-start gap-1.5 text-xs text-gray-500">
              <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-gray-400" />
              <span className="line-clamp-1">{ticket.address}</span>
            </div>
          )}
          {ticket.ward_number && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0">🏛️</span>
              <span>Ward {ticket.ward_number} — {ticket.ward?.ward_name}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Clock className="w-3.5 h-3.5 shrink-0 text-gray-400" />
            <span>{formatTimeAgo(ticket.created_at)}</span>
          </div>
          {ticket.assigned_officer_name && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <User className="w-3.5 h-3.5 shrink-0 text-gray-400" />
              <span>{ticket.assigned_officer_name}</span>
            </div>
          )}
        </div>

        {/* SLA Timer — only on gov view for open/in_progress */}
        {variant === 'gov' && ticket.status !== 'resolved' && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <SLATimer createdAt={ticket.created_at} slaHours={ticket.sla_hours} compact />
          </div>
        )}

        {/* View arrow */}
        {variant === 'consumer' && (
          <Link
            href={`/track?id=${ticket.ticket_number}`}
            className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={e => e.stopPropagation()}
          >
            <ArrowUpRight className="w-4 h-4 text-blue-500" />
          </Link>
        )}
      </div>
    </div>
  );
}
