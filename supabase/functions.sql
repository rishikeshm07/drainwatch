-- ============================================================
-- Supabase Additional SQL Functions
-- Run this AFTER schema.sql in the SQL Editor
-- ============================================================

-- PostGIS RPC: find which ward a point falls in
-- Called by /api/wards POST route
CREATE OR REPLACE FUNCTION find_ward_for_point(point_lat DOUBLE PRECISION, point_lng DOUBLE PRECISION)
RETURNS TABLE (
  id            UUID,
  ward_number   INTEGER,
  ward_name     TEXT,
  zone          TEXT,
  authority_name  TEXT,
  authority_email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.id,
    w.ward_number,
    w.ward_name,
    w.zone,
    w.authority_name,
    w.authority_email
  FROM wards w
  WHERE ST_Contains(
    w.boundary,
    ST_SetSRID(ST_MakePoint(point_lng, point_lat), 4326)
  )
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get overdue ticket summary per ward (for dashboard stats)
CREATE OR REPLACE FUNCTION get_ward_stats()
RETURNS TABLE (
  ward_number     INTEGER,
  ward_name       TEXT,
  total_tickets   BIGINT,
  open_tickets    BIGINT,
  resolved_tickets BIGINT,
  escalated_tickets BIGINT,
  overdue_tickets BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.ward_number,
    w.ward_name,
    COUNT(t.id)                                           AS total_tickets,
    COUNT(t.id) FILTER (WHERE t.status = 'open')          AS open_tickets,
    COUNT(t.id) FILTER (WHERE t.status = 'resolved')      AS resolved_tickets,
    COUNT(t.id) FILTER (WHERE t.status = 'escalated')     AS escalated_tickets,
    COUNT(t.id) FILTER (
      WHERE t.status NOT IN ('resolved','escalated')
      AND t.created_at < NOW() - (t.sla_hours || ' hours')::INTERVAL
    )                                                     AS overdue_tickets
  FROM wards w
  LEFT JOIN tickets t ON t.ward_id = w.id
  GROUP BY w.ward_number, w.ward_name
  ORDER BY w.ward_number;
END;
$$ LANGUAGE plpgsql STABLE;

-- Supabase Realtime: enable realtime on tickets table
-- (run this once in the Supabase dashboard → Database → Replication)
-- ALTER PUBLICATION supabase_realtime ADD TABLE tickets;
