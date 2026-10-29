const { getSupabaseAdmin } = require('../lib/supabase-server');
const { getClientIp, checkRateLimit } = require('../lib/security');
const { authenticate } = require('./admin-auth');

module.exports = async function adminAnalytics(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ success:false, error:'Method not allowed.' });
  const limit = checkRateLimit(`${getClientIp(req)}:admin-analytics`, 60, 60_000);
  if (!limit.allowed) return res.status(429).json({ success:false, error:'Too many requests.' });
  try {
    const auth = await authenticate(req);
    if (!auth) return res.status(401).json({ success:false, error:'Administrator authentication required.' });
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data, error } = await auth.admin.from('analytics_events').select('event_name, path, device_category, created_at').gte('created_at', since).order('created_at', { ascending:false }).limit(5000);
    if (error) throw error;
    const events = data || [];
    const byEvent = Object.fromEntries([...new Set(events.map(e=>e.event_name))].map(name=>[name, events.filter(e=>e.event_name===name).length]));
    return res.json({ success:true, periodDays:30, totalEvents:events.length, byEvent, pageViews:byEvent.page_view||0, contactStarts:byEvent.contact_start||0, contactSuccesses:byEvent.contact_success||0, conversionRate:byEvent.contactStarts ? Number(((byEvent.contactSuccesses||0)/byEvent.contactStarts*100).toFixed(1)) : 0 });
  } catch (error) { console.error('[v0] Admin analytics failed:', error.message); return res.status(503).json({success:false,error:'Analytics report unavailable.'}); }
};
