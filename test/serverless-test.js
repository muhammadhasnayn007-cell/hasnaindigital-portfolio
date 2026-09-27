// Serverless Handler Simulation Test
const assert = require('assert');
const healthHandler = require('../api/health.js');
const contactHandler = require('../api/contact.js');
const chatHandler = require('../api/chat.js');

function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(k, v) { res.headers[k] = v; return res; },
    status(code) { res.statusCode = code; return res; },
    json(data) { res.body = data; return res; },
    end() { return res; }
  };
  return res;
}

async function runServerlessTests() {
  console.log('=== RUNNING SERVERLESS HANDLERS TEST ===\n');

  // 1. Health Handler
  const reqHealth = { method: 'GET', headers: {} };
  const resHealth = createMockRes();
  healthHandler(reqHealth, resHealth);
  assert.strictEqual(resHealth.statusCode, 200);
  assert.strictEqual(resHealth.body.status, 'ok');
  assert.strictEqual(resHealth.body.brand, 'Hasnain Digital Marketer');
  console.log('✓ [PASS] api/health handler returned 200 OK');

  // 2. Contact Handler Options (CORS preflight)
  const reqOpt = { method: 'OPTIONS', headers: {} };
  const resOpt = createMockRes();
  await contactHandler(reqOpt, resOpt);
  assert.strictEqual(resOpt.statusCode, 200);
  console.log('✓ [PASS] api/contact OPTIONS preflight returned 200 OK');

  // 3. Contact Handler Validation (Invalid input)
  const reqInvalid = {
    method: 'POST',
    headers: { 'x-forwarded-for': '127.0.0.1' },
    body: { name: 'A', email: 'invalid' }
  };
  const resInvalid = createMockRes();
  await contactHandler(reqInvalid, resInvalid);
  assert.strictEqual(resInvalid.statusCode, 400);
  assert.strictEqual(resInvalid.body.success, false);
  console.log('✓ [PASS] api/contact rejected invalid data with 400');

  // 4. Contact Handler Honeypot
  const reqHoney = {
    method: 'POST',
    headers: { 'x-forwarded-for': '127.0.0.1' },
    body: { _honey: 'bot-detected', name: 'Bot', email: 'bot@spam.com' }
  };
  const resHoney = createMockRes();
  await contactHandler(reqHoney, resHoney);
  assert.strictEqual(resHoney.statusCode, 200);
  assert.strictEqual(resHoney.body.success, true);
  console.log('✓ [PASS] api/contact honeypot silently returned 200');

  // 5. Chat Handler (Semantic fallback / OpenAI)
  const reqChat = {
    method: 'POST',
    headers: { 'x-forwarded-for': '127.0.0.1' },
    body: { sessionId: 'test_session_serverless', message: 'Hello, what services do you provide?' }
  };
  const resChat = createMockRes();
  await chatHandler(reqChat, resChat);
  assert.strictEqual(resChat.statusCode, 200);
  assert.strictEqual(resChat.body.success, true);
  assert.ok(resChat.body.reply.length > 20);
  console.log('✓ [PASS] api/chat processed user query with 200 OK');

  console.log('\n=================================================');
  console.log(' ALL SERVERLESS HANDLER TESTS PASSED!');
  console.log('=================================================\n');
}

runServerlessTests().catch(err => {
  console.error('✕ Serverless test failed:', err);
  process.exit(1);
});
