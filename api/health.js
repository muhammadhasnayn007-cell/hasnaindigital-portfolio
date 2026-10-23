// Serverless Health Check Handler
const knowledge = require('../lib/knowledge.json');
const { applyCors } = require('../lib/security');

module.exports = function handler(req, res) {
  applyCors(req, res, 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  res.status(200).json({
    status: 'ok',
    service: 'portfolio-api',
    brand: knowledge.brand.name,
    availability: process.env.AVAILABILITY_STATUS || knowledge.brand.availability || 'Available for Projects',
    timestamp: new Date().toISOString()
  });
};
