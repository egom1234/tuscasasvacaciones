"use strict";

function esFinDeSemana(d) {
  const day = d.getDay();
  return day === 5 || day === 6;
}

function obtenerTarifaNoche(fecha) {
  const m = String(fecha.getMonth() + 1);
  const r = PAGE_CONFIG.rates[m];
  if (r == null) return 0;
  if (typeof r === "number") return r;
  return esFinDeSemana(fecha) ? r.weekend : r.weekday;
}

function calcularPrecio() {
  const t = document.getElementById("totalAmount");
  if (!APP_STATE.fechaEntrada || !APP_STATE.fechaSalida) {
    t.textContent = "Selecciona fechas";
    return;
  }

  const noches = Math.round((APP_STATE.fechaSalida - APP_STATE.fechaEntrada) / 86400000);
  let subtotal = 0;
  let cur = new Date(APP_STATE.fechaEntrada);

  for (let i = 0; i < noches; i++) {
    subtotal += obtenerTarifaNoche(cur);
    cur = new Date(cur.getTime() + 86400000);
  }

  const limpieza = PAGE_CONFIG.cleaning;
  const total = subtotal + limpieza;

  document.getElementById("nightsCount").textContent = noches;
  document.getElementById("subtotalAmount").textContent = `${subtotal} €`;
  document.getElementById("cleaningAmount").textContent = `${limpieza} €`;
  document.getElementById("totalAmount").textContent = `${total} €`;

  APP_STATE.lastPricing = { noches, subtotal, limpieza, total };
}