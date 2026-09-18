'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  AlertCircle, CheckCircle2, Clock, Zap, ArrowRight,
  Map, TrendingUp, Users, Shield, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PublicMap } from '@/components/maps/PublicMap';
import { TicketCard } from '@/components/tickets/TicketCard';
import { cn, STATUS_CONFIG } from '@/lib/utils';
import { MOCK_TICKETS } from '@/lib/mock-data';
import type { Ticket, TicketStatus } from '@/types';

const STATS = [
  { label: 'Reports This Month', value: '248', icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50' },
  { label: 'Resolved',           value: '189', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { label: 'Avg. Resolution',    value: '31h',  icon: Clock,        color: 'text-blue-500',    bg: 'bg-blue-50' },
  { label: 'Wards Active',       value: '5',    icon: Map,          color: 'text-violet-500',  bg: 'bg-violet-50' },
];

const STATUS_FILTERS: Array<{ status: TicketStatus | 'all'; label: string }> = [
  { status: 'all',         label: 'All' },
  { status: 'open',        label: 'Open' },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'resolved',    label: 'Resolved' },
  { status: 'escalated',   label: 'Escalated' },
];

export default function HomePage() {
  const [tickets] = useState<Ticket[]>(MOCK_TICKETS);
  const [selectedStatus, setSelectedStatus] = useState<TicketStatus | 'all'>('all');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [mapView, setMapView] = useState(true);

  const filtered = selectedStatus === 'all'
    ? tickets
    : tickets.filter(t => t.status === selectedStatus);

  const counts = {
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    escalated: tickets.filter(t => t.status === 'escalated').length,
  };

  return (
    <div className="page-transition">
      {/* ── HERO ────────────────────────────────────────────────── */}
      <section className="hero-gradient text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-blue-400 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-10 w-96 h-96 bg-cyan-400 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
              <Zap className="w-3.5 h-3.5" />
              AI-Powered · Real-Time · Transparent
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4">
              Report Blocked Drains.<br />
              <span className="text-blue-400">Track. Escalate. Resolve.</span>
            </h1>
            <p className="text-slate-300 text-lg mb-8 leading-relaxed">
              Snap a photo, drop a pin — we auto-route your report to the right ward officer.
              Watch real-time resolution on the city map.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/report">
                <Button size="xl" className="shadow-2xl shadow-blue-700/40">
                  Report a Blockage
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/track">
                <Button size="xl" variant="outline" className="border-white/20 text-white hover:bg-white/10 bg-white/5">
                  Track My Report
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-slate-400 animate-bounce">
          <span className="text-xs">Live map below</span>
          <ChevronDown className="w-4 h-4" />
        </div>
      </section>

      {/* ── STATS ROW ───────────────────────────────────────────── */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {STATS.map(({ label, value, icon: Icon, color, bg }) => (
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
        </div>
      </section>

      {/* ── LIVE MAP + TICKETS ──────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">City-Wide Blockage Map</h2>
            <p className="text-sm text-gray-500">Click any pin for details · Updates in real time</p>
          </div>

          {/* View toggle */}
          <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
            <button
              onClick={() => setMapView(true)}
              className={cn('px-4 py-1.5 rounded-lg text-sm font-medium transition-all', mapView ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700')}
            >
              🗺️ Map
            </button>
            <button
              onClick={() => setMapView(false)}
              className={cn('px-4 py-1.5 rounded-lg text-sm font-medium transition-all', !mapView ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700')}
            >
              📋 List
            </button>
          </div>
        </div>

        {/* Status filter pills */}
        <div className="flex gap-2 flex-wrap mb-5">
          {STATUS_FILTERS.map(({ status, label }) => {
            const cfg = status !== 'all' ? STATUS_CONFIG[status] : null;
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
            {/* Map — takes 3/5 width */}
            <div className="lg:col-span-3">
              <PublicMap
                tickets={filtered}
                onTicketClick={setSelectedTicket}
                selectedTicketId={selectedTicket?.id}
                height="520px"
              />

              {/* Legend */}
              <div className="mt-3 flex flex-wrap gap-3">
                {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
                  <div key={status} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <span className={cn('w-2.5 h-2.5 rounded-full', cfg.dot)} />
                    {cfg.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Ticket list — 2/5 width */}
            <div className="lg:col-span-2 space-y-3 max-h-[540px] overflow-y-auto pr-1">
              {filtered.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <Map className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No reports match this filter</p>
                </div>
              )}
              {filtered.map(ticket => (
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
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(ticket => (
              <TicketCard key={ticket.id} ticket={ticket} variant="consumer" />
            ))}
          </div>
        )}
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────── */}
      <section className="bg-white border-t border-gray-100 py-14">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">How DrainWatch Works</h2>
          <p className="text-gray-500 mb-10">Three steps. Zero guesswork.</p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', icon: '📸', title: 'Snap & Submit', desc: 'Take a photo of the blocked drain from your phone camera. Our AI instantly assesses severity.' },
              { step: '02', icon: '📍', title: 'Auto-Routed', desc: 'Your GPS coordinates pinpoint the exact ward. The right officer is notified automatically.' },
              { step: '03', icon: '✅', title: 'Track & Escalate', desc: 'Follow resolution in real-time. If ignored for 48h, it auto-escalates to the commissioner.' },
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
              <Button size="lg">
                Submit Your First Report <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
