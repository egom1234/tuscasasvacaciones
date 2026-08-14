/**
 * property-page.js — Shared logic for all property pages.
 */

const WORKER          = 'https://tuscasasvacaciones.eduardgomez-4.workers.dev';
const FORM_WORKER     = 'https://casitasdemar-form.eduardgomez-4.workers.dev';
const MESES_I18N = {
  es: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
  en: ['January','February','March','April','May','June','July','August','September','October','November','December']
};
const DIAS_I18N = {
  es: ['L','M','X','J','V','S','D'],
  en: ['M','T','W','T','F','S','S']
};
const MESES_ABREV_I18N = {
  es: ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'],
  en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
};
const MAX_MESES_VISTA = 9;

const I18N = {
  es: {
    syncOk: 'Sincronizado',
    syncError: 'Sin conexión — mostrando sin reservas',
    checkout: 'Salida',
    notAvailable: 'No disponible',
    alertBookedEntry: 'No puedes seleccionar una fecha de entrada que ya está reservada.',
    alertMinNights: (n) => `La estancia mínima es de ${n} noches.`,
    alertRangeBooked: 'No puedes seleccionar un rango que incluya días ya reservados.',
    fillGapTooltip: 'Oferta Fill the Gap · -20% · Sin mínimo de noches',
    fillGapLabel: 'Fill the Gap -20%',
    fillGapDiscount: 'Fill the Gap -20%',
    selectDates: 'Selecciona fechas',
    sending: 'Enviando...',
    requestBooking: 'Solicitar reserva',
    submitError: '⚠️ Error al enviar la solicitud: ',
    checkDates: '⚠️ Debes seleccionar las fechas de entrada y salida válidas',
    checkEmail: '⚠️ Introduce un email válido',
    checkPhone: '⚠️ Introduce un teléfono válido',
    nameRequired: '⚠️ El nombre es obligatorio',
    nameLetters: '⚠️ El nombre solo puede contener letras',
    emailRequired: '⚠️ El email es obligatorio',
    phoneRequired: '⚠️ El teléfono es obligatorio',
    directSaving: (amount) => `Precio directo · Ahorras ~${amount} € sin comisiones adicionales`,
    referralMsg: '¿Te ha gustado? Recomiéndanos a amigos o familia: cuando reserven mencionando tu nombre, ambos obtendréis un 5% de descuento en vuestra próxima reserva directa.',
    promoApply: 'Aplicar',
    promoRemove: 'Quitar',
    promoApplied: (code) => `Código "${code}" aplicado`,
    promoInvalid: 'Código no válido o no aplicable a esta propiedad.',
    waHello: (property) => `Hola, me gustaría reservar ${property}.`,
    waFromTo: (from, to, nights) => ` Del ${from} al ${to} (${nights} noches).`,
    waStarting: (from) => ` A partir del ${from}.`,
    waTotal: (total, subtotal, cleaning) => ` Importe: ${total} € (Subtotal: ${subtotal} €, Limpieza: ${cleaning} €).`,
    waTotalNoCleaning: (total, subtotal) => ` Importe: ${total} € (Subtotal: ${subtotal} €).`,
    waBreakdown: (txt) => ` Desglose:\n${txt}`,
    guestsLabel: (n) => `${n} pers.`,
    summaryPlaceholder: 'Elige tus fechas →',
    summaryEnterGuests: 'Indica huéspedes →',
    summaryCta: 'Reservar →',
    summaryWaTooltip: 'Escríbenos'
  },
  en: {
    syncOk: 'Synchronized',
    syncError: 'Offline — showing availability without reservations',
    checkout: 'Check-out',
    notAvailable: 'Not available',
    alertBookedEntry: 'You cannot select a check-in date that is already booked.',
    alertMinNights: (n) => `Minimum stay is ${n} nights.`,
    alertRangeBooked: 'You cannot select a range that includes already booked days.',
    fillGapTooltip: 'Fill the Gap offer · -20% · No minimum nights',
    fillGapLabel: 'Fill the Gap -20%',
    fillGapDiscount: 'Fill the Gap -20%',
    selectDates: 'Select dates',
    sending: 'Sending...',
    requestBooking: 'Request booking',
    submitError: '⚠️ Error sending request: ',
    checkDates: '⚠️ Please select valid check-in and check-out dates',
    checkEmail: '⚠️ Please enter a valid email address',
    checkPhone: '⚠️ Please enter a valid phone number',
    nameRequired: '⚠️ Name is required',
    nameLetters: '⚠️ Name can only contain letters',
    emailRequired: '⚠️ Email is required',
    phoneRequired: '⚠️ Phone number is required',
    directSaving: (amount) => `Direct price · Save ~€${amount} with no platform fees`,
    referralMsg: 'Enjoyed your stay? Recommend us to friends or family — when they book mentioning your name, you both get 5% off your next direct booking.',
    promoApply: 'Apply',
    promoRemove: 'Remove',
    promoApplied: (code) => `Code "${code}" applied`,
    promoInvalid: 'Invalid code or not applicable to this property.',
    waHello: (property) => `Hello, I would like to book ${property}.`,
    waFromTo: (from, to, nights) => ` From ${from} to ${to} (${nights} nights).`,
    waStarting: (from) => ` Starting from ${from}.`,
    waTotal: (total, subtotal, cleaning) => ` Total: ${total} € (Subtotal: ${subtotal} €, Cleaning: ${cleaning} €).`,
    waTotalNoCleaning: (total, subtotal) => ` Total: ${total} € (Subtotal: ${subtotal} €).`,
    waBreakdown: (txt) => ` Breakdown:\n${txt}`,
    guestsLabel: (n) => `${n} Guest${n !== 1 ? 's' : ''}`,
    summaryPlaceholder: 'Pick your dates →',
    summaryEnterGuests: 'Enter guests →',
    summaryCta: 'Book now →',
    summaryWaTooltip: 'Message us'
  }
};

function getLang() {
  return (window.PAGE_CONFIG && window.PAGE_CONFIG.lang) ||
         document.documentElement.lang?.slice(0, 2) ||
         (window.location.pathname.includes('/en/') ? 'en' : 'es');
}

function t(key, ...args) {
  const lang = getLang();
  const dict = I18N[lang] || I18N.es;
  const val = dict[key];
  return typeof val === 'function' ? val(...args) : val;
}

let fechasReservadas = new Set();
let gapDays          = new Set();
let mesActual        = new Date().getMonth();
let anyoActual       = new Date().getFullYear();
let fechaEntrada     = null;
let fechaSalida      = null;

function expandirRango(entrada, salida) {
  const fechas = new Set();
  const hoy    = new Date(); hoy.setHours(0,0,0,0);
  let cur      = new Date(entrada + 'T00:00:00');
  const fin    = new Date(salida  + 'T00:00:00');
  while (cur < fin) {
    if (cur >= hoy) fechas.add(toKey(cur));
    cur = new Date(cur.getTime() + 86400000);
  }
  return fechas;
}

async function cargarReservasConfirmadas() {
  const propiedad = (window.PAGE_CONFIG || {}).propiedad;
  if (!propiedad) return new Set();
  try {
    const res  = await fetch(FORM_WORKER + '/blocked-dates/' + encodeURIComponent(propiedad));
    const data = await res.json();
    if (!data.ok) return new Set();
    const fechas = new Set();
    (data.ranges || []).forEach(r => expandirRango(r.entrada, r.salida).forEach(k => fechas.add(k)));
    return fechas;
  } catch (e) {
    console.error('Blocked-dates fetch failed:', e);
    return new Set();
  }
}

async function cargarIcal() {
  const dot   = document.getElementById('syncDot');
  const text  = document.getElementById('syncText');
  const slugs = (window.PAGE_CONFIG || {}).icalSlugs || [];
  try {
    const responses = await Promise.all(slugs.map(s => fetch(WORKER + '/ical/' + s)));
    const texts     = await Promise.all(responses.map(r => r.ok ? r.text() : Promise.resolve('')));
    const reservadasConfirmadas = await cargarReservasConfirmadas();
    fechasReservadas = new Set([...texts.flatMap(t => [...parsearIcal(t)]), ...reservadasConfirmadas]);
    dot.className    = 'sync-dot ok';
    text.textContent = t('syncOk');
  } catch (e) {
    dot.className    = 'sync-dot error';
    text.textContent = t('syncError');
    console.error('iCal error:', e);
  }
  computarGaps();
  actualizarLeyendaGap();
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

function computarGaps() {
  gapDays = new Set();
  if ((window.PAGE_CONFIG || {}).noGapDiscount) return;
  const minNoches = (window.PAGE_CONFIG || {}).minNoches || 1;
  if (minNoches <= 1) return;

  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const fin = new Date(hoy.getFullYear(), hoy.getMonth() + MAX_MESES_VISTA + 1, 0);

  let cur = new Date(hoy.getTime());
  let freeRun = [];
  let prevBooked = false;

  while (cur <= fin) {
    const key = toKey(cur);
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
}

function isGapSelection(entrada, salida) {
  if (gapDays.size === 0) return false;
  let cur = new Date(entrada.getTime());
  while (cur < salida) {
    if (!gapDays.has(toKey(cur))) return false;
    cur = new Date(cur.getTime() + 86400000);
  }
  return true;
}

function showCalendarError(msg) {
  let el = document.getElementById('calendarError');
  if (!el) {
    el = document.createElement('div');
    el.id = 'calendarError';
    el.className = 'field-error';
    el.style.cssText = 'display:block;margin-top:0.5rem;';
    const legend = document.querySelector('.calendar-legend');
    if (legend) legend.after(el);
    else document.querySelector('.calendar')?.appendChild(el);
  }
  el.textContent = msg;
  el.style.display = 'block';
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.style.display = 'none'; }, 4000);
}

function actualizarLeyendaGap() {
  const legend = document.querySelector('.calendar-legend');
  if (!legend) return;
  const existing = legend.querySelector('.legend-item-gap');
  if (gapDays.size > 0) {
    if (!existing) {
      const item = document.createElement('div');
      item.className = 'legend-item legend-item-gap';
      item.innerHTML = `<div class="legend-dot gap"></div> ${t('fillGapLabel')}`;
      legend.appendChild(item);
    }
  } else if (existing) {
    existing.remove();
  }
}

function toKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function renderCalendario() {
  const grid     = document.getElementById('calendarioGrid');
  const labelMes = document.getElementById('mesActual');
  const lang     = getLang();
  const MESES    = MESES_I18N[lang] || MESES_I18N.es;
  const DIAS     = DIAS_I18N[lang] || DIAS_I18N.es;

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
          el.title = t('checkout');
        } else {
          el.classList.add('booked');
          el.title = t('notAvailable');
        }
      } else {
        el.classList.add('available');
        if (gapDays.has(key)) {
          el.classList.add('gap');
          el.title = t('fillGapTooltip');
        }
      }
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
    if (isBooked) {
      showCalendarError(t('alertBookedEntry'));
      return;
    }
    fechaEntrada = fecha;
    fechaSalida  = null;
  } else if (fecha > fechaEntrada) {
    const minNoches = (window.PAGE_CONFIG || {}).minNoches || 1;
    const noches = Math.ceil((fecha - fechaEntrada) / 86400000);
    if (noches < minNoches && !isGapSelection(fechaEntrada, fecha)) {
      showCalendarError(t('alertMinNights', minNoches));
      return;
    }
    let cur = new Date(fechaEntrada.getTime() + 86400000);
    while (cur < fecha) {
      if (fechasReservadas.has(toKey(cur))) {
        fechaEntrada = fecha;
        fechaSalida  = null;
        actualizarInputsFecha();
        renderCalendario();
        return;
      }
      cur = new Date(cur.getTime() + 86400000);
    }
    fechaSalida = fecha;
  } else {
    if (isBooked) {
      showCalendarError(t('alertBookedEntry'));
      return;
    }
    fechaEntrada = fecha;
    fechaSalida  = null;
  }

  actualizarInputsFecha();
  validarFechas();
  renderCalendario();
}

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

  iE.addEventListener('change', function () {
    if (!this.value) return;
    const minSalida = new Date(this.value + 'T00:00:00');
    minSalida.setDate(minSalida.getDate() + 1);
    iS.min = toKey(minSalida);
    if (iS.value && iS.value <= this.value) iS.value = '';
  });

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

async function fetchAndApplyRemoteConfig() {
  const propiedad = (window.PAGE_CONFIG || {}).propiedad;
  if (!propiedad) return;
  try {
    const res = await fetch(`${FORM_WORKER}/property-config/${encodeURIComponent(propiedad)}`);
    if (!res.ok) return;
    const remote = await res.json();
    if (!remote || !remote.rates) return;
    Object.assign(window.PAGE_CONFIG, remote);
    computarGaps();
    actualizarLeyendaGap();
    renderCalendario();
    actualizarBotonesStepper();
    if (fechaEntrada && fechaSalida) calcularPrecio();
  } catch (e) { /* silent fallback to local config */ }
}
fetchAndApplyRemoteConfig();

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
  if (!val) return setFieldState(input, msg, false, t('nameRequired'));
  if (!/^[a-zA-ZáéíóúàèìòùäëïöüÁÉÍÓÚÀÈÌÒÙÄËÏÖÜñÑçÇ\s\-']+$/.test(val))
    return setFieldState(input, msg, false, t('nameLetters'));
  return setFieldState(input, msg, true);
}

function validarEmail(input) {
  const val = input.value.trim();
  const msg = input.parentElement.querySelector('.error-email');
  if (!val) return setFieldState(input, msg, false, t('emailRequired'));
  const re = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  if (!re.test(val)) return setFieldState(input, msg, false, t('checkEmail'));
  return setFieldState(input, msg, true);
}

function validarTelefono(input) {
  const raw = input.value.trim();
  const val = raw.replace(/[^\d+]/g, '');
  const msg = input.parentElement.querySelector('.error-tel');
  if (!val) return setFieldState(input, msg, false, t('phoneRequired'));
  if (/^(?:\+34|0034)/.test(val)) {
    const ok = /^(?:\+34|0034)[6-9]\d{8}$/.test(val);
    return setFieldState(input, msg, ok, t('checkPhone'));
  }
  if (/^\+/.test(val)) {
    const ok = /^\+[1-9]\d{6,14}$/.test(val);
    return setFieldState(input, msg, ok, t('checkPhone'));
  }
  const okLocal = /^[6-9]\d{8}$/.test(val);
  return setFieldState(input, msg, okLocal, t('checkPhone'));
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

function actualizarBotonesStepper() {
  const iA  = document.querySelector('input[name="adultos"]');
  const iN  = document.querySelector('input[name="ninos"]');
  if (!iA || !iN) return;
  const max     = (window.PAGE_CONFIG || {}).maxPersonas || 2;
  const adultos = parseInt(iA.value) || 1;
  const ninos   = parseInt(iN.value) || 0;
  const total   = adultos + ninos;
  document.querySelectorAll('.stepper-btn[data-field="adultos"][data-delta="-1"]')
    .forEach(b => { b.disabled = adultos <= 1; });
  document.querySelectorAll('.stepper-btn[data-field="adultos"][data-delta="1"]')
    .forEach(b => { b.disabled = total >= max; });
  document.querySelectorAll('.stepper-btn[data-field="ninos"][data-delta="-1"]')
    .forEach(b => { b.disabled = ninos <= 0; });
  document.querySelectorAll('.stepper-btn[data-field="ninos"][data-delta="1"]')
    .forEach(b => { b.disabled = total >= max; });
}

function stepPersonas(field, delta) {
  const iA     = document.querySelector('input[name="adultos"]');
  const iN     = document.querySelector('input[name="ninos"]');
  const max    = (window.PAGE_CONFIG || {}).maxPersonas || 2;
  const input  = field === 'adultos' ? iA : iN;
  const minVal = field === 'adultos' ? 1 : 0;
  const cur    = parseInt(input.value) || minVal;
  const total  = (parseInt(iA.value) || 1) + (parseInt(iN.value) || 0);
  if (delta > 0 && total >= max) return;
  if (delta < 0 && cur <= minVal) return;
  input.value = cur + delta;
  actualizarBotonesStepper();
  validarPersonas();
  guestsConfirmed = true;
  actualizarBarraResumen();
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

const LIMPIEZA = 50;
let lastPricing = { nights: 0, subtotal: 0, cleaning: 50, total: 0, breakdown: '' };
let appliedPromo = null;

function esFinDeSemana(fecha) {
  const d = fecha.getDay();
  return d === 5 || d === 6;
}

function obtenerTarifaNoche(fecha) {
  const cfg = window.PAGE_CONFIG || {};
  const rates = cfg.rates || null;
  const m = fecha.getMonth() + 1;

  const specialDates = cfg.specialDates || {};
  const dateKey = `${fecha.getFullYear()}-${String(m).padStart(2,'0')}-${String(fecha.getDate()).padStart(2,'0')}`;
  if (specialDates[dateKey] !== undefined) return specialDates[dateKey];

  function isNightBeforeHoliday(d) {
    const holidays = (cfg.holidays || []);
    const next = new Date(d.getTime() + 86400000);
    const mmdd = `${String(next.getMonth()+1).padStart(2,'0')}-${String(next.getDate()).padStart(2,'0')}`;
    return holidays.includes(mmdd);
  }

  if (!rates) return 0;
  const r = rates[String(m)];
  if (r === null || r === undefined) return 0;
  let base = 0;
  if (typeof r === 'number') base = r;
  else if (typeof r === 'object') base = (esFinDeSemana(fecha) && r.weekend !== undefined) ? r.weekend : (r.weekday !== undefined ? r.weekday : 0);
  if (isNightBeforeHoliday(fecha)) return Math.round(base * 1.6);
  return base;
}

function calcularPrecio() {
  const pa = document.getElementById('priceAmount');
  const ps = document.getElementById('priceSummary');

  if (!fechaEntrada || !fechaSalida) {
    if (pa) pa.textContent = t('selectDates');
    if (ps) ps.style.display = 'none';

    const limpiezaBase = (window.PAGE_CONFIG && window.PAGE_CONFIG.cleaning != null) ? window.PAGE_CONFIG.cleaning : LIMPIEZA;
    lastPricing = { nights: 0, subtotal: 0, cleaning: limpiezaBase, total: 0, breakdown: '' };

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
    actualizarBarraResumen();
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

  const isGap = isGapSelection(fechaEntrada, fechaSalida);
  const cfgCleaning = (window.PAGE_CONFIG && window.PAGE_CONFIG.cleaning != null) ? window.PAGE_CONFIG.cleaning : LIMPIEZA;
  const gapCleaning = (window.PAGE_CONFIG && window.PAGE_CONFIG.gapCleaning != null) ? window.PAGE_CONFIG.gapCleaning : null;
  const limpieza = (isGap && gapCleaning != null) ? gapCleaning : cfgCleaning;
  const discountTiers = (window.PAGE_CONFIG && window.PAGE_CONFIG.discounts) || [];
  const activeTier = discountTiers
    .filter(d => noches >= d.minNights)
    .sort((a, b) => b.minNights - a.minNights)[0] || null;
  const seasonTiers   = (window.PAGE_CONFIG && window.PAGE_CONFIG.seasonDiscounts) || [];
  const checkInMonth  = fechaEntrada.getMonth() + 1;
  const activeSeasonTier = seasonTiers
    .filter(d => noches >= d.minNights && d.months.includes(checkInMonth))
    .sort((a, b) => b.minNights - a.minNights)[0] || null;
  const effectiveTier    = activeTier || activeSeasonTier;
  const tierPct          = effectiveTier ? effectiveTier.pct : 0;
  const tierDiscount     = tierPct > 0 ? Math.round(subtotal * tierPct) : 0;
  const subtotalAfterTier = subtotal - tierDiscount;
  const gapDiscount      = isGap ? Math.round(subtotalAfterTier * 0.20) : 0;
  const discountAmount   = tierDiscount + gapDiscount;
  let discountLabelText  = '';
  if (tierDiscount > 0 && gapDiscount > 0) {
    discountLabelText = Math.round(tierPct * 100) + '% + ' + t('fillGapDiscount');
  } else if (gapDiscount > 0) {
    discountLabelText = t('fillGapDiscount');
  } else if (tierDiscount > 0) {
    discountLabelText = Math.round(tierPct * 100) + '%';
  }
  const subtotalFinal    = subtotal - discountAmount;
  const promoDiscountAmount = appliedPromo
    ? (appliedPromo.tipo === 'pct'
        ? Math.round(subtotalFinal * appliedPromo.valor / 100)
        : Math.min(appliedPromo.valor, subtotalFinal))
    : 0;
  const subtotalWithPromo = subtotalFinal - promoDiscountAmount;
  const total             = subtotalWithPromo + limpieza;

  if (pa) pa.textContent = total.toFixed(2) + ' €';
  if (ps) {
    ps.style.display = 'block';
    ps.querySelector('#nightsCount').textContent = noches;
    ps.querySelector('#subtotalAmount').textContent = subtotal.toFixed(2) + ' €';
    const discountRow   = ps.querySelector('#discountRow');
    const discountEl    = ps.querySelector('#discountAmount');
    const discountLabel = ps.querySelector('#discountLabel');
    if (discountRow) discountRow.style.display = discountAmount > 0 ? '' : 'none';
    if (discountLabel && discountLabelText) discountLabel.textContent = discountLabelText;
    if (discountEl)  discountEl.textContent = '-' + discountAmount.toFixed(2) + ' €';
    const promoRow = ps.querySelector('#promoDiscountRow');
    const promoEl  = ps.querySelector('#promoDiscountAmount');
    const promoLbl = ps.querySelector('#promoDiscountLabel');
    if (promoRow) promoRow.style.display = promoDiscountAmount > 0 ? '' : 'none';
    if (promoLbl && appliedPromo) {
      promoLbl.textContent = appliedPromo.tipo === 'pct' ? `${appliedPromo.valor}%` : `${appliedPromo.valor} €`;
    }
    if (promoEl) promoEl.textContent = '-' + promoDiscountAmount.toFixed(2) + ' €';
    const cleaningRow = ps.querySelector('#cleaningRow');
    if (cleaningRow) cleaningRow.style.display = limpieza > 0 ? '' : 'none';
    ps.querySelector('#cleaningAmount').textContent = limpieza.toFixed(2) + ' €';
    ps.querySelector('#totalAmount').textContent = total.toFixed(2) + ' €';
    ps.querySelector('.breakdown').innerHTML = breakdownHTML;
    let savingsEl = ps.querySelector('#savingsNote');
    if (!savingsEl) {
      savingsEl = document.createElement('div');
      savingsEl.id = 'savingsNote';
      savingsEl.style.cssText = 'margin-top:0.5rem;padding:0.4rem 0.6rem;background:#f0f7f0;border-radius:4px;color:#2a6049;font-size:0.85rem;font-weight:500;';
      ps.appendChild(savingsEl);
    }
    savingsEl.textContent = t('directSaving', Math.round(total * 0.16));
  }

  lastPricing = { nights: noches, subtotal: subtotalWithPromo, cleaning: limpieza, total: total, breakdown: breakdownText,
    tierDiscount: tierDiscount, gapDiscount: gapDiscount, promoDiscount: promoDiscountAmount,
    discountLabel: discountLabelText, promoCode: appliedPromo ? appliedPromo.codigo : '' };

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
  actualizarBarraResumen();
}

let guestsConfirmed   = false;
let widgetDismissed   = false;
let widgetCollapsed   = false;
let lastFechaEntradaKeyBar = null;

function pintarResumenEn(container) {
  if (!container) return;
  if (container.id === 'bookingSummaryWidget' && widgetDismissed) return;

  const dateEl   = container.querySelector('.summary-dates');
  const guestsEl = container.querySelector('.summary-guests');
  const sepEl    = container.querySelector('.summary-sep');
  const priceEl  = container.querySelector('.summary-price');
  const sep2El   = container.querySelector('.summary-sep2');
  const ctaEl    = container.querySelector('.summary-cta');

  if (!fechaEntrada || !fechaSalida) {
    dateEl.textContent = t('summaryPlaceholder');
    guestsEl.textContent = '';
    sepEl.style.display = 'none';
    priceEl.textContent = '';
    sep2El.style.display = 'none';
    if (ctaEl) ctaEl.style.display = 'none';
    container.dataset.state = 'no-dates';
    container.classList.add('visible');
    return;
  }

  const lang   = getLang();
  const MESES  = MESES_ABREV_I18N[lang] || MESES_ABREV_I18N.es;
  const mismoMes = fechaEntrada.getMonth() === fechaSalida.getMonth();
  const rangoFechas = mismoMes
    ? `${fechaEntrada.getDate()} - ${fechaSalida.getDate()} ${MESES[fechaSalida.getMonth()]}`
    : `${fechaEntrada.getDate()} ${MESES[fechaEntrada.getMonth()]} - ${fechaSalida.getDate()} ${MESES[fechaSalida.getMonth()]}`;

  dateEl.textContent = rangoFechas;

  if (!guestsConfirmed) {
    guestsEl.textContent = t('summaryEnterGuests');
    sepEl.style.display = '';
    priceEl.textContent = '';
    sep2El.style.display = 'none';
    if (ctaEl) ctaEl.style.display = 'none';
    container.dataset.state = 'need-guests';
    container.classList.add('visible');
    return;
  }

  const iA      = document.querySelector('input[name="adultos"]');
  const iN      = document.querySelector('input[name="ninos"]');
  const adultos = parseInt(iA && iA.value) || 1;
  const ninos   = parseInt(iN && iN.value) || 0;
  const total   = adultos + ninos;

  guestsEl.textContent = t('guestsLabel', total);
  sepEl.style.display = '';
  priceEl.textContent = lastPricing && lastPricing.total ? lastPricing.total.toFixed(2) + ' €' : '';
  sep2El.style.display = priceEl.textContent ? '' : 'none';
  if (ctaEl) {
    ctaEl.textContent = t('summaryCta');
    ctaEl.style.display = priceEl.textContent ? 'inline-block' : 'none';
  }
  container.dataset.state = 'complete';
  container.classList.add('visible');
}

function resetearSeleccionReserva() {
  fechaEntrada = null;
  fechaSalida  = null;
  guestsConfirmed = false;

  const iA = document.querySelector('input[name="adultos"]');
  const iN = document.querySelector('input[name="ninos"]');
  if (iA) iA.value = 1;
  if (iN) iN.value = 0;
  actualizarBotonesStepper();

  appliedPromo = null;
  const promoInput = document.getElementById('promoCodeInput');
  if (promoInput) promoInput.value = '';

  renderCalendario();
  calcularPrecio();
}

function actualizarBarraResumen() {
  const bar = document.getElementById('bookingSummaryBar');
  const widget = document.getElementById('bookingSummaryWidget');
  const tab = document.getElementById('bookingSummaryTab');
  if (!bar && !widget) return;

  if (fechaEntrada && fechaSalida) {
    const entradaKey = toKey(fechaEntrada) + '_' + toKey(fechaSalida);
    if (lastFechaEntradaKeyBar !== entradaKey) {
      guestsConfirmed = false;
      lastFechaEntradaKeyBar = entradaKey;
      widgetDismissed = false;
    }
  } else if (lastFechaEntradaKeyBar !== null) {
    guestsConfirmed = false;
    lastFechaEntradaKeyBar = null;
  }

  pintarResumenEn(bar);

  if (widget) {
    if (widgetDismissed) {
      widget.classList.remove('visible');
      if (tab) tab.classList.remove('visible');
    } else {
      pintarResumenEn(widget);
      if (widgetCollapsed) {
        widget.classList.remove('visible');
        if (tab) tab.classList.add('visible');
      } else {
        if (tab) tab.classList.remove('visible');
      }
    }
  }

  const waContainer = document.querySelector('.wa-container');
  if (waContainer) waContainer.classList.toggle('box-open', widget && !widgetDismissed);
}

function ocultarBarraResumen() {
  widgetDismissed = true;
  const bar = document.getElementById('bookingSummaryBar');
  const widget = document.getElementById('bookingSummaryWidget');
  const tab = document.getElementById('bookingSummaryTab');
  if (bar) bar.classList.remove('visible');
  if (widget) widget.classList.remove('visible');
  if (tab) tab.classList.remove('visible');
}

function wireResumenClicks(container, reservaEl) {
  container.addEventListener('click', () => {
    if (container.dataset.state === 'complete') {
      const priceEl = document.getElementById('mobilePrice');
      (priceEl || reservaEl).scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (container.dataset.state === 'need-guests') {
      guestsConfirmed = true;
      actualizarBarraResumen();
      const iA = document.querySelector('input[name="adultos"]');
      (iA ? iA.closest('.form-row') || iA : reservaEl).scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      reservaEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
  const dateEl = container.querySelector('.summary-dates');
  if (dateEl) {
    dateEl.addEventListener('click', (e) => {
      e.stopPropagation();
      reservaEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
  const guestsEl = container.querySelector('.summary-guests');
  if (guestsEl) {
    guestsEl.addEventListener('click', (e) => {
      e.stopPropagation();
      guestsConfirmed = true;
      actualizarBarraResumen();
      const iA = document.querySelector('input[name="adultos"]');
      (iA ? iA.closest('.form-row') || iA : reservaEl).scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
  const ctaEl = container.querySelector('.summary-cta');
  if (ctaEl) {
    ctaEl.addEventListener('click', (e) => {
      e.stopPropagation();
      const nameInput = document.querySelector('input[name="name"]');
      (nameInput || reservaEl).scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (nameInput) nameInput.focus({ preventScroll: true });
    });
  }
  const waEl = container.querySelector('.summary-wa');
  if (waEl) {
    waEl.addEventListener('click', (e) => {
      e.stopPropagation();
      actualizarWAMensajes();
      const waLink = document.querySelector('.wa-container a.wa-option');
      if (waLink) waEl.href = waLink.href;
    });
  }
}

function initBarraResumen() {
  const reservaEl = document.getElementById('reserva');
  if (!reservaEl || document.getElementById('bookingSummaryBar')) return;

  const summaryInnerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
    <span class="summary-dates"></span>
    <span class="summary-sep">·</span>
    <span class="summary-guests"></span>
    <span class="summary-sep2">·</span>
    <span class="summary-price-row">
      <span class="summary-price"></span>
      <span class="summary-actions">
        <a href="#" target="_blank" rel="noopener noreferrer" class="summary-wa" aria-label="WhatsApp">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        </a>
        <button type="button" class="summary-cta"></button>
      </span>
    </span>
  `;

  const bar = document.createElement('div');
  bar.id = 'bookingSummaryBar';
  bar.className = 'booking-summary-bar';
  bar.innerHTML = summaryInnerHTML;
  wireResumenClicks(bar, reservaEl);
  document.body.appendChild(bar);

  const widget = document.createElement('div');
  widget.id = 'bookingSummaryWidget';
  widget.className = 'booking-summary-widget';
  widget.innerHTML = `
    <button type="button" class="widget-collapse" aria-label="Minimizar">›</button>
    <button type="button" class="widget-close" aria-label="Cerrar">✕</button>
    ${summaryInnerHTML}
  `;
  wireResumenClicks(widget, reservaEl);
  widget.querySelector('.widget-close').addEventListener('click', (e) => {
    e.stopPropagation();
    widgetDismissed = true;
    widget.classList.remove('visible');
    resetearSeleccionReserva();
  });
  widget.querySelector('.widget-collapse').addEventListener('click', (e) => {
    e.stopPropagation();
    widgetCollapsed = true;
    actualizarBarraResumen();
  });
  document.body.appendChild(widget);

  const tab = document.createElement('button');
  tab.id = 'bookingSummaryTab';
  tab.className = 'booking-summary-tab';
  tab.type = 'button';
  tab.setAttribute('aria-label', 'Mostrar resumen de reserva');
  tab.textContent = '‹';
  tab.addEventListener('click', () => {
    widgetCollapsed = false;
    actualizarBarraResumen();
  });
  document.body.appendChild(tab);

  const waLink = document.querySelector('.wa-container a.wa-option');
  if (waLink) {
    document.querySelectorAll('.summary-wa').forEach(a => {
      a.href = waLink.href;
      a.setAttribute('data-tooltip', t('summaryWaTooltip'));
    });
  }

  actualizarBarraResumen();
}
initBarraResumen();

async function aplicarCodigoPromo() {
  const input = document.getElementById('promoCodeInput');
  const btn   = document.getElementById('promoCodeBtn');
  const msg   = document.getElementById('promoCodeMsg');
  if (!input || !btn || !msg) return;

  if (appliedPromo) {
    appliedPromo = null;
    input.value = '';
    input.disabled = false;
    btn.textContent = t('promoApply');
    msg.style.display = 'none';
    const hdPromo = document.getElementById('hdPromoCode');
    if (hdPromo) hdPromo.value = '';
    calcularPrecio();
    return;
  }

  const code = (input.value || '').trim().toUpperCase();
  if (!code) return;

  btn.disabled = true;
  btn.textContent = '...';
  msg.style.display = 'none';

  const propiedad = (window.PAGE_CONFIG && window.PAGE_CONFIG.propiedad) || '';

  try {
    const res = await fetch(FORM_WORKER + '/discount-codes/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo: code, propiedad })
    });
    const data = await res.json();

    if (data.ok) {
      appliedPromo = data.discount;
      input.disabled = true;
      btn.disabled = false;
      btn.textContent = t('promoRemove');
      msg.style.color = 'green';
      msg.textContent = t('promoApplied', code);
      msg.style.display = 'block';
      const hdPromo = document.getElementById('hdPromoCode');
      if (hdPromo) hdPromo.value = code;
      calcularPrecio();
    } else {
      btn.disabled = false;
      btn.textContent = t('promoApply');
      msg.style.color = '#dc2626';
      msg.textContent = t('promoInvalid');
      msg.style.display = 'block';
    }
  } catch {
    btn.disabled = false;
    btn.textContent = t('promoApply');
    msg.style.color = '#dc2626';
    msg.textContent = t('promoInvalid');
    msg.style.display = 'block';
  }
}

(function initForm() {
  const form       = document.getElementById('formularioReserva');
  const btn        = document.getElementById('submitBtnReserva');
  const errorMsg   = document.getElementById('mensajeError');
  const formExito  = document.getElementById('formSuccess');
  const nombreInput = form.querySelector('input[name="name"]');
  const emailInput  = form.querySelector('input[name="email"]');
  const telInput    = form.querySelector('input[name="telefono"]');

  nombreInput.addEventListener('blur',  () => validarNombre(nombreInput));
  emailInput.addEventListener('blur',  () => validarEmail(emailInput));
  emailInput.addEventListener('input', () => validarEmail(emailInput));
  telInput.addEventListener('blur',    () => validarTelefono(telInput));

  form.addEventListener('click', function(e) {
    const stepBtn = e.target.closest('.stepper-btn');
    if (!stepBtn || stepBtn.disabled) return;
    stepPersonas(stepBtn.dataset.field, parseInt(stepBtn.dataset.delta));
  });
  actualizarBotonesStepper();

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

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

    await cargarIcal();
    calcularPrecio();

    btn.disabled      = true;
    btn.textContent   = t('sending');
    btn.style.opacity = '0.7';
    errorMsg.style.display = 'none';

    try {
      const turnstileToken = form.querySelector('[name="cf-turnstile-response"]')?.value || '';
      if (!turnstileToken) {
        errorMsg.style.display = 'block';
        btn.disabled      = false;
        btn.textContent   = t('requestBooking');
        btn.style.opacity = '1';
        return;
      }

      const fd = new FormData(form);
      fd.set('nights', String(lastPricing.nights));
      fd.set('subtotal', lastPricing.subtotal.toFixed(2));
      fd.set('cleaning', lastPricing.cleaning.toFixed(2));
      fd.set('total_price', lastPricing.total.toFixed(2));
      fd.set('price_breakdown', lastPricing.breakdown);
      fd.set('promo_code', appliedPromo ? appliedPromo.codigo : '');
      fd.set('propiedad', (window.PAGE_CONFIG && window.PAGE_CONFIG.propiedad) || '');

      // Admin notification is sent server-side by the Worker (Brevo).
      const res = await fetch(FORM_WORKER + '/reserva', { method: 'POST', body: fd });
      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch (e) { console.warn('Non-JSON response:', text); }

      if (!res.ok) {
        errorMsg.style.display = 'block';
        errorMsg.textContent = data.error || t('submitError');
        btn.disabled      = false;
        btn.textContent   = t('requestBooking');
        btn.style.opacity = '1';
        if (window.turnstile) window.turnstile.reset();
        return;
      }

      if (data && data.ok) {
        form.querySelectorAll('.form-row, .form-group, .submit-btn, .field-error')
            .forEach(el => el.style.display = 'none');
        formExito.style.display = 'block';
        ocultarBarraResumen();
      } else {
        throw new Error('Respuesta no exitosa: ' + (JSON.stringify(data) || text));
      }
    } catch (err) {
      console.error('Reservation submit error:', err);

      try {
        const fallback = document.createElement('form');
        fallback.method = 'POST';
        fallback.action = FORM_WORKER + '/reserva';
        fallback.style.display = 'none';

        const fd = new FormData(form);
        fd.set('nights', String(lastPricing.nights));
        fd.set('subtotal', lastPricing.subtotal.toFixed(2));
        fd.set('cleaning', lastPricing.cleaning.toFixed(2));
        fd.set('total_price', lastPricing.total.toFixed(2));
        fd.set('price_breakdown', lastPricing.breakdown);

        for (const [k, v] of fd.entries()) {
          const inp = document.createElement('input');
          inp.type = 'hidden'; inp.name = k; inp.value = v;
          fallback.appendChild(inp);
        }
        document.body.appendChild(fallback);
        fallback.submit();
        return;
      } catch (e2) {
        console.error('Fallback submit error:', e2);
        errorMsg.style.display = 'block';
        errorMsg.textContent = t('submitError') + (err && err.message ? err.message : 'console');
        btn.disabled      = false;
        btn.textContent   = t('requestBooking');
        btn.style.opacity = '1';
        if (window.turnstile) window.turnstile.reset();
      }
    }
  });
})();

function toggleMobileMenu() {
  document.getElementById('main-nav').classList.toggle('active');
}

function toggleGallery() {
  const gallery = document.querySelector('.gallery');
  const btn = document.querySelector('.gallery-toggle');
  if (!gallery || !btn) return;
  if (!btn.dataset.expandLabel) btn.dataset.expandLabel = btn.textContent;
  const expanded = gallery.classList.toggle('expanded');
  const collapseLabel = getLang() === 'en' ? 'Show fewer photos' : 'Ver menos fotos';
  btn.textContent = expanded ? collapseLabel : btn.dataset.expandLabel;
  if (!expanded) gallery.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
document.querySelectorAll('#main-nav a').forEach(link => {
  link.addEventListener('click', () => document.getElementById('main-nav').classList.remove('active'));
});
document.addEventListener('click', (e) => {
  const nav = document.getElementById('main-nav');
  const btn = document.querySelector('.mobile-menu-btn');
  if (nav && btn && !nav.contains(e.target) && !btn.contains(e.target)) nav.classList.remove('active');
});

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

function toggleWA() {
  document.getElementById('waOptions').classList.toggle('open');
  document.getElementById('waBtn').classList.toggle('open');
  actualizarWAMensajes();
}
function actualizarWAMensajes() {
  const propertyName = document.title.split(' - ')[0] || 'esta propiedad';
  let msg = t('waHello', propertyName);

  if (fechaEntrada && fechaSalida) {
    const noches = lastPricing && lastPricing.nights ? lastPricing.nights : Math.ceil((fechaSalida - fechaEntrada) / 86400000);
    msg += t('waFromTo', toKey(fechaEntrada), toKey(fechaSalida), noches);
    if (lastPricing && lastPricing.total) {
      msg += lastPricing.cleaning > 0
        ? t('waTotal', lastPricing.total.toFixed(2), lastPricing.subtotal.toFixed(2), lastPricing.cleaning.toFixed(2))
        : t('waTotalNoCleaning', lastPricing.total.toFixed(2), lastPricing.subtotal.toFixed(2));
    }
    if (lastPricing && lastPricing.breakdown) msg += t('waBreakdown', lastPricing.breakdown);
  } else if (fechaEntrada) {
    msg += t('waStarting', toKey(fechaEntrada));
  }

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

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
(function () {
  const btn = document.querySelector('.back-to-top');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 600);
  });
})();