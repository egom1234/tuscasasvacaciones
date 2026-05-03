"use strict";

function validarFechas() {
  return APP_STATE.fechaEntrada && APP_STATE.fechaSalida;
}

function validarPersonas() {
  const a = document.querySelector('[name="adultos"]');
  const n = document.querySelector('[name="ninos"]');
  const total = (parseInt(a?.value) || 0) + (parseInt(n?.value) || 0);
  return total > 0 && total <= PAGE_CONFIG.maxPersonas;
}

function validarEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function initForm() {
  const form = document.getElementById("formularioReserva");
  if (!form) return;

  form.addEventListener("submit", e => {
    e.preventDefault();

    if (!validarFechas()) {
      alert("Selecciona fechas válidas");
      return;
    }

    if (!validarPersonas()) {
      alert("Número de personas no válido");
      return;
    }

    const email = form.querySelector('[name="email"]')?.value;
    if (!validarEmail(email)) {
      alert("Email inválido");
      return;
    }

    alert("Formulario validado correctamente");
  });
}