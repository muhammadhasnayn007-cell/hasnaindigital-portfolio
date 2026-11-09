const { getSupabaseAdmin } = require('../lib/supabase-server');
const { hashNewsletterToken } = require('../lib/newsletter');

function page(title, message, ok = true) {
  const color = ok ? '#1b8b58' : '#c51b23';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="margin:0;background:#100d0c;color:#f4eee9;font:16px Arial,sans-serif;display:grid;place-items:center;min-height:100vh"><main style="max-width:520px;padding:40px;border:1px solid #413533;border-radius:20px;background:#171211;text-align:center"><p style="color:${color};font-weight:700;letter-spacing:.12em">H.X.S.N DIGITAL TECHNOLOGIES</p><h1>${title}</h1><p style="color:#c8bdb7;line-height:1.6">${message}</p><a href="/" style="color:#fff;background:#c51b23;padding:13px 18px;border-radius:8px;text-decoration:none;display:inline-block">Return to portfolio</a></main></body></html>`;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).send(page('Method not allowed', 'Please use the unsubscribe link from your email.', false));
  const token = typeof req.query?.token === 'string' ? req.query.token : '';
  if (!token || token.length > 200) return res.status(400).send(page('Invalid unsubscribe link', 'This unsubscribe link is incomplete or invalid.', false));

  try {
    const { error } = await getSupabaseAdmin()
      .from('newsletter_subscribers')
      .update({ status: 'unsubscribed', unsubscribed_at: new Date().toISOString() })
      .eq('unsubscribe_token_hash', hashNewsletterToken(token));
    if (error) throw error;
    return res.status(200).send(page('You are unsubscribed', 'You will no longer receive newsletter messages from us.'));
  } catch (error) {
    console.error('[v0] Newsletter unsubscribe failed:', error.message);
    return res.status(500).send(page('Unsubscribe unavailable', 'We could not complete the request right now. Please try again later.', false));
  }
};
