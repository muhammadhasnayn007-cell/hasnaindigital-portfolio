const { authenticate } = require('./admin-auth');
const { updateInquiry } = require('../lib/supabase-server');
const { generateInquirySummary } = require('../lib/ai');

module.exports = async function handler(req, res) {
  const auth = await authenticate(req);
  if (!auth) return res.status(401).json({ success: false, error: 'Administrator authentication required.' });
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed.' });
  const id = typeof req.body?.id === 'string' ? req.body.id : '';
  if (!id) return res.status(400).json({ success: false, error: 'Inquiry ID is required.' });
  try {
    const summary = await generateInquirySummary(req.body.inquiry || {});
    const inquiry = await updateInquiry(id, { ai_summary: summary });
    return res.status(200).json({ success: true, inquiry });
  } catch (error) {
    console.error('[v0] Inquiry processing failed:', error.message);
    return res.status(500).json({ success: false, error: 'Unable to generate the inquiry summary.' });
  }
};
