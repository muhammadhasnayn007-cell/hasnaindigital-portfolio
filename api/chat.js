// Serverless Chatbot Handler for Hasnain's Assistant (Vercel & Netlify)
const { checkRateLimit, getClientIp } = require('../lib/security');
const { handleChatInteraction } = require('../lib/ai');

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
  const rateCheck = checkRateLimit(`${ip}:chat_serverless`, 25, 60000);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      success: false,
      error: 'You are sending messages too quickly. Please wait a few seconds before trying again.'
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
  const { sessionId, message, history } = body;

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ success: false, error: 'Please provide a message.' });
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
    console.error('Serverless Chat error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Hasnain\'s Assistant encountered a temporary processing issue. Please try again or use the Contact Form.'
    });
  }
};
