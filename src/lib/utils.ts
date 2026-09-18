import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow, differenceInHours } from 'date-fns';
import type { SLAInfo, TicketStatus, TicketPriority } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ---- SLA / Escalation ----

export function getSLAInfo(createdAt: string, slaHours = 48): SLAInfo {
  const created = new Date(createdAt);
  const now = new Date();
  const hoursElapsed = differenceInHours(now, created);
  const hoursRemaining = Math.max(0, slaHours - hoursElapsed);
  const percentUsed = Math.min(100, (hoursElapsed / slaHours) * 100);

  return {
    hoursElapsed,
    hoursRemaining,
    percentUsed,
    isOverdue: hoursElapsed >= slaHours,
    isEscalated: hoursElapsed >= slaHours,
  };
}

export function formatTimeAgo(date: string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatCountdown(hoursRemaining: number): string {
  if (hoursRemaining <= 0) return 'OVERDUE';
  const h = Math.floor(hoursRemaining);
  const m = Math.floor((hoursRemaining - h) * 60);
  return `${h}h ${m}m`;
}

// ---- Status helpers ----

export const STATUS_CONFIG: Record<
  TicketStatus,
  { label: string; color: string; bg: string; dot: string }
> = {
  open: {
    label: 'Open',
    color: 'text-red-600',
    bg: 'bg-red-50 border-red-200',
    dot: 'bg-red-500',
  },
  in_progress: {
    label: 'In Progress',
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
    dot: 'bg-amber-500',
  },
  resolved: {
    label: 'Resolved',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  escalated: {
    label: 'Escalated',
    color: 'text-purple-600',
    bg: 'bg-purple-50 border-purple-200',
    dot: 'bg-purple-500',
  },
};

export const PRIORITY_CONFIG: Record<
  TicketPriority,
  { label: string; color: string; bg: string }
> = {
  low: { label: 'Low', color: 'text-slate-600', bg: 'bg-slate-100' },
  medium: { label: 'Medium', color: 'text-blue-600', bg: 'bg-blue-100' },
  high: { label: 'High', color: 'text-orange-600', bg: 'bg-orange-100' },
  critical: { label: 'Critical', color: 'text-red-700', bg: 'bg-red-100' },
};

// Map pin colours by status
export const MAP_PIN_COLORS: Record<TicketStatus, string> = {
  open: '#ef4444',
  in_progress: '#f59e0b',
  resolved: '#10b981',
  escalated: '#a855f7',
};

// ---- File helpers ----

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function generateLocalTicketId(): string {
  const year = new Date().getFullYear();
  const num = Math.floor(Math.random() * 99999)
    .toString()
    .padStart(5, '0');
  return `DW-${year}-${num}`;
}

// ---- Reverse geocode (OpenStreetMap Nominatim, free) ----

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    return data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}
