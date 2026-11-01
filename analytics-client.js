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

  const closeConsent = () => document.querySelector('.privacy-consent-popup')?.remove();
  const renderConsent = () => {
    closeConsent();
    const banner = document.createElement('aside');
    banner.className = 'privacy-consent-popup';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-modal', 'false');
    banner.setAttribute('aria-labelledby', 'privacy-consent-title');
    banner.innerHTML = '<div class="privacy-consent-copy"><strong id="privacy-consent-title">Privacy choice</strong><p>Allow anonymous analytics to help improve this site. No advertising trackers are used.</p></div><div class="privacy-consent-actions"><button class="privacy-consent-btn privacy-consent-btn-decline" type="button" data-consent="declined">Decline</button><button class="privacy-consent-btn privacy-consent-btn-allow" type="button" data-consent="granted">Allow analytics</button></div>';
    banner.querySelectorAll('[data-consent]').forEach((button) => button.addEventListener('click', () => { setConsent(button.dataset.consent); closeConsent(); if (button.dataset.consent === 'granted') window.hxsnTrack('page_view'); }));
    document.body.appendChild(banner);
  };

  const addPrivacySettings = () => {
    if (document.querySelector('.privacy-settings')) return;
    const button = document.createElement('button');
    button.className = 'privacy-settings';
    button.type = 'button';
    button.textContent = 'Privacy settings';
    button.addEventListener('click', renderConsent);
    document.body.appendChild(button);
  };

  const init = () => {
    addPrivacySettings();
    if (!consentValue() && navigator.doNotTrack !== '1') renderConsent();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
  if (consentValue() === 'granted') window.hxsnTrack('page_view');
})();
