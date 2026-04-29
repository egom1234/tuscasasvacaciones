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

    if (fecha < hoy) {
      el.classList.add('disabled');
    } else if (fechasReservadas.has(key)) {
      el.classList.add('booked');
      el.title = 'No disponible';
    } else {
      el.addEventListener('click', () => seleccionarFecha(fecha));
    }

    if (fechaEntrada && toKey(fecha) === toKey(fechaEntrada)) el.classList.add('selected');
    if (fechaSalida  && toKey(fecha) === toKey(fechaSalida))  el.classList.add('selected');
    if (fechaEntrada && fechaSalida && fecha > fechaEntrada && fecha < fechaSalida) el.classList.add('range');

    grid.appendChild(el);
  }
}

function seleccionarFecha(fecha) {
  if (fechasReservadas.has(toKey(fecha))) return;
  if (!fechaEntrada || (fechaEntrada && fechaSalida)) {
    fechaEntrada = fecha;
    fechaSalida  = null;
  } else if (fecha > fechaEntrada) {
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
    fechaSalida = fecha;
  } else {
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
    if (el.classList.contains('available')) {
      const key = el.getAttribute('data-date');
      const fecha = parseFecha(key.replace(/-/g, ''));
      seleccionarFecha(fecha);
    }
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
  if (!/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(val))
             return setFieldState(input, msg, false, '⚠️ Introduce un email válido');
  return setFieldState(input, msg, true);
}

function validarTelefono(input) {
  const val = input.value.trim().replace(/\s/g, '');
  const msg = input.parentElement.querySelector('.error-tel');
  if (!val)  return setFieldState(input, msg, false, '⚠️ El teléfono es obligatorio');
  const ok  = /^[6-9]\d{8}$/.test(val) || /^\+34[6-9]\d{8}$/.test(val) || /^\+[1-9]\d{6,14}$/.test(val);
  return setFieldState(input, msg, ok, '⚠️ Introduce un teléfono válido');
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
      const res  = await fetch('https://api.web3forms.com/submit', { method: 'POST', body: new FormData(form) });
      const data = await res.json();
      if (data.success) {
        form.querySelectorAll('.form-row, .form-group, .submit-btn, .field-error')
            .forEach(el => el.style.display = 'none');
        formExito.style.display = 'block';
      } else {
        throw new Error('Respuesta no exitosa');
      }
    } catch {
      errorMsg.style.display = 'block';
      btn.disabled      = false;
      btn.textContent   = 'Solicitar reserva';
      btn.style.opacity = '1';
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
  const baseMsg = isEnglish
    ? 'Hello, I would like to book this property.'
    : 'Hola, me gustaría reservar esta propiedad.';
  let msg = baseMsg;
  if (fechaEntrada && fechaSalida) {
    const noches = Math.ceil((fechaSalida - fechaEntrada) / (1000 * 60 * 60 * 24));
    msg += isEnglish
      ? ` From ${toKey(fechaEntrada)} to ${toKey(fechaSalida)} (${noches} nights).`
      : ` Del ${toKey(fechaEntrada)} al ${toKey(fechaSalida)} (${noches} noches).`;
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
    url.searchParams.set('text', msg); // Sin encodeURIComponent para que aparezca legible
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
