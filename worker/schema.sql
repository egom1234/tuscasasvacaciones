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
  precio_calculado TEXT,
  precio_discrepancia INTEGER DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'pendiente',
  notas TEXT,
  estado_pago TEXT NOT NULL DEFAULT 'sin_pagar',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS property_config (
  propiedad TEXT PRIMARY KEY,
  config_json TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
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
  expires_at TEXT,
  valido_desde TEXT,
  valido_hasta TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bloqueos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  propiedad TEXT NOT NULL,
  entrada TEXT NOT NULL,
  salida TEXT NOT NULL,
  motivo TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
