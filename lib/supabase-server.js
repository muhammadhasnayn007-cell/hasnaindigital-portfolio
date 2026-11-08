const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

function buildSubmissionKey({ full_name, email, description }) {
  return crypto.createHash('sha256').update([full_name, email, description].map(value => String(value || '').trim().toLowerCase()).join('|')).digest('hex');
}

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
  const submissionKey = input.submission_key || buildSubmissionKey(input);
  const payload = { ...input, submission_key: submissionKey };
  let { data, error } = await supabase.from('project_inquiries').insert(payload).select('id, reference_id, created_at, attachment_path').single();
  const missingSubmissionKey = error && (
    ['42703', 'PGRST204'].includes(error.code) ||
    String(error.message || '').toLowerCase().includes('submission_key')
  );
  if (missingSubmissionKey) {
    ({ data, error } = await supabase.from('project_inquiries').insert(input).select('id, reference_id, created_at, attachment_path').single());
    if (!error) return { ...data, isNew: true, submissionKey };
  }
  if (!error) return { ...data, isNew: true, submissionKey };
  if (error.code !== '23505') throw error;

  const { data: existing, error: existingError } = await supabase.from('project_inquiries').select('id, reference_id, created_at, attachment_path').eq('submission_key', submissionKey).single();
  if (existingError && String(existingError.message || '').toLowerCase().includes('submission_key')) {
    const { data: retried, error: retryError } = await supabase.from('project_inquiries').insert(input).select('id, reference_id, created_at, attachment_path').single();
    if (retryError) throw retryError;
    return { ...retried, isNew: true, submissionKey };
  }
  if (existingError) throw existingError;
  return { ...existing, isNew: false, submissionKey };
}

async function updateInquiry(id, update) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('project_inquiries').update(update).eq('id', id).select('id, reference_id, status, ai_summary, attachment_path, updated_at').single();
  if (error) throw error;
  return data;
}

async function uploadInquiryAttachment({ inquiryId, fileName, contentType, buffer }) {
  const supabase = getSupabaseAdmin();
  const safeName = fileName.replace(/[^a-z0-9._-]/gi, '-').slice(-120);
  const path = `${inquiryId}/${Date.now()}-${safeName}`;
  const { error: uploadError } = await supabase.storage.from('inquiry-attachments').upload(path, buffer, { contentType, upsert: false });
  if (uploadError) throw uploadError;
  await updateInquiry(inquiryId, { attachment_path: path });
  return path;
}

async function createNotificationDelivery(inquiryId) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .upsert({ inquiry_id: inquiryId, delivery_type: 'contact_email', status: 'pending' }, { onConflict: 'inquiry_id,delivery_type', ignoreDuplicates: true })
    .select('id, inquiry_id, status, attempt_count, provider_id, delivered_at')
    .single();
  if (!error) return data;
  if (!['PGRST116', '42P10', '23505'].includes(error.code)) throw error;
  const { data: existing, error: existingError } = await supabase.from('notification_deliveries').select('id, inquiry_id, status, attempt_count, provider_id, delivered_at').eq('inquiry_id', inquiryId).eq('delivery_type', 'contact_email').maybeSingle();
  if (existingError) throw existingError;
  if (existing) return existing;
  const { data: created, error: createError } = await supabase.from('notification_deliveries')
    .insert({ inquiry_id: inquiryId, delivery_type: 'contact_email', status: 'pending' })
    .select('id, inquiry_id, status, attempt_count, provider_id, delivered_at')
    .single();
  if (createError) throw createError;
  return created;
}

async function claimNotificationDelivery(id) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc('claim_notification_delivery', { delivery_id: id });
  if (!error) return data?.[0] || null;
  if (error.code !== 'PGRST202') throw error;

  const { data: fallback, error: fallbackError } = await supabase.from('notification_deliveries')
    .update({ status: 'sending', attempt_count: 1, updated_at: new Date().toISOString(), last_error: null })
    .eq('id', id).in('status', ['pending', 'failed'])
    .select('id, inquiry_id, status, attempt_count, provider_id, delivered_at').maybeSingle();
  if (fallbackError) throw fallbackError;
  return fallback || null;
}

async function updateNotificationDelivery(id, update) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('notification_deliveries')
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, status, provider_id, attempt_count, last_error, delivered_at')
    .single();
  if (error) throw error;
  return data;
}

module.exports = { buildSubmissionKey, createProjectInquiry, updateInquiry, uploadInquiryAttachment, createNotificationDelivery, claimNotificationDelivery, updateNotificationDelivery, getSupabaseAdmin };
