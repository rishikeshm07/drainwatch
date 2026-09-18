import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { assessSeverity } from '@/lib/ai-severity';

// ── GET /api/tickets ─────────────────────────────────────────
// Query params: status, ward_number, limit, offset
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status      = searchParams.get('status');
    const wardNumber  = searchParams.get('ward_number');
    const limit       = parseInt(searchParams.get('limit') ?? '50');
    const offset      = parseInt(searchParams.get('offset') ?? '0');

    const supabase = createAdminClient();

    let query = supabase
      .from('tickets')
      .select(`*, ward:wards(id, ward_number, ward_name, zone, authority_name, authority_email)`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status)     query = query.eq('status', status);
    if (wardNumber) query = query.eq('ward_number', parseInt(wardNumber));

    const { data, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({ tickets: data ?? [], count, limit, offset });
  } catch (err) {
    console.error('[GET /api/tickets]', err);
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 });
  }
}

// ── POST /api/tickets ────────────────────────────────────────
// Accepts multipart/form-data with photo + fields
export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const formData = await req.formData();

    // Extract fields
    const title         = formData.get('title') as string;
    const description   = formData.get('description') as string | null;
    const latitude      = parseFloat(formData.get('latitude') as string);
    const longitude     = parseFloat(formData.get('longitude') as string);
    const address       = formData.get('address') as string | null;
    const reporterName  = formData.get('reporter_name') as string | null;
    const reporterPhone = formData.get('reporter_phone') as string | null;
    const reporterEmail = formData.get('reporter_email') as string | null;
    const photo         = formData.get('photo') as File | null;

    // Basic validation
    if (!title || isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { error: 'title, latitude, and longitude are required' },
        { status: 400 }
      );
    }

    // ── 1. Upload photo to Supabase Storage ──────────────────
    let photoUrl: string | null = null;
    if (photo) {
      const ext      = photo.name.split('.').pop() ?? 'jpg';
      const fileName = `tickets/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const buffer   = Buffer.from(await photo.arrayBuffer());

      const { error: uploadError } = await supabase.storage
        .from('drainwatch-photos')
        .upload(fileName, buffer, { contentType: photo.type, upsert: false });

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('drainwatch-photos')
          .getPublicUrl(fileName);
        photoUrl = urlData.publicUrl;
      }
    }

    // ── 2. AI Severity Assessment ────────────────────────────
    let aiTag: string | null = formData.get('ai_severity_tag') as string | null;
    let aiConf: number | null = formData.get('ai_confidence')
      ? parseFloat(formData.get('ai_confidence') as string)
      : null;

    // If not pre-assessed (client didn't send), run server-side assessment
    if (!aiTag && photo) {
      const aiResult = await assessSeverity(photo);
      aiTag  = aiResult.tag;
      aiConf = aiResult.confidence;
    }

    // ── 3. Insert ticket (ward auto-assigned via DB trigger) ─
    const { data: ticket, error: insertError } = await supabase
      .from('tickets')
      .insert({
        title,
        description,
        latitude,
        longitude,
        address,
        photo_url:       photoUrl,
        reporter_name:   reporterName,
        reporter_phone:  reporterPhone,
        reporter_email:  reporterEmail,
        ai_severity_tag: aiTag,
        ai_confidence:   aiConf,
        status:          'open',
        sla_hours:       48,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // ── 4. Log creation event ─────────────────────────────────
    await supabase.from('ticket_events').insert({
      ticket_id:  ticket.id,
      event_type: 'created',
      new_value:  'open',
      actor_name: 'System',
      note:       `Report submitted${reporterName ? ` by ${reporterName}` : ' anonymously'}`,
    });

    return NextResponse.json(ticket, { status: 201 });
  } catch (err) {
    console.error('[POST /api/tickets]', err);
    return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 });
  }
}
