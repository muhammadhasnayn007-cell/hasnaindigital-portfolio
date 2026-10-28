const { createClient } = require('@supabase/supabase-js');

function adminClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Supabase server credentials are not configured.');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function authenticate(req) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const admin = adminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || data.user?.app_metadata?.role !== 'admin') return null;
  return { admin, user: data.user };
}

module.exports = async function handler(req, res) {
  const auth = await authenticate(req);
  if (!auth) return res.status(401).json({ success: false, error: 'Administrator authentication required.' });
  try {
    if (req.method === 'GET') {
      const search = typeof req.query?.search === 'string' ? req.query.search.trim().replace(/[%_,]/g, ' ').slice(0, 100) : '';
      const status = typeof req.query?.status === 'string' ? req.query.status : '';
      let query = auth.admin.from('project_inquiries').select('id, reference_id, full_name, email, company, phone, preferred_contact_method, project_type, project_title, current_website_url, description, budget, timeline, status, ai_summary, admin_notes, follow_up_at, created_at, updated_at').order('created_at', { ascending: false }).limit(200);
      if (status && ['new','contacted','qualified','converted','archived'].includes(status)) query = query.eq('status', status);
      if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,reference_id.ilike.%${search}%,project_title.ilike.%${search}%`);
      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json({ success: true, inquiries: data || [] });
    }
    if (req.method === 'PATCH') {
      const id = typeof req.body?.id === 'string' ? req.body.id : '';
      const status = typeof req.body?.status === 'string' ? req.body.status : '';
      const adminNotes = typeof req.body?.admin_notes === 'string' ? req.body.admin_notes.slice(0, 5000) : undefined;
      if (!id || !['new','contacted','qualified','converted','archived'].includes(status)) return res.status(400).json({ success: false, error: 'Valid inquiry ID and status are required.' });
      const update = { status };
      if (adminNotes !== undefined) update.admin_notes = adminNotes;
      const { data, error } = await auth.admin.from('project_inquiries').update(update).eq('id', id).select('id, reference_id, status, admin_notes, updated_at').single();
      if (error) throw error;
      return res.status(200).json({ success: true, inquiry: data });
    }
    return res.status(405).json({ success: false, error: 'Method not allowed.' });
  } catch (error) {
    console.error('[v0] Admin inquiries failed:', error.message);
    return res.status(500).json({ success: false, error: 'Unable to load or update inquiries.' });
  }
};
