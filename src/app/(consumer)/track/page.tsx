'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Search, Loader2, MapPin, Clock, User, AlertOctagon,
  CheckCircle2, ChevronRight, Ticket, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SeverityBadge } from '@/components/tickets/SeverityBadge';
import { SLATimer } from '@/components/tickets/SLATimer';
import { BeforeAfterSlider } from '@/components/tickets/BeforeAfterSlider';
import { cn, STATUS_CONFIG, PRIORITY_CONFIG, formatTimeAgo } from '@/lib/utils';
import { MOCK_TICKETS } from '@/lib/mock-data';
import type { Ticket as TicketType, TicketEvent } from '@/types';

// Mock timeline events
const MOCK_EVENTS: Record<string, TicketEvent[]> = {
  't1': [
    { id: 'e1', ticket_id: 't1', event_type: 'created',       old_value: null, new_value: 'open',        note: 'Report submitted by citizen', actor_id: null, actor_name: 'System',       created_at: MOCK_TICKETS[0].created_at },
    { id: 'e2', ticket_id: 't1', event_type: 'escalated',     old_value: 'open', new_value: 'escalated', note: 'SLA of 48h exceeded',         actor_id: null, actor_name: 'System',       created_at: new Date(Date.now() - 3_600_000).toISOString() },
  ],
  't2': [
    { id: 'e3', ticket_id: 't2', event_type: 'created',       old_value: null,   new_value: 'open',        note: 'Report submitted',          actor_id: null, actor_name: 'System',       created_at: MOCK_TICKETS[1].created_at },
    { id: 'e4', ticket_id: 't2', event_type: 'assigned',      old_value: null,   new_value: 'Sunil Patil', note: 'Assigned to ward officer',  actor_id: 'u1',  actor_name: 'Sunil Patil',  created_at: new Date(Date.now() - 15_600_000).toISOString() },
    { id: 'e5', ticket_id: 't2', event_type: 'status_change', old_value: 'open', new_value: 'in_progress', note: 'Team dispatched to site',   actor_id: 'u1',  actor_name: 'Sunil Patil',  created_at: new Date(Date.now() - 12_000_000).toISOString() },
  ],
  't3': [
    { id: 'e6', ticket_id: 't3', event_type: 'created',       old_value: null,           new_value: 'open',     note: 'Report submitted',            actor_id: null, actor_name: 'System',     created_at: MOCK_TICKETS[2].created_at },
    { id: 'e7', ticket_id: 't3', event_type: 'assigned',      old_value: null,           new_value: 'Meena',    note: 'Assigned to ward officer',    actor_id: 'u2', actor_name: 'Meena Joshi', created_at: new Date(Date.now() - 28_000_000).toISOString() },
    { id: 'e8', ticket_id: 't3', event_type: 'status_change', old_value: 'open',         new_value: 'in_progress', note: 'Crew on the way',          actor_id: 'u2', actor_name: 'Meena Joshi', created_at: new Date(Date.now() - 25_000_000).toISOString() },
    { id: 'e9', ticket_id: 't3', event_type: 'resolved',      old_value: 'in_progress',  new_value: 'resolved', note: 'Drain cleared. Debris removed.', actor_id: 'u2', actor_name: 'Meena Joshi', created_at: MOCK_TICKETS[2].resolved_at! },
  ],
};

const EVENT_ICONS: Record<string, React.ReactNode> = {
  created:       <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center"><Ticket className="w-3.5 h-3.5 text-blue-600" /></div>,
  assigned:      <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center"><User className="w-3.5 h-3.5 text-violet-600" /></div>,
  status_change: <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center"><RefreshCw className="w-3.5 h-3.5 text-amber-600" /></div>,
  escalated:     <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center"><AlertOctagon className="w-3.5 h-3.5 text-red-600" /></div>,
  resolved:      <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /></div>,
};

function TrackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState(searchParams.get('id') ?? '');
  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState<TicketType | null>(null);
  const [events, setEvents] = useState<TicketEvent[]>([]);
  const [error, setError] = useState('');

  // Auto-search if ID in URL
  useEffect(() => {
    const id = searchParams.get('id');
    if (id) { setQuery(id); doSearch(id); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const doSearch = async (searchId?: string) => {
    const q = (searchId ?? query).trim().toUpperCase();
    if (!q) return;
    setLoading(true);
    setError('');
    setTicket(null);

    await new Promise(r => setTimeout(r, 600));

    // Search mock data
    const found = MOCK_TICKETS.find(
      t => t.ticket_number === q || t.ticket_number.includes(q)
    );

    if (found) {
      setTicket(found);
      setEvents(MOCK_EVENTS[found.id] ?? []);
    } else {
      setError(`No report found for "${q}". Please check your ticket ID.`);
    }
    setLoading(false);
  };

  const statusCfg = ticket ? STATUS_CONFIG[ticket.status] : null;
  const priorityCfg = ticket ? PRIORITY_CONFIG[ticket.priority] : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Track Your Report</h1>
        <p className="text-sm text-gray-500">Enter your ticket ID to see the current status and full timeline.</p>
      </div>

      {/* Search bar */}
      <div className="flex gap-3 mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && doSearch()}
            placeholder="e.g. DW-2026-00001"
            className="pl-10 font-mono tracking-wide"
          />
        </div>
        <Button onClick={() => doSearch()} disabled={loading || !query}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl mb-6 animate-fade-up">
          <AlertOctagon className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800 text-sm">{error}</p>
            <p className="text-red-600 text-xs mt-1">Try: DW-2026-00001, DW-2026-00002, DW-2026-00003, DW-2026-00004, or DW-2026-00005</p>
          </div>
        </div>
      )}

      {/* Ticket result */}
      {ticket && statusCfg && priorityCfg && (
        <div className="animate-fade-up space-y-5">
          {/* Status hero */}
          <div className={cn('rounded-2xl border p-5', statusCfg.bg)}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn('inline-flex items-center gap-1.5 text-sm font-bold', statusCfg.color)}>
                    <span className={cn('w-2.5 h-2.5 rounded-full animate-pulse', statusCfg.dot)} />
                    {statusCfg.label}
                  </span>
                  <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-lg', priorityCfg.bg, priorityCfg.color)}>
                    {priorityCfg.label} Priority
                  </span>
                </div>
                <p className="font-mono text-xs text-gray-500 mb-1">{ticket.ticket_number}</p>
                <h2 className="text-lg font-bold text-gray-900">{ticket.title}</h2>
                {ticket.description && <p className="text-sm text-gray-600 mt-1">{ticket.description}</p>}
              </div>
            </div>
          </div>

          {/* Escalation alert */}
          {ticket.status === 'escalated' && (
            <div className="flex items-start gap-3 p-4 bg-purple-50 border border-purple-200 rounded-2xl">
              <AlertOctagon className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-purple-800 text-sm">Escalated to Higher Authority</p>
                <p className="text-purple-600 text-xs mt-0.5">
                  SLA was exceeded. This report has been forwarded to: {ticket.escalated_to}
                </p>
              </div>
            </div>
          )}

          {/* Meta grid */}
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { icon: MapPin,       label: 'Location',     value: ticket.address ?? `${ticket.latitude.toFixed(4)}, ${ticket.longitude.toFixed(4)}` },
              { icon: Clock,        label: 'Reported',     value: formatTimeAgo(ticket.created_at) },
              ticket.ward_number ? { icon: ChevronRight,  label: 'Ward',         value: `Ward ${ticket.ward_number} — ${ticket.ward?.ward_name}` } : null,
              ticket.assigned_officer_name ? { icon: User, label: 'Assigned To', value: ticket.assigned_officer_name } : null,
            ].filter(Boolean).map((item, i) => item && (
              <div key={i} className="flex items-start gap-2.5 p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                <item.icon className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400 font-medium">{item.label}</p>
                  <p className="text-sm text-gray-800 font-semibold">{item.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* AI Assessment */}
          {ticket.ai_severity_tag && (
            <div className="p-4 bg-gradient-to-r from-violet-50 to-blue-50 border border-violet-100 rounded-2xl">
              <p className="text-xs font-semibold text-violet-700 mb-2">🤖 AI Severity Assessment</p>
              <SeverityBadge tag={ticket.ai_severity_tag} confidence={ticket.ai_confidence} size="lg" />
            </div>
          )}

          {/* SLA Timer */}
          {ticket.status !== 'resolved' && (
            <SLATimer createdAt={ticket.created_at} slaHours={ticket.sla_hours} />
          )}

          {/* Before/After slider for resolved tickets */}
          {ticket.status === 'resolved' && ticket.photo_url && ticket.resolved_photo_url && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-700">Resolved — Before &amp; After</p>
              <BeforeAfterSlider
                beforeUrl={ticket.photo_url}
                afterUrl={ticket.resolved_photo_url}
              />
              {ticket.resolution_notes && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-sm text-emerald-800">
                  <span className="font-semibold">Officer notes: </span>{ticket.resolution_notes}
                </div>
              )}
            </div>
          )}

          {/* Original photo */}
          {ticket.photo_url && ticket.status !== 'resolved' && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Submitted Photo</p>
              <img src={ticket.photo_url} alt="Blockage" className="w-full rounded-2xl border border-gray-200 shadow-sm" />
            </div>
          )}

          {/* Timeline */}
          {events.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-4">Activity Timeline</p>
              <div className="relative pl-4">
                <div className="absolute left-[18px] top-0 bottom-0 w-0.5 bg-gray-100" />
                <div className="space-y-5">
                  {events.map((ev, i) => (
                    <div key={ev.id} className="flex items-start gap-3 relative">
                      <div className="shrink-0 -ml-4 z-10">{EVENT_ICONS[ev.event_type] ?? EVENT_ICONS.status_change}</div>
                      <div className="flex-1 pb-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-gray-800 capitalize">
                            {ev.event_type.replace('_', ' ')}
                          </p>
                          <p className="text-xs text-gray-400 whitespace-nowrap">{formatTimeAgo(ev.created_at)}</p>
                        </div>
                        {ev.note && <p className="text-xs text-gray-500 mt-0.5">{ev.note}</p>}
                        {ev.actor_name && (
                          <p className="text-xs text-gray-400 mt-0.5">by {ev.actor_name}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => router.push('/')}>
              View City Map
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => router.push('/report')}>
              New Report
            </Button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!ticket && !loading && !error && (
        <div className="text-center py-16 text-gray-400">
          <Ticket className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="font-semibold text-gray-500">Enter a ticket ID to get started</p>
          <p className="text-sm mt-1">e.g. DW-2026-00001</p>
        </div>
      )}
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>}>
      <TrackContent />
    </Suspense>
  );
}
