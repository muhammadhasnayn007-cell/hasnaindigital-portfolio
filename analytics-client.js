(() => {
  const consentCookie = 'hxsn_analytics_consent';
  const consentValue = () => document.cookie.split('; ').find((item) => item.startsWith(`${consentCookie}=`))?.split('=')[1] || null;
  const setConsent = (value) => {
    document.cookie = `${consentCookie}=${value}; Max-Age=31536000; Path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
  };
  const sessionId = (() => {
    try {
      const key = 'hxsn_analytics_session';
      let value = sessionStorage.getItem(key);
      if (!value) { value = crypto.randomUUID().replace(/[^a-z0-9-]/gi, ''); sessionStorage.setItem(key, value); }
      return value;
    } catch { return null; }
  })();

  window.hxsnTrack = (eventName, metadata = {}) => {
    if (consentValue() !== 'granted' || navigator.doNotTrack === '1') return;
    const payload = { eventName, path: location.pathname, metadata, sessionId, deviceCategory: innerWidth < 640 ? 'mobile' : innerWidth < 1024 ? 'tablet' : 'desktop', referrerHost: document.referrer ? new URL(document.referrer).hostname : null };
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) navigator.sendBeacon('/api/analytics', new Blob([body], { type: 'application/json' }));
    else fetch('/api/analytics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
  };

  const renderConsent = () => {
    if (consentValue() || navigator.doNotTrack === '1') return;
    const banner = document.createElement('aside');
    banner.setAttribute('aria-label', 'Analytics privacy choice');
    banner.innerHTML = '<strong>Privacy choice</strong><p>Allow anonymous analytics to help improve this site. No advertising trackers are used.</p><div><button type="button" data-consent="declined">Decline</button><button type="button" data-consent="granted">Allow analytics</button></div>';
    Object.assign(banner.style, { position: 'fixed', zIndex: '1000', left: '1rem', right: '1rem', bottom: '1rem', maxWidth: '28rem', padding: '1rem', background: '#101014', color: '#f5f5f5', border: '1px solid #3a3a44', borderRadius: '8px', boxShadow: '0 12px 32px rgba(0,0,0,.35)', font: '14px/1.45 system-ui, sans-serif' });
    banner.querySelector('p').style.margin = '0.35rem 0 0.75rem';
    banner.querySelector('div').style.display = 'flex';
    banner.querySelector('div').style.gap = '0.5rem';
    banner.querySelectorAll('button').forEach((button) => { button.style.padding = '0.5rem 0.75rem'; button.style.cursor = 'pointer'; button.addEventListener('click', () => { setConsent(button.dataset.consent); banner.remove(); if (button.dataset.consent === 'granted') window.hxsnTrack('page_view'); }); });
    document.body.appendChild(banner);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderConsent, { once: true });
  else renderConsent();
  if (consentValue() === 'granted') window.hxsnTrack('page_view');
})();
