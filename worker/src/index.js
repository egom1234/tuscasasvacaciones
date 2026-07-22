// ====== CORS ======

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, PUT, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-User',
  };
}

function json(body, status, cors) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

// ====== ICAL EXPORT ======

const ICAL_EXPORT_SLUGS = {
  'casa-gonda': 'Casa Gonda',
  'casa-blava': 'Casa Blava',
  'casa-pepita': 'Casa Pepita',
  'apartamento-tarifa': 'Apartamento Tarifa',
  'loft-tarifa': 'Loft Tarifa',
  'loft-binibeca': 'Loft Binibeca',
};

function toIcsDate(dateStr) {
  return (dateStr || '').replace(/-/g, '');
}

function icsEscape(s) {
  return String(s || '').replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function buildIcs(propiedad, ranges) {
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Casitas de Mar//iCal Export//ES',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${icsEscape(propiedad)} - Casitas de Mar`,
  ];
  for (const r of ranges) {
    if (!r.entrada || !r.salida) continue;
    lines.push(
      'BEGIN:VEVENT',
      `UID:${r.uid}@casitasdemar.com`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${toIcsDate(r.entrada)}`,
      `DTEND;VALUE=DATE:${toIcsDate(r.salida)}`,
      'SUMMARY:Ocupado - Casitas de Mar',
      'END:VEVENT'
    );
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function isAuthorized(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '');
  const user = request.headers.get('X-Admin-User') || '';
  return token && token === env.ADMIN_TOKEN && user === env.ADMIN_USER;
}

// ====== TURNSTILE ======

async function verifyTurnstile(data, request, env) {
  const token = data.get('cf-turnstile-response') || '';
  if (!token) {
    console.log('Turnstile: no token in submission');
    return false;
  }
  try {
    const body = new FormData();
    body.append('secret', env.TURNSTILE_SECRET_KEY);
    body.append('response', token);
    const remoteip = request.headers.get('CF-Connecting-IP');
    if (remoteip) body.append('remoteip', remoteip);

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
    });
    const result = await res.json();
    if (!result.success) console.log('Turnstile verify failed:', JSON.stringify(result));
    return !!result.success;
  } catch (e) {
    console.log('Turnstile verify exception:', e.message);
    return false;
  }
}

// ====== PRICING ENGINE (mirrors property-page.js exactly) ======

const ICAL_WORKER = 'https://tuscasasvacaciones.eduardgomez-4.workers.dev';

function toKeyW(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function parseFechaICal(s) {
  return new Date(+s.slice(0,4), +s.slice(4,6) - 1, +s.slice(6,8));
}

function esFinDeSemanaW(fecha) {
  const d = fecha.getDay();
  return d === 5 || d === 6;
}

function parsearIcalW(texto) {
  const fechas = new Set();
  const textoNorm = texto.replace(/\r\n|\r/g, '\n');
  const eventos = textoNorm.split('BEGIN:VEVENT');
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  for (let i = 1; i < eventos.length; i++) {
    const bloque = eventos[i];
    const dtStart = bloque.match(/DTSTART[^:\n]*:(\d{8})/);
    const dtEnd   = bloque.match(/DTEND[^:\n]*:(\d{8})/);
    if (!dtStart || !dtEnd) continue;
    let cur   = parseFechaICal(dtStart[1]);
    const fin = parseFechaICal(dtEnd[1]);
    if (cur.getTime() === fin.getTime()) {
      if (cur >= hoy) fechas.add(toKeyW(cur));
    } else {
      while (cur < fin) {
        if (cur >= hoy) fechas.add(toKeyW(cur));
        cur = new Date(cur.getTime() + 86400000);
      }
    }
  }
  return fechas;
}

function computarGapsW(fechasReservadas, minNoches) {
  const gapDays = new Set();
  if (minNoches <= 1) return gapDays;
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const fin = new Date(hoy.getFullYear(), hoy.getMonth() + 10, 0);
  let cur = new Date(hoy.getTime());
  let freeRun = [];
  let prevBooked = false;
  while (cur <= fin) {
    const key = toKeyW(cur);
    if (fechasReservadas.has(key)) {
      if (freeRun.length > 0 && prevBooked && freeRun.length < minNoches) {
        freeRun.forEach(k => gapDays.add(k));
      }
      freeRun = [];
      prevBooked = true;
    } else {
      if (freeRun.length > 0 || prevBooked) freeRun.push(key);
    }
    cur = new Date(cur.getTime() + 86400000);
  }
  return gapDays;
}

function isGapSelectionW(gapDays, entrada, salida) {
  if (gapDays.size === 0) return false;
  let cur = new Date(entrada.getTime());
  while (cur < salida) {
    if (!gapDays.has(toKeyW(cur))) return false;
    cur = new Date(cur.getTime() + 86400000);
  }
  return true;
}

function obtenerTarifaNocheW(fecha, config) {
  const rates    = config.rates || {};
  const holidays = config.holidays || [];
  const m = fecha.getMonth() + 1;

  const specialDates = config.specialDates || {};
  const dateKey = `${fecha.getFullYear()}-${String(m).padStart(2,'0')}-${String(fecha.getDate()).padStart(2,'0')}`;
  if (specialDates[dateKey] !== undefined) return specialDates[dateKey];

  function isNightBeforeHoliday(d) {
    const next = new Date(d.getTime() + 86400000);
    const mmdd = `${String(next.getMonth()+1).padStart(2,'0')}-${String(next.getDate()).padStart(2,'0')}`;
    return holidays.includes(mmdd);
  }

  const r = rates[String(m)];
  if (r === null || r === undefined) return 0;
  let base = 0;
  if (typeof r === 'number') base = r;
  else if (typeof r === 'object') {
    base = (esFinDeSemanaW(fecha) && r.weekend !== undefined) ? r.weekend : (r.weekday !== undefined ? r.weekday : 0);
  }
  if (isNightBeforeHoliday(fecha)) return Math.round(base * 1.6);
  return base;
}

function calcularPrecioW(config, entrada, salida, isGap, promoRow) {
  const noches = Math.ceil((salida - entrada) / 86400000);
  let subtotal = 0;
  let cur = new Date(entrada.getTime());
  let breakdownText = '';

  for (let i = 0; i < noches; i++) {
    const rate = obtenerTarifaNocheW(cur, config);
    subtotal += rate;
    breakdownText += `${toKeyW(cur)}: ${rate} €\n`;
    cur = new Date(cur.getTime() + 86400000);
  }

  const gapCleaning = config.gapCleaning != null ? config.gapCleaning : null;
  const limpieza = (isGap && gapCleaning != null) ? gapCleaning : (config.cleaning != null ? config.cleaning : 50);

  const discountTiers = config.discounts || [];
  const activeTier = discountTiers
    .filter(d => noches >= d.minNights)
    .sort((a, b) => b.minNights - a.minNights)[0] || null;
  const seasonTiers = config.seasonDiscounts || [];
  const checkInMonth = entrada.getMonth() + 1;
  const activeSeasonTier = seasonTiers
    .filter(d => noches >= d.minNights && d.months.includes(checkInMonth))
    .sort((a, b) => b.minNights - a.minNights)[0] || null;
  const effectiveTier = activeTier || activeSeasonTier;

  const tierPct      = effectiveTier ? effectiveTier.pct : 0;
  const tierDiscount = tierPct > 0 ? Math.round(subtotal * tierPct) : 0;
  const subtotalAfterTier = subtotal - tierDiscount;
  const gapDiscount  = isGap ? Math.round(subtotalAfterTier * 0.20) : 0;
  const subtotalFinal = subtotalAfterTier - gapDiscount;

  let promoDiscount = 0;
  if (promoRow) {
    promoDiscount = promoRow.tipo === 'pct'
      ? Math.round(subtotalFinal * promoRow.valor / 100)
      : Math.min(promoRow.valor, subtotalFinal);
  }

  const subtotalWithPromo = subtotalFinal - promoDiscount;
  const total = subtotalWithPromo + limpieza;

  return { total, subtotal, subtotalFinal: subtotalWithPromo, cleaning: limpieza, nights: noches, breakdown: breakdownText, tierDiscount, tierPct, gapDiscount, promoDiscount };
}

// Fallback: property_config saved from the admin panel doesn't include icalSlugs
// (the admin JSON template omits it), so mirror the slugs hardcoded in each
// property page here to keep server-side gap detection working regardless.
const ICAL_SLUGS_BY_PROPERTY = {
  'Casa Gonda':         ['gonda-airbnb', 'gonda-booking'],
  'Casa Blava':         ['casa-blava-airbnb', 'casa-blava-booking'],
  'Loft Binibeca':      ['loft-binibeca-airbnb', 'loft-binibeca-booking'],
  'Apartamento Tarifa': ['tarifa-apt-airbnb', 'tarifa-apt-booking'],
  'Loft Tarifa':        ['tarifa-loft-airbnb', 'tarifa-loft-booking'],
  'Casa Pepita':        ['pepita-airbnb'],
};

async function determinarIsGap(config, entrada, salida, propiedad, env) {
  if (config.noGapDiscount) return false;
  const minNoches = config.minNoches || 1;
  if (minNoches <= 1) { console.log(`isGap check [${propiedad}]: minNoches=${minNoches} <= 1, skipping`); return false; }
  const slugs = config.icalSlugs || ICAL_SLUGS_BY_PROPERTY[propiedad] || [];
  if (slugs.length === 0) { console.log(`isGap check [${propiedad}]: no icalSlugs found (config.icalSlugs=${JSON.stringify(config.icalSlugs)})`); return false; }
  try {
    // Fetched via a Service Binding, not a plain fetch(): Cloudflare blocks
    // Worker-to-Worker requests to *.workers.dev URLs (error 1042), which
    // silently broke this check (always saw an empty calendar).
    const responses = await Promise.all(slugs.map(s => env.ICAL_SERVICE.fetch(`${ICAL_WORKER}/ical/${s}`)));
    const texts = await Promise.all(responses.map(r => r.ok ? r.text() : ''));
    responses.forEach((r, i) => { if (!r.ok) console.log(`isGap check [${propiedad}]: ical fetch for slug "${slugs[i]}" failed HTTP ${r.status}`); });
    const fechasReservadas = new Set(texts.flatMap(t => [...parsearIcalW(t)]));
    const gapDays = computarGapsW(fechasReservadas, minNoches);
    const result = isGapSelectionW(gapDays, entrada, salida);
    console.log(`isGap check [${propiedad}]: slugs=${JSON.stringify(slugs)} minNoches=${minNoches} fechasReservadas=${fechasReservadas.size} gapDays=${gapDays.size} entrada=${toKeyW(entrada)} salida=${toKeyW(salida)} result=${result}`);
    return result;
  } catch (e) {
    console.error(`isGap check [${propiedad}]: error`, e);
    return false;
  }
}

// ====== MAIN ROUTER ======

export default {
  async fetch(request, env, ctx) {
    const cors = corsHeaders();

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);

    try {
      // ---- Admin: reservas ----
      if (url.pathname === '/admin/reservas') {
        if (!isAuthorized(request, env)) return json({ ok: false, error: 'Unauthorized' }, 401, cors);
        const { results } = await env.DB.prepare('SELECT * FROM reservas ORDER BY created_at DESC').all();
        return json({ ok: true, data: results }, 200, cors);
      }

      // ---- Admin: contactos ----
      if (url.pathname === '/admin/contactos') {
        if (!isAuthorized(request, env)) return json({ ok: false, error: 'Unauthorized' }, 401, cors);
        const { results } = await env.DB.prepare('SELECT * FROM contactos ORDER BY created_at DESC').all();
        return json({ ok: true, data: results }, 200, cors);
      }

      // ---- Admin: discount-codes ----
      if (url.pathname === '/admin/discount-codes') {
        if (!isAuthorized(request, env)) return json({ ok: false, error: 'Unauthorized' }, 401, cors);
        if (request.method === 'GET') {
          const { results } = await env.DB.prepare('SELECT * FROM discount_codes ORDER BY created_at DESC').all();
          return json({ ok: true, data: results }, 200, cors);
        }
        if (request.method === 'POST') {
          const body = await request.json();
          const { codigo, descripcion, tipo, valor, propiedad, usos_max, expires_at } = body;
          if (!codigo || !tipo || valor == null) return json({ ok: false, error: 'Faltan campos' }, 400, cors);
          await env.DB.prepare(
            `INSERT INTO discount_codes (codigo, descripcion, tipo, valor, propiedad, usos_max, expires_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
          ).bind(
            codigo.toUpperCase().trim(), descripcion || null, tipo,
            parseFloat(valor), propiedad || null, usos_max ? parseInt(usos_max) : null,
            expires_at || null
          ).run();
          return json({ ok: true }, 200, cors);
        }
      }

      if (url.pathname.startsWith('/admin/reservas/') && request.method === 'PATCH') {
        if (!isAuthorized(request, env)) return json({ ok: false, error: 'Unauthorized' }, 401, cors);
        const id = parseInt(url.pathname.split('/').pop());
        if (!id) return json({ ok: false, error: 'ID inválido' }, 400, cors);
        const body = await request.json();
        const allowed = ['estado', 'notas', 'estado_pago'];
        const fields = [];
        const values = [];
        for (const key of allowed) {
          if (body[key] !== undefined) { fields.push(`${key} = ?`); values.push(body[key]); }
        }
        if (fields.length === 0) return json({ ok: false, error: 'Sin campos válidos' }, 400, cors);
        values.push(id);
        await env.DB.prepare(`UPDATE reservas SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
        return json({ ok: true }, 200, cors);
      }

      if (url.pathname.startsWith('/admin/reservas/') && request.method === 'DELETE') {
        if (!isAuthorized(request, env)) return json({ ok: false, error: 'Unauthorized' }, 401, cors);
        const id = url.pathname.split('/').pop();
        await env.DB.prepare('DELETE FROM reservas WHERE id = ?').bind(parseInt(id)).run();
        return json({ ok: true }, 200, cors);
      }

      if (url.pathname.startsWith('/admin/discount-codes/') && request.method === 'DELETE') {
        if (!isAuthorized(request, env)) return json({ ok: false, error: 'Unauthorized' }, 401, cors);
        const id = url.pathname.split('/').pop();
        await env.DB.prepare('DELETE FROM discount_codes WHERE id = ?').bind(parseInt(id)).run();
        return json({ ok: true }, 200, cors);
      }

      // ---- Admin: bloqueos manuales de calendario ----
      if (url.pathname === '/admin/bloqueos') {
        if (!isAuthorized(request, env)) return json({ ok: false, error: 'Unauthorized' }, 401, cors);
        if (request.method === 'GET') {
          const { results } = await env.DB.prepare('SELECT * FROM bloqueos ORDER BY entrada').all();
          return json({ ok: true, data: results }, 200, cors);
        }
        if (request.method === 'POST') {
          const body = await request.json();
          const { propiedad, entrada, salida, motivo } = body;
          if (!propiedad || !entrada || !salida) return json({ ok: false, error: 'Faltan campos' }, 400, cors);
          if (salida <= entrada) return json({ ok: false, error: 'Rango de fechas inválido' }, 400, cors);
          await env.DB.prepare(
            `INSERT INTO bloqueos (propiedad, entrada, salida, motivo) VALUES (?, ?, ?, ?)`
          ).bind(propiedad, entrada, salida, motivo || null).run();
          return json({ ok: true }, 200, cors);
        }
      }

      if (url.pathname.startsWith('/admin/bloqueos/') && request.method === 'DELETE') {
        if (!isAuthorized(request, env)) return json({ ok: false, error: 'Unauthorized' }, 401, cors);
        const id = url.pathname.split('/').pop();
        await env.DB.prepare('DELETE FROM bloqueos WHERE id = ?').bind(parseInt(id)).run();
        return json({ ok: true }, 200, cors);
      }

      // ---- Admin: property-config ----
      if (url.pathname === '/admin/property-config') {
        if (!isAuthorized(request, env)) return json({ ok: false, error: 'Unauthorized' }, 401, cors);
        const { results } = await env.DB.prepare('SELECT * FROM property_config ORDER BY propiedad').all();
        return json({ ok: true, data: results }, 200, cors);
      }

      if (url.pathname.startsWith('/admin/property-config/') && request.method === 'PUT') {
        if (!isAuthorized(request, env)) return json({ ok: false, error: 'Unauthorized' }, 401, cors);
        const propiedad = decodeURIComponent(url.pathname.split('/admin/property-config/')[1]);
        const body = await request.text();
        try { JSON.parse(body); } catch { return json({ ok: false, error: 'JSON inválido' }, 400, cors); }
        await env.DB.prepare(
          `INSERT INTO property_config (propiedad, config_json, updated_at)
           VALUES (?, ?, datetime('now'))
           ON CONFLICT(propiedad) DO UPDATE SET config_json=excluded.config_json, updated_at=excluded.updated_at`
        ).bind(propiedad, body).run();
        return json({ ok: true }, 200, cors);
      }

      // ---- Public: validate discount code ----
      if (url.pathname === '/discount-codes/validate' && request.method === 'POST') {
        const body = await request.json();
        const { codigo, propiedad } = body;
        if (!codigo) return json({ ok: false, error: 'Código requerido' }, 400, cors);
        const row = await env.DB.prepare(
          `SELECT * FROM discount_codes WHERE UPPER(codigo) = UPPER(?) AND activo = 1`
        ).bind(codigo.trim()).first();
        if (!row) return json({ ok: false, error: 'Código no válido' }, 200, cors);
        if (row.usos_max != null && row.usos_usados >= row.usos_max) return json({ ok: false, error: 'Código agotado' }, 200, cors);
        if (row.expires_at && row.expires_at < new Date().toISOString().slice(0, 10)) return json({ ok: false, error: 'Código expirado' }, 200, cors);
        if (row.propiedad && propiedad && row.propiedad !== propiedad) return json({ ok: false, error: 'Código no aplicable a esta propiedad' }, 200, cors);
        return json({ ok: true, discount: { codigo: row.codigo, tipo: row.tipo, valor: row.valor, descripcion: row.descripcion } }, 200, cors);
      }

      // ---- Public: get property config (frontend rate sync) ----
      if (url.pathname.startsWith('/property-config/') && request.method === 'GET') {
        const propiedad = decodeURIComponent(url.pathname.split('/property-config/')[1] || '');
        if (!propiedad) return json({ ok: false, error: 'Propiedad requerida' }, 400, cors);
        const row = await env.DB.prepare(
          'SELECT config_json FROM property_config WHERE propiedad = ?'
        ).bind(propiedad).first();
        if (!row) return json({ ok: false, error: 'Not found' }, 404, cors);
        return new Response(row.config_json, {
          headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' }
        });
      }

      // ---- Public: confirmed direct reservations + manual blocks (block dates on the visitor-facing calendar) ----
      if (url.pathname.startsWith('/blocked-dates/') && request.method === 'GET') {
        const propiedad = decodeURIComponent(url.pathname.split('/blocked-dates/')[1] || '');
        if (!propiedad) return json({ ok: false, error: 'Propiedad requerida' }, 400, cors);
        const [reservasRes, bloqueosRes] = await Promise.all([
          env.DB.prepare(`SELECT entrada, salida FROM reservas WHERE propiedad = ? AND estado = 'confirmada'`).bind(propiedad).all(),
          env.DB.prepare(`SELECT entrada, salida FROM bloqueos WHERE propiedad = ?`).bind(propiedad).all(),
        ]);
        return json({ ok: true, ranges: [...reservasRes.results, ...bloqueosRes.results] }, 200, cors);
      }

      // ---- Public: outbound iCal export (channel manager) — import into Booking.com / Airbnb ----
      if (url.pathname.startsWith('/ical/') && url.pathname.endsWith('.ics') && request.method === 'GET') {
        const slug = url.pathname.slice('/ical/'.length, -'.ics'.length);
        const propiedad = ICAL_EXPORT_SLUGS[slug];
        if (!propiedad) return new Response('Not found', { status: 404, headers: cors });

        const [reservasRes, bloqueosRes] = await Promise.all([
          env.DB.prepare(`SELECT id, entrada, salida FROM reservas WHERE propiedad = ? AND estado = 'confirmada'`).bind(propiedad).all(),
          env.DB.prepare(`SELECT id, entrada, salida FROM bloqueos WHERE propiedad = ?`).bind(propiedad).all(),
        ]);

        const ics = buildIcs(propiedad, [
          ...reservasRes.results.map(r => ({ uid: `reserva-${r.id}`, entrada: r.entrada, salida: r.salida })),
          ...bloqueosRes.results.map(r => ({ uid: `bloqueo-${r.id}`, entrada: r.entrada, salida: r.salida })),
        ]);

        return new Response(ics, {
          status: 200,
          headers: { ...cors, 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'public, max-age=900' },
        });
      }

      if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405, headers: cors });
      }

      if (url.pathname === '/contacto') return await handleContacto(request, env, cors, ctx);
      if (url.pathname === '/reserva')  return await handleReserva(request, env, cors, ctx);

      return new Response('Not found', { status: 404, headers: cors });

    } catch (err) {
      return new Response(JSON.stringify({ ok: false, error: err.message }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
  },
};

// ====== HANDLERS ======

async function handleContacto(request, env, cors, ctx) {
  const data = await request.formData();
  if (!(await verifyTurnstile(data, request, env))) return json({ ok: false, error: 'Verificación anti-bot fallida' }, 400, cors);
  const nombre   = (data.get('name')     || '').trim();
  const email    = (data.get('email')    || '').trim();
  const telefono = (data.get('telefono') || '').trim();
  const mensaje  = (data.get('message')  || '').trim();
  if (!nombre || !email) return json({ ok: false, error: 'Faltan campos obligatorios' }, 400, cors);
  await env.DB.prepare(
    `INSERT INTO contactos (nombre, email, telefono, mensaje) VALUES (?, ?, ?, ?)`
  ).bind(nombre, email, telefono, mensaje).run();

  ctx.waitUntil(
    sendAdminContactNotification(env, { nombre, email, telefono, mensaje })
      .catch(e => console.error('Admin contact email failed:', e))
  );

  return json({ ok: true }, 200, cors);
}

async function handleReserva(request, env, cors, ctx) {
  const data = await request.formData();
  if (!(await verifyTurnstile(data, request, env))) return json({ ok: false, error: 'Verificación anti-bot fallida' }, 400, cors);

  const nombre       = (data.get('name')           || '').trim();
  const email        = (data.get('email')          || '').trim();
  const telefono     = (data.get('telefono')       || '').trim();
  const entrada      = data.get('entrada')         || '';
  const salida       = data.get('salida')          || '';
  const adultos      = parseInt(data.get('adultos')  || '1', 10);
  const ninos        = parseInt(data.get('ninos')    || '0', 10);
  const noches       = parseInt(data.get('nights')   || '0', 10);
  const precio_total = data.get('total_price')     || '';
  const desglose     = data.get('price_breakdown') || '';
  const comentarios  = (data.get('message')        || '').trim();
  const from_name    = (data.get('from_name')      || '').trim();
  const propiedad    = (data.get('propiedad')      || '').trim() || from_name;
  const promo_code   = (data.get('promo_code')     || '').trim().toUpperCase() || null;

  if (!nombre || !email) return json({ ok: false, error: 'Faltan campos obligatorios' }, 400, cors);

  // ---- Server-side price recalculation ----
  let precio_calculado   = null;
  let precio_discrepancia = 0;
  let calc = null;

  if (entrada && salida) {
    try {
      const configRow = await env.DB.prepare(
        'SELECT config_json FROM property_config WHERE propiedad = ?'
      ).bind(propiedad).first();

      if (configRow) {
        const config      = JSON.parse(configRow.config_json);
        const entradaDate = new Date(entrada + 'T00:00:00');
        const salidaDate  = new Date(salida  + 'T00:00:00');
        const hoy         = new Date(); hoy.setHours(0,0,0,0);

        if (entradaDate >= hoy && salidaDate > entradaDate) {
          // Validate gap via iCal
          const isGap = await determinarIsGap(config, entradaDate, salidaDate, propiedad, env);

          // Load promo row for server-side discount
          let promoRow = null;
          if (promo_code) {
            promoRow = await env.DB.prepare(
              'SELECT * FROM discount_codes WHERE UPPER(codigo) = ? AND activo = 1'
            ).bind(promo_code).first();
          }

          calc = calcularPrecioW(config, entradaDate, salidaDate, isGap, promoRow);
          precio_calculado = calc.total.toFixed(2);

          const submittedTotal  = parseFloat(precio_total) || 0;
          const calculatedTotal = calc.total;
          if (Math.abs(submittedTotal - calculatedTotal) > 1) {
            precio_discrepancia = 1;
          }
        }
      }
    } catch (e) {
      console.error('Server price calc error:', e);
    }
  }

  await env.DB.prepare(
    `INSERT INTO reservas (propiedad, nombre, email, telefono, entrada, salida, adultos, ninos, noches,
       precio_total, desglose, comentarios, promo_code, precio_calculado, precio_discrepancia)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    propiedad, nombre, email, telefono, entrada, salida,
    adultos, ninos, noches, precio_total, desglose, comentarios,
    promo_code, precio_calculado, precio_discrepancia
  ).run();

  if (promo_code) {
    await env.DB.prepare(
      `UPDATE discount_codes SET usos_usados = usos_usados + 1 WHERE UPPER(codigo) = ? AND activo = 1`
    ).bind(promo_code).run();
  }

  // Admin notification + guest confirmation, both via Brevo (keep alive until both complete)
  ctx.waitUntil((async () => {
    await sendAdminReservationNotification(env, { nombre, email, telefono, propiedad, entrada, salida, adultos, ninos, noches, precio_total, comentarios, promo_code, precio_calculado, precio_discrepancia, calc })
      .catch(e => console.error('Admin reservation email failed:', e));

    await sendGuestConfirmation(env, { nombre, email, propiedad, entrada, salida, adultos, ninos, noches, precio_total, comentarios, promo_code, calc })
      .catch(e => console.error('Brevo guest email failed:', e));
  })());

  return json({ ok: true, precio_calculado }, 200, cors);
}

const ADMIN_NOTIFICATION_EMAIL = 'casablavapeniscola@gmail.com';

function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function adminRow(label, value) {
  return `<tr>
    <td style="padding:6px 10px;color:#555;font-family:sans-serif;font-size:0.85rem;border-bottom:1px solid #eee">${label}</td>
    <td style="padding:6px 10px;color:#111;font-family:sans-serif;font-size:0.85rem;border-bottom:1px solid #eee;font-weight:600">${value}</td>
  </tr>`;
}

async function sendAdminEmail(env, { subject, html, replyToEmail, replyToName }) {
  if (!env.BREVO_API_KEY) { console.error('Admin email skipped: BREVO_API_KEY not set'); return; }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender:  { name: 'Casitas de Mar', email: 'info@casitasdemar.com' },
      to:      [{ email: ADMIN_NOTIFICATION_EMAIL }],
      replyTo: { email: replyToEmail || 'info@casitasdemar.com', name: replyToName || 'Casitas de Mar' },
      subject,
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`Admin email failed: HTTP ${res.status} - ${body.slice(0, 500)}`);
  }
}

async function sendAdminReservationNotification(env, { nombre, email, telefono, propiedad, entrada, salida, adultos, ninos, noches, precio_total, comentarios, promo_code, precio_calculado, precio_discrepancia, calc }) {
  const totalDisplay = calc ? `${calc.total.toFixed(2)} €` : (precio_total ? `${precio_total} €` : '—');

  const alertaHtml = precio_discrepancia
    ? `<p style="margin:0 0 16px;padding:10px 14px;background:#fdecea;color:#c0392b;font-family:sans-serif;font-size:0.85rem;font-weight:600">
        ⚠️ Discrepancia de precio: el cliente envió ${escHtml(precio_total)} €, el servidor calculó ${escHtml(precio_calculado)} €
      </p>`
    : '';

  const descuentosHtml = calc
    ? [
        calc.tierDiscount  > 0 ? adminRow('Descuento temporada', `-${calc.tierDiscount.toFixed(2)} € (${Math.round(calc.tierPct * 100)}%)`) : '',
        calc.gapDiscount   > 0 ? adminRow('Descuento Fill the Gap', `-${calc.gapDiscount.toFixed(2)} €`) : '',
        calc.promoDiscount > 0 ? adminRow('Descuento código promo', `-${calc.promoDiscount.toFixed(2)} € (${escHtml(promo_code)})`) : '',
      ].join('')
    : '';

  const html = `<!DOCTYPE html>
<html lang="es"><body style="margin:0;padding:24px 16px;background:#f5f0e8">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff">
<tr><td style="padding:28px 32px 4px">
  <h2 style="margin:0 0 4px;font-family:Georgia,serif;color:#2a2118;font-weight:400">Nueva solicitud de reserva</h2>
  <p style="margin:0 0 16px;color:#888;font-family:sans-serif;font-size:0.85rem">${escHtml(propiedad)}</p>
</td></tr>
<tr><td style="padding:0 32px 28px">
  ${alertaHtml}
  <table width="100%" cellpadding="0" cellspacing="0">
    ${adminRow('Nombre', escHtml(nombre))}
    ${adminRow('Email', `<a href="mailto:${escHtml(email)}" style="color:#2a2118">${escHtml(email)}</a>`)}
    ${adminRow('Teléfono', escHtml(telefono) || '—')}
    ${adminRow('Entrada', escHtml(entrada))}
    ${adminRow('Salida', escHtml(salida))}
    ${adminRow('Noches', String(noches))}
    ${adminRow('Huéspedes', `${adultos} adulto${adultos != 1 ? 's' : ''}${ninos > 0 ? ` · ${ninos} niño${ninos != 1 ? 's' : ''}` : ''}`)}
    ${descuentosHtml}
    ${adminRow('Total', totalDisplay)}
    ${promo_code ? adminRow('Código promo', escHtml(promo_code)) : ''}
  </table>
  ${comentarios ? `<p style="margin:16px 0 0;padding:14px;background:#f9f6f1;color:#555;font-family:sans-serif;font-size:0.85rem;line-height:1.6">${escHtml(comentarios)}</p>` : ''}
</td></tr>
</table>
</body></html>`;

  await sendAdminEmail(env, {
    subject: `Nueva solicitud de reserva - ${propiedad}`,
    html,
    replyToEmail: email,
    replyToName: nombre,
  });
}

async function sendAdminContactNotification(env, { nombre, email, telefono, mensaje }) {
  const html = `<!DOCTYPE html>
<html lang="es"><body style="margin:0;padding:24px 16px;background:#f5f0e8">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff">
<tr><td style="padding:28px 32px">
  <h2 style="margin:0 0 16px;font-family:Georgia,serif;color:#2a2118;font-weight:400">Nuevo mensaje de contacto</h2>
  <table width="100%" cellpadding="0" cellspacing="0">
    ${adminRow('Nombre', escHtml(nombre))}
    ${adminRow('Email', `<a href="mailto:${escHtml(email)}" style="color:#2a2118">${escHtml(email)}</a>`)}
    ${adminRow('Teléfono', escHtml(telefono) || '—')}
  </table>
  ${mensaje ? `<p style="margin:16px 0 0;padding:14px;background:#f9f6f1;color:#555;font-family:sans-serif;font-size:0.85rem;line-height:1.6">${escHtml(mensaje)}</p>` : ''}
</td></tr>
</table>
</body></html>`;

  await sendAdminEmail(env, {
    subject: `Nuevo mensaje de contacto de ${nombre}`,
    html,
    replyToEmail: email,
    replyToName: nombre,
  });
}

async function sendGuestConfirmation(env, { nombre, email, propiedad, entrada, salida, adultos, ninos, noches, precio_total, comentarios, promo_code, calc }) {
  if (!env.BREVO_API_KEY) { console.error('Brevo guest email skipped: BREVO_API_KEY not set'); return; }
  if (!email) { console.error('Brevo guest email skipped: no recipient email'); return; }

  const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const fmt = d => {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    return `${parseInt(day)} ${months[parseInt(m)-1]} ${y}`;
  };

  const row = (label, value, style = '') =>
    `<tr>
      <td style="padding:7px 0;color:#555;font-family:sans-serif;font-size:0.875rem;border-bottom:1px solid #d4c0a0">${label}</td>
      <td align="right" style="padding:7px 0;color:#2a2118;font-family:sans-serif;font-size:0.875rem;border-bottom:1px solid #d4c0a0;font-weight:600;${style}">${value}</td>
    </tr>`;

  const guestRow = (label, value) =>
    `<tr>
      <td style="padding:4px 0;color:#7a9e7e;font-family:sans-serif;font-size:0.875rem">${label}</td>
      <td align="right" style="padding:4px 0;color:#7a9e7e;font-family:sans-serif;font-size:0.875rem">-${value} €</td>
    </tr>`;

  let priceRows = '';
  let totalDisplay = precio_total ? `${precio_total} €` : '';

  if (calc) {
    priceRows += row('Subtotal noches', `${calc.subtotal.toFixed(2)} €`);
    if (calc.tierDiscount > 0) priceRows += guestRow(`Descuento temporada (${Math.round(calc.tierPct * 100)}%)`, calc.tierDiscount.toFixed(2));
    if (calc.gapDiscount  > 0) priceRows += guestRow('Descuento Fill the Gap', calc.gapDiscount.toFixed(2));
    if (calc.promoDiscount > 0) priceRows += guestRow(`Código promo (${esc(promo_code)})`, calc.promoDiscount.toFixed(2));
    if (calc.cleaning > 0) priceRows += row('Limpieza', `${calc.cleaning.toFixed(2)} €`);
    totalDisplay = `${calc.total.toFixed(2)} €`;
  }

  const comentariosSection = comentarios ? `
    <tr><td style="padding:0 40px 8px">
      <p style="margin:0 0 8px;font-family:sans-serif;font-size:0.7rem;letter-spacing:0.1em;text-transform:uppercase;color:#B5896A;font-weight:600">Tu mensaje</p>
      <p style="margin:0;background:#f9f6f1;padding:16px;color:#555;line-height:1.6;font-family:sans-serif;font-size:0.875rem">${esc(comentarios)}</p>
    </td></tr>` : '';

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Solicitud recibida – Casitas de Mar</title></head>
<body style="margin:0;padding:0;background:#f5f0e8">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e8;padding:32px 16px">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#ffffff">

<tr><td style="background:#2a2118;padding:36px 40px;text-align:center">
  <img src="https://casitasdemar.com/images/logo.png" alt="Casitas de Mar" height="52" style="display:block;margin:0 auto">
</td></tr>

<tr><td style="padding:40px 40px 28px">
  <h1 style="margin:0 0 12px;font-size:1.4rem;font-weight:400;color:#2a2118;font-family:Georgia,serif">Hola, ${esc(nombre)}</h1>
  <p style="margin:0;color:#666;line-height:1.7;font-family:sans-serif;font-size:0.9rem">Hemos recibido tu solicitud de reserva para <strong style="color:#2a2118">${esc(propiedad)}</strong>. Nos pondremos en contacto contigo en breve para confirmar disponibilidad y los detalles finales.</p>
</td></tr>

<tr><td style="padding:0 40px 32px">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#e8d5b7;padding:24px">
    <tr><td colspan="2" style="font-family:sans-serif;font-size:0.7rem;letter-spacing:0.1em;text-transform:uppercase;color:#B5896A;padding-bottom:14px;font-weight:600">Resumen de tu solicitud</td></tr>
    ${row('Propiedad', esc(propiedad))}
    ${row('Entrada', fmt(entrada))}
    ${row('Salida', fmt(salida))}
    ${row('Noches', String(noches))}
    ${row('Huéspedes', `${adultos} adulto${adultos != 1 ? 's' : ''}${ninos > 0 ? ` · ${ninos} niño${ninos != 1 ? 's' : ''}` : ''}`)}
    ${priceRows}
    <tr>
      <td style="padding:12px 0 0;color:#2a2118;font-family:sans-serif;font-size:0.95rem;font-weight:700">Total estimado</td>
      <td align="right" style="padding:12px 0 0;color:#2a2118;font-family:sans-serif;font-size:1.05rem;font-weight:700">${totalDisplay}</td>
    </tr>
    ${promo_code ? `<tr><td colspan="2" style="padding:6px 0 0;font-family:sans-serif;font-size:0.8rem;color:#7a9e7e">✓ Código aplicado: ${esc(promo_code)}</td></tr>` : ''}
  </table>
</td></tr>

${comentariosSection}

<tr><td style="padding:${comentarios ? '24px' : '0'} 40px 32px">
  <p style="margin:0;color:#aaa;font-size:0.8rem;font-family:sans-serif;line-height:1.6">Este correo confirma que hemos recibido tu solicitud. La reserva quedará confirmada una vez que te contactemos directamente.</p>
</td></tr>

<tr><td style="background:#2a2118;padding:28px 40px;text-align:center">
  <p style="margin:0 0 6px;font-family:sans-serif;font-size:0.7rem;letter-spacing:0.1em;text-transform:uppercase;color:#B5896A;font-weight:600">Casitas de Mar</p>
  <p style="margin:0 0 6px;font-family:sans-serif;font-size:0.85rem">
    <a href="mailto:info@casitasdemar.com" style="color:#e8d5b7;text-decoration:none">info@casitasdemar.com</a>
  </p>
  <p style="margin:0;font-family:sans-serif">
    <a href="https://casitasdemar.com" style="color:#B5896A;font-size:0.85rem;text-decoration:none">casitasdemar.com</a>
  </p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender:  { name: 'Casitas de Mar', email: 'info@casitasdemar.com' },
      to:      [{ email, name: nombre }],
      replyTo: { email: 'info@casitasdemar.com', name: 'Casitas de Mar' },
      subject: `Solicitud de reserva recibida – ${propiedad}`,
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`Brevo guest email failed: HTTP ${res.status} - ${body.slice(0, 500)}`);
  }
}
