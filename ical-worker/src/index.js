// Proxies upstream iCal feeds (Airbnb, Booking.com, Escapada Rural, Holidu...)
// behind a stable slug so property-page.js and the form worker never see the
// real (token-bearing, occasionally-rotated) upstream URLs.
const ICAL_URLS = {
  // Casa Blava - Peñiscola
  "casa-blava-airbnb": "https://www.airbnb.es/calendar/ical/1167479354827715217.ics?t=f2bb77075da448b59f3b20a51f4dba82",
  "casa-blava-booking": "https://ical.booking.com/v1/export?t=a460c389-9693-4160-b631-eb16bc84bf39",
  // Loft Binibeca
  "loft-binibeca-airbnb": "https://www.airbnb.com/calendar/ical/1225387229827469962.ics?t=a0d6a94433c94e738d58d689f700076e&locale=es",
  "loft-binibeca-booking": "https://ical.booking.com/v1/export?t=7d99622d-b2b3-4222-9d8e-745feb0a50d8",
  // Casa Gonda
  "gonda-airbnb": "https://www.airbnb.com/calendar/ical/609318681116300504.ics?t=429c883db0f7458ab9b67f3ae930f448&locale=es",
  // Tarifa Apartamento
  "tarifa-apt-airbnb": "https://www.airbnb.es/calendar/ical/21199779.ics?t=a628b52ace354e6db4895eb99ebde92f",
  "tarifa-apt-booking": "https://ical.booking.com/v1/export?t=9d7dee0b-91d9-4642-98af-7759796f43ba",
  // Tarifa Loft
  "tarifa-loft-airbnb": "https://www.airbnb.es/calendar/ical/21752919.ics?t=11d76d11bf0847b28071dfa9a720937a",
  "tarifa-loft-booking": "",
  // Casa Pepita
  "pepita-airbnb": "https://www.airbnb.com/calendar/ical/1725981897616729061.ics?t=ecb10e3952434e6c936b4a99541b9856&locale=es",
  "pepita-booking": "https://ical.booking.com/v1/export?t=0fecb3f6-11e2-46c4-b16a-2fc5dce7aa3e",
  "pepita-escapadarural": "https://static.escapadarural.com/ical-export/calendar-6a7d81399cc29.ics",
  "pepita-holidu": "https://api.host.holidu.com/ical/j59_9-dgmywqv73fjtfc7.ics",
};

const UPSTREAM_TIMEOUT_MS = 8000;

function getCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: getCorsHeaders() });
    }

    const url = new URL(request.url);
    const propiedad = url.pathname.replace("/ical/", "").replace(/\//g, "");
    if (!propiedad || !ICAL_URLS[propiedad]) {
      return new Response(
        JSON.stringify({ error: "Propiedad no encontrada", propiedades: Object.keys(ICAL_URLS) }),
        { status: 404, headers: { "Content-Type": "application/json", ...getCorsHeaders() } }
      );
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    try {
      const response = await fetch(ICAL_URLS[propiedad], {
        headers: { "User-Agent": "CasitasDeMarBot/1.0" },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Error iCal: ${response.status}`);
      const icalText = await response.text();
      return new Response(icalText, {
        status: 200,
        headers: {
          "Content-Type": "text/calendar; charset=utf-8",
          "Cache-Control": "public, max-age=900",
          ...getCorsHeaders(),
        },
      });
    } catch (err) {
      const timedOut = err.name === "AbortError";
      return new Response(
        JSON.stringify({ error: timedOut ? "Timeout al contactar la fuente iCal" : err.message }),
        { status: timedOut ? 504 : 502, headers: { "Content-Type": "application/json", ...getCorsHeaders() } }
      );
    } finally {
      clearTimeout(timer);
    }
  },
};
