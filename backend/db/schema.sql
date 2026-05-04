CREATE TABLE IF NOT EXISTS work_items (
  id UUID PRIMARY KEY,
  component_id TEXT NOT NULL,
  component_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('P0','P1','P2','P3')),
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('OPEN','INVESTIGATING','RESOLVED','CLOSED')),
  signal_count INTEGER NOT NULL DEFAULT 0,
  first_signal_time TIMESTAMPTZ NOT NULL,
  last_signal_time TIMESTAMPTZ NOT NULL,
  mttr_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_work_items_status_severity ON work_items(status, severity);
CREATE INDEX IF NOT EXISTS idx_work_items_component ON work_items(component_id);

CREATE TABLE IF NOT EXISTS rcas (
  id UUID PRIMARY KEY,
  work_item_id UUID NOT NULL UNIQUE REFERENCES work_items(id) ON DELETE CASCADE,
  incident_start TIMESTAMPTZ NOT NULL,
  incident_end TIMESTAMPTZ NOT NULL,
  root_cause_category TEXT NOT NULL,
  fix_applied TEXT NOT NULL,
  prevention_steps TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (incident_end >= incident_start)
);

CREATE TABLE IF NOT EXISTS status_events (
  id UUID PRIMARY KEY,
  work_item_id UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS signal_aggregations (
  bucket TIMESTAMPTZ NOT NULL,
  component_id TEXT NOT NULL,
  severity TEXT NOT NULL,
  signal_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(bucket, component_id, severity)
);
