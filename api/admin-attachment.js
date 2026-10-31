const { createClient } = require('@supabase/supabase-js');

function adminClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Supabase server credentials are not configured.');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed.' });
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ success: false, error: 'Administrator authentication required.' });

  try {
    const supabase = adminClient();
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || authData.user?.app_metadata?.role !== 'admin') return res.status(401).json({ success: false, error: 'Administrator authentication required.' });

    const inquiryId = typeof req.query?.inquiryId === 'string' ? req.query.inquiryId : '';
    if (!/^[0-9a-f-]{36}$/i.test(inquiryId)) return res.status(400).json({ success: false, error: 'A valid inquiry ID is required.' });
    const { data: inquiry, error: inquiryError } = await supabase.from('project_inquiries').select('attachment_path').eq('id', inquiryId).single();
    if (inquiryError || !inquiry?.attachment_path) return res.status(404).json({ success: false, error: 'Attachment not found.' });

    const { data: file, error: downloadError } = await supabase.storage.from('inquiry-attachments').download(inquiry.attachment_path);
    if (downloadError || !file) return res.status(404).json({ success: false, error: 'Attachment not found.' });
    const buffer = Buffer.from(await file.arrayBuffer());
    res.setHeader('Content-Type', file.type || 'application/octet-stream');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Content-Disposition', 'attachment; filename="inquiry-attachment"');
    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).send(buffer);
  } catch (error) {
    console.error('[v0] Admin attachment download failed:', error.message);
    return res.status(500).json({ success: false, error: 'Unable to download attachment.' });
  }
};
