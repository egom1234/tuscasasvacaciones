CREATE TABLE IF NOT EXISTS contactos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  telefono TEXT,
  mensaje TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reservas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  propiedad TEXT,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  telefono TEXT,
  entrada TEXT,
  salida TEXT,
  adultos INTEGER,
  ninos INTEGER,
  noches INTEGER,
  precio_total TEXT,
  desglose TEXT,
  comentarios TEXT,
  promo_code TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS discount_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  tipo TEXT NOT NULL CHECK(tipo IN ('pct', 'eur')),
  valor REAL NOT NULL,
  propiedad TEXT,
  usos_max INTEGER,
  usos_usados INTEGER NOT NULL DEFAULT 0,
  activo INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);
