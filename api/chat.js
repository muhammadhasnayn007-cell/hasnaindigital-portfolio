// Serverless Chatbot Handler for HXSN Assistant (Vercel & Netlify)
const { checkRateLimit, getClientIp, applyCors, readRequestBody, parseRequestBody, MAX_SERVERLESS_BODY_BYTES, MAX_CHAT_HISTORY_ITEMS, MAX_CHAT_ITEM_LENGTH } = require('../lib/security');
const { handleChatInteraction } = require('../lib/ai');

module.exports = async function handler(req, res) {
  applyCors(req, res, 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Only POST is accepted.' });
  }

  const ip = getClientIp(req);
  const rateCheck = checkRateLimit(`${ip}:chat_serverless`, 25, 60000);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      success: false,
      error: 'You are sending messages too quickly. Please wait a few seconds before trying again.'
    });
  }

  let body;
  try {
    const raw = await readRequestBody(req, MAX_SERVERLESS_BODY_BYTES);
    body = parseRequestBody(raw, req.headers['content-type'] || '');
  } catch (err) {
    if (err.code === 'BODY_TOO_LARGE') return res.status(413).json({ success: false, error: 'Request is too large.' });
    return res.status(400).json({ success: false, error: 'Please send valid JSON.' });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ success: false, error: 'Please send a valid chat request.' });
  }
  const { sessionId, message, history } = body;
  if (sessionId !== undefined && (typeof sessionId !== 'string' || sessionId.length < 1 || sessionId.length > 128 || !/^[a-zA-Z0-9_-]+$/.test(sessionId))) {
    return res.status(400).json({ success: false, error: 'Invalid session.' });
  }
  if (history !== undefined && (!Array.isArray(history) || history.length > MAX_CHAT_HISTORY_ITEMS || history.some(item => !item || typeof item !== 'object' || typeof item.role !== 'string' || typeof item.content !== 'string' || item.content.length > MAX_CHAT_ITEM_LENGTH))) {
    return res.status(400).json({ success: false, error: 'Chat history is invalid or too large.' });
  }

  if (!message || typeof message !== 'string' || message.length > 2000 || !message.trim()) {
    return res.status(400).json({ success: false, error: 'Please provide a message.' });
  }

  try {
    const result = await handleChatInteraction({
      sessionId: sessionId || ip,
      message: message.trim(),
      history: history || [],
      allowFallback: process.env.NODE_ENV !== 'production'
    });

    return res.status(200).json({
      success: true,
      reply: result.reply,
      groundingSources: result.groundingSources || [],
      leadStatus: result.leadStatus,
      handoffAvailable: result.handoffAvailable
    });
  } catch (err) {
    console.error('[v0] Serverless Chat error:', err.message);
    const isProviderUnavailable = err.code === 'AI_PROVIDER_UNAVAILABLE';
    return res.status(isProviderUnavailable ? 503 : 500).json({
      success: false,
      error: isProviderUnavailable
        ? err.message
        : 'Hasnain\'s Assistant encountered a temporary processing issue. Please try again or use the Contact Form.'
    });
  }
};
