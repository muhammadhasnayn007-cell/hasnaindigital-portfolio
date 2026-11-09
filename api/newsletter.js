const { getClientIp, checkRateLimit, applyCors } = require('../lib/security');
const { getSupabaseAdmin } = require('../lib/supabase-server');
const { sendNewsletterSubscriptionEmail } = require('../lib/mailer');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = async function handler(req, res) {
  applyCors(req, res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed.' });

  const rateCheck = checkRateLimit(`${getClientIp(req)}:newsletter`, 5, 3600000);
  if (!rateCheck.allowed) return res.status(429).json({ success: false, error: 'Please wait before subscribing again.' });

  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: existing, error: existingError } = await supabase
      .from('newsletter_subscribers')
      .select('id, status')
      .eq('email', email)
      .maybeSingle();
    if (existingError) throw existingError;

    const subscriberPayload = {
      email,
      source: 'portfolio_footer',
      status: 'subscribed',
      unsubscribed_at: null
    };
    if (!existing || existing.status !== 'subscribed') subscriberPayload.subscribed_at = new Date().toISOString();

    const { data: subscriber, error } = await supabase
      .from('newsletter_subscribers')
      .upsert(subscriberPayload, { onConflict: 'email' })
      .select('id, email, status, subscribed_at')
      .single();
    if (error) throw error;

    if (!existing || existing.status !== 'subscribed') {
      await sendNewsletterSubscriptionEmail({ email });
    }

    return res.status(200).json({ success: true, subscriber: { email: subscriber.email, status: subscriber.status } });
  } catch (error) {
    console.error('[v0] Newsletter subscription failed:', error.message);
    return res.status(500).json({ success: false, error: 'Subscription could not be completed right now. Please try again.' });
  }
};
