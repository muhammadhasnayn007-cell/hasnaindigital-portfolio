const assert = require('assert');
const Module = require('module');

const originalLoad = Module._load;
let capturedRequest;
let mode = 'success';

Module._load = function (request, parent, isMain) {
  if (request === '@google/genai') {
    return {
      GoogleGenAI: class {
        constructor(options) {
          assert.ok(options.apiKey, 'Gemini key must be passed server-side');
        }
        get models() {
          return {
            generateContent: async requestBody => {
              capturedRequest = requestBody;
              if (mode === 'error') throw new Error('429 quota exceeded');
              return { text: 'Gemini test response' };
            }
          };
        }
      }
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

process.env.GEMINI_API_KEY = 'test-only-key';
process.env.GEMINI_MODEL = 'gemini-test-model';
const { handleChatInteraction } = require('../lib/ai');

(async () => {
  const success = await handleChatInteraction({
    sessionId: 'gemini-test',
    message: 'What services do you offer?',
    history: [{ role: 'user', content: 'Hello' }, { role: 'assistant', content: 'Hi there' }],
    allowFallback: false
  });
  assert.strictEqual(success.reply, 'Gemini test response');
  assert.strictEqual(capturedRequest.model, 'gemini-test-model');
  assert.strictEqual(capturedRequest.contents[0].role, 'user');
  assert.strictEqual(capturedRequest.contents[1].role, 'model');
  assert.ok(capturedRequest.contents[0].parts[0].text.includes('Hello'));
  console.log('✓ Gemini success, model selection, and history format');

  mode = 'error';
  await assert.rejects(
    () => handleChatInteraction({ message: 'Try again', history: [], allowFallback: false }),
    error => error.code === 'AI_PROVIDER_UNAVAILABLE'
  );
  console.log('✓ Gemini provider errors become safe provider failures');

  const savedKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  await assert.rejects(
    () => handleChatInteraction({ message: 'Missing key', history: [], allowFallback: false }),
    error => error.code === 'AI_PROVIDER_UNAVAILABLE' && error.message.includes('temporarily unavailable')
  );
  process.env.GEMINI_API_KEY = savedKey;
  console.log('✓ Missing Gemini configuration is handled safely');

  Module._load = originalLoad;
  console.log('All Gemini tests passed.');
})().catch(error => {
  Module._load = originalLoad;
  console.error(error);
  process.exit(1);
});
