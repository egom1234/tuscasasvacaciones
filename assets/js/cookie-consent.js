(function () {
  var STORAGE_KEY = 'cd_cookie_consent';
  var lang = (document.documentElement.lang || '').toLowerCase().indexOf('en') === 0 ? 'en' : 'es';

  var STRINGS = {
    es: {
      text: 'Usamos cookies de análisis (Google Analytics) para entender cómo se usa la web. Puedes aceptarlas o rechazarlas.',
      accept: 'Aceptar',
      reject: 'Rechazar',
      policy: 'Política de privacidad',
      policyHref: '/politica-privacidad/'
    },
    en: {
      text: 'We use analytics cookies (Google Analytics) to understand how the site is used. You can accept or reject them.',
      accept: 'Accept',
      reject: 'Reject',
      policy: 'Privacy policy',
      policyHref: '/en/privacy-policy/'
    }
  };

  var t = STRINGS[lang];

  function updateConsent(granted) {
    if (typeof window.gtag !== 'function') return;
    var state = granted ? 'granted' : 'denied';
    window.gtag('consent', 'update', {
      ad_storage: state,
      ad_user_data: state,
      ad_personalization: state,
      analytics_storage: state
    });
  }

  function injectStyles() {
    var style = document.createElement('style');
    style.textContent =
      '#cd-cookie-banner{position:fixed;left:0;right:0;bottom:0;z-index:9999;background:#1f2d2b;color:#fff;' +
      'padding:1rem 1.25rem;display:flex;flex-wrap:wrap;gap:0.75rem 1.5rem;align-items:center;justify-content:center;' +
      'font-size:0.9rem;line-height:1.4;box-shadow:0 -2px 12px rgba(0,0,0,0.2);font-family:inherit}' +
      '#cd-cookie-banner p{margin:0;max-width:640px;flex:1 1 320px}' +
      '#cd-cookie-banner a{color:#9fd8c8;text-decoration:underline}' +
      '#cd-cookie-actions{display:flex;gap:0.5rem;flex-shrink:0}' +
      '#cd-cookie-actions button{cursor:pointer;border:none;border-radius:6px;padding:0.55rem 1.1rem;font-size:0.9rem;font-weight:600}' +
      '#cd-cookie-accept{background:#3fae7f;color:#fff}' +
      '#cd-cookie-reject{background:transparent;color:#fff;border:1px solid rgba(255,255,255,0.5)!important}' +
      '#cd-cookie-tab{position:fixed;left:1rem;bottom:1rem;z-index:9999;background:#1f2d2b;color:#fff;border:none;' +
      'border-radius:50%;width:44px;height:44px;font-size:1.2rem;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.25)}';
    document.head.appendChild(style);
  }

  function showBanner() {
    var banner = document.createElement('div');
    banner.id = 'cd-cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-live', 'polite');
    banner.innerHTML =
      '<p>' + t.text + ' <a href="' + t.policyHref + '">' + t.policy + '</a></p>' +
      '<div id="cd-cookie-actions">' +
      '<button id="cd-cookie-reject" type="button">' + t.reject + '</button>' +
      '<button id="cd-cookie-accept" type="button">' + t.accept + '</button>' +
      '</div>';
    document.body.appendChild(banner);

    document.getElementById('cd-cookie-accept').addEventListener('click', function () {
      setConsent(true);
      banner.remove();
      showTab();
    });
    document.getElementById('cd-cookie-reject').addEventListener('click', function () {
      setConsent(false);
      banner.remove();
      showTab();
    });
  }

  function showTab() {
    if (document.getElementById('cd-cookie-tab')) return;
    var tab = document.createElement('button');
    tab.id = 'cd-cookie-tab';
    tab.type = 'button';
    tab.title = t.policy;
    tab.setAttribute('aria-label', t.policy);
    tab.textContent = '🍪';
    tab.addEventListener('click', function () {
      tab.remove();
      showBanner();
    });
    document.body.appendChild(tab);
  }

  function setConsent(granted) {
    try {
      localStorage.setItem(STORAGE_KEY, granted ? 'granted' : 'denied');
    } catch (e) {}
    updateConsent(granted);
  }

  function init() {
    injectStyles();
    var stored;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      stored = null;
    }

    if (stored === 'granted') {
      updateConsent(true);
      showTab();
    } else if (stored === 'denied') {
      showTab();
    } else {
      showBanner();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
