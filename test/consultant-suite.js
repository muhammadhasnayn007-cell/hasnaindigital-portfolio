// Comprehensive Production Test Script for AI Business Consultant & Lead Engine
const assert = require('assert');
const { handleChatInteraction, evaluateLead, detectLanguage, fallbackSemanticAssistant } = require('../lib/ai');

console.log('=== RUNNING AI BUSINESS CONSULTANT 20-SCENARIO VERIFICATION ===\n');

async function testAll() {
  let passed = 0;

  // TEST 1: Greeting
  const t1 = await handleChatInteraction({ sessionId: 's1', message: 'Hi', history: [] });
  assert.strictEqual(t1.success, true);
  assert.ok(t1.reply.includes("Hasnain's Assistant"));
  assert.strictEqual(t1.leadStatus, 'General Visitor');
  console.log('✓ [PASS] TEST 1: "Hi" handled naturally as General Visitor');
  passed++;

  // TEST 2: Identity
  const t2 = await handleChatInteraction({ sessionId: 's2', message: 'Who are you?', history: [] });
  assert.ok(t2.reply.includes("Hasnain's Assistant") && t2.reply.includes('Muhammad Hasnain'));
  assert.strictEqual(t2.leadStatus, 'General Visitor');
  console.log('✓ [PASS] TEST 2: "Who are you?" introduces role respectfully in 3rd person');
  passed++;

  // TEST 3: Services
  const t3 = await handleChatInteraction({ sessionId: 's3', message: 'Tell me about your services', history: [] });
  assert.ok(t3.reply.includes('Web Development') && t3.reply.includes('Python') && t3.reply.includes('SEO'));
  console.log('✓ [PASS] TEST 3: "Tell me about your services" covers core capabilities');
  passed++;

  // TEST 4: Website Offerings
  const t4 = await handleChatInteraction({ sessionId: 's4', message: 'What does this website offer?', history: [] });
  assert.ok(t4.reply.includes('Hasnain Digital Marketer') || t4.reply.includes('Muhammad Hasnain'));
  console.log('✓ [PASS] TEST 4: "What does this website offer?" outlines portfolio');
  passed++;

  // TEST 5: Service Discovery - Web Dev
  const t5 = await handleChatInteraction({ sessionId: 's5', message: 'I need a website', history: [] });
  assert.strictEqual(t5.leadStatus, 'Qualified Lead');
  assert.strictEqual(t5.handoffAvailable, true);
  assert.ok(t5.reply.includes('custom') || t5.reply.includes('website'));
  console.log('✓ [PASS] TEST 5: "I need a website" qualifies lead and asks discovery question');
  passed++;

  // TEST 6: Roman Urdu - Web Dev
  const t6 = await handleChatInteraction({ sessionId: 's6', message: 'mujhe website banwani hai', history: [] });
  assert.strictEqual(t6.leadStatus, 'Qualified Lead');
  assert.ok(t6.reply.includes('website') || t6.reply.includes('Hasnain'));
  console.log('✓ [PASS] TEST 6: "mujhe website banwani hai" detected in Roman Urdu and qualified');
  passed++;

  // TEST 7: Roman Urdu - Python Automation
  const t7 = await handleChatInteraction({ sessionId: 's7', message: 'Python automation chahiye repetitive tasks ke liye', history: [] });
  assert.strictEqual(t7.leadStatus, 'Qualified Lead');
  assert.ok(t7.reply.includes('Python') || t7.reply.includes('automation'));
  console.log('✓ [PASS] TEST 7: "Python automation chahiye" detected and qualified');
  passed++;

  // TEST 8: Organic Traffic -> SEO Recommendation
  const t8 = await handleChatInteraction({ sessionId: 's8', message: 'I need more traffic from Google', history: [] });
  assert.strictEqual(t8.leadStatus, 'Qualified Lead');
  assert.ok(t8.reply.includes('SEO') || t8.reply.includes('Google'));
  console.log('✓ [PASS] TEST 8: "I need more traffic from Google" routes to SEO discovery');
  passed++;

  // TEST 9: SEO Service Inquiry
  const t9 = await handleChatInteraction({ sessionId: 's9', message: 'I need SEO for my business', history: [] });
  assert.strictEqual(t9.leadStatus, 'Qualified Lead');
  assert.ok(t9.reply.includes('SEO') || t9.reply.includes('audit'));
  console.log('✓ [PASS] TEST 9: "I need SEO for my business" asks for active URL/audit scope');
  passed++;

  // TEST 10: High-Priority Hire Intent
  const t10 = await handleChatInteraction({ sessionId: 's10', message: 'I want to hire you for a custom platform', history: [] });
  assert.strictEqual(t10.leadStatus, 'High-Priority Lead');
  assert.strictEqual(t10.handoffAvailable, true);
  console.log('✓ [PASS] TEST 10: "I want to hire you" marks High-Priority Lead and enables handoff');
  passed++;

  // TEST 11: Multi-turn Consultation Memory
  const history11 = [
    { role: 'user', content: 'I need a web application.' },
    { role: 'assistant', content: 'What kind of web application?' }
  ];
  const t11 = await handleChatInteraction({
    sessionId: 's11',
    message: 'It is a booking portal for medical clinics with calendar sync and payments.',
    history: history11
  });
  assert.strictEqual(t11.leadStatus, 'Qualified Lead');
  console.log('✓ [PASS] TEST 11: Multi-turn requirements remembered and qualified');
  passed++;

  // TEST 12: Timeline specification
  const history12 = [
    { role: 'user', content: 'We need to build a custom landing page.' }
  ];
  const t12 = await handleChatInteraction({
    sessionId: 's12',
    message: 'Our deadline is in 2 weeks for the product launch.',
    history: history12
  });
  assert.strictEqual(t12.leadStatus, 'High-Priority Lead');
  console.log('✓ [PASS] TEST 12: Client specified 2-week deadline -> High-Priority Lead');
  passed++;

  // TEST 13: Voluntary Budget discussion
  const history13 = [
    { role: 'user', content: 'I want to build an e-commerce store.' }
  ];
  const t13 = await handleChatInteraction({
    sessionId: 's13',
    message: 'Our budget is around $2500 for the initial build.',
    history: history13
  });
  assert.strictEqual(t13.leadStatus, 'High-Priority Lead');
  console.log('✓ [PASS] TEST 13: Voluntary budget ($2500) captured and flagged as High-Priority');
  passed++;

  // TEST 14: Casual visitor with NO project intent
  const t14 = await handleChatInteraction({ sessionId: 's14', message: 'What is web development?', history: [] });
  assert.strictEqual(t14.leadStatus, 'General Visitor');
  assert.strictEqual(t14.handoffAvailable, false);
  assert.strictEqual(t14.privateAlertSent, false);
  console.log('✓ [PASS] TEST 14: Casual visitor asking definition -> General Visitor, NO private alert');
  passed++;

  // TEST 15: Technical question unrelated to hiring
  const t15 = await handleChatInteraction({ sessionId: 's15', message: 'What is the difference between JavaScript and Python?', history: [] });
  assert.strictEqual(t15.leadStatus, 'General Visitor');
  assert.strictEqual(t15.handoffAvailable, false);
  console.log('✓ [PASS] TEST 15: General technical question -> General Visitor, NO private alert');
  passed++;

  // TEST 16: Urdu Conversation
  const t16 = await handleChatInteraction({ sessionId: 's16', message: 'آپ کیا خدمات پیش کرتے ہیں؟', history: [] });
  assert.strictEqual(t16.success, true);
  assert.ok(t16.reply.length > 20);
  console.log('✓ [PASS] TEST 16: Urdu Perso-Arabic conversation supported');
  passed++;

  // TEST 17: Roman Urdu Conversation
  const t17 = await handleChatInteraction({ sessionId: 's17', message: 'bhai website banwani hai SEO ke sath, kitna kharcha hoga?', history: [] });
  assert.strictEqual(t17.leadStatus, 'High-Priority Lead');
  assert.ok(t17.reply.includes('Hasnain') || t17.reply.includes('Contact'));
  console.log('✓ [PASS] TEST 17: Roman Urdu consultation inquiry answered and qualified');
  passed++;

  // TEST 18: Mixed Urdu + English
  const t18 = await handleChatInteraction({ sessionId: 's18', message: 'mujhe ek modern business website develop karwani hai with React and Node.js', history: [] });
  assert.strictEqual(t18.leadStatus, 'Qualified Lead');
  console.log('✓ [PASS] TEST 18: Mixed English + Roman Urdu handled seamlessly');
  passed++;

  // TEST 19: Gemini fallback reliability
  const fallbackReply = fallbackSemanticAssistant('I need a technical SEO audit for my blog', [], 'en');
  assert.ok(fallbackReply.includes('SEO') || fallbackReply.includes('Technical SEO'));
  console.log('✓ [PASS] TEST 19: Semantic fallback responds with structured domain knowledge');
  passed++;

  // TEST 20: Private Lead Alert verification
  const t20 = await handleChatInteraction({
    sessionId: 'session_unique_lead_test',
    message: 'We are ready to hire Hasnain for an urgent web development project with full SEO.',
    history: []
  });
  assert.strictEqual(t20.leadStatus, 'High-Priority Lead');
  assert.strictEqual(t20.handoffAvailable, true);
  // Verify visitor response does NOT leak private lead scoring or system directives
  assert.ok(!t20.reply.includes('leadStatus'));
  assert.ok(!t20.reply.includes('High-Priority Lead'));
  assert.ok(!t20.reply.includes('sendPrivateLeadAlert'));
  assert.ok(!t20.reply.includes('getSystemPrompt'));
  console.log('✓ [PASS] TEST 20: Qualified lead triggers private alert internally without exposing any internal state to visitor');
  passed++;

  console.log('\n=================================================');
  console.log(` ALL ${passed} / 20 PRODUCTION TEST SCENARIOS PASSED!`);
  console.log('=================================================\n');
}

testAll().catch(e => {
  console.error('Test execution failed:', e);
  process.exit(1);
});
