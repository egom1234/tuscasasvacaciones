function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders();

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: cors });
    }

    const url = new URL(request.url);

    try {
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

  if (!nombre || !email) {
    return json({ ok: false, error: 'Faltan campos obligatorios' }, 400, cors);
  }

  await env.DB.prepare(
    `INSERT INTO reservas (propiedad, nombre, email, telefono, entrada, salida, adultos, ninos, noches, precio_total, desglose, comentarios)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(propiedad, nombre, email, telefono, entrada, salida, adultos, ninos, noches, precio_total, desglose, comentarios).run();

  return json({ ok: true }, 200, cors);
}

function json(body, status, cors) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
