'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Droplets, Eye, EyeOff, Loader2, Shield, ArrowLeft, Lock, Mail } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

// Demo credentials — in production these are Supabase auth accounts
const DEMO_USERS = [
  { email: 'ward1@municipality.gov', password: 'ward1pass', name: 'Rajesh Kumar',  ward: 'Ward 1 – Andheri West', role: 'ward_officer' },
  { email: 'ward3@municipality.gov', password: 'ward3pass', name: 'Sunil Patil',   ward: 'Ward 3 – Bandra',       role: 'ward_officer' },
  { email: 'admin@municipality.gov', password: 'adminpass', name: 'Commissioner',  ward: 'All Wards',             role: 'admin' },
];

export default function GovLoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [errors, setErrors]     = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!email)    e.email    = 'Email is required';
    if (!password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    await new Promise(r => setTimeout(r, 900));

    const user = DEMO_USERS.find(u => u.email === email && u.password === password);
    if (user) {
      // Store session in sessionStorage (replace with Supabase auth in production)
      sessionStorage.setItem('gov_user', JSON.stringify(user));
      toast({ type: 'success', title: `Welcome, ${user.name}`, description: user.ward });
      router.push('/gov/dashboard');
    } else {
      toast({ type: 'error', title: 'Invalid credentials', description: 'Please check your email and password.' });
      setErrors({ password: 'Invalid email or password' });
    }
    setLoading(false);
  };

  const fillDemo = (u: typeof DEMO_USERS[0]) => {
    setEmail(u.email);
    setPassword(u.password);
    setErrors({});
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel — branding ────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 hero-gradient flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-80 h-80 bg-blue-400 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-64 h-64 bg-cyan-400 rounded-full blur-3xl" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center shadow-xl shadow-blue-500/30">
              <Droplets className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-xl">Drain<span className="text-blue-400">Watch</span></span>
          </div>
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold px-3 py-1.5 rounded-full">
              <Shield className="w-3.5 h-3.5" /> Government Portal
            </div>
            <h1 className="text-4xl font-extrabold text-white leading-tight">
              Municipal<br />
              <span className="text-blue-400">Response Hub</span>
            </h1>
            <p className="text-slate-400 text-base leading-relaxed max-w-sm">
              Manage drain blockage reports for your ward. Real-time triage, SLA tracking, and one-click escalation.
            </p>
          </div>
        </div>

        {/* Feature list */}
        <div className="relative space-y-4">
          {[
            { icon: '🗺️', title: 'Live Ward Map',        desc: 'See all active tickets on an interactive map' },
            { icon: '📋', title: 'Kanban Triage',         desc: 'Drag tickets from New → In Progress → Resolved' },
            { icon: '⏱️', title: 'SLA Countdown Timers', desc: 'Auto-escalates after 48h — never miss a deadline' },
            { icon: '🤖', title: 'AI Severity Tags',      desc: 'Gemini Vision pre-classifies each report' },
          ].map(f => (
            <div key={f.title} className="flex items-start gap-3">
              <span className="text-xl mt-0.5">{f.icon}</span>
              <div>
                <p className="text-white font-semibold text-sm">{f.title}</p>
                <p className="text-slate-400 text-xs">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel — login form ──────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to public portal
          </Link>

          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
              <Droplets className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-gray-900">DrainWatch <span className="text-blue-600">Gov</span></span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Sign in to your account</h2>
            <p className="text-gray-500 text-sm mt-1">Municipal officers only. Use your official credentials.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5" noValidate>
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Official Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setErrors(v => ({ ...v, email: '' })); }}
                  placeholder="you@municipality.gov"
                  className={cn('pl-10', errors.email && 'border-red-400 focus-visible:ring-red-400')}
                  autoComplete="email"
                />
              </div>
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setErrors(v => ({ ...v, password: '' })); }}
                  placeholder="Your password"
                  className={cn('pl-10 pr-10', errors.password && 'border-red-400 focus-visible:ring-red-400')}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in…</>
              ) : (
                <><Shield className="w-4 h-4 mr-2" /> Sign In to Dashboard</>
              )}
            </Button>
          </form>

          {/* Demo credentials */}
          <div className="mt-8">
            <p className="text-xs font-semibold text-gray-400 mb-3 text-center uppercase tracking-wide">
              Demo Credentials
            </p>
            <div className="space-y-2">
              {DEMO_USERS.map(u => (
                <button
                  key={u.email}
                  type="button"
                  onClick={() => fillDemo(u)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-left group"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-800">{u.name}</p>
                    <p className="text-xs text-gray-500">{u.ward}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono text-gray-400">{u.email}</p>
                    <span className={cn(
                      'text-[10px] font-bold px-2 py-0.5 rounded-full',
                      u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    )}>
                      {u.role === 'admin' ? '👑 Admin' : '🏛️ Officer'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
