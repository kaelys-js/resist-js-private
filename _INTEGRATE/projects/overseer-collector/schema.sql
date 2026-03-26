-- Overseer D1 Schema

-- Records each collector execution attempt
CREATE TABLE IF NOT EXISTS collector_runs (
  run_id TEXT PRIMARY KEY,
  collector_id TEXT NOT NULL,
  runtime TEXT NOT NULL CHECK (runtime IN ('local', 'cloud')),
  started_at TEXT NOT NULL,
  finished_at TEXT,
  ok INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  attempts INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_collector_runs_collector_id ON collector_runs(collector_id);
CREATE INDEX IF NOT EXISTS idx_collector_runs_started_at ON collector_runs(started_at);

-- Stores collected data (append-only)
CREATE TABLE IF NOT EXISTS collector_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  collector_id TEXT NOT NULL,
  collected_at TEXT NOT NULL,
  payload TEXT NOT NULL,
  run_id TEXT REFERENCES collector_runs(run_id)
);

CREATE INDEX IF NOT EXISTS idx_collector_data_collector_id ON collector_data(collector_id);
CREATE INDEX IF NOT EXISTS idx_collector_data_collected_at ON collector_data(collected_at);
