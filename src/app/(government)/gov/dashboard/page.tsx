'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutGrid, Map as MapIcon, Filter, RefreshCw, AlertOctagon,
  Clock, CheckCircle2, Inbox, TrendingUp, Users, ChevronDown,
  GripVertical, Bell, Search, X, SlidersHorizontal, Zap,
  MapPin, Loader2
} from 'lucide-react';
import { GovNavbar } from '@/components/Navbar';
import { PublicMap } from '@/components/maps/PublicMap';
import { TicketCard } from '@/components/tickets/TicketCard';
import { SeverityBadge } from '@/components/tickets/SeverityBadge';
import { SLATimer } from '@/components/tickets/SLATimer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { cn, STATUS_CONFIG, PRIORITY_CONFIG, getSLAInfo, formatTimeAgo } from '@/lib/utils';
import { MOCK_TICKETS, MOCK_WARDS } from '@/lib/mock-data';
import type { Ticket, TicketStatus } from '@/types';

// ── Kanban column config ─────────────────────────────────────
const COLUMNS: Array<{ id: TicketStatus; label: string; icon: React.ReactNode; accent: string }> = [
  { id: 'open',        label: 'New',         icon: <Inbox className="w-4 h-4" />,         accent: 'border-t-red-500' },
  { id: 'in_progress', label: 'In Progress',  icon: <Clock className="w-4 h-4" />,          accent: 'border-t-amber-500' },
  { id: 'resolved',    label: 'Resolved',     icon: <CheckCircle2 className="w-4 h-4" />,   accent: 'border-t-emerald-500' },
  { id: 'escalated',   label: 'Escalated',    icon: <AlertOctagon className="w-4 h-4" />,   accent: 'border-t-purple-500' },
];

interface GovUser { name: string; ward: string; role: string }

export default function GovDashboard() {
  const router = useRouter();
  const { toast } = useToast();

  const [user, setUser] = useState<GovUser | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>(MOCK_TICKETS);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [view, setView] = useState<'kanban' | 'map'>('kanban');
  const [splitView, setSplitView] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<TicketStatus | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Auth guard
  useEffect(() => {
    const stored = sessionStorage.getItem('gov_user');
    if (!stored) { router.replace('/gov/login'); return; }
    setUser(JSON.parse(stored));
  }, [router]);

  // Stats
  const stats = useMemo(() => ({
    total:      tickets.length,
    open:       tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    resolved:   tickets.filter(t => t.status === 'resolved').length,
    escalated:  tickets.filter(t => t.status === 'escalated').length,
    overdue:    tickets.filter(t => {
      const s = getSLAInfo(t.created_at, t.sla_hours);
      return s.isOverdue && t.status !== 'resolved';
    }).length,
  }), [tickets]);

  // Filtered tickets
  const filtered = useMemo(() => {
    let list = tickets;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t =>
        t.ticket_number.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        t.address?.toLowerCase().includes(q)
      );
    }
    if (priorityFilter !== 'all') {
      list = list.filter(t => t.priority === priorityFilter);
    }
    return list;
  }, [tickets, searchQuery, priorityFilter]);

  const getColumn = (status: TicketStatus) =>
    filtered.filter(t => t.status === status).sort((a, b) => {
      // Escalated / overdue floats to top
      const aOver = getSLAInfo(a.created_at, a.sla_hours).isOverdue ? 1 : 0;
      const bOver = getSLAInfo(b.created_at, b.sla_hours).isOverdue ? 1 : 0;
      return bOver - aOver || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  // ── Drag & Drop ─────────────────────────────────────────────
  const onDragStart = (e: React.DragEvent, ticketId: string) => {
    setDragging(ticketId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: React.DragEvent, status: TicketStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(status);
  };

  const onDrop = (e: React.DragEvent, newStatus: TicketStatus) => {
    e.preventDefault();
    if (!dragging) return;
    const ticket = tickets.find(t => t.id === dragging);
    if (!ticket || ticket.status === newStatus) { setDragging(null); setDragOver(null); return; }

    setTickets(prev => prev.map(t =>
      t.id === dragging ? { ...t, status: newStatus, updated_at: new Date().toISOString() } : t
    ));

    toast({
      type: 'success',
      title: 'Status updated',
      description: `${ticket.ticket_number} → ${STATUS_CONFIG[newStatus].label}`,
    });

    setDragging(null);
    setDragOver(null);
  };

  // ── Refresh simulation ───────────────────────────────────────
  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 800));
    setRefreshing(false);
    toast({ type: 'info', title: 'Dashboard refreshed', description: 'Showing latest ticket data.' });
  };

  // ── Quick status change ──────────────────────────────────────
  const updateStatus = useCallback((ticketId: string, status: TicketStatus) => {
    setTickets(prev => prev.map(t =>
      t.id === ticketId ? {
        ...t,
        status,
        updated_at: new Date().toISOString(),
        resolved_at: status === 'resolved' ? new Date().toISOString() : t.resolved_at,
      } : t
    ));
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket(prev => prev ? { ...prev, status } : null);
    }
    toast({ type: 'success', title: 'Ticket updated', description: `Status → ${STATUS_CONFIG[status].label}` });
  }, [selectedTicket, toast]);

  if (!user) return null;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
      <GovNavbar officerName={user.name} wardName={user.ward} />

      {/* ── Stats bar ──────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center gap-6 overflow-x-auto">
          {[
            { label: 'Total',      value: stats.total,      color: 'text-gray-700', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
            { label: 'New',        value: stats.open,       color: 'text-red-600',  icon: <Inbox className="w-3.5 h-3.5" /> },
            { label: 'In Progress',value: stats.inProgress, color: 'text-amber-600',icon: <Clock className="w-3.5 h-3.5" /> },
            { label: 'Resolved',   value: stats.resolved,   color: 'text-emerald-600', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
            { label: 'Escalated',  value: stats.escalated,  color: 'text-purple-600',  icon: <AlertOctagon className="w-3.5 h-3.5" /> },
            { label: 'SLA Breached',value: stats.overdue,   color: 'text-red-700 font-bold', icon: <Bell className="w-3.5 h-3.5" /> },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-2 shrink-0">
              <span className={cn('flex items-center gap-1 text-xs', s.color)}>
                {s.icon}{s.label}
              </span>
              <span className={cn('text-lg font-bold', s.color)}>{s.value}</span>
              <div className="w-px h-4 bg-gray-200 ml-2 last-of-type:hidden" />
            </div>
          ))}

          <div className="ml-auto flex items-center gap-2 shrink-0">
            <Button
              variant="ghost" size="sm"
              onClick={handleRefresh}
              className={cn('text-gray-500', refreshing && 'animate-spin')}
              aria-label="Refresh"
            >
              <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Toolbar ───────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6 py-2.5 flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search tickets…"
            className="pl-9 h-9 text-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Priority filter */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {['all', 'critical', 'high', 'medium', 'low'].map(p => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-semibold transition-all capitalize',
                priorityFilter === p
                  ? 'bg-white shadow text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {p === 'all' ? 'All Priority' : p}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Split view toggle */}
          <button
            onClick={() => setSplitView(v => !v)}
            className={cn(
              'flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all',
              splitView
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Split View
          </button>

          {/* Kanban / Map toggle (single view) */}
          {!splitView && (
            <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
              <button
                onClick={() => setView('kanban')}
                className={cn('px-3 py-1 rounded-md text-xs font-semibold transition-all', view === 'kanban' ? 'bg-white shadow text-gray-900' : 'text-gray-500')}
              >
                📋 Kanban
              </button>
              <button
                onClick={() => setView('map')}
                className={cn('px-3 py-1 rounded-md text-xs font-semibold transition-all', view === 'map' ? 'bg-white shadow text-gray-900' : 'text-gray-500')}
              >
                🗺️ Map
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Main content ──────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex">

        {/* Split view: Kanban LEFT + Map RIGHT */}
        {splitView ? (
          <>
            {/* Kanban board — left 60% */}
            <div className="flex-[0_0_60%] overflow-x-auto overflow-y-hidden p-4 flex gap-3">
              {COLUMNS.map(col => {
                const colTickets = getColumn(col.id);
                const cfg = STATUS_CONFIG[col.id];
                return (
                  <div
                    key={col.id}
                    className={cn(
                      'flex flex-col rounded-2xl border-t-4 bg-gray-100/80 min-w-[240px] flex-1',
                      col.accent,
                      dragOver === col.id && 'ring-2 ring-blue-400 bg-blue-50/60'
                    )}
                    onDragOver={e => onDragOver(e, col.id)}
                    onDrop={e => onDrop(e, col.id)}
                    onDragLeave={() => setDragOver(null)}
                  >
                    {/* Column header */}
                    <div className="flex items-center justify-between px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className={cn('', cfg.color)}>{col.icon}</span>
                        <span className="text-sm font-bold text-gray-700">{col.label}</span>
                        <span className={cn(
                          'text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center',
                          cfg.bg, cfg.color
                        )}>
                          {colTickets.length}
                        </span>
                      </div>
                    </div>

                    {/* Cards */}
                    <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2.5">
                      {colTickets.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-24 text-gray-300 text-xs">
                          <GripVertical className="w-5 h-5 mb-1 opacity-40" />
                          Drop here
                        </div>
                      )}
                      {colTickets.map(ticket => (
                        <div
                          key={ticket.id}
                          draggable
                          onDragStart={e => onDragStart(e, ticket.id)}
                          onDragEnd={() => { setDragging(null); setDragOver(null); }}
                          className={cn(dragging === ticket.id && 'opacity-40 scale-95')}
                        >
                          <TicketCard
                            ticket={ticket}
                            variant="gov"
                            isSelected={selectedTicket?.id === ticket.id}
                            onClick={() => {
                              setSelectedTicket(t => t?.id === ticket.id ? null : ticket);
                              setShowDetail(true);
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Map — right 40% */}
            <div className="flex-[0_0_40%] border-l border-gray-200 bg-white overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">Live Ward Map</p>
                {selectedTicket && (
                  <button onClick={() => setSelectedTicket(null)} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                    <X className="w-3 h-3" /> Clear selection
                  </button>
                )}
              </div>
              <div className="flex-1">
                <PublicMap
                  tickets={filtered}
                  onTicketClick={t => { setSelectedTicket(t); setShowDetail(true); }}
                  selectedTicketId={selectedTicket?.id}
                  height="100%"
                  interactive={true}
                />
              </div>
            </div>
          </>
        ) : view === 'kanban' ? (
          /* ── Full-width Kanban ─────────────────────────── */
          <div className="flex-1 overflow-x-auto overflow-y-hidden p-5 flex gap-4">
            {COLUMNS.map(col => {
              const colTickets = getColumn(col.id);
              const cfg = STATUS_CONFIG[col.id];
              return (
                <div
                  key={col.id}
                  className={cn(
                    'flex flex-col rounded-2xl border-t-4 bg-gray-100/80 min-w-[280px] flex-1 max-w-[360px]',
                    col.accent,
                    dragOver === col.id && 'ring-2 ring-blue-400 bg-blue-50/60'
                  )}
                  onDragOver={e => onDragOver(e, col.id)}
                  onDrop={e => onDrop(e, col.id)}
                  onDragLeave={() => setDragOver(null)}
                >
                  <div className="flex items-center justify-between px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className={cn(cfg.color)}>{col.icon}</span>
                      <span className="text-sm font-bold text-gray-700">{col.label}</span>
                      <span className={cn('text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center', cfg.bg, cfg.color)}>
                        {colTickets.length}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
                    {colTickets.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-28 text-gray-300 text-xs border-2 border-dashed border-gray-200 rounded-xl">
                        <GripVertical className="w-6 h-6 mb-1 opacity-40" />
                        Drop tickets here
                      </div>
                    )}
                    {colTickets.map(ticket => (
                      <div
                        key={ticket.id}
                        draggable
                        onDragStart={e => onDragStart(e, ticket.id)}
                        onDragEnd={() => { setDragging(null); setDragOver(null); }}
                        className={cn(dragging === ticket.id && 'opacity-40')}
                      >
                        <TicketCard
                          ticket={ticket}
                          variant="gov"
                          isSelected={selectedTicket?.id === ticket.id}
                          onClick={() => { setSelectedTicket(ticket); setShowDetail(true); }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Full-width Map ────────────────────────────── */
          <div className="flex-1 p-4">
            <PublicMap
              tickets={filtered}
              onTicketClick={t => { setSelectedTicket(t); setShowDetail(true); }}
              selectedTicketId={selectedTicket?.id}
              height="100%"
              interactive={true}
            />
          </div>
        )}

        {/* ── Ticket Detail Drawer ──────────────────────── */}
        {showDetail && selectedTicket && (
          <TicketDetailDrawer
            ticket={selectedTicket}
            onClose={() => { setShowDetail(false); }}
            onStatusChange={updateStatus}
          />
        )}
      </div>
    </div>
  );
}

// ── Ticket Detail Drawer ─────────────────────────────────────
import { BeforeAfterSlider } from '@/components/tickets/BeforeAfterSlider';
import { Textarea } from '@/components/ui/textarea';

function TicketDetailDrawer({
  ticket,
  onClose,
  onStatusChange,
}: {
  ticket: Ticket;
  onClose: () => void;
  onStatusChange: (id: string, status: TicketStatus) => void;
}) {
  const { toast } = useToast();
  const [notes, setNotes] = useState(ticket.resolution_notes ?? '');
  const [saving, setSaving] = useState(false);
  const statusCfg = STATUS_CONFIG[ticket.status];
  const priorityCfg = PRIORITY_CONFIG[ticket.priority];

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setSaving(false);
    toast({ type: 'success', title: 'Notes saved', description: 'Resolution notes updated.' });
  };

  return (
    <div className="w-[420px] border-l border-gray-200 bg-white flex flex-col h-full overflow-hidden shadow-2xl animate-slide-in-right shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <p className="text-xs font-mono text-gray-400">{ticket.ticket_number}</p>
          <p className="text-sm font-bold text-gray-900 truncate max-w-[280px]">{ticket.title}</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition-all">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Status + Priority badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border', statusCfg.bg, statusCfg.color)}>
            <span className={cn('w-2 h-2 rounded-full', statusCfg.dot)} />
            {statusCfg.label}
          </span>
          <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-lg', priorityCfg.bg, priorityCfg.color)}>
            {priorityCfg.label}
          </span>
          {ticket.ward_number && (
            <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-lg font-semibold">
              Ward {ticket.ward_number}
            </span>
          )}
        </div>

        {/* Escalation alert */}
        {ticket.status === 'escalated' && (
          <div className="flex items-start gap-3 p-3.5 bg-purple-50 border border-purple-200 rounded-xl">
            <AlertOctagon className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-purple-800">Auto-Escalated</p>
              <p className="text-xs text-purple-600 mt-0.5">Forwarded to: {ticket.escalated_to}</p>
            </div>
          </div>
        )}

        {/* AI Severity */}
        {ticket.ai_severity_tag && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-violet-50 to-blue-50 border border-violet-100">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold text-violet-800">AI Assessment</p>
              <SeverityBadge tag={ticket.ai_severity_tag} confidence={ticket.ai_confidence} size="sm" />
            </div>
          </div>
        )}

        {/* Location */}
        <div className="space-y-1.5 text-sm">
          {ticket.address && (
            <div className="flex items-start gap-2 text-gray-600">
              <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-gray-400" />
              <span>{ticket.address}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-gray-500 text-xs">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span>Reported {formatTimeAgo(ticket.created_at)}</span>
          </div>
          {ticket.reporter_name && (
            <div className="flex items-center gap-2 text-gray-500 text-xs">
              <Users className="w-3.5 h-3.5 text-gray-400" />
              <span>{ticket.reporter_name} {ticket.reporter_phone ? `· ${ticket.reporter_phone}` : ''}</span>
            </div>
          )}
        </div>

        {/* SLA Timer */}
        {ticket.status !== 'resolved' && (
          <SLATimer createdAt={ticket.created_at} slaHours={ticket.sla_hours} />
        )}

        {/* Photo */}
        {ticket.photo_url && (
          ticket.resolved_photo_url ? (
            <BeforeAfterSlider beforeUrl={ticket.photo_url} afterUrl={ticket.resolved_photo_url} />
          ) : (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">Report Photo</p>
              <img src={ticket.photo_url} alt="Blockage" className="w-full rounded-xl border border-gray-200" />
            </div>
          )
        )}

        {/* Description */}
        {ticket.description && (
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1.5">Description</p>
            <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3 border border-gray-100">{ticket.description}</p>
          </div>
        )}

        {/* Resolution notes */}
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-1.5">Resolution Notes</p>
          <Textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add notes about actions taken, crew dispatched, materials used…"
            rows={3}
          />
        </div>

        {/* Quick status actions */}
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-2">Update Status</p>
          <div className="grid grid-cols-2 gap-2">
            {(['open', 'in_progress', 'resolved', 'escalated'] as TicketStatus[])
              .filter(s => s !== ticket.status)
              .map(s => {
                const cfg = STATUS_CONFIG[s];
                return (
                  <button
                    key={s}
                    onClick={() => onStatusChange(ticket.id, s)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all hover:shadow-sm',
                      cfg.bg, cfg.color
                    )}
                  >
                    <span className={cn('w-2 h-2 rounded-full', cfg.dot)} />
                    Mark as {cfg.label}
                  </button>
                );
              })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onClose}>Close</Button>
        <Button className="flex-1" onClick={handleSave} disabled={saving}>
          {saving ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving…</> : 'Save Notes'}
        </Button>
      </div>
    </div>
  );
}


