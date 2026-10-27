// Hasnain Digital Marketer - Production Express Server
require('dotenv').config();

const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const {
  isValidEmail,
  getClientIp,
  checkRateLimit,
  isDuplicateSubmission,
  recordSubmissionSuccess,
  clearSubmissionLock,
  escapeHtml
} = require('./lib/security');
const { sendContactFormEmail } = require('./lib/mailer');
const { handleChatInteraction } = require('./lib/ai');
const knowledge = require('./lib/knowledge.json');

const app = express();
const PORT = process.env.PORT || 3000;
const allowedOrigins = new Set([
  'https://hasnaindigital-portfolio.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  ...(process.env.ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean)
]);
app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : false);

// CORS is an origin allowlist, not authentication.
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  optionsSuccessStatus: 204
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
    (reqPath.endsWith('.js') && reqPath !== '/script.js' && reqPath !== '/firebase-client.js')
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

app.get('/firebase-client.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.sendFile(path.join(__dirname, 'firebase-client.js'));
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
  res.status(200).json({
    status: 'ok',
    service: 'portfolio-api',
    brand: knowledge.brand.name,
    availability: process.env.AVAILABILITY_STATUS || knowledge.brand.availability || 'Available for Projects',
    timestamp: new Date().toISOString()
  });
});

// Firebase Client Configuration Endpoint
app.get('/api/firebase-config', (req, res) => {
  try {
    const configPath = path.join(__dirname, 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return res.status(200).json({
        configured: true,
        projectId: config.projectId,
        appId: config.appId,
        apiKey: config.apiKey,
        authDomain: config.authDomain,
        firestoreDatabaseId: config.firestoreDatabaseId,
        storageBucket: config.storageBucket,
        messagingSenderId: config.messagingSenderId
      });
    }
  } catch (err) {
    console.error('Error reading firebase-applet-config.json:', err.message);
  }
  return res.status(200).json({ configured: false });
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
  const budget = (body.budget || '').trim();
  const timeline = (body.timeline || '').trim();
  const websiteUrl = (body.websiteUrl || '').trim();
  const contactMethod = body.contactMethod === 'WhatsApp' ? 'WhatsApp' : 'Email';
  const whatsapp = (body.whatsapp || '').trim();

  if (websiteUrl) {
    try { new URL(websiteUrl); } catch { return res.status(400).json({ success: false, error: 'Please provide a valid website URL.' }); }
  }
  if (contactMethod === 'WhatsApp' && whatsapp.length < 7) {
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

  // Duplicate submission protection within 60s
  if (isDuplicateSubmission(name, email, message)) {
    return res.status(400).json({
      success: false,
      error: 'You have already submitted this message. If you need to make changes, please wait a minute.'
    });
  }

  try {
    const delivery = await sendContactFormEmail({ name, email, subject, service, message, budget, timeline, websiteUrl, contactMethod, whatsapp });
    recordSubmissionSuccess(name, email, message);
    return res.status(200).json({
      success: true,
      message: 'Your message was submitted successfully and accepted by the delivery service. You will receive a response within 24 hours.',
      deliveryId: delivery.id
    });
  } catch (err) {
    clearSubmissionLock(name, email, message);
    console.error('Contact Form Delivery Error:', err.message);

    return res.status(500).json({
      success: false,
      error: 'A server error occurred. Please try again later.'
    });
  }
});

// HXSN Assistant - AI Chat Endpoint
app.post('/api/chat', async (req, res) => {
  const ip = getClientIp(req);
  const rateCheck = checkRateLimit(`${ip}:chat`, Number(process.env.RATE_LIMIT_CHAT || 25), 60000);
  if (!rateCheck.allowed) return res.status(429).json({ success: false, error: 'You have sent messages too quickly. Please wait a few seconds before trying again.' });
  const { sessionId, message, history } = req.body || {};
  if (!message || typeof message !== 'string' || message.length > 2000 || !message.trim()) return res.status(400).json({ success: false, error: 'Please provide a message.' });
  if (sessionId !== undefined && (typeof sessionId !== 'string' || sessionId.length > 128 || !/^[a-zA-Z0-9_-]+$/.test(sessionId))) return res.status(400).json({ success: false, error: 'Invalid session.' });
  if (history !== undefined && (!Array.isArray(history) || history.length > 20 || history.some(item => !item || typeof item.role !== 'string' || typeof item.content !== 'string' || item.content.length > 2000))) return res.status(400).json({ success: false, error: 'Chat history is invalid or too large.' });
  try {
    const result = await handleChatInteraction({
      sessionId: sessionId || ip,
      message: message.trim(),
      history: history || [],
      allowFallback: process.env.NODE_ENV !== 'production'
    });
    return res.status(200).json({ success: true, reply: result.reply, groundingSources: result.groundingSources || [], leadStatus: result.leadStatus, handoffAvailable: result.handoffAvailable });
  } catch (err) {
    console.error('[v0] Chat error:', err.message, err.cause?.message || '');
    const isProviderUnavailable = err.code === 'AI_PROVIDER_UNAVAILABLE';
    return res.status(isProviderUnavailable ? 503 : 500).json({
      success: false,
      error: isProviderUnavailable
        ? err.message
        : "Hasnain's Assistant encountered a temporary processing issue. Please feel free to ask again or reach out directly."
    });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`=================================================================`);
  console.log(` Hasnain Digital Marketer - Full-Stack Portfolio Running`);
  console.log(` URL: http://localhost:${PORT}`);
  console.log(` Mode: ${process.env.NODE_ENV || 'development'}`);
  console.log(` Contact Delivery: ${(process.env.RESEND_API_KEY || process.env.API_key) ? 'Resend' : process.env.SMTP_HOST ? 'SMTP' : 'Unconfigured'}`);
  console.log(` AI Assistant: ${process.env.GEMINI_API_KEY ? `Gemini (${process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite'})` : 'Gemini API key not configured'}`);
  console.log(`=================================================================`);
});
