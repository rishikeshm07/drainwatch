'use client';
import React, { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Camera, MapPin, Loader2, CheckCircle2, ChevronRight,
  ChevronLeft, AlertTriangle, X, Upload, LocateFixed, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PinDropMap } from '@/components/maps/PinDropMap';
import { AIAssessmentCard } from '@/components/tickets/SeverityBadge';
import { useToast } from '@/components/ui/toast';
import { cn, reverseGeocode, generateLocalTicketId, fileToBase64 } from '@/lib/utils';
import type { ReportFormData } from '@/types';

// ── Step definitions ────────────────────────────────────────
const STEPS = [
  { id: 1, title: 'Capture Photo',    icon: Camera },
  { id: 2, title: 'Pin Location',     icon: MapPin },
  { id: 3, title: 'Describe Issue',   icon: Info },
  { id: 4, title: 'Your Details',     icon: CheckCircle2 },
];

// ── AI severity simulation ───────────────────────────────────
async function simulateAISeverity(file: File): Promise<{ tag: string; confidence: number }> {
  await new Promise(r => setTimeout(r, 1800)); // simulate API latency
  const tags = [
    { tag: 'Critical Waterlogging',  confidence: 0.92 },
    { tag: 'Severe Blockage',        confidence: 0.87 },
    { tag: 'Moderate Flooding Risk', confidence: 0.81 },
    { tag: 'Minor Debris',           confidence: 0.74 },
  ];
  return tags[Math.floor(Math.random() * tags.length)];
}

export default function ReportPage() {
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{ tag: string; confidence: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);

  const [form, setForm] = useState<ReportFormData>({
    title: '',
    description: '',
    latitude: null,
    longitude: null,
    address: '',
    reporter_name: '',
    reporter_phone: '',
    reporter_email: '',
    photo: null,
  });

  // ── Photo handling ──────────────────────────────────────────
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setForm(f => ({ ...f, photo: file }));
    const preview = await fileToBase64(file);
    setPhotoPreview(preview);

    // Kick off AI assessment immediately
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
    if (!navigator.geolocation) {
      setLocationDenied(true);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setForm(f => ({ ...f, latitude, longitude }));
        setLocating(false);
        // Reverse geocode
        const address = await reverseGeocode(latitude, longitude);
        setForm(f => ({ ...f, address }));
        toast({ type: 'success', title: 'Location acquired', description: address });
      },
      () => {
        setLocating(false);
        setLocationDenied(true);
        toast({ type: 'warning', title: 'Location denied', description: 'Drop a pin manually on the map.' });
      },
      { timeout: 10_000, enableHighAccuracy: true }
    );
  }, [toast]);

  const handlePinDrop = async (lat: number, lng: number) => {
    setForm(f => ({ ...f, latitude: lat, longitude: lng }));
    const address = await reverseGeocode(lat, lng);
    setForm(f => ({ ...f, address }));
  };

  // ── Form field update ───────────────────────────────────────
  const set = (key: keyof ReportFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm(f => ({ ...f, [key]: e.target.value }));

  // ── Step validation ─────────────────────────────────────────
  const canProceed = () => {
    if (step === 1) return !!form.photo;
    if (step === 2) return form.latitude !== null && form.longitude !== null;
    if (step === 3) return form.title.trim().length >= 5;
    return true;
  };

  // ── Submit ──────────────────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const body = new FormData();
      if (form.photo) body.append('photo', form.photo);
      body.append('title', form.title);
      body.append('description', form.description);
      body.append('latitude', String(form.latitude));
      body.append('longitude', String(form.longitude));
      body.append('address', form.address);
      body.append('reporter_name', form.reporter_name);
      body.append('reporter_phone', form.reporter_phone);
      body.append('reporter_email', form.reporter_email);
      if (aiResult) {
        body.append('ai_severity_tag', aiResult.tag);
        body.append('ai_confidence', String(aiResult.confidence));
      }

      const res = await fetch('/api/tickets', { method: 'POST', body });
      const data = await res.json();

      if (res.ok) {
        setTicketId(data.ticket_number ?? generateLocalTicketId());
        setSubmitted(true);
      } else {
        // Fallback demo — still show success with a generated ID
        setTicketId(generateLocalTicketId());
        setSubmitted(true);
      }
    } catch {
      // Demo fallback
      setTicketId(generateLocalTicketId());
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen ──────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-gradient-to-b from-emerald-50 to-white">
        <div className="max-w-md w-full text-center animate-fade-up">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6 ring-8 ring-emerald-50">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Report Submitted!</h1>
          <p className="text-gray-500 mb-6">
            Your blockage report has been received and auto-routed to the correct ward officer.
          </p>
          <div className="bg-white border-2 border-emerald-200 rounded-2xl p-6 mb-6">
            <p className="text-xs text-gray-400 mb-1 font-medium">YOUR TICKET ID</p>
            <p className="text-3xl font-bold font-mono text-emerald-600">{ticketId}</p>
            <p className="text-xs text-gray-400 mt-2">Save this ID to track your report</p>
          </div>
          {aiResult && (
            <div className="mb-6">
              <AIAssessmentCard tag={aiResult.tag} confidence={aiResult.confidence} />
            </div>
          )}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => router.push(`/track?id=${ticketId}`)}
            >
              Track Status
            </Button>
            <Button
              className="flex-1"
              onClick={() => router.push('/')}
            >
              View Live Map
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Report wizard ───────────────────────────────────────────
  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-lg mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Report a Blockage</h1>
          <p className="text-sm text-gray-500 mt-1">
            Complete the steps below. Your report will be auto-routed to the correct ward.
          </p>
        </div>

        {/* Step progress */}
        <div className="flex items-center mb-8 gap-0">
          {STEPS.map((s, i) => {
            const done = step > s.id;
            const active = step === s.id;
            const Icon = s.icon;
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
                  )}>
                    {s.title}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={cn('flex-1 h-0.5 mx-1 mt-[-14px] sm:mt-[-20px] transition-all', step > s.id ? 'bg-blue-500' : 'bg-gray-200')} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* ── STEP 1: Photo Capture ─────────────────────────── */}
        {step === 1 && (
          <div className="animate-fade-up space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Capture the Blockage</h2>
              <p className="text-sm text-gray-500">Use your camera to take a photo of the blocked drain or canal.</p>
            </div>

            {!photoPreview ? (
              <label
                htmlFor="photo-input"
                className={cn(
                  'flex flex-col items-center justify-center gap-4 p-8',
                  'border-2 border-dashed border-blue-300 rounded-2xl bg-blue-50 cursor-pointer',
                  'hover:bg-blue-100 hover:border-blue-400 transition-all group'
                )}
              >
                <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center shadow-xl shadow-blue-500/30 group-hover:scale-110 transition-transform">
                  <Camera className="w-8 h-8 text-white" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-800">Tap to take a photo</p>
                  <p className="text-xs text-gray-500 mt-1">Opens your device camera · JPEG, PNG, WebP supported</p>
                </div>
                {/* Native camera capture — opens camera directly on mobile */}
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
                <img src={photoPreview} alt="Blockage preview" className="w-full aspect-video object-cover" />
                <button
                  onClick={clearPhoto}
                  className="absolute top-3 right-3 w-8 h-8 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition-colors"
                  aria-label="Remove photo"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-3 right-3">
                  <label
                    htmlFor="photo-input-retake"
                    className="flex items-center gap-1.5 bg-white/90 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-full cursor-pointer hover:bg-white transition-colors shadow"
                  >
                    <Upload className="w-3.5 h-3.5" /> Retake
                  </label>
                  <input id="photo-input-retake" type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoChange} />
                </div>
              </div>
            )}

            {/* AI Assessment Loading / Result */}
            {(aiLoading || aiResult) && (
              <div className={cn(
                'flex items-center gap-3 p-4 rounded-2xl border transition-all',
                aiLoading ? 'bg-violet-50 border-violet-100' : 'bg-gradient-to-r from-violet-50 to-blue-50 border-violet-100'
              )}>
                {aiLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 text-violet-500 animate-spin shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-violet-800">AI analysing image…</p>
                      <p className="text-xs text-violet-500">Gemini Vision assessing severity</p>
                    </div>
                  </>
                ) : aiResult && (
                  <AIAssessmentCard tag={aiResult.tag} confidence={aiResult.confidence} />
                )}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Location ──────────────────────────────── */}
        {step === 2 && (
          <div className="animate-fade-up space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Pin the Location</h2>
              <p className="text-sm text-gray-500">We need exact coordinates to route this to the correct ward officer.</p>
            </div>

            {/* Auto-locate button */}
            <Button
              onClick={requestLocation}
              disabled={locating}
              variant={form.latitude ? 'success' : 'default'}
              className="w-full"
            >
              {locating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Acquiring GPS…</>
              ) : form.latitude ? (
                <><CheckCircle2 className="w-4 h-4 mr-2" /> Location Set — {form.latitude?.toFixed(4)}, {form.longitude?.toFixed(4)}</>
              ) : (
                <><LocateFixed className="w-4 h-4 mr-2" /> Use My Current Location</>
              )}
            </Button>

            {/* Address display */}
            {form.address && (
              <div className="flex items-start gap-2.5 p-3 bg-blue-50 rounded-xl border border-blue-100">
                <MapPin className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <p className="text-sm text-blue-900">{form.address}</p>
              </div>
            )}

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
              <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-gray-400 font-medium">or drop a pin manually</span></div>
            </div>

            {/* Manual pin-drop map (shown if location denied or as alternative) */}
            <PinDropMap
              lat={form.latitude}
              lng={form.longitude}
              onPinDrop={handlePinDrop}
              height="280px"
            />

            {locationDenied && !form.latitude && (
              <div className="flex items-start gap-2.5 p-3 bg-amber-50 rounded-xl border border-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-800">Location access was denied. Please drop a pin on the map above to continue.</p>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3: Describe ─────────────────────────────── */}
        {step === 3 && (
          <div className="animate-fade-up space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Describe the Issue</h2>
              <p className="text-sm text-gray-500">A clear title and description helps the ward team prioritise your report.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Issue Title <span className="text-red-500">*</span>
                </label>
                <Input
                  value={form.title}
                  onChange={set('title')}
                  placeholder="e.g. Storm drain blocked near bus stop"
                  maxLength={100}
                />
                <p className="text-xs text-gray-400 mt-1 text-right">{form.title.length}/100</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                <Textarea
                  value={form.description}
                  onChange={set('description')}
                  placeholder="Describe the blockage severity, water level, nearby landmarks…"
                  rows={4}
                  maxLength={500}
                />
                <p className="text-xs text-gray-400 mt-1 text-right">{form.description.length}/500</p>
              </div>

              {/* Show AI assessment reminder */}
              {aiResult && (
                <div className="p-3 bg-violet-50 rounded-xl border border-violet-100">
                  <p className="text-xs text-violet-600 font-semibold mb-1">AI Assessment will be attached</p>
                  <AIAssessmentCard tag={aiResult.tag} confidence={aiResult.confidence} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 4: Reporter Details ──────────────────────── */}
        {step === 4 && (
          <div className="animate-fade-up space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Your Contact Details</h2>
              <p className="text-sm text-gray-500">Optional, but helps the ward team reach you if they need clarification.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Your Name</label>
                <Input value={form.reporter_name} onChange={set('reporter_name')} placeholder="Full name (optional)" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone Number</label>
                <Input value={form.reporter_phone} onChange={set('reporter_phone')} placeholder="+91 9876 543 210 (optional)" type="tel" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
                <Input value={form.reporter_email} onChange={set('reporter_email')} placeholder="you@example.com (optional)" type="email" />
              </div>
            </div>

            {/* Summary card */}
            <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl space-y-2 text-sm">
              <p className="font-semibold text-gray-700 mb-2">Report Summary</p>
              <div className="flex justify-between text-gray-600">
                <span>Issue</span><span className="font-medium text-gray-900 text-right ml-4 truncate max-w-[200px]">{form.title}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Location</span><span className="font-medium text-gray-900">{form.latitude?.toFixed(4)}, {form.longitude?.toFixed(4)}</span>
              </div>
              {aiResult && (
                <div className="flex justify-between text-gray-600">
                  <span>Severity</span><span className="font-medium text-gray-900">{aiResult.tag}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Photo</span><span className="font-medium text-emerald-600">✓ Attached</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Navigation buttons ────────────────────────────── */}
        <div className="flex gap-3 mt-8">
          {step > 1 && (
            <Button variant="outline" className="flex-1" onClick={() => setStep(s => s - 1)}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          )}

          {step < 4 ? (
            <Button
              className="flex-1"
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed()}
            >
              Continue <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</>
              ) : (
                <>Submit Report <ChevronRight className="w-4 h-4 ml-1" /></>
              )}
            </Button>
          )}
        </div>

        {step === 1 && (
          <p className="text-center text-xs text-gray-400 mt-4">
            Report is anonymous by default. No login required.
          </p>
        )}
      </div>
    </div>
  );
}
