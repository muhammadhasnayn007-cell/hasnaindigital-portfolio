const assert = require('node:assert/strict');
const security = require('../lib/security');
const supabaseServer = require('../lib/supabase-server');

let savedEvents = [];
let rateLimitAllowed = true;
security.checkRateLimit = () => ({ allowed: rateLimitAllowed });
security.getClientIp = () => '127.0.0.1';
supabaseServer.getSupabaseAdmin = () => ({
  from(table) {
    assert.equal(table, 'analytics_events');
    return {
      insert(event) {
        savedEvents.push(event);
        return Promise.resolve({ error: null });
      }
    };
  }
});

const analyticsHandler = require('../api/analytics');

function createResponse() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    end() { this.ended = true; return this; }
  };
}

async function callAnalytics({ cookie, headers = {}, body }) {
  const res = createResponse();
  await analyticsHandler({ method: 'POST', headers: { ...(cookie ? { cookie } : {}), ...headers }, body }, res);
  return res;
}

async function main() {
  savedEvents = [];
  let res = await callAnalytics({ body: { eventName: 'page_view' } });
  assert.equal(res.statusCode, 204);
  assert.equal(savedEvents.length, 0);

  res = await callAnalytics({ cookie: 'hxsn_analytics_consent=granted', headers: { 'sec-gpc': '1' }, body: { eventName: 'page_view' } });
  assert.equal(res.statusCode, 204);
  assert.equal(savedEvents.length, 0);

  res = await callAnalytics({
    cookie: 'hxsn_analytics_consent=granted',
    body: {
      eventName: 'contact_success',
      path: '/contact?email=client%40example.com',
      sessionId: '01234567-89ab-cdef-0123-456789abcdef',
      deviceCategory: 'desktop',
      referrerHost: 'client@example.com',
      metadata: { service: 'Web & Python', source: 'portfolio', email: 'client@example.com', message: 'Private project description' }
    }
  });
  assert.equal(res.statusCode, 202);
  assert.equal(savedEvents.length, 1);
  assert.equal(savedEvents[0].path, '/');
  assert.equal(savedEvents[0].referrer_host, null);
  assert.deepEqual(savedEvents[0].metadata, { service: 'Web & Python', source: 'portfolio' });
  assert.equal(JSON.stringify(savedEvents[0]).includes('client@example.com'), false);
  assert.equal(JSON.stringify(savedEvents[0]).includes('Private project description'), false);

  res = await callAnalytics({ cookie: 'hxsn_analytics_consent=granted', body: { eventName: 'unsupported_event' } });
  assert.equal(res.statusCode, 400);
  assert.equal(savedEvents.length, 1);

  rateLimitAllowed = false;
  res = await callAnalytics({ cookie: 'hxsn_analytics_consent=granted', body: { eventName: 'page_view' } });
  assert.equal(res.statusCode, 429);
  assert.equal(savedEvents.length, 1);

  process.stdout.write('Analytics consent, privacy-signal, metadata, and rate-limit tests passed.\n');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
