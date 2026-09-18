# 🌊 DrainWatch — Canal & Storm-Drain Blockage Reporter

> **Hackathon Project** · Full-Stack · Next.js 14 · Supabase · Leaflet · AI-Powered

A two-portal civic-tech web app that lets citizens report blocked drains and municipal officers triage + resolve them — with AI severity tagging, auto ward-routing, and 48h SLA escalation.

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js ≥ 18
- npm / pnpm
- A [Supabase](https://supabase.com) project (free tier works)

### 2. Install dependencies
```bash
cd drainwatch
npm install
```

### 3. Configure environment
```bash
cp .env.example .env.local
```
Edit `.env.local` and fill in:
| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project Settings → API (secret) |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Not required — app uses free OpenStreetMap/CARTO tiles |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com) (optional) |

### 4. Set up Supabase database
In your Supabase project → **SQL Editor**, run these two files in order:
1. `supabase/schema.sql` — tables, triggers, RLS, sample data
2. `supabase/functions.sql` — PostGIS RPC helpers

### 5. Create Supabase Storage bucket
In Supabase → **Storage**, create a bucket named `drainwatch-photos` and set it to **public**.

### 6. Run the development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

---

## 📱 Consumer Portal (`/`)

| Page | Route | Description |
|---|---|---|
| Landing / Live Map | `/` | Hero, city stats, colour-coded public map, ticket list |
| Report Blockage | `/report` | 4-step wizard with camera capture, GPS, AI severity |
| Track Report | `/track?id=DW-2026-XXXXX` | Status, timeline, SLA timer, before/after slider |

**Demo flow:**
1. Go to `/report` → tap "Tap to take a photo" → allow camera
2. Allow location or drop a pin on the map
3. Fill in title → submit
4. Copy ticket ID → go to `/track` and paste it

---

## 🏛️ Government Portal (`/gov`)

| Page | Route | Description |
|---|---|---|
| Login | `/gov/login` | Auth with demo credentials |
| Dashboard | `/gov/dashboard` | Split-pane Kanban + live map, drag-and-drop |

**Demo credentials:**
| Email | Password | Role |
|---|---|---|
| `ward1@municipality.gov` | `ward1pass` | Ward Officer – Andheri West |
| `ward3@municipality.gov` | `ward3pass` | Ward Officer – Bandra |
| `admin@municipality.gov` | `adminpass` | Admin – All Wards |

**Dashboard features:**
- **Split View** (default): Kanban board left, live map right
- **Drag & Drop**: move tickets between New → In Progress → Resolved
- **Ticket Drawer**: click any card for SLA timer, AI assessment, before/after photo slider, status update, resolution notes
- **Auto-escalation**: tickets overdue > 48h are flagged purple with "ESCALATED" banner

---

## 🗃️ Project Structure

```
drainwatch/
├── src/
│   ├── app/
│   │   ├── (consumer)/          # Public portal routes
│   │   │   ├── page.tsx         # Landing page + live map
│   │   │   ├── report/          # 4-step report wizard
│   │   │   └── track/           # Ticket tracker
│   │   ├── (government)/        # Gov portal routes
│   │   │   ├── login/           # Auth page
│   │   │   └── dashboard/       # Split Kanban+Map dashboard
│   │   └── api/
│   │       ├── tickets/         # GET (list), POST (create)
│   │       ├── tickets/[id]/    # GET, PATCH, DELETE
│   │       ├── wards/           # GET (list), POST (resolve point→ward)
│   │       ├── escalate/        # GET (overdue), POST (cron job)
│   │       └── severity/        # POST (AI image assessment)
│   ├── components/
│   │   ├── ui/                  # Base: Button, Card, Input, Toast…
│   │   ├── maps/                # PublicMap, PinDropMap (Leaflet)
│   │   └── tickets/             # TicketCard, SLATimer, SeverityBadge, BeforeAfterSlider
│   ├── lib/
│   │   ├── supabase.ts          # Supabase client
│   │   ├── utils.ts             # cn(), getSLAInfo(), reverseGeocode()…
│   │   ├── ai-severity.ts       # Gemini Vision + heuristic fallback
│   │   ├── escalation.ts        # SLA checking + escalation helpers
│   │   └── mock-data.ts         # 5 seed tickets for offline dev
│   └── types/index.ts           # All shared TypeScript types
├── supabase/
│   ├── schema.sql               # Tables, triggers, RLS, sample wards
│   └── functions.sql            # PostGIS RPCs, ward stats
├── vercel.json                  # Hourly escalation cron job
└── .env.local                   # Your secrets (not committed)
```

---

## ⚙️ Architecture

```
Browser
  ↓ POST /api/tickets (multipart)
  ↓ → Upload photo → Supabase Storage
  ↓ → AI assess → Gemini Vision API (or mock)
  ↓ → INSERT ticket → Supabase PostgreSQL
  ↓   ↳ DB trigger: auto-assign ward via PostGIS ST_Contains()
  ↓   ↳ DB trigger: generate ticket number DW-YYYY-NNNNN
  ↓ ← 201 { ticket_number, ward_id, ai_severity_tag }

Vercel Cron (every hour)
  → POST /api/escalate
  → UPDATE tickets SET status='escalated' WHERE age > sla_hours
  → INSERT ticket_events (audit log)
```

---

## 🤖 AI Severity Assessment

`src/lib/ai-severity.ts` implements a two-path strategy:

1. **Real (Gemini 1.5 Flash)**: When `GEMINI_API_KEY` is set, encodes the image as base64 and sends a structured prompt to the vision model. Returns `severity_level`, `severity_tag`, `confidence`, and `observations`.

2. **Simulation fallback**: When no API key is present, uses file size as a weak heuristic and weighted-random selection from the severity taxonomy to return a realistic mock result. Useful for hackathon demos without billing.

Severity levels → priority mapping:
| Level | Tag example | Auto priority |
|---|---|---|
| critical | "Critical Waterlogging" | critical |
| high | "Severe Blockage" | high |
| moderate | "Partial Blockage" | medium |
| low | "Minor Debris" | low |

---

## ⏱️ SLA & Escalation

- Default SLA: **48 hours** per ticket (configurable per ticket in DB)
- `SLATimer` component shows a live countdown that updates every 60s
- Progress bar: green → amber (75%) → red (100%/breach)
- Cron job at `/api/escalate` runs hourly (Vercel Cron config in `vercel.json`)
- Escalation chain: Ward Officer → Zone Supervisor → Commissioner → State Authority

---

## 🗺️ Map Technology

- **Leaflet** + **react-leaflet** with free **CARTO Voyager** tiles (no API key needed)
- `PublicMap`: plots all tickets with colour-coded SVG pins, popup on click, pan-to-selected
- `PinDropMap`: click/drag to drop a pin, calls reverse geocode via Nominatim (free)
- PostGIS `ST_Contains()` on the backend resolves which ward a pin falls inside

---

## 🚀 Deployment (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Set the same environment variables from `.env.local` in your Vercel project settings. The cron job in `vercel.json` will run automatically on the Pro plan or above.

---

## 📄 License
MIT — built for civic good at a hackathon. Feel free to fork and adapt.
