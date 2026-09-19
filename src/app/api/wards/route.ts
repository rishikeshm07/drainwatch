import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      return NextResponse.json({ wards: [] });
    }
    const { createAdminClient } = await import('@/lib/supabase');
    const supabase = createAdminClient();
    const { data, error } = await supabase.from('wards').select('id, ward_number, ward_name, zone, authority_name, authority_email').order('ward_number');
    if (error) throw error;
    return NextResponse.json({ wards: data ?? [] });
  } catch (err) {
    return NextResponse.json({ wards: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { lat, lng } = await req.json() as { lat: number; lng: number };
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json({ error: 'lat and lng required' }, { status: 400 });
    }
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      return NextResponse.json({ ward: null, method: 'fallback' });
    }
    const { createAdminClient } = await import('@/lib/supabase');
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc('find_ward_for_point', { point_lat: lat, point_lng: lng });
    if (error) return NextResponse.json({ ward: null, method: 'fallback' });
    return NextResponse.json({ ward: data?.[0] ?? null, method: 'postgis' });
  } catch (err) {
    return NextResponse.json({ ward: null, method: 'error' });
  }
}
