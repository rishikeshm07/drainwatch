// ============================================================
// AI Severity Assessment Engine
// Primary:  Google Gemini Vision API (gemini-1.5-flash)
// Fallback: Rule-based heuristic simulation
// ============================================================

export interface SeverityResult {
  tag:        string;   // Human-readable severity label
  confidence: number;   // 0.0 – 1.0
  label:      SeverityLevel;
  raw:        unknown;  // Full API response (for debugging)
}

export type SeverityLevel = 'critical' | 'high' | 'moderate' | 'low' | 'unknown';

// ── Severity taxonomy ─────────────────────────────────────────
const SEVERITY_TAGS: Record<SeverityLevel, string[]> = {
  critical: ['Critical Waterlogging',  'Severe Canal Blockage',   'Overflowing Sewage'],
  high:     ['Severe Blockage',        'Heavy Debris Accumulation','Risk of Flooding'],
  moderate: ['Moderate Flooding Risk', 'Partial Blockage',         'Accumulated Debris'],
  low:      ['Minor Debris',           'Leaf Litter',              'Minor Obstruction'],
  unknown:  ['Unable to Assess'],
};

// Maps severity level to priority (for auto-priority assignment)
export const SEVERITY_TO_PRIORITY: Record<SeverityLevel, string> = {
  critical: 'critical',
  high:     'high',
  moderate: 'medium',
  low:      'low',
  unknown:  'medium',
};

// ── Main entry point ──────────────────────────────────────────
export async function assessSeverity(photo: File): Promise<SeverityResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey && apiKey !== 'your-gemini-api-key-here') {
    try {
      return await assessWithGemini(photo, apiKey);
    } catch (err) {
      console.warn('[AI] Gemini failed, falling back to heuristic:', err);
    }
  }

  return simulateSeverityAssessment(photo);
}

// ── Gemini Vision integration ─────────────────────────────────
async function assessWithGemini(photo: File, apiKey: string): Promise<SeverityResult> {
  const base64 = await fileToBase64(photo);
  const mimeType = photo.type || 'image/jpeg';

  const prompt = `You are an expert municipal drainage engineer analyzing a photo of a blocked drain or canal.

Analyze the image and return a JSON response with EXACTLY this structure:
{
  "severity_level": "<critical|high|moderate|low|unknown>",
  "severity_tag": "<concise label, max 5 words>",
  "confidence": <0.0-1.0>,
  "observations": ["<key observation 1>", "<key observation 2>"],
  "recommended_action": "<one sentence action>"
}

Severity guidelines:
- critical: Active flooding, sewage overflow, immediate public health risk
- high: Significant blockage, >75% flow obstruction, risk of imminent flooding
- moderate: Partial blockage, 30-75% obstruction, monitor closely
- low: Minor debris, <30% obstruction, routine maintenance
- unknown: Image unclear or not drain-related`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64.split(',')[1], // strip data: prefix
              },
            },
          ],
        }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1, // low temperature for consistent classification
          maxOutputTokens: 512,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errorText}`);
  }

  const geminiResponse = await response.json();
  const content = geminiResponse?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!content) throw new Error('Empty Gemini response');

  const parsed = JSON.parse(content) as {
    severity_level: SeverityLevel;
    severity_tag: string;
    confidence: number;
    observations: string[];
    recommended_action: string;
  };

  return {
    tag:        parsed.severity_tag,
    confidence: Math.min(1, Math.max(0, parsed.confidence)),
    label:      parsed.severity_level,
    raw:        { gemini: geminiResponse, parsed },
  };
}

// ── Heuristic simulation (no API key needed) ──────────────────
// Mimics what a vision model would return using file metadata + randomness
// weighted toward realistic distributions
export function simulateSeverityAssessment(photo?: File): SeverityResult {
  // Use file size as a weak signal (larger files = more complex scenes)
  const fileSize    = photo?.size ?? 0;
  const sizeKB      = fileSize / 1024;

  // Weighted probability distribution (mirrors real-world drain report data)
  const weights: Array<[SeverityLevel, number]> = [
    ['critical', 0.20],
    ['high',     0.30],
    ['moderate', 0.30],
    ['low',      0.18],
    ['unknown',  0.02],
  ];

  // Bias toward higher severity for larger images (more detail captured)
  let biasedWeights = [...weights];
  if (sizeKB > 2000) {
    biasedWeights = [
      ['critical', 0.30],
      ['high',     0.35],
      ['moderate', 0.25],
      ['low',      0.08],
      ['unknown',  0.02],
    ];
  }

  const level = weightedRandom(biasedWeights);
  const tags  = SEVERITY_TAGS[level];
  const tag   = tags[Math.floor(Math.random() * tags.length)];

  // Confidence varies by severity: critical/high tend to be more certain
  const confRanges: Record<SeverityLevel, [number, number]> = {
    critical: [0.85, 0.97],
    high:     [0.78, 0.93],
    moderate: [0.70, 0.88],
    low:      [0.65, 0.85],
    unknown:  [0.40, 0.60],
  };
  const [min, max] = confRanges[level];
  const confidence = parseFloat((min + Math.random() * (max - min)).toFixed(2));

  return {
    tag,
    confidence,
    label: level,
    raw: {
      method: 'simulation',
      note:   'Set GEMINI_API_KEY in .env.local to enable real AI assessment',
      inputs: { fileSizeKB: Math.round(sizeKB), mimeType: photo?.type },
    },
  };
}

// ── Helpers ───────────────────────────────────────────────────
function weightedRandom<T>(weights: Array<[T, number]>): T {
  const total = weights.reduce((sum, [, w]) => sum + w, 0);
  let rand    = Math.random() * total;
  for (const [value, weight] of weights) {
    rand -= weight;
    if (rand <= 0) return value;
  }
  return weights[weights.length - 1][0];
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Ward-routing helper (pure JS fallback) ────────────────────
// Used when PostGIS is unavailable (dev mode / no Supabase)
export interface SimpleWardBoundary {
  id: string;
  ward_number: number;
  ward_name: string;
  minLat: number; maxLat: number;
  minLng: number; maxLng: number;
}

export function findWardByBoundingBox(
  lat: number,
  lng: number,
  wards: SimpleWardBoundary[]
): SimpleWardBoundary | null {
  return wards.find(w =>
    lat >= w.minLat && lat <= w.maxLat &&
    lng >= w.minLng && lng <= w.maxLng
  ) ?? null;
}

// Demo ward bounding boxes — Kerala locations
export const DEMO_WARD_BOUNDS: SimpleWardBoundary[] = [
  { id: 'w1', ward_number: 1, ward_name: 'Thiruvananthapuram', minLat: 8.40,  maxLat: 8.60,  minLng: 76.85, maxLng: 77.10 },
  { id: 'w2', ward_number: 2, ward_name: 'Kochi Ernakulam',    minLat: 9.85,  maxLat: 10.10, minLng: 76.15, maxLng: 76.45 },
  { id: 'w3', ward_number: 3, ward_name: 'Kozhikode City',     minLat: 11.15, maxLat: 11.40, minLng: 75.70, maxLng: 75.90 },
  { id: 'w4', ward_number: 4, ward_name: 'Thrissur',           minLat: 10.45, maxLat: 10.65, minLng: 76.10, maxLng: 76.35 },
  { id: 'w5', ward_number: 5, ward_name: 'Kollam',             minLat: 8.80,  maxLat: 9.00,  minLng: 76.55, maxLng: 76.70 },
];
