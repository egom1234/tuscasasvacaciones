-- Migration 002: bloqueos manuales de calendario
-- Run: npx wrangler d1 execute casitasdemar --remote --file=migrations/002_bloqueos.sql

CREATE TABLE IF NOT EXISTS bloqueos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  propiedad TEXT NOT NULL,
  entrada TEXT NOT NULL,
  salida TEXT NOT NULL,
  motivo TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
