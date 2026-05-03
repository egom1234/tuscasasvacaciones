"use strict";

/*
  Requiere:
  - window.PAGE_CONFIG
  - window.APP_STATE
  - calcularPrecio() (pricing.js)
*/

function initWhatsApp() {
  actualizarWAMensajes();
}

/* ====== HELPERS ====== */
function formatoFecha(d) {
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
}

function getIdioma() {
  if (PAGE_CONFIG.lang) return PAGE_CONFIG.lang;
  if (document.documentElement.lang?.startsWith("en")) return "en";
  if (location.pathname.includes("/en/")) return "en";
  return "es";
}

/* ====== MENSAJE WA ====== */
function construirMensajeWA() {
  const lang = getIdioma();
  const nombre = PAGE_CONFIG.name || "esta propiedad";

  let msg = lang === "en"
    ? `Hello, I would like to book ${nombre}.`
    : `Hola, me gustaría reservar ${nombre}.`;

  const fIn = APP_STATE.fechaEntrada;
  const fOut = APP_STATE.fechaSalida;
  const price = APP_STATE.lastPricing;

  if (fIn && fOut && price) {
    const noches = price.noches;
    if (lang === "en") {
      msg += ` From ${formatoFecha(fIn)} to ${formatoFecha(fOut)} (${noches} nights).`;
      msg += ` Total: ${price.total} € (Subtotal: ${price.subtotal} €, Cleaning: ${price.limpieza} €).`;
    } else {
      msg += ` Del ${formatoFecha(fIn)} al ${formatoFecha(fOut)} (${noches} noches).`;
      msg += ` Importe total: ${price.total} € (Subtotal: ${price.subtotal} €, Limpieza: ${price.limpieza} €).`;
    }
  } else if (fIn) {
    msg += lang === "en"
      ? ` Starting from ${formatoFecha(fIn)}.`
      : ` A partir del ${formatoFecha(fIn)}.`;
  }

  return msg;
}

/* ====== ACTUALIZAR LINKS ====== */
function actualizarWAMensajes() {
  const msg = construirMensajeWA();

  document.querySelectorAll("[data-wa]").forEach(a => {
    const base = a.getAttribute("data-wa");
    const url = new URL(base);
    url.searchParams.set("text", msg);
    a.href = url.toString();
  });
}

/* ====== HOOKS ====== */
/* Se llama automáticamente cuando cambia el precio */
document.addEventListener("precioActualizado", actualizarWAMensajes);