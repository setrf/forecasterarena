export const SYSTEM_TABLES_SQL = `
-- ============================================================================
-- SYSTEM LOGS
-- ============================================================================
-- Audit trail for all system events.
-- Critical for debugging and monitoring.

CREATE TABLE IF NOT EXISTS system_logs (
  id TEXT PRIMARY KEY,                           -- UUID
  event_type TEXT NOT NULL,                      -- Event category
  event_data TEXT,                               -- JSON payload
  severity TEXT DEFAULT 'info',                  -- info | warning | error
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`;
