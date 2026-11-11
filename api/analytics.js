const { getSupabaseAdmin } = require('../lib/supabase-server');
const { getClientIp, checkRateLimit } = require('../lib/security');

const allowedEvents = new Set(['page_view','project_view','project_click','service_engagement','contact_start','contact_validation_error','contact_success','resume_download','assistant_interaction','suggestion_submit']);
const allowedMetadataKeys = new Set(['service', 'project', 'action', 'source']);
const safeValuePattern = /^[\p{L}\p{N} _&/-]{1,80}$/u;

function hasAnalyticsConsent(req) {
  if (req.headers['sec-gpc'] === '1' || req.headers.dnt === '1') return false;
  return (req.headers.cookie || '').split(';').some(cookie => cookie.trim() === 'hxsn_analytics_consent=granted');
}

function sanitizeMetadata(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([key, item]) =>
    allowedMetadataKeys.has(key) && typeof item === 'string' && safeValuePattern.test(item) && !item.includes('@')
  ));
}

function sanitizePath(value) {
  return typeof value === 'string' && /^\/[a-z0-9/_-]{0,250}$/i.test(value) ? value : '/';
}

function sanitizeReferrerHost(value) {
  if (typeof value !== 'string' || value.length > 253) return null;
  return /^(?:localhost|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)$/i.test(value) ? value.toLowerCase() : null;
}

module.exports = async function analytics(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed.' });
  if (!hasAnalyticsConsent(req)) return res.status(204).end();
  const limit = checkRateLimit(`${getClientIp(req)}:analytics`, 120, 60_000);
  if (!limit.allowed) return res.status(429).json({ success: false, error: 'Too many analytics events.' });
  const body = req.body || {};
  if (!allowedEvents.has(body.eventName)) return res.status(400).json({ success: false, error: 'Unsupported analytics event.' });
  const path = sanitizePath(body.path);
  const metadata = sanitizeMetadata(body.metadata);
  const sessionId = typeof body.sessionId === 'string' && /^[a-z0-9-]{16,80}$/i.test(body.sessionId) ? body.sessionId : null;
  const deviceCategory = ['mobile','tablet','desktop','unknown'].includes(body.deviceCategory) ? body.deviceCategory : 'unknown';
  const referrerHost = sanitizeReferrerHost(body.referrerHost);
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('analytics_events').insert({ event_name: body.eventName, path, metadata, session_id: sessionId, device_category: deviceCategory, referrer_host: referrerHost });
    if (error) throw error;
    return res.status(202).json({ success: true });
  } catch (error) {
    console.error('[v0] Analytics event failed:', error.message);
    return res.status(503).json({ success: false, error: 'Analytics is temporarily unavailable.' });
  }
};
