/**
 * property-page.js — Shared logic for all property pages.
 *
 * Each page must declare window.PAGE_CONFIG before loading this script:
 *   window.PAGE_CONFIG = {
 *     icalSlugs:   ['slug-airbnb', 'slug-booking'],
 *     maxPersonas: 4,
 *   };
 */

// ── iCAL + CALENDARIO ────────────────────────────────────────────────────────
const WORKER          = 'https://tuscasasvacaciones.eduardgomez-4.workers.dev';
const MESES           = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS            = ['L','M','X','J','V','S','D'];
const MAX_MESES_VISTA = 9;

let fechasReservadas = new Set();
let mesActual        = new Date().getMonth();
let anyoActual       = new Date().getFullYear();
let fechaEntrada     = null;
let fechaSalida      = null;

/* Casa Blava defaults: set rates & holidays in JS (keeps config out of HTML). */
(function setCasaBlavaDefaults(){
  try {
    const path = window.location.pathname || '';
    const title = document.title || '';
    const isCasaBlava = path.includes('Casa_blava') || title.includes('Casa Blava') || path.includes('/Casa_blava');
    if (!isCasaBlava) return;
    window.PAGE_CONFIG = window.PAGE_CONFIG || {};
    window.PAGE_CONFIG.rates = window.PAGE_CONFIG.rates || { "10": { weekday: 100, weekend: 150 }, "11": { weekday: 100, weekend: 150 } };
    window.PAGE_CONFIG.holidays = window.PAGE_CONFIG.holidays || ['11-01','12-06','12-07','12-08','12-24','12-25','12-26','12-31'];
  } catch (e) { console.warn('setCasaBlavaDefaults error', e); }
})();

async function cargarIcal() {
  const dot    = document.getElementById('syncDot');
  const text   = document.getElementById('syncText');
  const slugs  = (window.PAGE_CONFIG || {}).icalSlugs || [];
  try {
    const responses = await Promise.all(slugs.map(s => fetch(WORKER + '/ical/' + s)));
    const texts     = await Promise.all(responses.map(r => r.ok ? r.text() : Promise.resolve('')));
    fechasReservadas = new Set(texts.flatMap(t => [...parsearIcal(t)]));
    dot.className    = 'sync-dot ok';
    text.textContent = 'Sincronizado';
  } catch (e) {
    dot.className    = 'sync-dot error';
    text.textContent = 'Sin conexión — mostrando sin reservas';
    console.error('iCal error:', e);
  }
  renderCalendario();
}

function parsearIcal(texto) {
  const fechas    = new Set();
  const textoNorm = texto.replace(/\r\n|\r/g, '\n');
  const eventos   = textoNorm.split('BEGIN:VEVENT');
  const hoy       = new Date(); hoy.setHours(0,0,0,0);
  for (let i = 1; i < eventos.length; i++) {
    const bloque  = eventos[i];
    const dtStart = bloque.match(/DTSTART[^:\n]*:(\d{8})/);
    const dtEnd   = bloque.match(/DTEND[^:\n]*:(\d{8})/);
    if (!dtStart || !dtEnd) continue;
    let cur   = parseFecha(dtStart[1]);
    const fin = parseFecha(dtEnd[1]);
    if (cur.getTime() === fin.getTime()) {
      if (cur >= hoy) fechas.add(toKey(cur));
    } else {
      while (cur < fin) {
        if (cur >= hoy) fechas.add(toKey(cur));
        cur = new Date(cur.getTime() + 86400000);
      }
    }
  }
  return fechas;
}

function parseFecha(s) {
  return new Date(+s.slice(0,4), +s.slice(4,6) - 1, +s.slice(6,8));
}

function toKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function renderCalendario() {
  const grid     = document.getElementById('calendarioGrid');
  const labelMes = document.getElementById('mesActual');
  grid.innerHTML = '';
  labelMes.textContent = `${MESES[mesActual]} ${anyoActual}`;

  DIAS.forEach(d => {
    const el = document.createElement('div');
    el.className = 'calendar-day-name';
    el.textContent = d;
    grid.appendChild(el);
  });

  const hoy       = new Date(); hoy.setHours(0,0,0,0);
  const primerDia = new Date(anyoActual, mesActual, 1).getDay();
  const ultimoDia = new Date(anyoActual, mesActual + 1, 0).getDate();
  const offset    = primerDia === 0 ? 6 : primerDia - 1;

  for (let i = 0; i < offset; i++) {
    const el = document.createElement('div');
    el.className = 'calendar-day empty';
    grid.appendChild(el);
  }

  for (let dia = 1; dia <= ultimoDia; dia++) {
    const fecha = new Date(anyoActual, mesActual, dia);
    const key   = toKey(fecha);
    const el    = document.createElement('div');
    el.className   = 'calendar-day';
    el.textContent = dia;
    el.setAttribute('data-date', key);

    if (fecha < hoy) {
      el.classList.add('disabled');
    } else {
      if (fechasReservadas.has(key)) {
        // Determine if this booked date can be used as a checkout (i.e., fecha > fechaEntrada and no booked days between entrada and this day)
        let canBeCheckout = false;
        if (fechaEntrada && fecha > fechaEntrada) {
          let cur = new Date(fechaEntrada.getTime() + 86400000);
          canBeCheckout = true;
          while (cur < fecha) {
            if (fechasReservadas.has(toKey(cur))) { canBeCheckout = false; break; }
            cur = new Date(cur.getTime() + 86400000);
          }
        }
        if (canBeCheckout) {
          el.classList.add('available');
          el.title = 'Salida';
        } else {
          el.classList.add('booked');
          el.title = 'No disponible';
        }
      } else {
        el.classList.add('available');
      }
      // Clicks handled by delegated listener so booked days can be used as checkout.
    }

    if (fechaEntrada && toKey(fecha) === toKey(fechaEntrada)) el.classList.add('selected');
    if (fechaSalida  && toKey(fecha) === toKey(fechaSalida))  el.classList.add('selected');
    if (fechaEntrada && fechaSalida && fecha > fechaEntrada && fecha < fechaSalida) el.classList.add('range');

    grid.appendChild(el);
  }
}

function seleccionarFecha(fecha) {
  const key = toKey(fecha);
  const isBooked = fechasReservadas.has(key);

  if (!fechaEntrada || (fechaEntrada && fechaSalida)) {
    // Selecting a new entrada: must not be a booked date
    if (isBooked) {
      alert('No puedes seleccionar una fecha de entrada que ya está reservada.');
      return;
    }
    fechaEntrada = fecha;
    fechaSalida  = null;
  } else if (fecha > fechaEntrada) {
    // Selecting salida: allow selecting a booked date as checkout (so long as there are no booked days between entrada and salida)
    let cur = new Date(fechaEntrada.getTime() + 86400000);
    while (cur < fecha) {
      if (fechasReservadas.has(toKey(cur))) {
        alert('No puedes seleccionar un rango que incluya días ya reservados.');
        fechaEntrada = fecha;
        fechaSalida  = null;
        actualizarInputsFecha();
        renderCalendario();
        return;
      }
      cur = new Date(cur.getTime() + 86400000);
    }
    // fecha (checkout) can be a booked day (checkout before that booking)
    fechaSalida = fecha;
  } else {
    // Selecting an earlier or same day as entrada -> set new entrada (must not be booked)
    if (isBooked) {
      alert('No puedes seleccionar una fecha de entrada que ya está reservada.');
      return;
    }
    fechaEntrada = fecha;
    fechaSalida  = null;
  }

  actualizarInputsFecha();
  validarFechas();
  renderCalendario();
}

/* Use toKey() instead of toISOString() to avoid UTC timezone shift */
function actualizarInputsFecha() {
  document.getElementById('fechaEntrada').value = fechaEntrada ? toKey(fechaEntrada) : '';
  document.getElementById('fechaSalida').value  = fechaSalida  ? toKey(fechaSalida)  : '';
  calcularPrecio();
}

function cambiarMes(delta) {
  const hoy       = new Date();
  const minMes    = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const maxMes    = new Date(hoy.getFullYear(), hoy.getMonth() + MAX_MESES_VISTA, 1);
  const siguiente = new Date(anyoActual, mesActual + delta, 1);
  if (siguiente < minMes || siguiente > maxMes) return;
  mesActual += delta;
  if (mesActual < 0)  { mesActual = 11; anyoActual--; }
  if (mesActual > 11) { mesActual = 0;  anyoActual++; }
  renderCalendario();
}

(function initCalendario() {
  const hoy     = new Date();
  const hoyStr  = toKey(hoy);
  const maxDate = new Date(hoy.getFullYear(), hoy.getMonth() + MAX_MESES_VISTA, hoy.getDate());
  const maxStr  = toKey(maxDate);
  const iE = document.getElementById('fechaEntrada');
  const iS = document.getElementById('fechaSalida');
  iE.min = hoyStr; iE.max = maxStr;
  iS.min = hoyStr; iS.max = maxStr;
  /* Update salida min when entrada changes (good UX for all pages) */
  iE.addEventListener('change', function () {
    if (!this.value) return;
    const minSalida = new Date(this.value + 'T00:00:00');
    minSalida.setDate(minSalida.getDate() + 1);
    iS.min = toKey(minSalida);
    if (iS.value && iS.value <= this.value) iS.value = '';
  });
  // Delegación de eventos en el grid
  document.getElementById('calendarioGrid').addEventListener('click', (e) => {
    const el = e.target.closest('[data-date]');
    if (!el) return;
    if (el.classList.contains('disabled')) return;
    const key = el.getAttribute('data-date');
    const fecha = parseFecha(key.replace(/-/g, ''));
    seleccionarFecha(fecha);
  });
  renderCalendario();
  cargarIcal();
})();


// ── Validaciones ─────────────────────────────────────────────────────────────
function setFieldState(input, errorEl, valid, msg) {
  input.style.borderColor = valid ? 'var(--verde-ok)' : 'var(--rojo)';
  if (errorEl) {
    if (msg) errorEl.textContent = msg;
    errorEl.style.display = valid ? 'none' : 'block';
  }
  return valid;
}

function validarNombre(input) {
  const val = input.value.trim();
  const msg = input.parentElement.querySelector('.error-nombre');
  if (!val)  return setFieldState(input, msg, false, '⚠️ El nombre es obligatorio');
  if (!/^[a-zA-ZáéíóúàèìòùäëïöüÁÉÍÓÚÀÈÌÒÙÄËÏÖÜñÑçÇ\s\-']+$/.test(val))
             return setFieldState(input, msg, false, '⚠️ El nombre solo puede contener letras');
  return setFieldState(input, msg, true);
}

function validarEmail(input) {
  const val = input.value.trim();
  const msg = input.parentElement.querySelector('.error-email');
  if (!val)  return setFieldState(input, msg, false, '⚠️ El email es obligatorio');
  // Prefer built-in browser validation when available
  if (input.type === 'email' && typeof input.checkValidity === 'function' && input.checkValidity()) {
    return setFieldState(input, msg, true);
  }
  const re = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  if (!re.test(val)) return setFieldState(input, msg, false, '⚠️ Introduce un email válido');
  return setFieldState(input, msg, true);
}

function validarTelefono(input) {
  const raw = input.value.trim();
  // Keep digits and leading + only
  const val = raw.replace(/[^\d+]/g, '');
  const msg = input.parentElement.querySelector('.error-tel');
  if (!val)  return setFieldState(input, msg, false, '⚠️ El teléfono es obligatorio');
  // If the number has Spanish country code, require mobile pattern (6-9). Otherwise accept E.164 for other countries.
  if (/^(?:\+34|0034)/.test(val)) {
    const ok = /^(?:\+34|0034)[6-9]\d{8}$/.test(val);
    return setFieldState(input, msg, ok, '⚠️ Introduce un teléfono válido');
  }
  if (/^\+/.test(val)) {
    const ok = /^\+[1-9]\d{6,14}$/.test(val);
    return setFieldState(input, msg, ok, '⚠️ Introduce un teléfono válido');
  }
  // Local number without country code: assume Spanish mobile if starts 6-9 and 9 digits
  const okLocal = /^[6-9]\d{8}$/.test(val);
  return setFieldState(input, msg, okLocal, '⚠️ Introduce un teléfono válido');
}

function validarPersonas() {
  const iA    = document.querySelector('input[name="adultos"]');
  const iN    = document.querySelector('input[name="ninos"]');
  const msg   = document.getElementById('errorPersonas');
  const total = (parseInt(iA.value) || 0) + (parseInt(iN.value) || 0);
  const max   = (window.PAGE_CONFIG || {}).maxPersonas || 2;
  const ok    = total >= 1 && total <= max;
  iA.style.borderColor = ok ? 'var(--verde-ok)' : 'var(--rojo)';
  iN.style.borderColor = ok ? 'var(--verde-ok)' : 'var(--rojo)';
  if (msg) msg.style.display = ok ? 'none' : 'block';
  return ok;
}

function validarFechas() {
  const iE  = document.getElementById('fechaEntrada');
  const iS  = document.getElementById('fechaSalida');
  const msg = document.getElementById('errorFechas');
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const max = new Date(hoy.getFullYear(), hoy.getMonth() + MAX_MESES_VISTA, hoy.getDate());
  let ok    = true;

  if (!iE.value || new Date(iE.value + 'T00:00:00') < hoy || new Date(iE.value + 'T00:00:00') > max) {
    iE.style.borderColor = 'var(--rojo)'; ok = false;
  } else {
    iE.style.borderColor = 'var(--verde-ok)';
  }

  const entrada = new Date(iE.value + 'T00:00:00');
  const salida  = new Date(iS.value + 'T00:00:00');
  if (!iS.value || salida <= entrada || salida < hoy || salida > max) {
    iS.style.borderColor = 'var(--rojo)'; ok = false;
  } else {
    iS.style.borderColor = 'var(--verde-ok)';
  }

  if (msg) msg.style.display = ok ? 'none' : 'block';
  return ok;
}


// ── Cálculo de precios (parametrizable por página vía window.PAGE_CONFIG)
const LIMPIEZA = 50;
let lastPricing = { nights: 0, subtotal: 0, cleaning: (window.PAGE_CONFIG && window.PAGE_CONFIG.cleaning) || LIMPIEZA, total: 0, breakdown: '' };

function esFinDeSemana(fecha) {
  const d = fecha.getDay();
  return d === 5 || d === 6; // viernes o sábado
}

function obtenerTarifaNoche(fecha) {
  // If the page provides explicit rates per month, use them. Rates can be:
  //  - a number (same price every day that month)
  //  - an object { weekday: X, weekend: Y }
  // Additionally pages can provide PAGE_CONFIG.holidays as array of 'MM-DD' strings.
  const cfg = window.PAGE_CONFIG || {};
  const rates = cfg.rates || null;
  const m = fecha.getMonth() + 1;
  const dia = fecha.getDate();

  // Helper to detect if the NEXT day is a configured holiday (so the current night is the night before a holiday)
  function isNightBeforeHoliday(d) {
    const holidays = (cfg.holidays || []);
    const next = new Date(d.getTime() + 86400000);
    const mmdd = `${String(next.getMonth()+1).padStart(2,'0')}-${String(next.getDate()).padStart(2,'0')}`;
    return holidays.includes(mmdd);
  }

  if (rates) {
    const r = rates[String(m)];
    if (r === null || r === undefined) {
      // Explicitly closed month -> return 0 so total shows 0
      return 0;
    }
    let base = 0;
    if (typeof r === 'number') base = r;
    else if (typeof r === 'object') base = (esFinDeSemana(fecha) && r.weekend !== undefined) ? r.weekend : (r.weekday !== undefined ? r.weekday : 0);

    if (isNightBeforeHoliday(fecha)) return Math.round(base * 1.6);
    return base;
  }

  // Fallback: legacy Casa Blava hard-coded rules
  let baseRate;
  if (m === 7) baseRate = 250;
  else if (m === 8) baseRate = 260;
  else if (m === 5) baseRate = esFinDeSemana(fecha) ? 190 : 140;
  else if (m === 6) baseRate = esFinDeSemana(fecha) ? 200 : 160;
  else if (m === 9) {
    if (dia >= 1 && dia <= 6) baseRate = 190;
    else baseRate = esFinDeSemana(fecha) ? 180 : 150;
  } else if (m === 10) baseRate = esFinDeSemana(fecha) ? 180 : 130;
  else if (m === 11) baseRate = esFinDeSemana(fecha) ? 180 : 110;
  else baseRate = 140;

  if (isNightBeforeHoliday(fecha)) return Math.round(baseRate * 1.6);
  return baseRate;
}

function calcularPrecio() {
  const pa = document.getElementById('priceAmount');
  const ps = document.getElementById('priceSummary');
  // mobile/alternate targets
  const paM = document.getElementById('priceAmountMobile');
  const psM = document.getElementById('priceSummaryMobile');
  const mobileContainer = document.getElementById('mobilePrice');
  const lang = (window.PAGE_CONFIG && window.PAGE_CONFIG.lang) || 'es';
  const texts = { es: 'Selecciona fechas', en: 'Select dates' };

  if (!fechaEntrada || !fechaSalida) {
    const msg = texts[lang] || texts.es;
    if (pa) pa.textContent = msg;
    if (ps) ps.style.display = 'none';
    if (paM) paM.textContent = msg;
    if (psM) psM.style.display = 'none';
    if (mobileContainer) mobileContainer.style.display = 'none';

    lastPricing = { nights: 0, subtotal: 0, cleaning: LIMPIEZA, total: 0, breakdown: '' };
    // Clear hidden fields
    const hN2 = document.getElementById('hdNights');
    const hS2 = document.getElementById('hdSubtotal');
    const hC2 = document.getElementById('hdCleaning');
    const hT2 = document.getElementById('hdTotalPrice');
    const hB2 = document.getElementById('hdPriceBreakdown');
    if (hN2) hN2.value = '';
    if (hS2) hS2.value = '';
    if (hC2) hC2.value = '';
    if (hT2) hT2.value = '';
    if (hB2) hB2.value = '';
    actualizarWAMensajes();
    return;
  }

  const noches = Math.ceil((fechaSalida - fechaEntrada) / 86400000);
  let subtotal = 0;
  let cur = new Date(fechaEntrada.getTime());
  let breakdownHTML = '';
  let breakdownText = '';
  for (let i = 0; i < noches; i++) {
    const rate = obtenerTarifaNoche(cur);
    subtotal += rate;
    breakdownHTML += `<div>${toKey(cur)}: ${rate} €</div>`;
    breakdownText += `${toKey(cur)}: ${rate} €\n`;
    cur = new Date(cur.getTime() + 86400000);
  }
  const limpieza = (window.PAGE_CONFIG && window.PAGE_CONFIG.cleaning) || LIMPIEZA;
  const total = subtotal + limpieza;

  if (pa) pa.textContent = total.toFixed(2) + ' €';
  if (ps) {
    ps.style.display = 'block';
    ps.querySelector('#nightsCount').textContent = noches;
    ps.querySelector('#subtotalAmount').textContent = subtotal.toFixed(2) + ' €';
    ps.querySelector('#cleaningAmount').textContent = limpieza.toFixed(2) + ' €';
    ps.querySelector('#totalAmount').textContent = total.toFixed(2) + ' €';
    ps.querySelector('.breakdown').innerHTML = breakdownHTML;
  }

  // Update mobile targets if present
  if (paM) paM.textContent = total.toFixed(2) + ' €';
  if (psM) {
    psM.style.display = 'block';
    const nM = document.getElementById('nightsCountMobile');
    const subM = document.getElementById('subtotalAmountMobile');
    const cleanM = document.getElementById('cleaningAmountMobile');
    const totM = document.getElementById('totalAmountMobile');
    if (nM) nM.textContent = noches;
    if (subM) subM.textContent = subtotal.toFixed(2) + ' €';
    if (cleanM) cleanM.textContent = limpieza.toFixed(2) + ' €';
    if (totM) totM.textContent = total.toFixed(2) + ' €';
    const bdM = document.querySelector('.breakdown-mobile');
    if (bdM) bdM.innerHTML = breakdownHTML;
  }
  if (mobileContainer) mobileContainer.style.display = 'block';

  lastPricing = { nights: noches, subtotal: subtotal, cleaning: limpieza, total: total, breakdown: breakdownText };

  // Update hidden fields so other scripts (calendar component) or form submissions include pricing
  const hN = document.getElementById('hdNights');
  const hS = document.getElementById('hdSubtotal');
  const hC = document.getElementById('hdCleaning');
  const hT = document.getElementById('hdTotalPrice');
  const hB = document.getElementById('hdPriceBreakdown');
  if (hN) hN.value = String(lastPricing.nights);
  if (hS) hS.value = lastPricing.subtotal.toFixed(2);
  if (hC) hC.value = lastPricing.cleaning.toFixed(2);
  if (hT) hT.value = lastPricing.total.toFixed(2);
  if (hB) hB.value = lastPricing.breakdown;

  actualizarWAMensajes();
}


// ── Formulario — handler único ───────────────────────────────────────────────
(function initForm() {
  const form        = document.getElementById('formularioReserva');
  const btn         = document.getElementById('submitBtnReserva');
  const errorMsg    = document.getElementById('mensajeError');
  const formExito   = document.getElementById('formSuccess');
  const nombreInput = form.querySelector('input[name="name"]');
  const emailInput  = form.querySelector('input[name="email"]');
  const telInput    = form.querySelector('input[name="telefono"]');

  nombreInput.addEventListener('blur', () => validarNombre(nombreInput));
  emailInput.addEventListener('blur',  () => validarEmail(emailInput));
  telInput.addEventListener('blur',    () => validarTelefono(telInput));

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    /* Run all validators explicitly so every field shows its error state */
    const v1 = validarFechas();
    const v2 = validarPersonas();
    const v3 = validarNombre(nombreInput);
    const v4 = validarEmail(emailInput);
    const v5 = validarTelefono(telInput);

    if (!(v1 && v2 && v3 && v4 && v5)) {
      (form.querySelector('.form-input[style*="var(--rojo)"]') ||
       form.querySelector('.form-input[style*="e74c3c"]'))
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    btn.disabled      = true;
    btn.textContent   = 'Enviando...';
    btn.style.opacity = '0.7';
    errorMsg.style.display = 'none';

    try {
      const fd = new FormData(form);
      fd.append('nights', String(lastPricing.nights));
      fd.append('subtotal', lastPricing.subtotal.toFixed(2));
      fd.append('cleaning', lastPricing.cleaning.toFixed(2));
      fd.append('total_price', lastPricing.total.toFixed(2));
      fd.append('price_breakdown', lastPricing.breakdown);

      const res = await fetch('https://api.web3forms.com/submit', { method: 'POST', body: fd });
      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch (e) { console.warn('Non-JSON response from web3forms:', text); }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText} - ${data.message || text.slice(0,200)}`);
      }

      if (data && data.success) {
        form.querySelectorAll('.form-row, .form-group, .submit-btn, .field-error')
            .forEach(el => el.style.display = 'none');
        formExito.style.display = 'block';
      } else {
        throw new Error('Respuesta no exitosa: ' + (JSON.stringify(data) || text));
      }
    } catch (err) {
      console.error('Reservation submit error:', err);

      // Fallback: si fetch falla (CORS o red), intentar envío tradicional del formulario
      try {
        const fallback = document.createElement('form');
        fallback.method = 'POST';
        fallback.action = form.action;
        fallback.style.display = 'none';

        const fd = new FormData(form);
        fd.append('nights', String(lastPricing.nights));
        fd.append('subtotal', lastPricing.subtotal.toFixed(2));
        fd.append('cleaning', lastPricing.cleaning.toFixed(2));
        fd.append('total_price', lastPricing.total.toFixed(2));
        fd.append('price_breakdown', lastPricing.breakdown);

        for (const [k, v] of fd.entries()) {
          const inp = document.createElement('input');
          inp.type = 'hidden'; inp.name = k; inp.value = v;
          fallback.appendChild(inp);
        }
        document.body.appendChild(fallback);
        // Esto navegará fuera de la SPA y realiza el POST directamente (evita problemas CORS)
        fallback.submit();
        return;
      } catch (e2) {
        console.error('Fallback submit error:', e2);
        errorMsg.style.display = 'block';
        errorMsg.textContent = '⚠️ Error al enviar la solicitud: ' + (err && err.message ? err.message : 'comprueba la consola');
        btn.disabled      = false;
        btn.textContent   = 'Solicitar reserva';
        btn.style.opacity = '1';
      }
    }
  });
})();


// ── Menú móvil ───────────────────────────────────────────────────────────────
function toggleMobileMenu() {
  document.getElementById('main-nav').classList.toggle('active');
}
document.querySelectorAll('#main-nav a').forEach(link => {
  link.addEventListener('click', () => document.getElementById('main-nav').classList.remove('active'));
});
document.addEventListener('click', (e) => {
  const nav = document.getElementById('main-nav');
  const btn = document.querySelector('.mobile-menu-btn');
  if (nav && btn && !nav.contains(e.target) && !btn.contains(e.target)) nav.classList.remove('active');
});


// ── Lightbox ─────────────────────────────────────────────────────────────────
let currentIndex   = 0;
let currentGallery = [];

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.gallery').forEach(gallery => {
    const items = [...gallery.querySelectorAll('.gallery-main, .gallery-item')];
    currentGallery = items.map(i => i.style.backgroundImage.replace(/url\(["']?|["']?\)/g, ''));
    items.forEach((item, index) => {
      item.addEventListener('click', () => { currentIndex = index; openLightbox(currentGallery[index]); });
    });
  });
});

function openLightbox(src) {
  document.getElementById('lightbox-img').src = src;
  document.getElementById('lightbox').classList.add('active');
  document.body.style.overflow = 'hidden';
  updateCounter();
}
function closeLightbox() {
  document.getElementById('lightbox').classList.remove('active');
  document.body.style.overflow = '';
}
function changeImage(dir) {
  currentIndex = (currentIndex + dir + currentGallery.length) % currentGallery.length;
  document.getElementById('lightbox-img').src = currentGallery[currentIndex];
  updateCounter();
}
function updateCounter() {
  document.getElementById('lightbox-counter').textContent = `${currentIndex + 1} / ${currentGallery.length}`;
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape')     closeLightbox();
  if (e.key === 'ArrowRight') changeImage(1);
  if (e.key === 'ArrowLeft')  changeImage(-1);
});
document.getElementById('lightbox').addEventListener('click', (e) => {
  if (e.target === document.getElementById('lightbox')) closeLightbox();
});


// ── WhatsApp flotante ─────────────────────────────────────────────────────────
function toggleWA() {
  document.getElementById('waOptions').classList.toggle('open');
  document.getElementById('waBtn').classList.toggle('open');
  // Actualizar mensajes de WhatsApp con fechas seleccionadas
  actualizarWAMensajes();
}
function actualizarWAMensajes() {
  const isEnglish = document.documentElement.lang?.startsWith('en') || window.location.pathname.includes('/en/');
  const propertyName = document.title.split(' - ')[0] || 'esta propiedad'; // Asumiendo que el título es "Nombre - Sitio"
  const baseMsg = isEnglish
    ? `Hello, I would like to book ${propertyName}.`
    : `Hola, me gustaría reservar ${propertyName}.`;
  let msg = baseMsg;
  if (fechaEntrada && fechaSalida) {
    const noches = lastPricing && lastPricing.nights ? lastPricing.nights : Math.ceil((fechaSalida - fechaEntrada) / (1000 * 60 * 60 * 24));
    if (isEnglish) {
      msg += ` From ${toKey(fechaEntrada)} to ${toKey(fechaSalida)} (${noches} nights).`;
      if (lastPricing && lastPricing.total) msg += ` Total: ${lastPricing.total.toFixed(2)} € (Subtotal: ${lastPricing.subtotal.toFixed(2)} €, Cleaning: ${lastPricing.cleaning.toFixed(2)} €).`;
      if (lastPricing && lastPricing.breakdown) msg += ` Breakdown:\n${lastPricing.breakdown}`;
    } else {
      msg += ` Del ${toKey(fechaEntrada)} al ${toKey(fechaSalida)} (${noches} noches).`;
      if (lastPricing && lastPricing.total) msg += ` Importe: ${lastPricing.total.toFixed(2)} € (Subtotal: ${lastPricing.subtotal.toFixed(2)} €, Limpieza: ${lastPricing.cleaning.toFixed(2)} €).`;
      if (lastPricing && lastPricing.breakdown) msg += ` Desglose:\n${lastPricing.breakdown}`;
    }
  } else if (fechaEntrada) {
    msg += isEnglish
      ? ` Starting from ${toKey(fechaEntrada)}.`
      : ` A partir del ${toKey(fechaEntrada)}.`;
  }
  // Asumiendo que hay enlaces con data-wa dentro de waOptions
  document.querySelectorAll('#waOptions a').forEach(a => {
    const originalHref = a.getAttribute('data-original-href') || a.href;
    a.setAttribute('data-original-href', originalHref);
    const url = new URL(originalHref);
    url.searchParams.set('text', msg);
    a.href = url.toString();
  });
}
document.addEventListener('click', (e) => {
  const c = document.querySelector('.wa-container');
  if (c && !c.contains(e.target)) {
    document.getElementById('waOptions').classList.remove('open');
    document.getElementById('waBtn').classList.remove('open');
  }
});
