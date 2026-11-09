const { getClientIp, checkRateLimit, applyCors } = require('../lib/security');
const { getSupabaseAdmin } = require('../lib/supabase-server');
const { createNewsletterToken, hashNewsletterToken, buildNewsletterUrl } = require('../lib/newsletter');
const { sendNewsletterConfirmationEmail } = require('../lib/mailer');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONFIRMATION_WINDOW_MS = 48 * 60 * 60 * 1000;

module.exports = async function handler(req, res) {
  applyCors(req, res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed.' });

  const rateCheck = checkRateLimit(`${getClientIp(req)}:newsletter`, 5, 3600000);
  if (!rateCheck.allowed) return res.status(429).json({ success: false, error: 'Please wait before subscribing again.' });

  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!EMAIL_PATTERN.test(email) || email.length > 254) return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
  if (req.body?.consent !== true) return res.status(400).json({ success: false, error: 'Please confirm that you want to receive the newsletter.' });

  try {
    const supabase = getSupabaseAdmin();
    const { data: existing, error: existingError } = await supabase
      .from('newsletter_subscribers')
      .select('id, email, status')
      .eq('email', email)
      .maybeSingle();
    if (existingError) throw existingError;

    const confirmationToken = createNewsletterToken();
    const unsubscribeToken = createNewsletterToken();
    const confirmationExpiresAt = new Date(Date.now() + CONFIRMATION_WINDOW_MS).toISOString();
    const isAlreadyActive = existing?.status === 'active';
    const subscriberPayload = {
      email,
      source: 'portfolio_footer',
      status: isAlreadyActive ? 'active' : 'pending',
      consent_at: new Date().toISOString(),
      confirmed_at: isAlreadyActive ? new Date().toISOString() : null,
      confirmation_token_hash: isAlreadyActive ? null : hashNewsletterToken(confirmationToken),
      confirmation_expires_at: isAlreadyActive ? null : confirmationExpiresAt,
      unsubscribe_token_hash: hashNewsletterToken(unsubscribeToken),
      unsubscribed_at: null
    };

    const { data: subscriber, error } = await supabase
      .from('newsletter_subscribers')
      .upsert(subscriberPayload, { onConflict: 'email' })
      .select('email, status')
      .single();
    if (error) throw error;

    if (!isAlreadyActive) {
      await sendNewsletterConfirmationEmail({
        email,
        confirmationUrl: buildNewsletterUrl(req, '/api/newsletter/confirm', confirmationToken),
        unsubscribeUrl: buildNewsletterUrl(req, '/api/newsletter/unsubscribe', unsubscribeToken)
      });
    }

    return res.status(200).json({
      success: true,
      subscriber: { email: subscriber.email, status: subscriber.status },
      message: isAlreadyActive ? 'You are already subscribed.' : 'Check your inbox to confirm your subscription.'
    });
  } catch (error) {
    console.error('[v0] Newsletter subscription failed:', error.message);
    return res.status(500).json({ success: false, error: 'Subscription could not be completed right now. Please try again.' });
  }
};
