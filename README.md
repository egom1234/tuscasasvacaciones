# Casitas de Mar

Sitio web de reservas directas para alquileres vacacionales en el Mediterráneo. Sin intermediarios, sin comisiones.

**Web:** [casitasdemar.com](https://casitasdemar.com)

---

## Propiedades

| Propiedad | Ubicación |
|---|---|
| Casa Gonda | Menorca |
| Casa Blava | Peñíscola |
| Loft Binibeca | Menorca |
| Apartamento Tarifa | Tarifa |
| Loft Tarifa | Tarifa |

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | HTML / CSS / JavaScript vanilla |
| Backend | Cloudflare Workers |
| Base de datos | Cloudflare D1 (SQLite) |
| Hosting | Cloudflare Pages |
| Analytics | Google Tag Manager + Google Analytics |

---

## Estructura del proyecto

```
/
├── index.html                  # Página principal (ES)
├── en/                         # Versión en inglés
├── Casa_Gonda/                 # Página de propiedad
├── Casa_blava/
├── Tarifa_apartamento/
├── Tarifa_loft/
├── loft_binibeca/
├── assets/
│   ├── css/                    # Estilos
│   └── js/                     # Lógica de precios por propiedad
├── worker/
│   ├── src/index.js            # API (Cloudflare Worker)
│   ├── schema.sql              # Esquema de base de datos
│   └── wrangler.toml           # Configuración de Cloudflare
├── admin/                      # Panel de administración
├── sitemap.xml
└── robots.txt
```

---

## API (Cloudflare Worker)

### Endpoints públicos

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/contacto` | Envío de formulario de contacto |
| POST | `/reserva` | Envío de solicitud de reserva |

### Endpoints de admin

Requieren autenticación: `Authorization: Bearer <token>` + header `X-Admin-User`.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/admin/reservas` | Ver todas las reservas |
| GET | `/admin/contactos` | Ver todos los contactos |

---

## Base de datos

**`contactos`** — mensajes del formulario de contacto  
**`reservas`** — solicitudes de reserva (propiedad, fechas, huéspedes, precio)

---

## Desarrollo local

### Requisitos

- [Node.js](https://nodejs.org)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) para el worker

### Worker

```bash
cd worker
npm install
npx wrangler dev
```

### Frontend

Abrir `index.html` directamente en el navegador o usar cualquier servidor estático:

```bash
npx serve .
```

---

## Despliegue

- **Frontend:** push a `main` despliega automáticamente en Cloudflare Pages
- **Worker:** `npx wrangler deploy` desde `/worker`
