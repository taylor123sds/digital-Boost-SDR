// debug_undefined_text.js
// Diagnostic script to understand the "undefined" text bug

import { MessageCoordinator } from './src/handlers/MessageCoordinator.js';

console.log('🔍 DEBUG: Simulating message queue flow\n');
console.log('═'.repeat(80));

const coordinator = new MessageCoordinator();
const testPhone = '558496791624';

async function testFlow() {
  // STEP 1: Enqueue a message (simulating webhook.routes.js line 134-140)
  console.log('\n📥 STEP 1: ENQUEUE MESSAGE');
  console.log('─'.repeat(80));

  const messageToEnqueue = {
    text: 'Impacta bastante',
    messageType: 'text',
    metadata: { test: true },
    timestamp: Date.now(),
    messageId: 'test-message-id'
  };

  console.log('Message object being enqueued:');
  console.log(JSON.stringify(messageToEnqueue, null, 2));

  const enqueueResult = await coordinator.enqueueMessage(testPhone, messageToEnqueue);
  console.log('\n✅ Enqueue result:', enqueueResult.status);

  // STEP 2: Dequeue the message (simulating webhook.routes.js line 154)
  console.log('\n\n📤 STEP 2: DEQUEUE MESSAGE');
  console.log('─'.repeat(80));

  const nextMessage = await coordinator.dequeueMessage(testPhone);

  console.log('nextMessage object returned from dequeue:');
  console.log(JSON.stringify(nextMessage, null, 2));

  // STEP 3: Access text (simulating webhook.routes.js line 217)
  console.log('\n\n🎯 STEP 3: ACCESS TEXT (as done in webhook.routes.js:217)');
  console.log('─'.repeat(80));

  console.log('nextMessage.message:', nextMessage.message);
  console.log('nextMessage.message.text:', nextMessage.message.text);
  console.log('typeof nextMessage.message.text:', typeof nextMessage.message.text);

  if (nextMessage.message.text === undefined) {
    console.log('\n❌ BUG REPRODUCED: text is undefined!');
  } else {
    console.log('\n✅ Text is correct:', nextMessage.message.text);
  }

  console.log('\n' + '═'.repeat(80));
}

testFlow().catch(err => {
  console.error('Error:', err);
});
