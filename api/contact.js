// Serverless Contact Form Handler for Vercel, Netlify, and Serverless Platforms
const { isValidEmail, checkRateLimit, isDuplicateSubmission, getClientIp } = require('../lib/security');
const { sendContactFormEmail } = require('../lib/mailer');

module.exports = async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      const params = new URLSearchParams(body);
      body = Object.fromEntries(params.entries());
    }
  } else if (!body && req.readable) {
    const buffers = [];
    for await (const chunk of req) buffers.push(chunk);
    const raw = Buffer.concat(buffers).toString();
    try {
      body = JSON.parse(raw);
    } catch {
      const params = new URLSearchParams(raw);
      body = Object.fromEntries(params.entries());
    }
  }

  body = body || {};

  // Honeypot spam check
  if (body._honey) {
    return res.status(200).json({ success: true, message: 'Message sent successfully.' });
  }

  const name = (body.name || '').trim();
  const email = (body.email || '').trim();
  const subject = (body.subject || '').trim();
  const service = (body.service || 'General Project').trim();
  const message = (body.message || '').trim();

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

  if (isDuplicateSubmission(name, email, message)) {
    return res.status(400).json({
      success: false,
      error: 'You have already submitted this message. Please wait a minute before re-submitting.'
    });
  }

  try {
    const delivery = await sendContactFormEmail({ name, email, subject, service, message });
    return res.status(200).json({
      success: true,
      message: 'Your message has been delivered directly to Hasnain. You will receive a response within 24 hours.',
      deliveryId: delivery.id
    });
  } catch (err) {
    console.error('Contact Form Delivery Error:', err.message);

    if (err.message.includes('No email service configured')) {
      return res.status(503).json({
        success: false,
        error: 'Email delivery service is currently not configured on this server. Please reach out directly to muhammadhasnayn007@gmail.com.',
        fallbackEmail: 'muhammadhasnayn007@gmail.com'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred delivering your message. Please reach out directly to muhammadhasnayn007@gmail.com.'
    });
  }
};
