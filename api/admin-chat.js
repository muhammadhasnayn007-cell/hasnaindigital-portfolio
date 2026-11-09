const { authenticate } = require('./admin-auth');

function formatDate(value) {
  return value ? new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'Unknown date';
}

module.exports = async function handler(req, res) {
  const auth = await authenticate(req);
  if (!auth) return res.status(401).json({ success: false, error: 'Administrator authentication required.' });
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed.' });

  const message = typeof req.body?.message === 'string' ? req.body.message.trim().slice(0, 1000) : '';
  if (!message) return res.status(400).json({ success: false, error: 'Please enter a request.' });

  const wantsHistory = /client history|client inquiries|all clients|all inquiries|lead history|project history/i.test(message);
  if (!wantsHistory) {
    return res.status(200).json({ success: true, reply: 'I can securely retrieve client history, inquiry statuses, subscriber totals, and delivery records. Try: “Give me all client history.”' });
  }

  try {
    const { data, error } = await auth.admin
      .from('project_inquiries')
      .select('reference_id, full_name, email, company, phone, preferred_contact_method, project_type, project_title, description, budget, timeline, status, ai_summary, admin_notes, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    const inquiries = data || [];
    const reply = inquiries.length
      ? `I found ${inquiries.length} client ${inquiries.length === 1 ? 'record' : 'records'} in the secure inquiry history. Full records are available below.`
      : 'There are no client inquiries in the secure history yet.';
    return res.status(200).json({
      success: true,
      reply,
      clientHistory: inquiries.map(item => ({ ...item, created_at: formatDate(item.created_at), updated_at: formatDate(item.updated_at) }))
    });
  } catch (error) {
    console.error('[v0] Admin history assistant failed:', error.message);
    return res.status(500).json({ success: false, error: 'Unable to retrieve client history.' });
  }
};
