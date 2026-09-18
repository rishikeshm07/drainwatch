'use client';
import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  AlertCircle, CheckCircle2, Clock, Zap, ArrowRight,
  Map, Shield, ChevronDown, TrendingUp, AlertOctagon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PublicMap } from '@/components/maps/PublicMap';
import { TicketCard } from '@/components/tickets/TicketCard';
import { EmptyState } from '@/components/ui/empty-state';
import { cn, STATUS_CONFIG } from '@/lib/utils';
import { getAllTickets } from '@/lib/ticket-store';
import type { Ticket, TicketStatus } from '@/types';

const STATUS_FILTERS: Array<{ status: TicketStatus | 'all'; label: string }> = [
  { status: 'all',         label: 'All' },
  { status: 'open',        label: 'Open' },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'resolved',    label: 'Resolved' },
  { status: 'escalated',   label: 'Escalated' },
];

export default function HomePage() {
  const [tickets, setTickets]           = useState<Ticket[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<TicketStatus | 'all'>('all');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [mapView, setMapView]           = useState(true);

  // Load from localStorage (includes user-submitted tickets)
  useEffect(() => {
    setTickets(getAllTickets());
  }, []);

  // Real stats derived from actual ticket data
  const stats = useMemo(() => {
    const open       = tickets.filter(t => t.status === 'open').length;
    const resolved   = tickets.filter(t => t.status === 'resolved').length;
    const escalated  = tickets.filter(t => t.status === 'escalated').length;
    const inProgress = tickets.filter(t => t.status === 'in_progress').length;
    const total      = tickets.length;

    // Avg resolution: mean hours between created_at and resolved_at
    const resolvedWithTime = tickets.filter(t => t.resolved_at);
    const avgHours = resolvedWithTime.length > 0
      ? Math.round(
          resolvedWithTime.reduce((sum, t) => {
            const diff = new Date(t.resolved_at!).getTime() - new Date(t.created_at).getTime();
            return sum + diff / 3_600_000;
          }, 0) / resolvedWithTime.length
        )
      : null;

    const wardSet = new Set(tickets.map(t => t.ward_number).filter(Boolean));

    return { total, open, resolved, escalated, inProgress, avgHours, wardsActive: wardSet.size };
  }, [tickets]);

  const filtered = useMemo(() =>
    selectedStatus === 'all' ? tickets : tickets.filter(t => t.status === selectedStatus),
    [tickets, selectedStatus]
  );

  const counts = useMemo(() => ({
    open:        tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved:    tickets.filter(t => t.status === 'resolved').length,
    escalated:   tickets.filter(t => t.status === 'escalated').length,
  }), [tickets]);

  const statCards = [
    { label: 'Active Reports',   value: String(stats.open + stats.inProgress), icon: AlertCircle, color: 'text-red-500',     bg: 'bg-red-50' },
    { label: 'Resolved',         value: String(stats.resolved),                icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Avg. Resolution',  value: stats.avgHours != null ? `${stats.avgHours}h` : 'N/A', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Districts Active', value: String(stats.wardsActive || 5),        icon: Map,          color: 'text-violet-500',  bg: 'bg-violet-50' },
  ];

  return (
    <div className="page-transition">
      {/* ── HERO ────────────────────────────────────────────── */}
      <section className="hero-gradient text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-blue-400 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-10 w-96 h-96 bg-cyan-400 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
              <Zap className="w-3.5 h-3.5" />
              Kerala Civic Tech · AI-Powered · Real-Time
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4">
              Report Blocked Drains<br />
              <span className="text-blue-400">Across Kerala.</span>
            </h1>
            <p className="text-slate-300 text-lg mb-8 leading-relaxed">
              Snap a photo, drop a pin — your complaint is auto-routed to the right ward officer.
              Track resolution in real time on the satellite map.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/report">
                <Button size="xl" className="shadow-2xl shadow-blue-700/40">
                  Report a Blockage <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/track">
                <Button size="xl" variant="outline" className="border-white/20 text-white hover:bg-white/10 bg-white/5">
                  Track My Complaint
                </Button>
              </Link>
            </div>
          </div>
        </div>
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-slate-400 animate-bounce">
          <span className="text-xs">Live satellite map below</span>
          <ChevronDown className="w-4 h-4" />
        </div>
      </section>

      {/* ── STATS — derived from real data ──────────────────── */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statCards.map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', bg)}>
                  <Icon className={cn('w-5 h-5', color)} />
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-900">{value}</div>
                  <div className="text-xs text-gray-500">{label}</div>
                </div>
              </div>
            ))}
          </div>
          {/* Escalation alert banner */}
          {stats.escalated > 0 && (
            <div className="mt-4 flex items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-xl">
              <AlertOctagon className="w-4 h-4 text-purple-600 shrink-0" />
              <p className="text-sm text-purple-800 font-medium">
                {stats.escalated} complaint{stats.escalated > 1 ? 's have' : ' has'} been escalated to the Commissioner's Office due to SLA breach.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── MAP + TICKETS ────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Kerala Live Blockage Map</h2>
            <p className="text-sm text-gray-500">🛰️ Satellite imagery · Tap any pin for details</p>
          </div>
          <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
            <button onClick={() => setMapView(true)}  className={cn('px-4 py-1.5 rounded-lg text-sm font-medium transition-all', mapView  ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700')}>🛰️ Map</button>
            <button onClick={() => setMapView(false)} className={cn('px-4 py-1.5 rounded-lg text-sm font-medium transition-all', !mapView ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700')}>📋 List</button>
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 flex-wrap mb-5">
          {STATUS_FILTERS.map(({ status, label }) => {
            const cfg   = status !== 'all' ? STATUS_CONFIG[status] : null;
            const count = status === 'all' ? tickets.length : counts[status as TicketStatus];
            return (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                  selectedStatus === status
                    ? cfg ? `${cfg.bg} ${cfg.color} border-current` : 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                )}
              >
                {cfg && <span className={cn('w-2 h-2 rounded-full', cfg.dot)} />}
                {label}
                <span className="bg-white/30 rounded-full px-1.5 font-bold">{count}</span>
              </button>
            );
          })}
        </div>

        {mapView ? (
          <div className="grid lg:grid-cols-5 gap-5">
            <div className="lg:col-span-3">
              <PublicMap
                tickets={filtered}
                onTicketClick={setSelectedTicket}
                selectedTicketId={selectedTicket?.id}
                height="520px"
              />
              <div className="mt-3 flex flex-wrap gap-3">
                {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
                  <div key={status} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <span className={cn('w-2.5 h-2.5 rounded-full', cfg.dot)} />
                    {cfg.label}
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-2 space-y-3 max-h-[540px] overflow-y-auto pr-1">
              {filtered.length === 0 ? (
                <EmptyState
                  emoji="🗺️"
                  title="No reports match this filter"
                  description="Try selecting a different status or submit a new report."
                  size="sm"
                />
              ) : filtered.map(ticket => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  variant="consumer"
                  isSelected={selectedTicket?.id === ticket.id}
                  onClick={() => setSelectedTicket(t => t?.id === ticket.id ? null : ticket)}
                />
              ))}
            </div>
          </div>
        ) : (
          <>
            {filtered.length === 0 ? (
              <EmptyState
                emoji="📋"
                title="No reports match this filter"
                description="Try a different filter or be the first to report in this category."
                action={<Link href="/report"><Button size="sm">Report a Blockage</Button></Link>}
              />
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(ticket => (
                  <TicketCard key={ticket.id} ticket={ticket} variant="consumer" />
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────── */}
      <section className="bg-white border-t border-gray-100 py-14">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">How DrainWatch Works</h2>
          <p className="text-gray-500 mb-10">Three steps. No guesswork. Built for Kerala.</p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', icon: '📸', title: 'Snap & Submit',       desc: 'Take a photo on your phone. Our AI instantly assesses blockage severity using image analysis.' },
              { step: '02', icon: '🛰️', title: 'Auto-Routed via GPS', desc: 'Your location pins the exact ward. The right officer is notified within minutes.' },
              { step: '03', icon: '✅', title: 'Track & Escalate',    desc: 'Follow resolution in real time. Ignored for 48h? Auto-escalated to the Commissioner.' },
            ].map(({ step, icon, title, desc }) => (
              <div key={step} className="relative">
                <div className="text-4xl mb-4">{icon}</div>
                <div className="text-xs font-bold text-blue-400 mb-1">{step}</div>
                <h3 className="text-base font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-10">
            <Link href="/report">
              <Button size="lg">Submit Your Report <ArrowRight className="w-4 h-4 ml-2" /></Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
