function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-User',
  };
}

function json(body, status, cors) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

function isAuthorized(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '');
  const user = request.headers.get('X-Admin-User') || '';
  return token && token === env.ADMIN_TOKEN && user === env.ADMIN_USER;
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders();

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);

    try {
      // Admin endpoints (GET)
      if (url.pathname === '/admin/reservas') {
        if (!isAuthorized(request, env)) {
          return json({ ok: false, error: 'Unauthorized' }, 401, cors);
        }
        const { results } = await env.DB.prepare(
          'SELECT * FROM reservas ORDER BY created_at DESC'
        ).all();
        return json({ ok: true, data: results }, 200, cors);
      }

      if (url.pathname === '/admin/contactos') {
        if (!isAuthorized(request, env)) {
          return json({ ok: false, error: 'Unauthorized' }, 401, cors);
        }
        const { results } = await env.DB.prepare(
          'SELECT * FROM contactos ORDER BY created_at DESC'
        ).all();
        return json({ ok: true, data: results }, 200, cors);
      }

      if (url.pathname === '/admin/discount-codes') {
        if (!isAuthorized(request, env)) {
          return json({ ok: false, error: 'Unauthorized' }, 401, cors);
        }
        if (request.method === 'GET') {
          const { results } = await env.DB.prepare(
            'SELECT * FROM discount_codes ORDER BY created_at DESC'
          ).all();
          return json({ ok: true, data: results }, 200, cors);
        }
        if (request.method === 'POST') {
          const body = await request.json();
          const { codigo, descripcion, tipo, valor, propiedad, usos_max } = body;
          if (!codigo || !tipo || valor == null) {
            return json({ ok: false, error: 'Faltan campos' }, 400, cors);
          }
          await env.DB.prepare(
            `INSERT INTO discount_codes (codigo, descripcion, tipo, valor, propiedad, usos_max)
             VALUES (?, ?, ?, ?, ?, ?)`
          ).bind(
            codigo.toUpperCase().trim(),
            descripcion || null,
            tipo,
            parseFloat(valor),
            propiedad || null,
            usos_max ? parseInt(usos_max) : null
          ).run();
          return json({ ok: true }, 200, cors);
        }
      }

      if (url.pathname.startsWith('/admin/discount-codes/') && request.method === 'DELETE') {
        if (!isAuthorized(request, env)) {
          return json({ ok: false, error: 'Unauthorized' }, 401, cors);
        }
        const id = url.pathname.split('/').pop();
        await env.DB.prepare('DELETE FROM discount_codes WHERE id = ?').bind(parseInt(id)).run();
        return json({ ok: true }, 200, cors);
      }

      // Public endpoints (POST)
      if (url.pathname === '/discount-codes/validate' && request.method === 'POST') {
        const body = await request.json();
        const { codigo, propiedad } = body;
        if (!codigo) return json({ ok: false, error: 'Código requerido' }, 400, cors);
        const row = await env.DB.prepare(
          `SELECT * FROM discount_codes WHERE UPPER(codigo) = UPPER(?) AND activo = 1`
        ).bind(codigo.trim()).first();
        if (!row) return json({ ok: false, error: 'Código no válido' }, 200, cors);
        if (row.usos_max != null && row.usos_usados >= row.usos_max) {
          return json({ ok: false, error: 'Código agotado' }, 200, cors);
        }
        if (row.propiedad && propiedad && row.propiedad !== propiedad) {
          return json({ ok: false, error: 'Código no aplicable a esta propiedad' }, 200, cors);
        }
        return json({
          ok: true,
          discount: { codigo: row.codigo, tipo: row.tipo, valor: row.valor, descripcion: row.descripcion }
        }, 200, cors);
      }

      if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405, headers: cors });
      }

      if (url.pathname === '/contacto') {
        return await handleContacto(request, env, cors);
      }
      if (url.pathname === '/reserva') {
        return await handleReserva(request, env, cors);
      }
      return new Response('Not found', { status: 404, headers: cors });
    } catch (err) {
      return new Response(JSON.stringify({ ok: false, error: err.message }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
  },
};

async function handleContacto(request, env, cors) {
  const data = await request.formData();

  const nombre = (data.get('name') || '').trim();
  const email = (data.get('email') || '').trim();
  const telefono = (data.get('telefono') || '').trim();
  const mensaje = (data.get('message') || '').trim();

  if (!nombre || !email) {
    return json({ ok: false, error: 'Faltan campos obligatorios' }, 400, cors);
  }

  await env.DB.prepare(
    `INSERT INTO contactos (nombre, email, telefono, mensaje) VALUES (?, ?, ?, ?)`
  ).bind(nombre, email, telefono, mensaje).run();

  return json({ ok: true }, 200, cors);
}

async function handleReserva(request, env, cors) {
  const data = await request.formData();

  const nombre = (data.get('name') || '').trim();
  const email = (data.get('email') || '').trim();
  const telefono = (data.get('telefono') || '').trim();
  const entrada = data.get('entrada') || '';
  const salida = data.get('salida') || '';
  const adultos = parseInt(data.get('adultos') || '1', 10);
  const ninos = parseInt(data.get('ninos') || '0', 10);
  const noches = parseInt(data.get('nights') || '0', 10);
  const precio_total = data.get('total_price') || '';
  const desglose = data.get('price_breakdown') || '';
  const comentarios = (data.get('message') || '').trim();
  const propiedad = (data.get('from_name') || '').trim();
  const promo_code = (data.get('promo_code') || '').trim().toUpperCase() || null;

  if (!nombre || !email) {
    return json({ ok: false, error: 'Faltan campos obligatorios' }, 400, cors);
  }

  await env.DB.prepare(
    `INSERT INTO reservas (propiedad, nombre, email, telefono, entrada, salida, adultos, ninos, noches, precio_total, desglose, comentarios, promo_code)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(propiedad, nombre, email, telefono, entrada, salida, adultos, ninos, noches, precio_total, desglose, comentarios, promo_code).run();

  if (promo_code) {
    await env.DB.prepare(
      `UPDATE discount_codes SET usos_usados = usos_usados + 1 WHERE UPPER(codigo) = ? AND activo = 1`
    ).bind(promo_code).run();
  }

  return json({ ok: true }, 200, cors);
}
