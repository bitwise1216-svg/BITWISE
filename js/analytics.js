/**
 * bitwise. - Privacy-Friendly Real-Time Website Analytics Tracker
 * Captures visitor metrics (pageviews, unique visitors, devices, referrers, session length)
 * and streams them to the BITWISE Executive Dashboard via BroadcastChannel & LocalStorage.
 */

(function () {
  'use strict';

  const STORAGE_KEY_EVENTS = 'bitwise_analytics_events';
  const STORAGE_KEY_VISITOR = 'bitwise_visitor_id';
  const STORAGE_KEY_SESSION = 'bitwise_session_id';
  const CHANNEL_NAME = 'bitwise_data_bridge';

  // 1. Helper to generate UUID-like IDs
  function generateId(prefix) {
    return (prefix || 'id') + '_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
  }

  // 2. Identify Visitor & Session
  function getVisitorId() {
    let vid = localStorage.getItem(STORAGE_KEY_VISITOR);
    if (!vid) {
      vid = generateId('vis');
      localStorage.setItem(STORAGE_KEY_VISITOR, vid);
    }
    return vid;
  }

  function getSessionId() {
    let sid = sessionStorage.getItem(STORAGE_KEY_SESSION);
    if (!sid) {
      sid = generateId('ses');
      sessionStorage.setItem(STORAGE_KEY_SESSION, sid);
    }
    return sid;
  }

  // 3. Device & Browser Detection
  function detectDevice() {
    const ua = navigator.userAgent || '';
    let device = 'Desktop';
    if (/tablet|ipad|playbook|silk/i.test(ua) || (navigator.maxTouchPoints > 1 && window.innerWidth >= 768 && window.innerWidth <= 1024)) {
      device = 'Tablet';
    } else if (/mobile|iphone|ipod|android|blackberry|iemobile|kindle/i.test(ua) || window.innerWidth < 768) {
      device = 'Mobile';
    }

    let browser = 'Other';
    if (/edg/i.test(ua)) browser = 'Edge';
    else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
    else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
    else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
    else if (/opera|opr/i.test(ua)) browser = 'Opera';

    let os = 'Other';
    if (/windows/i.test(ua)) os = 'Windows';
    else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
    else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
    else if (/android/i.test(ua)) os = 'Android';
    else if (/linux/i.test(ua)) os = 'Linux';

    return { device, browser, os };
  }

  // 4. Referrer Categorization
  function getReferrerCategory() {
    const ref = document.referrer || '';
    if (!ref) return 'Direct';
    try {
      const url = new URL(ref);
      const host = url.hostname.toLowerCase();
      if (host.includes('google')) return 'Google Search';
      if (host.includes('bing') || host.includes('duckduckgo')) return 'Search Engines';
      if (host.includes('instagram')) return 'Instagram';
      if (host.includes('twitter') || host.includes('x.com')) return 'X / Twitter';
      if (host.includes('linkedin')) return 'LinkedIn';
      if (host.includes('github')) return 'GitHub';
      if (host.includes('behance') || host.includes('dribbble')) return 'Design Portfolios';
      return host.replace(/^www\./, '');
    } catch (e) {
      return 'Referral';
    }
  }

  // 5. Real-Time Visitor Telemetry & Dashboard Streaming (No automated email sending)
  function dispatchVisitorTelemetry(event) {
    // Fast GeoIP lookup with a 1.6s timeout for instant geographic resolution
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(function () { controller.abort(); }, 1600) : null;

    fetch('https://freeipapi.com/api/json', { signal: controller ? controller.signal : undefined })
      .then(function (res) { return res.json(); })
      .then(function (geo) {
        if (timeoutId) clearTimeout(timeoutId);
        if (geo) {
          event.location = geo.cityName ? (geo.cityName + ', ' + (geo.countryName || '')) : (geo.countryName || 'Direct / Private');
          event.ip = geo.ipAddress || 'Anonymous';
          broadcastVisitToDashboard(event);
        }
      })
      .catch(function () {
        if (timeoutId) clearTimeout(timeoutId);
        event.location = 'Direct / Private';
        event.ip = 'Anonymous';
        broadcastVisitToDashboard(event);
      });

    // Also attempt local studio server telemetry endpoint if available
    try {
      fetch('/api/analytics/visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      }).catch(function () {});
    } catch (e) {}
  }

  function broadcastVisitToDashboard(event) {
    // Update event in localStorage with enriched location
    try {
      const raw = localStorage.getItem(STORAGE_KEY_EVENTS);
      if (raw) {
        const events = JSON.parse(raw);
        const idx = events.findIndex(function (e) { return e.id === event.id; });
        if (idx !== -1) {
          events[idx] = event;
          localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(events));
        }
      }
    } catch (e) {}

    // Broadcast updated event with location to the executive dashboard
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const channel = new BroadcastChannel(CHANNEL_NAME);
        channel.postMessage({ type: 'NEW_VISIT', data: event });
        channel.close();
      } catch (e) {}
    }

    if (window.parent && window.parent !== window) {
      try {
        window.parent.postMessage({ type: 'NEW_VISIT', data: event }, '*');
      } catch (e) {}
    }
  }

  // 6. Track Pageview
  function trackPageView() {
    const { device, browser, os } = detectDevice();
    const visitorId = getVisitorId();
    const sessionId = getSessionId();
    const referrer = getReferrerCategory();

    const event = {
      id: generateId('evt'),
      type: 'pageview',
      timestamp: new Date().toISOString(),
      visitorId: visitorId,
      sessionId: sessionId,
      page: window.location.pathname || '/',
      title: document.title,
      device: device,
      browser: browser,
      os: os,
      referrer: referrer,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      language: navigator.language || 'en',
      location: 'Detecting...',
      ip: 'Anonymous'
    };

    // Save to LocalStorage (retaining last 500 events)
    try {
      const raw = localStorage.getItem(STORAGE_KEY_EVENTS);
      const events = raw ? JSON.parse(raw) : [];
      events.unshift(event);
      if (events.length > 500) events.length = 500;
      localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(events));
    } catch (e) {
      console.warn('[bitwise. analytics] Local storage quota reached.');
    }

    // Broadcast in real-time across open tabs & live viewport frames to the Dashboard
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const channel = new BroadcastChannel(CHANNEL_NAME);
        channel.postMessage({ type: 'NEW_VISIT', data: event });
        channel.close();
      } catch (e) {}
    }

    if (window.parent && window.parent !== window) {
      try {
        window.parent.postMessage({ type: 'NEW_VISIT', data: event }, '*');
      } catch (e) {}
    }

    try {
      window.dispatchEvent(new CustomEvent('bitwise:visit', { detail: event }));
    } catch (e) {}

    // Dispatch real-time telemetry to Dashboard & Server (Emails completely removed)
    dispatchVisitorTelemetry(event);
  }

  // 6. Track Session Duration on Exit
  const startTime = Date.now();
  window.addEventListener('beforeunload', function () {
    const durationSec = Math.round((Date.now() - startTime) / 1000);
    if (durationSec < 1) return;

    try {
      const raw = localStorage.getItem(STORAGE_KEY_EVENTS);
      if (raw) {
        const events = JSON.parse(raw);
        if (events.length && events[0].sessionId === getSessionId()) {
          events[0].durationSeconds = durationSec;
          localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(events));
        }
      }
    } catch (e) {}
  });

  // 7. Dynamic Google Analytics (GA4) Integration
  function initGoogleAnalytics() {
    try {
      const gaId = localStorage.getItem('bitwise_google_analytics_id');
      if (!gaId || !/^G-[A-Z0-9]+$/i.test(gaId.trim())) return;

      if (window._gaInitialized) return;
      window._gaInitialized = true;

      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(gaId.trim());
      document.head.appendChild(script);

      window.dataLayer = window.dataLayer || [];
      function gtag(){ dataLayer.push(arguments); }
      window.gtag = gtag;
      gtag('js', new Date());
      gtag('config', gaId.trim(), { anonymize_ip: true });
    } catch (e) {}
  }

  // Run automatically on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      trackPageView();
      initGoogleAnalytics();
    });
  } else {
    trackPageView();
    initGoogleAnalytics();
  }

  // Expose global API
  window.bitwiseAnalytics = {
    getVisitorId: getVisitorId,
    getSessionId: getSessionId,
    trackEvent: function (action, meta) {
      const event = {
        id: generateId('evt'),
        type: 'custom',
        action: action,
        meta: meta || {},
        timestamp: new Date().toISOString(),
        visitorId: getVisitorId(),
        sessionId: getSessionId()
      };
      if (typeof BroadcastChannel !== 'undefined') {
        try {
          const channel = new BroadcastChannel(CHANNEL_NAME);
          channel.postMessage({ type: 'CUSTOM_EVENT', data: event });
          channel.close();
        } catch (e) {}
      }
    }
  };
})();
