// ============================================================
// Local ticket store — persists to localStorage
// Acts as the data layer when Supabase is not configured
// ============================================================
import type { Ticket } from '@/types';
import { MOCK_TICKETS } from './mock-data';

const STORAGE_KEY = 'drainwatch_tickets';

export function getAllTickets(): Ticket[] {
  if (typeof window === 'undefined') return MOCK_TICKETS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const stored: Ticket[] = raw ? JSON.parse(raw) : [];
    // Merge mock tickets + user-submitted tickets (deduplicate by id)
    const ids = new Set(stored.map(t => t.id));
    const merged = [
      ...stored,
      ...MOCK_TICKETS.filter(t => !ids.has(t.id)),
    ];
    return merged.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  } catch {
    return MOCK_TICKETS;
  }
}

export function getTicketById(idOrNumber: string): Ticket | null {
  const all = getAllTickets();
  return (
    all.find(
      t =>
        t.id === idOrNumber ||
        t.ticket_number.toUpperCase() === idOrNumber.toUpperCase()
    ) ?? null
  );
}

export function saveTicket(ticket: Ticket): void {
  if (typeof window === 'undefined') return;
  try {
    const raw     = localStorage.getItem(STORAGE_KEY);
    const stored: Ticket[] = raw ? JSON.parse(raw) : [];
    // Replace if exists, else prepend
    const idx = stored.findIndex(t => t.id === ticket.id);
    if (idx >= 0) stored[idx] = ticket;
    else stored.unshift(ticket);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch (e) {
    console.warn('Could not save ticket to localStorage', e);
  }
}

export function updateTicketStatus(
  ticketId: string,
  status: Ticket['status'],
  extra: Partial<Ticket> = {}
): Ticket | null {
  const ticket = getTicketById(ticketId);
  if (!ticket) return null;
  const updated: Ticket = {
    ...ticket,
    ...extra,
    status,
    updated_at: new Date().toISOString(),
    resolved_at:
      status === 'resolved' ? new Date().toISOString() : ticket.resolved_at,
  };
  saveTicket(updated);
  return updated;
}

export function generateTicketNumber(): string {
  const year    = new Date().getFullYear();
  const all     = getAllTickets();
  // Find highest existing number and increment
  const max = all
    .map(t => parseInt(t.ticket_number.split('-')[2] ?? '0', 10))
    .reduce((a, b) => Math.max(a, b), 0);
  return `DW-${year}-${String(max + 1).padStart(5, '0')}`;
}
