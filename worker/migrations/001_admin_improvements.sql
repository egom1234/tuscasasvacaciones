-- Migration 001: admin improvements
-- Run: npx wrangler d1 execute casitasdemar --remote --file=migrations/001_admin_improvements.sql

ALTER TABLE reservas ADD COLUMN estado TEXT NOT NULL DEFAULT 'pendiente';
ALTER TABLE reservas ADD COLUMN notas TEXT;
ALTER TABLE reservas ADD COLUMN estado_pago TEXT NOT NULL DEFAULT 'sin_pagar';

ALTER TABLE discount_codes ADD COLUMN expires_at TEXT;
