const { createClient } = require('@supabase/supabase-js');

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    const error = new Error('Supabase server credentials are not configured.');
    error.code = 'SUPABASE_NOT_CONFIGURED';
    throw error;
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function createProjectInquiry(input) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('project_inquiries')
    .insert(input)
    .select('id, reference_id, created_at')
    .single();
  if (error) throw error;
  return data;
}

module.exports = { createProjectInquiry };
