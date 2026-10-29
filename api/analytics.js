const { getSupabaseAdmin } = require('../lib/supabase-server');
const { getClientIp, checkRateLimit } = require('../lib/security');

const allowedEvents = new Set(['page_view','project_view','project_click','service_engagement','contact_start','contact_validation_error','contact_success','resume_download','assistant_interaction','suggestion_submit']);

module.exports = async function analytics(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed.' });
  const limit = checkRateLimit(`${getClientIp(req)}:analytics`, 120, 60_000);
  if (!limit.allowed) return res.status(429).json({ success: false, error: 'Too many analytics events.' });
  const body = req.body || {};
  if (!allowedEvents.has(body.eventName)) return res.status(400).json({ success: false, error: 'Unsupported analytics event.' });
  const path = typeof body.path === 'string' ? body.path.slice(0, 500) : '/';
  const metadata = body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata) ? body.metadata : {};
  const sessionId = typeof body.sessionId === 'string' && /^[a-z0-9-]{16,80}$/i.test(body.sessionId) ? body.sessionId : null;
  const deviceCategory = ['mobile','tablet','desktop','unknown'].includes(body.deviceCategory) ? body.deviceCategory : 'unknown';
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('analytics_events').insert({ event_name: body.eventName, path, metadata, session_id: sessionId, device_category: deviceCategory, referrer_host: typeof body.referrerHost === 'string' ? body.referrerHost.slice(0, 200) : null });
    if (error) throw error;
    return res.status(202).json({ success: true });
  } catch (error) {
    console.error('[v0] Analytics event failed:', error.message);
    return res.status(503).json({ success: false, error: 'Analytics is temporarily unavailable.' });
  }
};
