// Serverless Health Check Handler
const knowledge = require('../lib/knowledge.json');

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const availability = process.env.AVAILABILITY_STATUS || knowledge.brand.availability || 'Available for Projects';

  res.status(200).json({
    status: 'ok',
    brand: knowledge.brand.name,
    availability,
    emailConfigured: Boolean(process.env.RESEND_API_KEY || (process.env.SMTP_HOST && process.env.SMTP_USER)),
    aiConfigured: Boolean(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY),
    timestamp: new Date().toISOString()
  });
};
