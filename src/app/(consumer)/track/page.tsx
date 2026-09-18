'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Search, Loader2, MapPin, Clock, User, AlertOctagon,
  CheckCircle2, ChevronRight, Ticket, RefreshCw, ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SeverityBadge } from '@/components/tickets/SeverityBadge';
import { SLATimer } from '@/components/tickets/SLATimer';
import { BeforeAfterSlider } from '@/components/tickets/BeforeAfterSlider';
import { EmptyState } from '@/components/ui/empty-state';
import { cn, STATUS_CONFIG, PRIORITY_CONFIG, formatTimeAgo } from '@/lib/utils';
import { getTicketById, getAllTickets } from '@/lib/ticket-store';
import type { Ticket as TicketType } from '@/types';

const EVENT_ICONS: Record<string, React.ReactNode> = {
  created:       <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center"><Ticket className="w-3.5 h-3.5 text-blue-600" /></div>,
  assigned:      <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center"><User className="w-3.5 h-3.5 text-violet-600" /></div>,
  status_change: <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center"><RefreshCw className="w-3.5 h-3.5 text-amber-600" /></div>,
  escalated:     <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center"><AlertOctagon className="w-3.5 h-3.5 text-red-600" /></div>,
  resolved:      <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /></div>,
};

function buildTimeline(ticket: TicketType) {
  const events = [
    { id: 'e1', type: 'created', label: 'Complaint Registered', note: `Report submitted${ticket.reporter_name ? ` by ${ticket.reporter_name}` : ' anonymously'}`, time: ticket.created_at },
  ];
  if (ticket.assigned_officer_name) {
    events.push({ id: 'e2', type: 'assigned', label: 'Assigned to Officer', note: `Assigned to ${ticket.assigned_officer_name} — Ward ${ticket.ward_number}`, time: ticket.updated_at });
  }
  if (ticket.status === 'in_progress') {
    events.push({ id: 'e3', type: 'status_change', label: 'Work In Progress', note: 'Ward team dispatched to site', time: ticket.updated_at });
  }
  if (ticket.status === 'escalated' && ticket.escalated_at) {
    events.push({ id: 'e4', type: 'escalated', label: 'Escalated', note: `SLA exceeded. Forwarded to ${ticket.escalated_to}`, time: ticket.escalated_at });
  }
  if (ticket.status === 'resolved' && ticket.resolved_at) {
    events.push({ id: 'e5', type: 'resolved', label: 'Issue Resolved', note: ticket.resolution_notes ?? 'Drain cleared by ward team.', time: ticket.resolved_at });
  }
  return events;
}

function TrackContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const [query, setQuery]   = useState(searchParams.get('id') ?? '');
  const [loading, setLoading] = useState(false);
  const [ticket, setTicket]   = useState<TicketType | null>(null);
  const [error, setError]     = useState('');
  const [recentTickets, setRecentTickets] = useState<TicketType[]>([]);

  // Load recent tickets for quick access
  useEffect(() => {
    const all   = getAllTickets();
    // Show only user-submitted (non-mock) tickets at top
    const local = all.filter(t => t.id.startsWith('local-'));
    setRecentTickets(local.slice(0, 3));
  }, []);

  // Auto-search if ID in URL
  useEffect(() => {
    const id = searchParams.get('id');
    if (id) { setQuery(id); doSearch(id); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const doSearch = async (searchId?: string) => {
    const q = (searchId ?? query).trim();
    if (!q) return;
    setLoading(true);
    setError('');
    setTicket(null);
    await new Promise(r => setTimeout(r, 400));

    const found = getTicketById(q);
    if (found) {
      setTicket(found);
      // Update URL without reload
      window.history.replaceState(null, '', `/track?id=${found.ticket_number}`);
    } else {
      setError(`No report found for "${q}". Check your ticket ID — it looks like DW-2026-XXXXX`);
    }
    setLoading(false);
  };

  const statusCfg   = ticket ? STATUS_CONFIG[ticket.status] : null;
  const priorityCfg = ticket ? PRIORITY_CONFIG[ticket.priority] : null;
  const timeline    = ticket ? buildTimeline(ticket) : [];

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Track Your Complaint</h1>
        <p className="text-sm text-gray-500">Enter your ticket ID to see real-time status and full activity timeline.</p>
      </div>

      {/* Search bar */}
      <div className="flex gap-3 mb-6">
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
        <Button onClick={() => doSearch()} disabled={loading || !query.trim()}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
        </Button>
      </div>

      {/* Recent submissions quick-access */}
      {recentTickets.length > 0 && !ticket && !error && (
        <div className="mb-6">
          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Your recent reports</p>
          <div className="space-y-2">
            {recentTickets.map(t => {
              const cfg = STATUS_CONFIG[t.status];
              return (
                <button
                  key={t.id}
                  onClick={() => { setQuery(t.ticket_number); doSearch(t.ticket_number); }}
                  className="w-full flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', cfg.dot)} />
                    <div>
                      <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-800 truncate max-w-[260px]">{t.title}</p>
                      <p className="text-xs text-gray-400 font-mono">{t.ticket_number} · {formatTimeAgo(t.created_at)}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400 shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl mb-6 animate-fade-up">
          <AlertOctagon className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800 text-sm">{error}</p>
            <p className="text-red-600 text-xs mt-1">
              Demo tickets: DW-2026-00001 through DW-2026-00006
            </p>
          </div>
        </div>
      )}

      {/* Result */}
      {ticket && statusCfg && priorityCfg && (
        <div className="animate-fade-up space-y-5">

          {/* Status hero */}
          <div className={cn('rounded-2xl border p-5', statusCfg.bg)}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className={cn('inline-flex items-center gap-1.5 text-sm font-bold', statusCfg.color)}>
                    <span className={cn('w-2.5 h-2.5 rounded-full animate-pulse', statusCfg.dot)} />
                    {statusCfg.label}
                  </span>
                  <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-lg', priorityCfg.bg, priorityCfg.color)}>
                    {priorityCfg.label} Priority
                  </span>
                  {ticket.ward_number && (
                    <span className="text-xs bg-white/60 border border-current/20 px-2 py-0.5 rounded-lg font-semibold text-gray-600">
                      Ward {ticket.ward_number} — {ticket.ward?.ward_name}
                    </span>
                  )}
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
                  SLA breached. Forwarded to: <strong>{ticket.escalated_to ?? 'Kerala Municipal Commissioner'}</strong>
                </p>
              </div>
            </div>
          )}

          {/* Meta grid */}
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              ticket.address         ? { icon: MapPin,        label: 'Location',    value: ticket.address } : null,
              { icon: Clock,          label: 'Reported',    value: formatTimeAgo(ticket.created_at) },
              ticket.ward_number     ? { icon: ChevronRight, label: 'Ward',         value: `Ward ${ticket.ward_number} — ${ticket.ward?.ward_name}` } : null,
              ticket.assigned_officer_name ? { icon: User,   label: 'Assigned To', value: ticket.assigned_officer_name } : null,
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

          {/* Before/After or single photo */}
          {ticket.photo_url && ticket.resolved_photo_url ? (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">✅ Resolved — Before &amp; After</p>
              <BeforeAfterSlider beforeUrl={ticket.photo_url} afterUrl={ticket.resolved_photo_url} />
              {ticket.resolution_notes && (
                <div className="mt-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-sm text-emerald-800">
                  <span className="font-semibold">Officer notes: </span>{ticket.resolution_notes}
                </div>
              )}
            </div>
          ) : ticket.photo_url ? (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">📸 Submitted Photo</p>
              <img src={ticket.photo_url} alt="Blockage" className="w-full rounded-2xl border border-gray-200 shadow-sm" />
            </div>
          ) : null}

          {/* Timeline */}
          {timeline.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-4">📅 Activity Timeline</p>
              <div className="relative pl-4">
                <div className="absolute left-[18px] top-0 bottom-0 w-0.5 bg-gray-100" />
                <div className="space-y-5">
                  {timeline.map(ev => (
                    <div key={ev.id} className="flex items-start gap-3 relative">
                      <div className="shrink-0 -ml-4 z-10">{EVENT_ICONS[ev.type] ?? EVENT_ICONS.status_change}</div>
                      <div className="flex-1 pb-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-gray-800">{ev.label}</p>
                          <p className="text-xs text-gray-400 whitespace-nowrap">{formatTimeAgo(ev.time)}</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{ev.note}</p>
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
        <EmptyState
          emoji="🎫"
          title="Enter your ticket ID above"
          description="Your ticket ID was shown after submitting your complaint. It looks like DW-2026-00001"
          action={
            <Link href="/report">
              <Button size="sm">Report a new blockage</Button>
            </Link>
          }
        />
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
