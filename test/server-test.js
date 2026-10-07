// Server E2E Integration Test for Hasnain Digital Marketer
const assert = require('assert');
const http = require('http');

process.env.PORT = '3001';
process.env.NODE_ENV = 'test';
process.env.AVAILABILITY_STATUS = 'Available for Projects';

console.log('Starting Express server on port 3001 for integration test...');
require('../server.js');

function postJson(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 3001,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      },
      res => {
        let resBody = '';
        res.on('data', chunk => (resBody += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.status, statusCode: res.statusCode, data: JSON.parse(resBody) });
          } catch (e) {
            resolve({ status: res.status, statusCode: res.statusCode, text: resBody });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(path) {
  return new Promise((resolve, reject) => {
    http.get({ hostname: '127.0.0.1', port: 3001, path }, res => {
      let body = '';
      res.on('data', chunk => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ statusCode: res.statusCode, text: body });
        }
      });
    }).on('error', reject);
  });
}

setTimeout(async () => {
  try {
    console.log('\n=== RUNNING E2E SERVER INTEGRATION TESTS ===');

    // 1. Health check
    const health = await get('/api/health');
    assert.strictEqual(health.statusCode, 200, 'Health endpoint should return 200');
    assert.strictEqual(health.data.status, 'ok');
    assert.strictEqual(health.data.brand, 'H.X.S.N Digital Marketer');
    assert.strictEqual(health.data.availability, 'Available for Projects');
    console.log('✓ [PASS] GET /api/health returned 200 with correct brand and availability');

    // 2. Contact form validation
    const invalidContact = await postJson('/api/contact', { name: 'A', email: 'not-an-email' });
    assert.strictEqual(invalidContact.statusCode, 400, 'Invalid contact should return 400');
    assert.strictEqual(invalidContact.data.success, false);
    console.log('✓ [PASS] POST /api/contact rejected invalid data with 400');

    // 3. Contact honeypot
    const botContact = await postJson('/api/contact', { _honey: 'bot-input', name: 'Bot', email: 'bot@spam.com' });
    assert.strictEqual(botContact.statusCode, 200, 'Honeypot should silently return 200');
    assert.strictEqual(botContact.data.success, true);
    console.log('✓ [PASS] POST /api/contact honeypot silently accepted spam bot');

    // 4. Chatbot interaction (English)
    const chatEn = await postJson('/api/chat', {
      sessionId: 'test_session_e2e',
      message: 'Hello, what services do you provide?',
      history: []
    });
    assert.strictEqual(chatEn.statusCode, 200, 'Chat endpoint should return 200');
    assert.strictEqual(chatEn.data.success, true);
    assert.ok(chatEn.data.reply.length > 20, 'Reply should be substantive');
    console.log('✓ [PASS] POST /api/chat handled English greeting successfully');

    // 5. Chatbot project discovery & lead qualification (Roman Urdu)
    const chatLead = await postJson('/api/chat', {
      sessionId: 'test_session_e2e_lead',
      message: 'Mujhe ek modern business website banwani hai SEO ke sath, kitna kharcha hoga?',
      history: []
    });
    assert.strictEqual(chatLead.statusCode, 200);
    assert.strictEqual(chatLead.data.success, true);
    assert.ok(chatLead.data.handoffAvailable === true || chatLead.data.leadStatus === 'Qualified Lead', 'Should qualify project lead');
    console.log('✓ [PASS] POST /api/chat recognized project inquiry in Roman Urdu & flagged for handoff');

    // 6. Static asset serving
    const htmlRes = await get('/');
    assert.strictEqual(htmlRes.statusCode, 200);
    assert.ok(htmlRes.text.includes('H.X.S.N Digital Marketer'));
    assert.ok(htmlRes.text.includes("Hasnain's Assistant"));
    console.log('✓ [PASS] GET / serves index.html with Hasnain\'s Assistant widget');

    console.log('\n=================================================');
    console.log(' ALL E2E SERVER INTEGRATION TESTS PASSED!');
    console.log('=================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('✕ E2E TEST FAILED:', err);
    process.exit(1);
  }
}, 1200);
