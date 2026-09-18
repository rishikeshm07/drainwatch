'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Droplets, Menu, X, Map, Plus, Search, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

const NAV_LINKS = [
  { href: '/',       label: 'Live Map',   icon: Map },
  { href: '/report', label: 'Report',     icon: Plus },
  { href: '/track',  label: 'Track',      icon: Search },
];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-slate-900/80">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-shadow">
            <Droplets className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">
            Drain<span className="text-blue-400">Watch</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all',
                pathname === href
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </nav>

        {/* CTA + Gov link */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/gov/login"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors font-medium"
          >
            <Shield className="w-3.5 h-3.5" />
            Gov Login
          </Link>
          <Link href="/report">
            <Button size="sm" className="rounded-lg">
              <Plus className="w-4 h-4 mr-1.5" />
              Report Blockage
            </Button>
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden text-slate-300 hover:text-white p-2"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden border-t border-white/10 bg-slate-900 px-4 py-4 space-y-1">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                pathname === href
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
          <Link
            href="/gov/login"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/10"
          >
            <Shield className="w-4 h-4" />
            Government Login
          </Link>
        </div>
      )}
    </header>
  );
}

// Government-specific top bar
export function GovNavbar({ officerName, wardName }: { officerName?: string; wardName?: string }) {
  return (
    <header className="h-14 border-b border-gray-200 bg-white px-6 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
          <Droplets className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="font-bold text-slate-800 text-sm">DrainWatch <span className="text-blue-600">Gov</span></span>
        {wardName && (
          <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-0.5 rounded-full font-semibold">
            {wardName}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        {officerName && (
          <span className="text-sm text-gray-600 hidden sm:block">
            Welcome, <strong>{officerName}</strong>
          </span>
        )}
        <Link href="/gov/login">
          <Button variant="outline" size="sm" className="text-xs">
            Sign Out
          </Button>
        </Link>
      </div>
    </header>
  );
}
