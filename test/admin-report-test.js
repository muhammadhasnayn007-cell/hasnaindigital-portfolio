const assert = require('node:assert/strict');
const authModule = require('../api/admin-auth');
const security = require('../lib/security');
const mailer = require('../lib/mailer');

const ownerEmail = 'owner@example.com';
const inquiries = [{
  id: 'inquiry-1',
  reference_id: 'HX-100',
  full_name: '<Alice & Bob>',
  email: 'client@example.com',
  project_type: 'Web Development',
  project_title: 'Portfolio refresh',
  description: 'Build a responsive portfolio.',
  status: 'new',
  admin_notes: 'Follow up next week.',
  created_at: '2026-11-01T12:00:00.000Z',
  updated_at: '2026-11-02T12:00:00.000Z'
}];
const deliveries = [{ inquiry_id: 'inquiry-1', delivery_type: 'owner_email', status: 'delivered', delivered_at: '2026-11-01T12:02:00.000Z' }];
const subscribers = [{
  email: 'subscriber@example.com',
  status: 'active',
  consent_at: '2026-11-01T12:00:00.000Z',
  confirmed_at: '2026-11-01T12:05:00.000Z',
  unsubscribed_at: null,
  created_at: '2026-11-01T12:00:00.000Z'
}];
let authResult;
let emailCalls = [];
let queryCalls = [];
let sendResult = { provider: 'resend', id: 'accepted-test-id' };
let rowsByTable = {};

function fakeAdmin() {
  return {
    from(table) {
      const query = { table, limitValue: null, inValues: null };
      queryCalls.push(query);
      const builder = {
        select() { return builder; },
        order() { return builder; },
        gte() { return builder; },
        eq() { return builder; },
        in(_column, values) { query.inValues = values; return builder; },
        limit(value) { query.limitValue = value; return builder; },
        then(resolve, reject) {
          return Promise.resolve({ data: rowsByTable[table] || [], error: null }).then(resolve, reject);
        }
      };
      return builder;
    }
  };
}

security.checkRateLimit = () => ({ allowed: true });
security.getClientIp = () => '127.0.0.1';
authModule.authenticate = async () => authResult;
mailer.sendEmail = async options => {
  emailCalls.push(options);
  if (sendResult instanceof Error) throw sendResult;
  return sendResult;
};

const reportHandler = require('../api/admin-chat');
const analyticsHandler = require('../api/admin-analytics');

function createResponse() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

function resetFixtures() {
  process.env.CONTACT_EMAIL = ownerEmail;
  authResult = {
    user: { id: 'owner-1', email: ownerEmail, email_confirmed_at: '2026-11-01T00:00:00.000Z' },
    admin: fakeAdmin()
  };
  rowsByTable = { project_inquiries: inquiries, notification_deliveries: deliveries, newsletter_subscribers: subscribers };
  queryCalls = [];
  emailCalls = [];
  sendResult = { provider: 'resend', id: 'accepted-test-id' };
}

async function callReport(message) {
  const res = createResponse();
  await reportHandler({ method: 'POST', body: { message } }, res);
  return res;
}

async function main() {
  resetFixtures();
  authResult = null;
  let res = await callReport('Give me the client history and saved inquiry data.');
  assert.equal(res.statusCode, 401);
  assert.equal(emailCalls.length, 0);

  resetFixtures();
  res = await callReport('Could we discuss client data?');
  assert.equal(res.statusCode, 200);
  assert.equal(queryCalls.length, 0);
  assert.equal(emailCalls.length, 0);

  resetFixtures();
  res = await callReport('Email the client history and newsletter subscriber report.');
  assert.equal(res.statusCode, 200);
  assert.match(res.body.reply, /separately/i);
  assert.equal(queryCalls.length, 0);
  assert.equal(emailCalls.length, 0);

  resetFixtures();
  res = await callReport('Give me the client history and saved inquiry data.');
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.reportSent, true);
  assert.equal(queryCalls.map(call => call.table).join(','), 'project_inquiries,notification_deliveries');
  assert.equal(queryCalls[0].limitValue, 50);
  assert.deepEqual(queryCalls[1].inValues, ['inquiry-1']);
  assert.equal(emailCalls[0].to, ownerEmail);
  assert.match(emailCalls[0].text, /HX-100/);
  assert.match(emailCalls[0].text, /owner_email: delivered/);
  assert.match(emailCalls[0].html, /&lt;Alice &amp; Bob&gt;/);
  assert.doesNotMatch(JSON.stringify(res.body), /client@example\.com|Alice/);
  assert.match(emailCalls[0].text, /subscriber records are reported separately/i);

  resetFixtures();
  res = await callReport('Email me the newsletter subscriber report.');
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.reportSent, true);
  assert.deepEqual(queryCalls.map(call => call.table), ['newsletter_subscribers']);
  assert.equal(queryCalls[0].limitValue, 50);
  assert.match(emailCalls[0].text, /subscriber@example\.com/);
  assert.match(emailCalls[0].text, /Consent recorded/);
  assert.match(emailCalls[0].text, /Subscription confirmed/);
  assert.doesNotMatch(emailCalls[0].text, /client@example\.com|HX-100/);

  resetFixtures();
  authResult.user.email = 'other-admin@example.com';
  res = await callReport('Email the client inquiry report.');
  assert.equal(res.statusCode, 403);
  assert.equal(emailCalls.length, 0);
  assert.equal(queryCalls.length, 0);

  resetFixtures();
  delete process.env.CONTACT_EMAIL;
  res = await callReport('Email the client inquiry report.');
  assert.equal(res.statusCode, 503);
  assert.equal(emailCalls.length, 0);

  resetFixtures();
  sendResult = new Error('Provider unavailable');
  res = await callReport('Email the client inquiry report.');
  assert.equal(res.statusCode, 502);
  assert.equal(res.body.reportSent, undefined);

  resetFixtures();
  rowsByTable = { analytics_events: [
    { event_name: 'contact_start' },
    { event_name: 'contact_start' },
    { event_name: 'contact_start' },
    { event_name: 'contact_start' },
    { event_name: 'contact_start' },
    { event_name: 'contact_success' },
    { event_name: 'contact_success' }
  ] };
  res = createResponse();
  await analyticsHandler({ method: 'GET', query: {}, headers: {} }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.conversionRate, 40);

  process.stdout.write('Admin report authorization, separation, caps, provider acceptance, and analytics conversion tests passed.\n');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
