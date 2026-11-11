// Serverless Contact Form Handler for Vercel, Netlify, and Serverless Platforms
const { isValidEmail, checkRateLimit, isDuplicateSubmission, recordSubmissionSuccess, clearSubmissionLock, getClientIp, applyCors, readRequestBody, parseRequestBody, MAX_SERVERLESS_BODY_BYTES } = require('../security');
const { processContactSubmission } = require('../contact-submission');

module.exports = async function handler(req, res) {
  applyCors(req, res, 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Only POST is accepted.' });
  }

  const ip = getClientIp(req);
  const rateCheck = checkRateLimit(`${ip}:contact_serverless`, 5, 60000);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      success: false,
      error: 'Too many contact requests. Please wait a minute before sending another message.'
    });
  }

  let body;
  try {
    const raw = await readRequestBody(req, MAX_SERVERLESS_BODY_BYTES);
    body = parseRequestBody(raw, req.headers['content-type'] || '');
  } catch (err) {
    if (err.code === 'BODY_TOO_LARGE') return res.status(413).json({ success: false, error: 'Request is too large.' });
    return res.status(400).json({ success: false, error: 'Please send a valid request.' });
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ success: false, error: 'Please send a valid contact request.' });
  }
  const textField = (value, max) => typeof value === 'string' && value.length <= max ? value.trim() : '';

  // Honeypot spam check
  if (body._honey) {
    return res.status(200).json({ success: true, message: 'Message sent successfully.' });
  }

  const name = textField(body.name, 120);
  const email = textField(body.email, 254);
  const subject = textField(body.subject, 200);
  const service = textField(body.service, 120) || 'General Project';
  const message = textField(body.message, 8000);
  const budget = textField(body.budget, 120);
  const timeline = textField(body.timeline, 120);
  const websiteUrl = textField(body.websiteUrl, 500);
  const contactMethod = body.contactMethod === 'WhatsApp' ? 'whatsapp' : 'email';
  const whatsapp = textField(body.whatsapp, 40);
  const privacyConsent = body.privacyConsent === true;
  if (!privacyConsent) return res.status(400).json({ success: false, error: 'Please accept the privacy notice before submitting.' });
  if (websiteUrl) {
    try {
      const parsedUrl = new URL(websiteUrl);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('Unsupported protocol');
    } catch { return res.status(400).json({ success: false, error: 'Please provide a valid HTTP or HTTPS website URL.' }); }
  }
  if (contactMethod === 'whatsapp' && whatsapp.length < 7) {
    return res.status(400).json({ success: false, error: 'Please provide a valid WhatsApp number.' });
  }

  // Server-side validation
  if (!name || name.length < 2) {
    return res.status(400).json({ success: false, error: 'Please provide your full name (minimum 2 characters).' });
  }

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ success: false, error: 'Please provide a valid email address.' });
  }

  if (!subject || subject.length < 3) {
    return res.status(400).json({ success: false, error: 'Please provide a descriptive subject (minimum 3 characters).' });
  }

  if (!message || message.length < 10) {
    return res.status(400).json({ success: false, error: 'Please provide project details (minimum 10 characters).' });
  }

  // Duplicate submission protection (only triggers if previously DELIVERED within 60s)
  if (isDuplicateSubmission(name, email, message)) {
    return res.status(400).json({
      success: false,
      error: 'You have already submitted this message. Please wait a minute before re-submitting.'
    });
  }

  try {
    const result = await processContactSubmission({
      inquiryData: {
        full_name: name,
        email,
        phone: contactMethod === 'whatsapp' ? whatsapp : null,
        preferred_contact_method: contactMethod,
        project_type: service,
        project_title: subject,
        current_website_url: websiteUrl || null,
        description: message,
        budget: budget || null,
        timeline: timeline || null,
        privacy_consent: privacyConsent,
        marketing_consent: false
      },
      emailData: { name, email, subject, service, message, budget, timeline, websiteUrl, contactMethod, whatsapp },
      attachment: body.attachment
    });

    if (result.deliveryError) {
      clearSubmissionLock(name, email, message);
      return res.status(202).json({ success: true, message: 'Your enquiry was received securely. Our team will follow up shortly.', inquiryId: result.inquiry.id, referenceId: result.inquiry.reference_id, deliveryPending: true });
    }

    recordSubmissionSuccess(name, email, message);
    return res.status(200).json({
      success: true,
      message: result.alreadyProcessing ? 'Your enquiry is already being delivered.' : 'Your enquiry was accepted by the delivery service. You will receive a response within 24 hours.',
      inquiryId: result.inquiry.id,
      referenceId: result.inquiry.reference_id,
      deliveryId: result.delivery.id
    });
  } catch (err) {
    clearSubmissionLock(name, email, message);
    console.error('Contact Form Delivery Error:', err.message);
    const serviceUnavailable = err.code === 'SUPABASE_NOT_CONFIGURED';
    return res.status(serviceUnavailable ? 503 : 500).json({
      success: false,
      error: serviceUnavailable
        ? 'The contact service is temporarily unavailable. Please use the direct email fallback.'
        : 'We could not process your enquiry right now. Please retry or use the direct email fallback.'
    });
  }
};
