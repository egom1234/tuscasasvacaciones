"use strict";

/* ====== CONFIG SAFE ====== */
window.PAGE_CONFIG = window.PAGE_CONFIG || {};
PAGE_CONFIG.rates = PAGE_CONFIG.rates || {};
PAGE_CONFIG.holidays = PAGE_CONFIG.holidays || [];
PAGE_CONFIG.icalSlugs = PAGE_CONFIG.icalSlugs || [];
PAGE_CONFIG.cleaning = PAGE_CONFIG.cleaning ?? 75;
PAGE_CONFIG.maxPersonas = PAGE_CONFIG.maxPersonas ?? 6;
PAGE_CONFIG.lang = PAGE_CONFIG.lang || "es";

/* ====== ESTADO GLOBAL ====== */
window.APP_STATE = {
  fechaEntrada: null,
  fechaSalida: null,
  fechasReservadas: new Set(),
  lastPricing: null
};

/* ====== INIT ====== */
document.addEventListener("DOMContentLoaded", () => {
  initCalendario();
  initForm();
  initWhatsApp();
});
