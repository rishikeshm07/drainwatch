import { NextRequest, NextResponse } from 'next/server';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }
    const { createAdminClient } = await import('@/lib/supabase');
    const supabase = createAdminClient();
    const isTicketNumber = params.id.startsWith('DW-');
    let query = supabase.from('tickets').select('*, ward:wards(*), events:ticket_events(*)');
    if (isTicketNumber) query = query.eq('ticket_number', params.id);
    else query = query.eq('id', params.id);
    const { data, error } = await query.single();
    if (error || !data) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      return NextResponse.json({ success: true, note: 'Supabase not configured' });
    }
    const { createAdminClient } = await import('@/lib/supabase');
    const supabase = createAdminClient();
    const body = await req.json();
    const ALLOWED = ['status','priority','assigned_officer_id','assigned_officer_name','resolution_notes','resolved_photo_url','resolved_at','escalated_at','escalated_to','sla_hours'];
    const updates: Record<string, unknown> = {};
    for (const key of ALLOWED) { if (key in body) updates[key] = body[key]; }
    if (updates.status === 'resolved' && !updates.resolved_at) updates.resolved_at = new Date().toISOString();
    const { data, error } = await supabase.from('tickets').update(updates).eq('id', params.id).select().single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      return NextResponse.json({ success: true });
    }
    const { createAdminClient } = await import('@/lib/supabase');
    const supabase = createAdminClient();
    await supabase.from('tickets').delete().eq('id', params.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
