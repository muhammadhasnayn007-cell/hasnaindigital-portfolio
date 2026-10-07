const assert = require('assert');
const http = require('http');

process.env.PORT = '3002';
process.env.NODE_ENV = 'production';

require('../server.js');

function fetchPath(path) {
  return new Promise((resolve, reject) => {
    http.get({ hostname: '127.0.0.1', port: 3002, path }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({
        statusCode: res.statusCode,
        contentType: res.headers['content-type'],
        body: data,
        length: Buffer.byteLength(data)
      }));
    }).on('error', reject);
  });
}

setTimeout(async () => {
  try {
    console.log('=== RUNNING STATIC ASSET & MIME VERIFICATION ===\n');

    // 1. style.css verification
    const css = await fetchPath('/style.css');
    assert.strictEqual(css.statusCode, 200);
    assert.ok(css.contentType.includes('text/css'), `Expected text/css but got ${css.contentType}`);
    assert.ok(css.body.includes('--red:'), 'style.css should contain CSS variables');
    assert.ok(css.length > 50000, `Expected CSS size > 50KB, got ${css.length}`);
    console.log(`✓ [PASS] /style.css returns 200 OK with ${css.contentType} (${css.length} bytes)`);

    // 2. script.js verification
    const js = await fetchPath('/script.js');
    assert.strictEqual(js.statusCode, 200);
    assert.ok(js.contentType.includes('javascript'), `Expected javascript but got ${js.contentType}`);
    assert.ok(js.body.includes('DOMContentLoaded'), 'script.js should contain JavaScript logic');
    assert.ok(js.length > 25000, `Expected JS size > 25KB, got ${js.length}`);
    console.log(`✓ [PASS] /script.js returns 200 OK with ${js.contentType} (${js.length} bytes)`);

    // 3. firebase-client.js verification
    const fbJs = await fetchPath('/firebase-client.js');
    assert.strictEqual(fbJs.statusCode, 200);
    assert.ok(fbJs.contentType.includes('javascript'), `Expected javascript but got ${fbJs.contentType}`);
    console.log(`✓ [PASS] /firebase-client.js returns 200 OK with ${fbJs.contentType}`);

    // 4. robots.txt verification
    const robots = await fetchPath('/robots.txt');
    assert.strictEqual(robots.statusCode, 200);
    assert.ok(robots.contentType.includes('text/plain'));
    console.log(`✓ [PASS] /robots.txt returns 200 OK with text/plain`);

    // 4. Missing static asset should return 404 (never return HTML)
    const missing = await fetchPath('/non-existent.css');
    assert.strictEqual(missing.statusCode, 404);
    console.log(`✓ [PASS] /non-existent.css correctly returns 404 (not HTML)`);

    // 5. Root page returns HTML
    const html = await fetchPath('/');
    assert.strictEqual(html.statusCode, 200);
    assert.ok(html.contentType.includes('text/html'));
    console.log(`✓ [PASS] / returns 200 OK with text/html`);

    // 6. API health returns JSON
    const health = await fetchPath('/api/health');
    assert.strictEqual(health.statusCode, 200);
    assert.ok(health.contentType.includes('application/json'));
    console.log(`✓ [PASS] /api/health returns 200 OK with application/json`);

    console.log('\n=================================================');
    console.log(' ALL STATIC ASSET & MIME TESTS PASSED!');
    console.log('=================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('✕ STATIC ASSET TEST FAILED:', err);
    process.exit(1);
  }
}, 1000);
