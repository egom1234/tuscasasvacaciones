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
  created_at TEXT DEFAULT (datetime('now'))
);
