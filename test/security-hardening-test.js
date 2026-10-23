const assert = require('assert');
const { applyCors, isAllowedExternalUrl, createBoundedTtlCache, parseRequestBody } = require('../lib/security');

function response() { return { headers: {}, setHeader(key, value) { this.headers[key] = value; } }; }

const allowed = response();
assert.strictEqual(applyCors({ headers: { origin: 'https://hasnaindigital-portfolio.vercel.app' } }, allowed), true);
assert.strictEqual(allowed.headers['Access-Control-Allow-Origin'], 'https://hasnaindigital-portfolio.vercel.app');
const blocked = response();
assert.strictEqual(applyCors({ headers: { origin: 'https://attacker.example' } }, blocked), false);
assert.strictEqual(blocked.headers['Access-Control-Allow-Origin'], undefined);

assert.strictEqual(isAllowedExternalUrl('https://example.com/docs'), true);
assert.strictEqual(isAllowedExternalUrl('javascript:alert(1)'), false);
assert.strictEqual(isAllowedExternalUrl('data:text/html,hello'), false);
assert.deepStrictEqual(parseRequestBody('{"message":"<script>"}', 'application/json'), { message: '<script>' });
assert.throws(() => parseRequestBody('{bad', 'application/json'));

const cache = createBoundedTtlCache(2, 1000);
cache.add('one'); cache.add('two'); cache.add('three');
assert.strictEqual(cache.has('one'), false);
assert.strictEqual(cache.has('three'), true);
console.log('Security hardening regression tests passed');
