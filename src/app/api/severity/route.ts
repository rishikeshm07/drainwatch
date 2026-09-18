import { NextRequest, NextResponse } from 'next/server';
import { assessSeverity } from '@/lib/ai-severity';

// ── POST /api/severity ─────────────────────────────────────────
// Accepts multipart/form-data with a "photo" file
// Returns AI severity assessment from Gemini Vision (or mock)
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const photo    = formData.get('photo') as File | null;

    if (!photo) {
      return NextResponse.json({ error: 'photo is required' }, { status: 400 });
    }

    const result = await assessSeverity(photo);

    return NextResponse.json({
      tag:        result.tag,
      confidence: result.confidence,
      label:      result.label,
      raw:        result.raw,
      assessed_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[POST /api/severity]', err);
    return NextResponse.json({ error: 'Severity assessment failed' }, { status: 500 });
  }
}
