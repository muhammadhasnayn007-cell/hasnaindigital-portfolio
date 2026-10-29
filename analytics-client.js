(() => {
  const sessionId = (() => {
    try {
      const key = 'hxsn_analytics_session';
      let value = sessionStorage.getItem(key);
      if (!value) { value = crypto.randomUUID().replace(/[^a-z0-9-]/gi, ''); sessionStorage.setItem(key, value); }
      return value;
    } catch { return null; }
  })();
  window.hxsnTrack = (eventName, metadata = {}) => {
    if (navigator.doNotTrack === '1') return;
    const payload = { eventName, path: location.pathname, metadata, sessionId, deviceCategory: innerWidth < 640 ? 'mobile' : innerWidth < 1024 ? 'tablet' : 'desktop', referrerHost: document.referrer ? new URL(document.referrer).hostname : null };
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) navigator.sendBeacon('/api/analytics', new Blob([body], { type: 'application/json' }));
    else fetch('/api/analytics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
  };
  window.hxsnTrack('page_view');
})();
