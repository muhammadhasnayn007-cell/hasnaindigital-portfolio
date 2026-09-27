// Hasnain Digital Marketer - Production Express Server
require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');

const {
  isValidEmail,
  getClientIp,
  checkRateLimit,
  isDuplicateSubmission,
  escapeHtml
} = require('./lib/security');
const { sendContactFormEmail } = require('./lib/mailer');
const { handleChatInteraction } = require('./lib/ai');
const knowledge = require('./lib/knowledge.json');

const app = express();
const PORT = process.env.PORT || 3000;

// Security and CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsers with sensible size limits
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Lightweight security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Protect sensitive server files and hidden files
app.use((req, res, next) => {
  const reqPath = req.path.toLowerCase();
  if (
    reqPath.startsWith('/.') ||
    reqPath.startsWith('/lib') ||
    reqPath.startsWith('/test') ||
    reqPath.startsWith('/node_modules') ||
    reqPath.endsWith('.env') ||
    reqPath.endsWith('.json') ||
    reqPath.endsWith('.lock') ||
    (reqPath.endsWith('.js') && reqPath !== '/script.js')
  ) {
    if (reqPath.startsWith('/api/')) return next();
    return res.status(404).end();
  }
  next();
});

// Explicit static handlers for core assets to guarantee correct Content-Type on Serverless & Node runtimes
app.get('/style.css', (req, res) => {
  res.setHeader('Content-Type', 'text/css; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.sendFile(path.join(__dirname, 'style.css'));
});

app.get('/script.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.sendFile(path.join(__dirname, 'script.js'));
});

app.get('/robots.txt', (req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.sendFile(path.join(__dirname, 'robots.txt'));
});

app.get('/sitemap.xml', (req, res) => {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.sendFile(path.join(__dirname, 'sitemap.xml'));
});

// Serve images directory statically
app.use('/images', express.static(path.join(__dirname, 'images'), {
  maxAge: '1d',
  etag: true
}));

// Serve other static assets with cache headers
app.use(express.static(__dirname, {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
  etag: true,
  dotfiles: 'ignore',
  index: 'index.html'
}));

// ==============================================================================
// 1. Health & Status Endpoint
// ==============================================================================
app.get('/api/health', (req, res) => {
  const availability = process.env.AVAILABILITY_STATUS || knowledge.brand.availability || 'Available for Projects';
  res.status(200).json({
    status: 'ok',
    brand: knowledge.brand.name,
    availability,
    version: '2.0.0',
    emailConfigured: Boolean(process.env.RESEND_API_KEY || (process.env.SMTP_HOST && process.env.SMTP_USER)),
    aiConfigured: Boolean(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY),
    timestamp: new Date().toISOString()
  });
});

// ==============================================================================
// 2. Real Contact Form Submission Endpoint
// ==============================================================================
app.post('/api/contact', async (req, res) => {
  const ip = getClientIp(req);

  // Rate limit: max 5 contact submissions per minute per IP
  const rateCheck = checkRateLimit(`${ip}:contact`, Number(process.env.RATE_LIMIT_CONTACT || 5), 60000);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      success: false,
      error: 'Too many contact requests. Please wait a moment before sending another message.'
    });
  }

  const body = req.body || {};

  // Honeypot anti-spam check
  if (body._honey) {
    // Return fake success for bots
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

  // Duplicate submission protection within 60s
  if (isDuplicateSubmission(name, email, message)) {
    return res.status(400).json({
      success: false,
      error: 'You have already submitted this message. If you need to make changes, please wait a minute.'
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

    // If neither Resend nor SMTP is configured on the server
    if (err.message.includes('No email service configured')) {
      return res.status(503).json({
        success: false,
        error: 'Email delivery service is currently not configured on this server. Please contact Hasnain directly at muhammadhasnayn007@gmail.com.',
        fallbackEmail: 'muhammadhasnayn007@gmail.com'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'An unexpected email delivery error occurred. Please try again or reach out directly to muhammadhasnayn007@gmail.com.'
    });
  }
});

// ==============================================================================
// 3. Hasnain's Assistant - AI Chat Endpoint
// ==============================================================================
app.post('/api/chat', async (req, res) => {
  const ip = getClientIp(req);

  // Rate limit: max 25 chat messages per minute per IP
  const rateCheck = checkRateLimit(`${ip}:chat`, Number(process.env.RATE_LIMIT_CHAT || 25), 60000);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      success: false,
      error: 'You have sent messages too quickly. Please wait a few seconds before trying again.'
    });
  }

  const { sessionId, message, history } = req.body || {};

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a message.'
    });
  }

  try {
    const result = await handleChatInteraction({
      sessionId: sessionId || ip,
      message: message.trim(),
      history: history || []
    });

    return res.status(200).json({
      success: true,
      reply: result.reply,
      leadStatus: result.leadStatus,
      handoffAvailable: result.handoffAvailable
    });
  } catch (err) {
    console.error('Chat error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Hasnain\'s Assistant encountered a temporary processing issue. Please feel free to ask again or reach out directly.'
    });
  }
});

// Fallback for API routes
app.all('/api/*', (req, res) => {
  res.status(404).json({ success: false, error: 'API endpoint not found.' });
});

// SPA fallback for HTML requests only (never serve HTML for file asset paths)
app.get('*', (req, res) => {
  if (path.extname(req.path)) {
    return res.status(404).end();
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server Uncaught Error:', err.message);
  res.status(500).json({
    success: false,
    error: 'A server error occurred. Please try again later.'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`=================================================================`);
  console.log(` Hasnain Digital Marketer - Full-Stack Portfolio Running`);
  console.log(` URL: http://localhost:${PORT}`);
  console.log(` Mode: ${process.env.NODE_ENV || 'development'}`);
  console.log(` Contact Delivery: ${process.env.RESEND_API_KEY ? 'Resend' : process.env.SMTP_HOST ? 'SMTP' : 'Unconfigured'}`);
  console.log(` AI Assistant: ${process.env.GEMINI_API_KEY ? 'Google Gemini' : process.env.OPENAI_API_KEY ? 'OpenAI' : 'Built-in Semantic Engine'}`);
  console.log(`=================================================================`);
});
