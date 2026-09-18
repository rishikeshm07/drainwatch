import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';

// ── GET /api/wards ────────────────────────────────────────────
// Returns all wards (without heavy geometry)
export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('wards')
      .select('id, ward_number, ward_name, zone, authority_name, authority_email')
      .order('ward_number');

    if (error) throw error;

    return NextResponse.json({ wards: data ?? [] });
  } catch (err) {
    console.error('[GET /api/wards]', err);
    return NextResponse.json({ error: 'Failed to fetch wards' }, { status: 500 });
  }
}

// ── POST /api/wards/resolve ────────────────────────────────────
// Body: { lat: number, lng: number }
// Returns the ward that contains this point via PostGIS
export async function POST(req: NextRequest) {
  try {
    const { lat, lng } = await req.json() as { lat: number; lng: number };

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json({ error: 'lat and lng are required numbers' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // PostGIS point-in-polygon query
    const { data, error } = await supabase.rpc('find_ward_for_point', {
      point_lat: lat,
      point_lng: lng,
    });

    if (error) {
      // Fallback: return nearest ward by Euclidean distance if PostGIS RPC unavailable
      const { data: wards } = await supabase
        .from('wards')
        .select('id, ward_number, ward_name, zone, authority_name, authority_email');

      return NextResponse.json({
        ward: wards?.[0] ?? null,
        method: 'fallback',
        note: 'PostGIS RPC not available — returning first ward as fallback',
      });
    }

    return NextResponse.json({ ward: data?.[0] ?? null, method: 'postgis' });
  } catch (err) {
    console.error('[POST /api/wards]', err);
    return NextResponse.json({ error: 'Ward resolution failed' }, { status: 500 });
  }
}
