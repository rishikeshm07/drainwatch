// ============================================================
// Escalation Engine — Client-side helpers + Server trigger logic
// ============================================================
import { differenceInHours } from 'date-fns';
import type { Ticket } from '@/types';

export interface EscalationCheck {
  shouldEscalate: boolean;
  hoursOverdue:   number;
  escalationTarget: string;
  reason: string;
}

// Escalation authority hierarchy
const ESCALATION_CHAIN = [
  'Ward Officer',
  'Zone Supervisor',
  'Municipal Commissioner Office',
  'State Urban Development Authority',
];

// ── Check if a single ticket should be escalated ─────────────
export function checkEscalation(ticket: Ticket): EscalationCheck {
  if (ticket.status === 'resolved' || ticket.status === 'escalated') {
    return {
      shouldEscalate: false,
      hoursOverdue:   0,
      escalationTarget: '',
      reason: 'Ticket already resolved or escalated',
    };
  }

  const hoursElapsed = differenceInHours(new Date(), new Date(ticket.created_at));
  const hoursOverdue = Math.max(0, hoursElapsed - ticket.sla_hours);
  const shouldEscalate = hoursElapsed >= ticket.sla_hours;

  // Determine escalation level based on how overdue it is
  let escalationLevel = 1; // Default: Zone Supervisor
  if (hoursOverdue >= 72)  escalationLevel = 3; // State authority
  else if (hoursOverdue >= 24) escalationLevel = 2; // Commissioner

  return {
    shouldEscalate,
    hoursOverdue,
    escalationTarget: ESCALATION_CHAIN[escalationLevel] ?? ESCALATION_CHAIN[1],
    reason: shouldEscalate
      ? `SLA of ${ticket.sla_hours}h exceeded by ${hoursOverdue}h`
      : `${ticket.sla_hours - hoursElapsed}h remaining`,
  };
}

// ── Batch escalation — returns tickets that need escalation ───
export function getTicketsForEscalation(tickets: Ticket[]): Array<{
  ticket: Ticket;
  check: EscalationCheck;
}> {
  return tickets
    .map(ticket => ({ ticket, check: checkEscalation(ticket) }))
    .filter(({ check }) => check.shouldEscalate);
}

// ── Client-side trigger (calls the API route) ─────────────────
export async function triggerEscalationJob(secret?: string): Promise<{
  escalated_count: number;
  escalated_tickets: string[];
}> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (secret) headers['x-cron-secret'] = secret;

  const res = await fetch('/api/escalate', { method: 'POST', headers });
  if (!res.ok) throw new Error(`Escalation job failed: ${res.statusText}`);
  return res.json();
}

// ── SLA urgency color (for visual timers) ────────────────────
export type SLAUrgency = 'safe' | 'warning' | 'danger' | 'breach';

export function getSLAUrgency(percentUsed: number): SLAUrgency {
  if (percentUsed >= 100) return 'breach';
  if (percentUsed >= 75)  return 'danger';
  if (percentUsed >= 50)  return 'warning';
  return 'safe';
}

export const SLA_URGENCY_STYLES: Record<SLAUrgency, { bar: string; text: string; bg: string }> = {
  safe:    { bar: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50'  },
  warning: { bar: 'bg-amber-500',   text: 'text-amber-700',   bg: 'bg-amber-50'    },
  danger:  { bar: 'bg-orange-500',  text: 'text-orange-700',  bg: 'bg-orange-50'   },
  breach:  { bar: 'bg-red-500',     text: 'text-red-700',     bg: 'bg-red-50'      },
};
