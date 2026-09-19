import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const photo = formData.get('photo') as File | null;
    if (!photo) return NextResponse.json({ error: 'photo is required' }, { status: 400 });
    const { assessSeverity } = await import('@/lib/ai-severity');
    const result = await assessSeverity(photo);
    return NextResponse.json({ tag: result.tag, confidence: result.confidence, label: result.label, assessed_at: new Date().toISOString() });
  } catch (err) {
    console.error('[POST /api/severity]', err);
    return NextResponse.json({ tag: 'Unable to Assess', confidence: 0.5, label: 'unknown' });
  }
}
