import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';

// ── GET /api/tickets/[id] ────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createAdminClient();
    const isTicketNumber = params.id.startsWith('DW-');

    let query = supabase
      .from('tickets')
      .select(`*, ward:wards(*), events:ticket_events(*)`)
      .order('created_at', { foreignTable: 'ticket_events', ascending: true });

    if (isTicketNumber) {
      query = query.eq('ticket_number', params.id);
    } else {
      query = query.eq('id', params.id);
    }

    const { data, error } = await query.single();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });

    return NextResponse.json(data);
  } catch (err) {
    console.error('[GET /api/tickets/:id]', err);
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
  }
}

// ── PATCH /api/tickets/[id] ──────────────────────────────────
// Accepts JSON body with fields to update
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createAdminClient();
    const body = await req.json() as Record<string, unknown>;

    // Only allow updating safe fields
    const ALLOWED = [
      'status', 'priority', 'assigned_officer_id', 'assigned_officer_name',
      'resolution_notes', 'resolved_photo_url', 'resolved_at',
      'escalated_at', 'escalated_to', 'sla_hours',
    ];

    const updates: Record<string, unknown> = {};
    for (const key of ALLOWED) {
      if (key in body) updates[key] = body[key];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Auto-set resolved_at when status changes to resolved
    if (updates.status === 'resolved' && !updates.resolved_at) {
      updates.resolved_at = new Date().toISOString();
    }

    const { data: ticket, error } = await supabase
      .from('tickets')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    // Log the status change event
    if (updates.status) {
      await supabase.from('ticket_events').insert({
        ticket_id:  params.id,
        event_type: 'status_change',
        new_value:  updates.status as string,
        actor_name: (body.actor_name as string) ?? 'Officer',
        note:       (body.note as string) ?? undefined,
      });
    }

    return NextResponse.json(ticket);
  } catch (err) {
    console.error('[PATCH /api/tickets/:id]', err);
    return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 });
  }
}

// ── DELETE /api/tickets/[id] ─────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from('tickets').delete().eq('id', params.id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/tickets/:id]', err);
    return NextResponse.json({ error: 'Failed to delete ticket' }, { status: 500 });
  }
}
