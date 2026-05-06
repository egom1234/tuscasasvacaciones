(function () {
  var CONSENT_KEY = 'cookie_consent';
  var lang = document.documentElement.lang || 'es';
  var isEN = lang === 'en';

  var t = isEN
    ? {
        message: 'We use analytics cookies to improve your experience.',
        accept: 'Accept',
        reject: 'Reject',
        policy: 'Privacy policy',
        policyUrl: '/en/privacy-policy/'
      }
    : {
        message: 'Usamos cookies de análisis para mejorar tu experiencia.',
        accept: 'Aceptar',
        reject: 'Rechazar',
        policy: 'Política de privacidad',
        policyUrl: '/politica-privacidad/'
      };

  function updateConsent(granted) {
    if (typeof gtag === 'function') {
      gtag('consent', 'update', {
        analytics_storage: granted ? 'granted' : 'denied',
        ad_storage: granted ? 'granted' : 'denied'
      });
    }
  }

  function removeBanner() {
    var b = document.getElementById('cookie-banner');
    if (b) b.remove();
  }

  function showBanner() {
    var banner = document.createElement('div');
    banner.id = 'cookie-banner';
    banner.innerHTML =
      '<style>' +
      '#cookie-banner{position:fixed;bottom:0;left:0;right:0;background:#22584e;color:#fff;padding:1rem 1.5rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;z-index:99999;flex-wrap:wrap;font-family:Inter,sans-serif;font-size:.9rem;box-shadow:0 -2px 10px rgba(0,0,0,.2)}' +
      '#cookie-banner p{margin:0;flex:1;min-width:200px}' +
      '#cookie-banner a{color:#84ada5}' +
      '.ck-btns{display:flex;gap:.5rem;flex-shrink:0}' +
      '#ck-accept,#ck-reject{padding:.45rem 1.1rem;border:none;border-radius:4px;cursor:pointer;font-size:.875rem;font-weight:500;font-family:inherit}' +
      '#ck-accept{background:#84ada5;color:#fff}' +
      '#ck-accept:hover{background:#537e75}' +
      '#ck-reject{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.45)!important}' +
      '#ck-reject:hover{background:rgba(255,255,255,.1)}' +
      '</style>' +
      '<p>' + t.message + ' <a href="' + t.policyUrl + '">' + t.policy + '</a></p>' +
      '<div class="ck-btns">' +
      '<button id="ck-reject">' + t.reject + '</button>' +
      '<button id="ck-accept">' + t.accept + '</button>' +
      '</div>';

    document.body.appendChild(banner);

    document.getElementById('ck-accept').addEventListener('click', function () {
      localStorage.setItem(CONSENT_KEY, 'granted');
      updateConsent(true);
      removeBanner();
    });

    document.getElementById('ck-reject').addEventListener('click', function () {
      localStorage.setItem(CONSENT_KEY, 'denied');
      updateConsent(false);
      removeBanner();
    });
  }

  var consent = localStorage.getItem(CONSENT_KEY);
  if (consent === 'granted') {
    updateConsent(true);
  } else if (consent === 'denied') {
    updateConsent(false);
  } else {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showBanner);
    } else {
      showBanner();
    }
  }
})();
