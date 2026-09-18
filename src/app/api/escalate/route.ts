import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';

// ── POST /api/escalate ────────────────────────────────────────
// Called by a cron job (e.g. Vercel Cron, pg_cron, or manual trigger)
// Finds all tickets older than their SLA window and escalates them
export async function POST(req: NextRequest) {
  // Protect the endpoint with a secret header in production
  const authHeader = req.headers.get('x-cron-secret');
  const expected   = process.env.CRON_SECRET;
  if (expected && authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();

    // Call the stored procedure we defined in schema.sql
    const { data, error } = await supabase.rpc('escalate_overdue_tickets');

    if (error) {
      // Fallback: manual escalation logic in JS if RPC fails
      const { data: overdue, error: fetchError } = await supabase
        .from('tickets')
        .select('id, ticket_number, sla_hours, created_at, ward_number')
        .in('status', ['open', 'in_progress'])
        .lt('created_at', new Date(Date.now() - 48 * 3600 * 1000).toISOString());

      if (fetchError) throw fetchError;

      const escalated = [];
      for (const ticket of overdue ?? []) {
        const slaMs  = ticket.sla_hours * 3600 * 1000;
        const ageMs  = Date.now() - new Date(ticket.created_at).getTime();
        if (ageMs < slaMs) continue;

        const { error: updateError } = await supabase
          .from('tickets')
          .update({
            status:       'escalated',
            escalated_at: new Date().toISOString(),
            escalated_to: 'Municipal Commissioner Office',
          })
          .eq('id', ticket.id);

        if (!updateError) {
          await supabase.from('ticket_events').insert({
            ticket_id:  ticket.id,
            event_type: 'escalated',
            new_value:  'escalated',
            actor_name: 'System',
            note:       `Auto-escalated: SLA of ${ticket.sla_hours}h exceeded`,
          });
          escalated.push(ticket.ticket_number);
        }
      }

      return NextResponse.json({
        escalated_count: escalated.length,
        escalated_tickets: escalated,
        method: 'fallback',
      });
    }

    return NextResponse.json({
      escalated_count: data ?? 0,
      method: 'rpc',
    });
  } catch (err) {
    console.error('[POST /api/escalate]', err);
    return NextResponse.json({ error: 'Escalation job failed' }, { status: 500 });
  }
}

// ── GET /api/escalate ─────────────────────────────────────────
// Returns tickets that are currently overdue (for the dashboard alert)
export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('tickets')
      .select('id, ticket_number, title, ward_number, created_at, sla_hours, status')
      .in('status', ['open', 'in_progress'])
      .order('created_at', { ascending: true });

    if (error) throw error;

    const now      = Date.now();
    const overdue  = (data ?? []).filter(t => {
      const ageMs = now - new Date(t.created_at).getTime();
      return ageMs > t.sla_hours * 3600 * 1000;
    });

    return NextResponse.json({ overdue_count: overdue.length, overdue });
  } catch (err) {
    console.error('[GET /api/escalate]', err);
    return NextResponse.json({ error: 'Failed to fetch overdue tickets' }, { status: 500 });
  }
}
