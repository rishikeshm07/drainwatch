-- ============================================================
-- DrainWatch Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable PostGIS for spatial queries
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- WARDS TABLE
-- Stores municipal ward boundaries as GeoJSON polygons
-- ============================================================
CREATE TABLE IF NOT EXISTS wards (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ward_number   INTEGER NOT NULL UNIQUE,
  ward_name     TEXT NOT NULL,
  zone          TEXT,                          -- e.g. "North Zone", "South Zone"
  authority_email TEXT,                        -- email of ward officer
  authority_name  TEXT,
  boundary      GEOMETRY(POLYGON, 4326),       -- PostGIS polygon in WGS84
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Spatial index on ward boundaries for fast point-in-polygon queries
CREATE INDEX IF NOT EXISTS wards_boundary_idx ON wards USING GIST (boundary);

-- ============================================================
-- TICKETS TABLE
-- Core report table for drain/canal blockage reports
-- ============================================================
CREATE TABLE IF NOT EXISTS tickets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number   TEXT NOT NULL UNIQUE,         -- human-readable e.g. DW-2024-00001
  title           TEXT NOT NULL,
  description     TEXT,

  -- Location
  latitude        DOUBLE PRECISION NOT NULL,
  longitude       DOUBLE PRECISION NOT NULL,
  location_point  GEOMETRY(POINT, 4326)         -- PostGIS point, auto-populated via trigger
                  GENERATED ALWAYS AS (
                    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
                  ) STORED,
  address         TEXT,                         -- reverse-geocoded address

  -- Ward assignment (auto-calculated from lat/lng via PostGIS)
  ward_id         UUID REFERENCES wards(id) ON DELETE SET NULL,
  ward_number     INTEGER,

  -- Status & workflow
  status          TEXT NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open', 'in_progress', 'resolved', 'escalated')),
  priority        TEXT NOT NULL DEFAULT 'medium'
                  CHECK (priority IN ('low', 'medium', 'high', 'critical')),

  -- AI Severity Assessment (Gemini Vision placeholder)
  ai_severity_tag TEXT,                         -- e.g. "Critical Waterlogging", "Minor Debris"
  ai_confidence   REAL,                         -- 0.0 to 1.0
  ai_raw_response JSONB,                        -- full AI response stored as JSON

  -- Media
  photo_url       TEXT,                         -- original blockage photo URL (Supabase Storage)
  resolved_photo_url TEXT,                      -- "after" photo uploaded by ward officer

  -- Reporter info (anonymous by default)
  reporter_name   TEXT,
  reporter_phone  TEXT,
  reporter_email  TEXT,

  -- Government / responder info
  assigned_officer_id UUID,                     -- FK to profiles table
  assigned_officer_name TEXT,
  resolution_notes TEXT,

  -- SLA & Escalation tracking
  sla_hours       INTEGER NOT NULL DEFAULT 48,  -- SLA window in hours
  escalated_at    TIMESTAMPTZ,                  -- when it was escalated
  escalated_to    TEXT,                         -- higher authority name/email
  resolved_at     TIMESTAMPTZ,

  -- Metadata
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Spatial index on ticket location points
CREATE INDEX IF NOT EXISTS tickets_location_idx ON tickets USING GIST (location_point);
CREATE INDEX IF NOT EXISTS tickets_ward_id_idx  ON tickets (ward_id);
CREATE INDEX IF NOT EXISTS tickets_status_idx   ON tickets (status);
CREATE INDEX IF NOT EXISTS tickets_created_at_idx ON tickets (created_at DESC);

-- ============================================================
-- TICKET TIMELINE / AUDIT LOG
-- Tracks every status change for transparency
-- ============================================================
CREATE TABLE IF NOT EXISTS ticket_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id   UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL,     -- 'created', 'assigned', 'status_change', 'escalated', 'resolved', 'comment'
  old_value   TEXT,
  new_value   TEXT,
  note        TEXT,
  actor_id    UUID,              -- who performed the action (null = system)
  actor_name  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ticket_events_ticket_id_idx ON ticket_events (ticket_id);

-- ============================================================
-- GOVERNMENT USER PROFILES
-- Extends Supabase auth.users for municipal officers
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  role        TEXT NOT NULL DEFAULT 'ward_officer'
              CHECK (role IN ('ward_officer', 'supervisor', 'admin')),
  ward_id     UUID REFERENCES wards(id) ON DELETE SET NULL,
  ward_number INTEGER,
  avatar_url  TEXT,
  phone       TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AUTO-INCREMENT TICKET NUMBER
-- Generates human-readable ticket IDs like DW-2024-00001
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ticket_number := 'DW-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
                       LPAD(nextval('ticket_number_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_ticket_number
  BEFORE INSERT ON tickets
  FOR EACH ROW
  WHEN (NEW.ticket_number IS NULL OR NEW.ticket_number = '')
  EXECUTE FUNCTION generate_ticket_number();

-- ============================================================
-- AUTO-UPDATE updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- AUTO-ASSIGN WARD via PostGIS point-in-polygon
-- When a ticket is inserted/updated with lat/lng, find its ward
-- ============================================================
CREATE OR REPLACE FUNCTION assign_ward_to_ticket()
RETURNS TRIGGER AS $$
DECLARE
  matched_ward RECORD;
BEGIN
  SELECT id, ward_number INTO matched_ward
  FROM wards
  WHERE ST_Contains(
    boundary,
    ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)
  )
  LIMIT 1;

  IF FOUND THEN
    NEW.ward_id     := matched_ward.id;
    NEW.ward_number := matched_ward.ward_number;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_assign_ward
  BEFORE INSERT OR UPDATE OF latitude, longitude ON tickets
  FOR EACH ROW EXECUTE FUNCTION assign_ward_to_ticket();

-- ============================================================
-- ESCALATION: Auto-flag tickets overdue > 48 hours
-- Run this as a scheduled Supabase Edge Function (pg_cron)
-- or call it from a cron job / API route
-- ============================================================
CREATE OR REPLACE FUNCTION escalate_overdue_tickets()
RETURNS INTEGER AS $$
DECLARE
  escalated_count INTEGER;
BEGIN
  UPDATE tickets
  SET
    status       = 'escalated',
    escalated_at = NOW(),
    escalated_to = 'Municipal Commissioner Office'
  WHERE
    status NOT IN ('resolved', 'escalated')
    AND created_at < NOW() - (sla_hours || ' hours')::INTERVAL;

  GET DIAGNOSTICS escalated_count = ROW_COUNT;

  -- Log escalation events
  INSERT INTO ticket_events (ticket_id, event_type, new_value, actor_name, note)
  SELECT
    id,
    'escalated',
    'escalated',
    'System',
    'Auto-escalated: SLA of ' || sla_hours || ' hours exceeded'
  FROM tickets
  WHERE status = 'escalated'
    AND escalated_at >= NOW() - INTERVAL '1 minute';

  RETURN escalated_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE tickets  ENABLE ROW LEVEL SECURITY;
ALTER TABLE wards    ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_events ENABLE ROW LEVEL SECURITY;

-- Public can read tickets and wards (for the public transparency map)
CREATE POLICY "Public can view tickets"
  ON tickets FOR SELECT USING (true);

CREATE POLICY "Public can insert tickets"
  ON tickets FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can view wards"
  ON wards FOR SELECT USING (true);

CREATE POLICY "Public can view ticket events"
  ON ticket_events FOR SELECT USING (true);

-- Authenticated officers can update tickets
CREATE POLICY "Officers can update tickets"
  ON tickets FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Officers can insert events
CREATE POLICY "Officers can insert events"
  ON ticket_events FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Profiles only accessible by owner or admin
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- ============================================================
-- SAMPLE WARD DATA (Mumbai-inspired, 5 wards for demo)
-- Replace boundaries with real GeoJSON for production
-- ============================================================
INSERT INTO wards (ward_number, ward_name, zone, authority_email, authority_name, boundary)
VALUES
  (1, 'Andheri West',   'West Zone',  'ward1@municipality.gov',  'Rajesh Kumar',    ST_GeomFromText('POLYGON((72.820 19.110, 72.860 19.110, 72.860 19.140, 72.820 19.140, 72.820 19.110))', 4326)),
  (2, 'Andheri East',   'East Zone',  'ward2@municipality.gov',  'Priya Sharma',    ST_GeomFromText('POLYGON((72.860 19.100, 72.900 19.100, 72.900 19.140, 72.860 19.140, 72.860 19.100))', 4326)),
  (3, 'Bandra',         'West Zone',  'ward3@municipality.gov',  'Sunil Patil',     ST_GeomFromText('POLYGON((72.820 19.050, 72.850 19.050, 72.850 19.085, 72.820 19.085, 72.820 19.050))', 4326)),
  (4, 'Kurla',          'Central',    'ward4@municipality.gov',  'Meena Joshi',     ST_GeomFromText('POLYGON((72.870 19.060, 72.910 19.060, 72.910 19.090, 72.870 19.090, 72.870 19.060))', 4326)),
  (5, 'Dadar',          'Central',    'ward5@municipality.gov',  'Amit Desai',      ST_GeomFromText('POLYGON((72.840 19.015, 72.870 19.015, 72.870 19.045, 72.840 19.045, 72.840 19.015))', 4326))
ON CONFLICT (ward_number) DO NOTHING;
