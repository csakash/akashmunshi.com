-- ARI-42 requests: someone asks for the full 42-question list, or for a review of their agent stack.
CREATE TABLE IF NOT EXISTS ari42_requests (
  id          TEXT PRIMARY KEY,
  created_at  TEXT NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('list', 'review')),
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  company     TEXT,
  website     TEXT,
  product     TEXT,
  tools       TEXT,       -- JSON array of {name, category, usage}
  access      TEXT,       -- JSON array of access options the requester can give
  timeline    TEXT,
  notes       TEXT,
  status      TEXT NOT NULL DEFAULT 'new',
  ip_hash     TEXT,
  user_agent  TEXT
);
CREATE INDEX IF NOT EXISTS idx_ari42_created ON ari42_requests (created_at);
CREATE INDEX IF NOT EXISTS idx_ari42_ip ON ari42_requests (ip_hash, created_at);
