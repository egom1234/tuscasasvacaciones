"use strict";

const WORKER = "https://tuscasasvacaciones.eduardgomez-4.workers.dev";
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DIAS = ["L","M","X","J","V","S","D"];
const MS_DIA = 86400000;

let mesActual = new Date().getMonth();
let anyoActual = new Date().getFullYear();

function toKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function parseFecha(key) {
  const [y,m,d] = key.split("-").map(Number);
  return new Date(y, m-1, d);
}

/* ===== iCAL + WORKER ===== */
async function cargarIcal() {
  if (!PAGE_CONFIG.icalSlugs?.length) return;

  const responses = await Promise.all(
    PAGE_CONFIG.icalSlugs.map(s => fetch(`${WORKER}/ical/${s}`))
  );
  const texts = await Promise.all(responses.map(r => r.ok ? r.text() : ""));

  texts.forEach(t => parsearIcal(t));
  renderCalendario();
}

function parsearIcal(texto) {
  const eventos = texto.split("BEGIN:VEVENT");
  const hoy = new Date(); hoy.setHours(0,0,0,0);

  for (let i = 1; i < eventos.length; i++) {
    const s = eventos[i].match(/DTSTART[^:]*:(\d{8})/);
    const e = eventos[i].match(/DTEND[^:]*:(\d{8})/);
    if (!s || !e) continue;

    let cur = parseFecha(s[1].replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3"));
    const fin = parseFecha(e[1].replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3"));

    while (cur < fin) {
      if (cur >= hoy) APP_STATE.fechasReservadas.add(toKey(cur));
      cur = new Date(cur.getTime() + MS_DIA);
    }
  }
}

/* ===== CALENDARIO + BLOQUEOS ===== */
function renderCalendario() {
  const grid = document.getElementById("calendarioGrid");
  const label = document.getElementById("mesActual");
  grid.innerHTML = "";
  label.textContent = `${MESES[mesActual]} ${anyoActual}`;

  DIAS.forEach(d => {
    const el = document.createElement("div");
    el.className = "calendar-day-name";
    el.textContent = d;
    grid.appendChild(el);
  });

  const first = new Date(anyoActual, mesActual, 1).getDay();
  const offset = first === 0 ? 6 : first - 1;
  for (let i = 0; i < offset; i++) grid.appendChild(document.createElement("div"));

  const last = new Date(anyoActual, mesActual + 1, 0).getDate();

  for (let d = 1; d <= last; d++) {
    const fecha = new Date(anyoActual, mesActual, d);
    const key = toKey(fecha);
    const el = document.createElement("div");
    el.textContent = d;
    el.dataset.date = key;
    el.className = "calendar-day";

    if (APP_STATE.fechasReservadas.has(key)) {
      el.classList.add("reserved");
    }

    if (APP_STATE.fechaEntrada && key === toKey(APP_STATE.fechaEntrada)) {
      el.classList.add("selected");
    }
    if (APP_STATE.fechaSalida && key === toKey(APP_STATE.fechaSalida)) {
      el.classList.add("selected");
    }

    grid.appendChild(el);
  }
}

function seleccionarFecha(key) {
  if (APP_STATE.fechasReservadas.has(key)) return;

  const f = parseFecha(key);

  if (!APP_STATE.fechaEntrada || APP_STATE.fechaSalida) {
    APP_STATE.fechaEntrada = f;
    APP_STATE.fechaSalida = null;
  } else if (f > APP_STATE.fechaEntrada) {
    APP_STATE.fechaSalida = f;
  } else {
    APP_STATE.fechaEntrada = f;
    APP_STATE.fechaSalida = null;
  }

  document.getElementById("fechaEntrada").value = APP_STATE.fechaEntrada ? toKey(APP_STATE.fechaEntrada) : "";
  document.getElementById("fechaSalida").value = APP_STATE.fechaSalida ? toKey(APP_STATE.fechaSalida) : "";

  calcularPrecio();
  renderCalendario();
}

function initCalendario() {
  cargarIcal();
  renderCalendario();

  document.getElementById("calendarioGrid").addEventListener("click", e => {
    const el = e.target.closest("[data-date]");
    if (el) seleccionarFecha(el.dataset.date);
  });
}