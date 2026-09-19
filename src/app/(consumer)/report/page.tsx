'use client';
import React, { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Camera, MapPin, Loader2, CheckCircle2, ChevronRight,
  ChevronLeft, AlertTriangle, X, Upload, LocateFixed, Info,
  Copy, Share2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PinDropMap } from '@/components/maps/PinDropMap';
import { AIAssessmentCard } from '@/components/tickets/SeverityBadge';
import { useToast } from '@/components/ui/toast';
import { Confetti } from '@/components/ui/confetti';
import { SMSNotification } from '@/components/ui/sms-notification';
import {
  cn, reverseGeocode, fileToBase64,
  PRIORITY_CONFIG, STATUS_CONFIG
} from '@/lib/utils';
import { saveTicket, generateTicketNumber } from '@/lib/ticket-store';
import { MOCK_WARDS } from '@/lib/mock-data';
import type { ReportFormData, Ticket } from '@/types';

const STEPS = [
  { id: 1, title: 'Capture Photo',  icon: Camera },
  { id: 2, title: 'Pin Location',   icon: MapPin },
  { id: 3, title: 'Describe Issue', icon: Info },
  { id: 4, title: 'Your Details',   icon: CheckCircle2 },
];

async function simulateAISeverity(file: File): Promise<{ tag: string; confidence: number }> {
  await new Promise(r => setTimeout(r, 1600));
  const size = file.size / 1024;
  const tags = size > 1500
    ? [
        { tag: 'Critical Waterlogging',  confidence: 0.94 },
        { tag: 'Severe Blockage',        confidence: 0.89 },
      ]
    : [
        { tag: 'Moderate Flooding Risk', confidence: 0.81 },
        { tag: 'Minor Debris',           confidence: 0.74 },
      ];
  return tags[Math.floor(Math.random() * tags.length)];
}

// Find which ward a lat/lng belongs to (bounding-box fallback)
function resolveWard(lat: number, lng: number) {
  // Simple distance-based assignment to nearest ward centroid (Kerala)
  const centroids = [
    { ward: MOCK_WARDS[0], lat: 8.5074,  lng: 76.9574 }, // TVM
    { ward: MOCK_WARDS[1], lat: 9.9312,  lng: 76.2673 }, // Kochi
    { ward: MOCK_WARDS[2], lat: 11.2588, lng: 75.7804 }, // Kozhikode
    { ward: MOCK_WARDS[3], lat: 10.5276, lng: 76.2144 }, // Thrissur
    { ward: MOCK_WARDS[4], lat: 8.8932,  lng: 76.6141 }, // Kollam
  ];
  let nearest = centroids[0];
  let minDist = Infinity;
  for (const c of centroids) {
    const d = Math.hypot(c.lat - lat, c.lng - lng);
    if (d < minDist) { minDist = d; nearest = c; }
  }
  return nearest.ward;
}

export default function ReportPage() {
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep]           = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]  = useState(false);
  const [ticketId, setTicketId]    = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [showSMS, setShowSMS]      = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [aiLoading, setAiLoading]  = useState(false);
  const [aiResult, setAiResult]    = useState<{ tag: string; confidence: number } | null>(null);
  const [locating, setLocating]    = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [copied, setCopied]        = useState(false);

  const [form, setForm] = useState<ReportFormData>({
    title: '', description: '',
    latitude: null, longitude: null, address: '',
    reporter_name: '', reporter_phone: '', reporter_email: '',
    photo: null,
  });

  // ── Photo ───────────────────────────────────────────────────
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm(f => ({ ...f, photo: file }));
    const preview = await fileToBase64(file);
    setPhotoPreview(preview);
    setAiLoading(true);
    try {
      const result = await simulateAISeverity(file);
      setAiResult(result);
    } finally {
      setAiLoading(false);
    }
  };

  const clearPhoto = () => {
    setForm(f => ({ ...f, photo: null }));
    setPhotoPreview(null);
    setAiResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Geolocation ─────────────────────────────────────────────
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) { setLocationDenied(true); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude, longitude } = pos.coords;
        setForm(f => ({ ...f, latitude, longitude }));
        setLocating(false);
        const address = await reverseGeocode(latitude, longitude);
        setForm(f => ({ ...f, address }));
        toast({ type: 'success', title: 'Location acquired', description: address });
      },
      () => {
        setLocating(false);
        setLocationDenied(true);
        toast({ type: 'warning', title: 'Location denied', description: 'Drop a pin manually on the map below.' });
      },
      { timeout: 10_000, enableHighAccuracy: true }
    );
  }, [toast]);

  const handlePinDrop = async (lat: number, lng: number) => {
    setForm(f => ({ ...f, latitude: lat, longitude: lng }));
    const address = await reverseGeocode(lat, lng);
    setForm(f => ({ ...f, address }));
  };

  const set = (key: keyof ReportFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  const canProceed = () => {
    if (step === 1) return !!form.photo;
    if (step === 2) return form.latitude !== null && form.longitude !== null;
    if (step === 3) return form.title.trim().length >= 5;
    return true;
  };

  // ── Copy ticket ID ───────────────────────────────────────────
  const copyTicketId = () => {
    navigator.clipboard.writeText(ticketId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── Submit ──────────────────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Try real API first
      let savedTicketNumber: string | null = null;
      try {
        const body = new FormData();
        if (form.photo) body.append('photo', form.photo);
        Object.entries(form).forEach(([k, v]) => {
          if (k !== 'photo' && v !== null) body.append(k, String(v));
        });
        if (aiResult) {
          body.append('ai_severity_tag', aiResult.tag);
          body.append('ai_confidence', String(aiResult.confidence));
        }
        const res  = await fetch('/api/tickets', { method: 'POST', body });
        const data = await res.json();
        if (res.ok && data.ticket_number) savedTicketNumber = data.ticket_number;
      } catch { /* fall through to local */ }

      // Always save locally so tracking works
      const tNum    = savedTicketNumber ?? generateTicketNumber();
      const ward    = form.latitude && form.longitude
        ? resolveWard(form.latitude, form.longitude)
        : MOCK_WARDS[0];

      const priority = aiResult?.tag.toLowerCase().includes('critical') ? 'critical'
        : aiResult?.tag.toLowerCase().includes('severe') ? 'high'
        : aiResult?.tag.toLowerCase().includes('moderate') ? 'medium'
        : 'low';

      const newTicket: Ticket = {
        id:              `local-${Date.now()}`,
        ticket_number:   tNum,
        title:           form.title,
        description:     form.description || null,
        latitude:        form.latitude!,
        longitude:       form.longitude!,
        address:         form.address || null,
        ward_id:         ward.id,
        ward_number:     ward.ward_number,
        ward:            ward,
        status:          'open',
        priority:        priority as Ticket['priority'],
        ai_severity_tag: aiResult?.tag ?? null,
        ai_confidence:   aiResult?.confidence ?? null,

        photo_url:       photoPreview,   // base64 preview stored locally
        resolved_photo_url: null,
        reporter_name:   form.reporter_name || null,
        reporter_phone:  form.reporter_phone || null,
        reporter_email:  form.reporter_email || null,
        assigned_officer_id:   null,
        assigned_officer_name: null,
        resolution_notes:      null,
        sla_hours:       48,
        escalated_at:    null,
        escalated_to:    null,
        resolved_at:     null,
        created_at:      new Date().toISOString(),
        updated_at:      new Date().toISOString(),
      };

      saveTicket(newTicket);
      setTicketId(tNum);
      setSubmitted(true);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000);

      // Show SMS notification if phone provided
      if (form.reporter_phone.trim().length >= 10) {
        setTimeout(() => setShowSMS(true), 800);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen ──────────────────────────────────────────
  if (submitted) {
    return (
      <>
        <Confetti active={showConfetti} />
        {showSMS && (
          <SMSNotification
            phone={form.reporter_phone}
            ticketNumber={ticketId}
            onClose={() => setShowSMS(false)}
          />
        )}
        <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-gradient-to-b from-emerald-50 to-white">
          <div className="max-w-md w-full text-center animate-fade-up">
            {/* Big success ring */}
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full bg-emerald-100 animate-ping opacity-30" />
              <div className="relative w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center ring-8 ring-emerald-50">
                <CheckCircle2 className="w-12 h-12 text-emerald-600" />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">Complaint Registered!</h1>
            <p className="text-gray-500 mb-6 leading-relaxed">
              Your report has been saved and auto-routed to the correct ward officer.
              {form.reporter_phone && ' An SMS confirmation has been sent to your number.'}
            </p>

            {/* Ticket ID card */}
            <div className="bg-white border-2 border-emerald-200 rounded-2xl p-6 mb-5 shadow-lg">
              <p className="text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wide">Your Ticket ID</p>
              <p className="text-3xl font-bold font-mono text-emerald-600 mb-3">{ticketId}</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={copyTicketId}
                >
                  {copied ? <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />Copied!</> : <><Copy className="w-3.5 h-3.5 mr-1.5" />Copy ID</>}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: 'DrainWatch Complaint',
                        text:  `My complaint has been registered. Track it with Ticket ID: ${ticketId}`,
                        url:   `${window.location.origin}/track?id=${ticketId}`,
                      });
                    } else {
                      copyTicketId();
                    }
                  }}
                >
                  <Share2 className="w-3.5 h-3.5 mr-1.5" />Share
                </Button>
              </div>
            </div>

            {/* What happens next */}
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-5 text-left">
              <p className="text-xs font-bold text-blue-800 mb-3">What happens next?</p>
              <div className="space-y-2">
                {[
                  { icon: '🏛️', text: `Routed to Ward ${MOCK_WARDS.find(w => w.id === 'w1')?.ward_name ?? 'Officer'}` },
                  { icon: '⏱️', text: 'Officer must respond within 48 hours' },
                  { icon: '📈', text: 'Auto-escalates to Commissioner if ignored' },
                  { icon: '✅', text: 'You\'ll see before/after photos when resolved' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-xs text-blue-700">
                    <span>{item.icon}</span><span>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI assessment */}
            {aiResult && (
              <div className="mb-5">
                <AIAssessmentCard tag={aiResult.tag} confidence={aiResult.confidence} />
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => router.push(`/track?id=${ticketId}`)}>
                Track Status
              </Button>
              <Button className="flex-1" onClick={() => router.push('/')}>
                View Live Map
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Wizard ──────────────────────────────────────────────────
  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Report a Blockage</h1>
          <p className="text-sm text-gray-500 mt-1">
            Complete all steps — your report is saved locally so you can track it anytime.
          </p>
        </div>

        {/* Step progress */}
        <div className="flex items-center mb-8 gap-0">
          {STEPS.map((s, i) => {
            const done   = step > s.id;
            const active = step === s.id;
            const Icon   = s.icon;
            return (
              <React.Fragment key={s.id}>
                <div className="flex flex-col items-center gap-1.5">
                  <div className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center transition-all border-2 font-semibold text-sm',
                    done   ? 'bg-blue-600 border-blue-600 text-white' :
                    active ? 'bg-white border-blue-500 text-blue-600 shadow-md shadow-blue-100' :
                             'bg-white border-gray-200 text-gray-300'
                  )}>
                    {done ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className={cn(
                    'text-[10px] font-semibold whitespace-nowrap hidden sm:block',
                    active ? 'text-blue-600' : done ? 'text-gray-600' : 'text-gray-300'
                  )}>{s.title}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={cn(
                    'flex-1 h-0.5 mx-1 mt-[-14px] sm:mt-[-20px] transition-all',
                    step > s.id ? 'bg-blue-500' : 'bg-gray-200'
                  )} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* ── STEP 1: Photo ─────────────────────────────────── */}
        {step === 1 && (
          <div className="animate-fade-up space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Capture the Blockage</h2>
              <p className="text-sm text-gray-500">Take a clear photo — the AI will assess severity automatically.</p>
            </div>

            {!photoPreview ? (
              <label
                htmlFor="photo-input"
                className="flex flex-col items-center justify-center gap-4 p-8 border-2 border-dashed border-blue-300 rounded-2xl bg-blue-50 cursor-pointer hover:bg-blue-100 hover:border-blue-400 transition-all group"
              >
                <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center shadow-xl shadow-blue-500/30 group-hover:scale-110 transition-transform">
                  <Camera className="w-8 h-8 text-white" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-800">Tap to take a photo</p>
                  <p className="text-xs text-gray-500 mt-1">Opens your camera directly on mobile</p>
                </div>
                <input
                  id="photo-input"
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePhotoChange}
                  aria-label="Capture blockage photo"
                />
              </label>
            ) : (
              <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-md">
                <img src={photoPreview} alt="Preview" className="w-full aspect-video object-cover" />
                <button onClick={clearPhoto} className="absolute top-3 right-3 w-8 h-8 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white">
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-3 right-3">
                  <label htmlFor="photo-retake" className="flex items-center gap-1.5 bg-white/90 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-full cursor-pointer hover:bg-white shadow">
                    <Upload className="w-3.5 h-3.5" /> Retake
                  </label>
                  <input id="photo-retake" type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoChange} />
                </div>
              </div>
            )}

            {(aiLoading || aiResult) && (
              <div className={cn('flex items-center gap-3 p-4 rounded-2xl border transition-all', aiLoading ? 'bg-violet-50 border-violet-100' : 'bg-gradient-to-r from-violet-50 to-blue-50 border-violet-100')}>
                {aiLoading
                  ? <><Loader2 className="w-5 h-5 text-violet-500 animate-spin" /><div><p className="text-sm font-semibold text-violet-800">AI analysing photo…</p><p className="text-xs text-violet-500">Assessing blockage severity</p></div></>
                  : aiResult && <AIAssessmentCard tag={aiResult.tag} confidence={aiResult.confidence} />
                }
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Location ──────────────────────────────── */}
        {step === 2 && (
          <div className="animate-fade-up space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Pin the Location</h2>
              <p className="text-sm text-gray-500">Exact location helps us route to the right ward officer.</p>
            </div>
            <Button onClick={requestLocation} disabled={locating} variant={form.latitude ? 'success' : 'default'} className="w-full">
              {locating
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Acquiring GPS…</>
                : form.latitude
                ? <><CheckCircle2 className="w-4 h-4 mr-2" />Location Set — {form.latitude.toFixed(4)}, {form.longitude?.toFixed(4)}</>
                : <><LocateFixed className="w-4 h-4 mr-2" />Use My Current Location</>
              }
            </Button>
            {form.address && (
              <div className="flex items-start gap-2.5 p-3 bg-blue-50 rounded-xl border border-blue-100">
                <MapPin className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <p className="text-sm text-blue-900">{form.address}</p>
              </div>
            )}
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
              <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-gray-400 font-medium">or drop a pin manually</span></div>
            </div>
            <PinDropMap lat={form.latitude} lng={form.longitude} onPinDrop={handlePinDrop} height="280px" />
            {locationDenied && !form.latitude && (
              <div className="flex items-start gap-2.5 p-3 bg-amber-50 rounded-xl border border-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-800">Location denied. Tap the satellite map above to drop a pin.</p>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3: Describe ─────────────────────────────── */}
        {step === 3 && (
          <div className="animate-fade-up space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Describe the Issue</h2>
              <p className="text-sm text-gray-500">A clear description helps the ward team prioritise faster.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Issue Title <span className="text-red-500">*</span></label>
                <Input value={form.title} onChange={set('title')} placeholder="e.g. Storm drain blocked near bus stop" maxLength={100} />
                <p className="text-xs text-gray-400 mt-1 text-right">{form.title.length}/100</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                <Textarea value={form.description} onChange={set('description')} placeholder="Describe severity, water level, nearby landmarks…" rows={4} maxLength={500} />
                <p className="text-xs text-gray-400 mt-1 text-right">{form.description.length}/500</p>
              </div>
              {aiResult && (
                <div className="p-3 bg-violet-50 rounded-xl border border-violet-100">
                  <p className="text-xs text-violet-600 font-semibold mb-1">🤖 AI Assessment will be attached</p>
                  <AIAssessmentCard tag={aiResult.tag} confidence={aiResult.confidence} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 4: Contact ──────────────────────────────── */}
        {step === 4 && (
          <div className="animate-fade-up space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Your Contact Details</h2>
              <p className="text-sm text-gray-500">
                Enter your mobile number to receive an SMS confirmation. All fields are optional — report anonymously if you prefer.
              </p>
            </div>
            <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <span className="text-lg">📱</span>
              <p className="text-xs text-emerald-800 font-medium">
                If you enter your phone number, we'll send an SMS with your ticket ID and tracking link.
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Your Name</label>
                <Input value={form.reporter_name} onChange={set('reporter_name')} placeholder="Full name (optional)" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Mobile Number
                  {form.reporter_phone.length >= 10 && (
                    <span className="ml-2 text-xs text-emerald-600 font-normal">✓ SMS will be sent</span>
                  )}
                </label>
                <Input value={form.reporter_phone} onChange={set('reporter_phone')} placeholder="+91 9876 543 210" type="tel" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
                <Input value={form.reporter_email} onChange={set('reporter_email')} placeholder="you@example.com (optional)" type="email" />
              </div>
            </div>

            {/* Summary */}
            <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl space-y-2 text-sm">
              <p className="font-semibold text-gray-700 mb-2">📋 Report Summary</p>
              {[
                { label: 'Issue',    value: form.title },
                { label: 'Location', value: form.address || `${form.latitude?.toFixed(4)}, ${form.longitude?.toFixed(4)}` },
                { label: 'Severity', value: aiResult?.tag ?? 'Not assessed' },
                { label: 'Photo',    value: '✓ Attached' },
              ].map(row => (
                <div key={row.label} className="flex justify-between text-gray-600 gap-4">
                  <span className="shrink-0">{row.label}</span>
                  <span className="font-medium text-gray-900 text-right truncate max-w-[220px]">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Navigation ────────────────────────────────────── */}
        <div className="flex gap-3 mt-8">
          {step > 1 && (
            <Button variant="outline" className="flex-1" onClick={() => setStep(s => s - 1)}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          )}
          {step < 4 ? (
            <Button className="flex-1" onClick={() => setStep(s => s + 1)} disabled={!canProceed()}>
              Continue <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button className="flex-1" onClick={handleSubmit} disabled={submitting}>
              {submitting
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting…</>
                : <>Submit Report <ChevronRight className="w-4 h-4 ml-1" /></>
              }
            </Button>
          )}
        </div>
        {step === 1 && (
          <p className="text-center text-xs text-gray-400 mt-4">
            Reports are anonymous by default · No login required
          </p>
        )}
      </div>
    </div>
  );
}
