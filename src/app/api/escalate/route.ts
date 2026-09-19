import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      return NextResponse.json({ escalated_count: 0, method: 'mock', note: 'Supabase not configured' });
    }
    const { createAdminClient } = await import('@/lib/supabase');
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc('escalate_overdue_tickets');
    if (error) throw error;
    return NextResponse.json({ escalated_count: data ?? 0, method: 'rpc' });
  } catch (err) {
    console.error('[POST /api/escalate]', err);
    return NextResponse.json({ escalated_count: 0, error: 'Escalation skipped' }, { status: 200 });
  }
}

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      return NextResponse.json({ overdue_count: 0, overdue: [], note: 'Supabase not configured' });
    }
    const { createAdminClient } = await import('@/lib/supabase');
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('tickets')
      .select('id, ticket_number, title, ward_number, created_at, sla_hours, status')
      .in('status', ['open', 'in_progress'])
      .order('created_at', { ascending: true });
    if (error) throw error;
    const now = Date.now();
    const overdue = (data ?? []).filter(t => {
      const ageMs = now - new Date(t.created_at).getTime();
      return ageMs > t.sla_hours * 3600 * 1000;
    });
    return NextResponse.json({ overdue_count: overdue.length, overdue });
  } catch (err) {
    console.error('[GET /api/escalate]', err);
    return NextResponse.json({ overdue_count: 0, overdue: [] });
  }
}
