const { authenticate } = require('./admin-auth');

module.exports = async function handler(req, res) {
  const auth = await authenticate(req);
  if (!auth) return res.status(401).json({ success: false, error: 'Administrator authentication required.' });
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed.' });

  try {
    const status = typeof req.query?.status === 'string' ? req.query.status : 'active';
    let query = auth.admin
      .from('newsletter_subscribers')
      .select('id, email, source, status, subscribed_at, unsubscribed_at, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(500);
    if (['pending', 'active', 'unsubscribed'].includes(status)) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    return res.status(200).json({ success: true, subscribers: data || [] });
  } catch (error) {
    console.error('[v0] Admin newsletter failed:', error.message);
    return res.status(500).json({ success: false, error: 'Unable to load newsletter subscribers.' });
  }
};
