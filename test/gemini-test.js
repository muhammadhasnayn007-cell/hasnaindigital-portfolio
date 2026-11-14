const assert = require('assert');

const originalFetch = global.fetch;
global.fetch = async () => {
  throw new Error('Simulated AI Gateway network failure');
};

const { handleChatInteraction } = require('../lib/ai');

(async () => {
  const fallback = await handleChatInteraction({
    sessionId: 'gateway-test',
    message: 'What services do you offer?',
    history: [{ role: 'user', content: 'Hello' }, { role: 'assistant', content: 'Hi there' }]
  });
  assert.strictEqual(fallback.success, true);
  assert.ok(fallback.reply.length > 20, 'Semantic fallback should remain available when Gateway is unreachable');
  console.log('✓ AI Gateway failures preserve the portfolio-aware fallback');

  await assert.rejects(
    () => handleChatInteraction({ message: 'Try again', history: [], allowFallback: false }),
    error => error.code === 'AI_PROVIDER_UNAVAILABLE' && error.message.includes('temporarily unavailable')
  );
  console.log('✓ AI Gateway errors become safe provider failures when fallback is disabled');

  global.fetch = originalFetch;
  console.log('All AI Gateway tests passed.');
})().catch(error => {
  global.fetch = originalFetch;
  console.error(error);
  process.exit(1);
});
