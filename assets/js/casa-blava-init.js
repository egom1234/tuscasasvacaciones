/* Casa Blava defaults: set rates & holidays in JS (keeps config out of HTML). */
function setCasaBlavaDefaults(){
  try {
    const path = window.location.pathname || '';
    const title = document.title || '';
    const isCasaBlava = title.includes('Casa Blava') || path.includes('/Casa_blava');
    if (!isCasaBlava) return;
    window.PAGE_CONFIG = window.PAGE_CONFIG || {};
    window.PAGE_CONFIG.rates = window.PAGE_CONFIG.rates || { "10": { weekday: 100, weekend: 150 }, "11": { weekday: 100, weekend: 150 } };
    window.PAGE_CONFIG.holidays = window.PAGE_CONFIG.holidays || ['11-01','12-06','12-07','12-08','12-24','12-25','12-26','12-31'];
  } catch (e) { console.warn('setCasaBlavaDefaults error', e); }
}