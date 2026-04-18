/**
 * COMPONENTE CALENDARIO iCal — Casitas de Mar
 * Añade este script en cada página HTML de propiedad.
 * Llama a initCalendario({ propiedad, containerId }) tras cargar el DOM.
 */

const WORKER_BASE = 'https://tuscasasvacaciones.eduardgomez-4.workers.dev';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS  = ['L','M','X','J','V','S','D'];

function parseIcal(text) {
  const ocupadas = new Set();
  const eventos = text.split('BEGIN:VEVENT');

  for (let i = 1; i < eventos.length; i++) {
    const bloque = eventos[i];

    // ✅ Captura TODOS los formatos de Airbnb:
    // DTSTART;VALUE=DATE:20260501
    // DTSTART:20260510T100000Z
    // DTSTART;TZID=Europe/Madrid:20260520T160000  ← antes fallaba
    const dtstart = bloque.match(/DTSTART[^:]*:(\d{8})/);
    const dtend   = bloque.match(/DTEND[^:]*:(\d{8})/);

    if (dtstart && dtend) {
      let inicio = parseFechaIcal(dtstart[1]);
      const fin  = parseFechaIcal(dtend[1]);

      if (inicio.getTime() === fin.getTime()) {
        // ✅ Bloqueo de 1 día exacto
        ocupadas.add(toYMD(inicio));
      } else {
        while (inicio < fin) {
          ocupadas.add(toYMD(inicio));
          inicio.setDate(inicio.getDate() + 1);
        }
      }
    }
  }
  return ocupadas;
}

function parseFechaIcal(str) {
  return new Date(parseInt(str.slice(0,4)), parseInt(str.slice(4,6))-1, parseInt(str.slice(6,8)));
}

function toYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth()+1).padStart(2,'0');
  const d = String(date.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}

async function initCalendario({ propiedad, containerId }) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let ocupadas = new Set();
  let mesVista  = new Date(); mesVista.setDate(1);
  let entrada = null, salida = null;

  container.innerHTML = `
    <div class="ical-cal">
      <div class="ical-header">
        <button class="ical-nav" id="${containerId}-prev">&#8249;</button>
        <span class="ical-mes" id="${containerId}-mes">Cargando...</span>
        <button class="ical-nav" id="${containerId}-next">&#8250;</button>
      </div>
      <div class="ical-loading" id="${containerId}-loading">
        <div class="ical-spinner"></div><span>Cargando disponibilidad&hellip;</span>
      </div>
      <div class="ical-grid" id="${containerId}-grid" style="display:none"></div>
      <div class="ical-leyenda">
        <span class="ical-leyenda-item"><span class="ical-dot ocupado"></span>Ocupado</span>
        <span class="ical-leyenda-item"><span class="ical-dot seleccionado"></span>Seleccionado</span>
        <span class="ical-leyenda-item"><span class="ical-dot rango"></span>Rango</span>
      </div>
    </div>`;

  try {
    // Llama a ambas fuentes en paralelo
    const [resAirbnb, resBooking] = await Promise.all([
      fetch(`${WORKER_BASE}/ical/${propiedad}-airbnb`),
      fetch(`${WORKER_BASE}/ical/${propiedad}-booking`),
    ]);

    const [icsAirbnb, icsBooking] = await Promise.all([
      resAirbnb.ok  ? resAirbnb.text()  : Promise.resolve(''),
      resBooking.ok ? resBooking.text() : Promise.resolve(''),
    ]);

    ocupadas = new Set([
      ...parseIcal(icsAirbnb),
      ...parseIcal(icsBooking),
    ]);

  } catch(e) { console.warn('iCal error:', e); }

  document.getElementById(`${containerId}-loading`).style.display = 'none';
  document.getElementById(`${containerId}-grid`).style.display    = 'grid';

  function render() {
    const grid  = document.getElementById(`${containerId}-grid`);
    const label = document.getElementById(`${containerId}-mes`);
    grid.innerHTML = '';
    label.textContent = `${MESES[mesVista.getMonth()]} ${mesVista.getFullYear()}`;

    DIAS.forEach(d => {
      const el = document.createElement('div');
      el.className = 'ical-day-name'; el.textContent = d;
      grid.appendChild(el);
    });

    const primerDia = new Date(mesVista.getFullYear(), mesVista.getMonth(), 1).getDay();
    const diasMes   = new Date(mesVista.getFullYear(), mesVista.getMonth()+1, 0).getDate();
    const offset    = primerDia === 0 ? 6 : primerDia - 1;
    const hoy       = new Date(); hoy.setHours(0,0,0,0);

    for (let i = 0; i < offset; i++) {
      const el = document.createElement('div');
      el.className = 'ical-day ical-empty'; grid.appendChild(el);
    }

    for (let d = 1; d <= diasMes; d++) {
      const fecha = new Date(mesVista.getFullYear(), mesVista.getMonth(), d);
      const ymd   = toYMD(fecha);
      const el    = document.createElement('div');
      el.className = 'ical-day'; el.textContent = d;

      if (fecha < hoy) { el.classList.add('ical-pasado'); }
      else if (ocupadas.has(ymd)) { el.classList.add('ical-ocupado'); el.title = 'No disponible'; }
      else {
        el.classList.add('ical-libre');
        el.addEventListener('click', () => seleccionar(fecha));
      }
      if (entrada && toYMD(fecha) === toYMD(entrada)) el.classList.add('ical-sel');
      if (salida  && toYMD(fecha) === toYMD(salida))  el.classList.add('ical-sel');
      if (entrada && salida && fecha > entrada && fecha < salida) el.classList.add('ical-rango');
      grid.appendChild(el);
    }
  }

  function seleccionar(fecha) {
    if (!entrada || (entrada && salida)) { entrada = fecha; salida = null; }
    else if (fecha > entrada) {
      let cursor = new Date(entrada); cursor.setDate(cursor.getDate()+1);
      let hayOcupado = false;
      while (cursor < fecha) {
        if (ocupadas.has(toYMD(cursor))) { hayOcupado = true; break; }
        cursor.setDate(cursor.getDate()+1);
      }
      if (hayOcupado) { entrada = fecha; salida = null; }
      else { salida = fecha; }
    } else { entrada = fecha; salida = null; }

    const inE = document.getElementById('fechaEntrada');
    const inS = document.getElementById('fechaSalida');
    if (inE && entrada) inE.value = toYMD(entrada);
    if (inS && salida)  inS.value = toYMD(salida);
    render();
  }

  document.getElementById(`${containerId}-prev`).addEventListener('click', () => {
    mesVista.setMonth(mesVista.getMonth()-1); render();
  });
  document.getElementById(`${containerId}-next`).addEventListener('click', () => {
    mesVista.setMonth(mesVista.getMonth()+1); render();
  });
  render();
}

window.initCalendario = initCalendario;
