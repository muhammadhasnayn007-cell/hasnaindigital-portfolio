const crypto = require('crypto');

function createNewsletterToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function hashNewsletterToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function getNewsletterSiteUrl(req) {
  const configured = String(process.env.SITE_URL || '').trim().replace(/\/$/, '');
  if (configured) return configured;
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers.host || 'localhost:3000';
  return `${protocol}://${host}`;
}

function buildNewsletterUrl(req, path, token) {
  const url = new URL(path, `${getNewsletterSiteUrl(req)}/`);
  url.searchParams.set('token', token);
  return url.toString();
}

module.exports = { createNewsletterToken, hashNewsletterToken, getNewsletterSiteUrl, buildNewsletterUrl };
