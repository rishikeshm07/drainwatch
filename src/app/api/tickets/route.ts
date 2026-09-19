import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      return NextResponse.json({ tickets: [], count: 0, note: 'Supabase not configured — using local data' });
    }
    const { createAdminClient } = await import('@/lib/supabase');
    const supabase = createAdminClient();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const wardNumber = searchParams.get('ward_number');
    const limit = parseInt(searchParams.get('limit') ?? '50');
    const offset = parseInt(searchParams.get('offset') ?? '0');
    let query = supabase
      .from('tickets')
      .select('*, ward:wards(id, ward_number, ward_name, zone, authority_name, authority_email)')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (status) query = query.eq('status', status);
    if (wardNumber) query = query.eq('ward_number', parseInt(wardNumber));
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ tickets: data ?? [], limit, offset });
  } catch (err) {
    console.error('[GET /api/tickets]', err);
    return NextResponse.json({ tickets: [], error: 'Failed to fetch tickets' }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      return NextResponse.json({ ticket_number: `DW-${new Date().getFullYear()}-${String(Math.floor(Math.random()*99999)).padStart(5,'0')}`, note: 'Supabase not configured' }, { status: 201 });
    }
    const { createAdminClient } = await import('@/lib/supabase');
    const { assessSeverity } = await import('@/lib/ai-severity');
    const supabase = createAdminClient();
    const formData = await req.formData();
    const title = formData.get('title') as string;
    const latitude = parseFloat(formData.get('latitude') as string);
    const longitude = parseFloat(formData.get('longitude') as string);
    if (!title || isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json({ error: 'title, latitude, and longitude are required' }, { status: 400 });
    }
    const photo = formData.get('photo') as File | null;
    let photoUrl: string | null = null;
    if (photo) {
      const ext = photo.name.split('.').pop() ?? 'jpg';
      const fileName = `tickets/${Date.now()}.${ext}`;
      const buffer = Buffer.from(await photo.arrayBuffer());
      const { error: uploadError } = await supabase.storage.from('drainwatch-photos').upload(fileName, buffer, { contentType: photo.type });
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('drainwatch-photos').getPublicUrl(fileName);
        photoUrl = urlData.publicUrl;
      }
    }
    let aiTag = formData.get('ai_severity_tag') as string | null;
    let aiConf = formData.get('ai_confidence') ? parseFloat(formData.get('ai_confidence') as string) : null;
    if (!aiTag && photo) {
      const result = await assessSeverity(photo);
      aiTag = result.tag; aiConf = result.confidence;
    }
    const { data: ticket, error } = await supabase.from('tickets').insert({
      title, description: formData.get('description'), latitude, longitude,
      address: formData.get('address'), photo_url: photoUrl,
      reporter_name: formData.get('reporter_name'), reporter_phone: formData.get('reporter_phone'),
      reporter_email: formData.get('reporter_email'), ai_severity_tag: aiTag,
      ai_confidence: aiConf, status: 'open', sla_hours: 48,
    }).select().single();
    if (error) throw error;
    return NextResponse.json(ticket, { status: 201 });
  } catch (err) {
    console.error('[POST /api/tickets]', err);
    return NextResponse.json({ ticket_number: `DW-${new Date().getFullYear()}-${String(Math.floor(Math.random()*99999)).padStart(5,'0')}` }, { status: 201 });
  }
}
