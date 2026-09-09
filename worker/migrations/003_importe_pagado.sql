-- Migration 003: importe pagado (señal / pago parcial)
-- Run: npx wrangler d1 execute casitasdemar --remote --file=migrations/003_importe_pagado.sql

ALTER TABLE reservas ADD COLUMN importe_pagado REAL;
