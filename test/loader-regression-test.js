const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const script = fs.readFileSync('script.js', 'utf8');

assert.ok(html.includes('window.__hxsnLoaderController'), 'index should include an inline loader controller');
assert.ok(html.includes("document.readyState === 'complete'"), 'loader should handle load already having fired');
assert.ok(html.includes('window.setTimeout(() => settle(true), 2500)'), 'loader should have a bounded failsafe');
assert.ok(html.includes('unhandledrejection'), 'loader should recover from rejected promises');
assert.ok(script.includes('controller.settle(failed)'), 'runtime should reuse the idempotent loader controller');
console.log('Loader regression tests passed.');
