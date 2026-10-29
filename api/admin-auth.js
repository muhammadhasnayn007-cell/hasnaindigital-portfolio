const { createClient } = require('@supabase/supabase-js');

function client() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('Supabase authentication is not configured.');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function authenticate(req) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const admin = require('../lib/supabase-server').getSupabaseAdmin();
  const { data, error } = await admin.auth.getUser(token);
  return error || data.user?.app_metadata?.role !== 'admin' ? null : { admin, user: data.user };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed.' });
  const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!email || !password) return res.status(400).json({ success: false, error: 'Email and password are required.' });
  try {
    const { data, error } = await client().auth.signInWithPassword({ email, password });
    if (error || !data.session || data.user?.app_metadata?.role !== 'admin') {
      return res.status(401).json({ success: false, error: 'Invalid administrator credentials.' });
    }
    return res.status(200).json({ success: true, accessToken: data.session.access_token, user: { email: data.user.email } });
  } catch (error) {
    console.error('[v0] Admin auth failed:', error.message);
    return res.status(500).json({ success: false, error: 'Administrator authentication is temporarily unavailable.' });
  }
};

module.exports.authenticate = authenticate;
