// test_message_orchestrator.js
// Test file for the comprehensive MessageOrchestrator system

import orchestrator, { MessageOrchestrator } from './src/handlers/message_orchestrator.js';

// Mock processor functions for testing
const mockProcessor = async (message, context) => {
  const delay = Math.random() * 2000 + 500; // Random delay 500-2500ms
  console.log(`   🔄 Mock processor iniciado para ${context.contactId} (delay: ${delay.toFixed(0)}ms)`);

  await new Promise(resolve => setTimeout(resolve, delay));

  return {
    success: true,
    response: `Processado: ${message.text} para ${context.contactId}`,
    processingTime: delay
  };
};

const slowProcessor = async (message, context) => {
  console.log(`   🐌 Slow processor iniciado para ${context.contactId}`);
  await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay

  return {
    success: true,
    response: `Processamento lento concluído para ${context.contactId}`,
    processingTime: 5000
  };
};

const errorProcessor = async (message, context) => {
  console.log(`   💥 Error processor para ${context.contactId}`);
  throw new Error('Simulated processing error');
};

// Test functions
async function testBasicProcessing() {
  console.log('\n🧪 === TESTE 1: PROCESSAMENTO BÁSICO ===');

  const result = await orchestrator.processMessage(
    'contact1',
    { text: 'Olá, como vocês podem me ajudar?' },
    mockProcessor
  );

  console.log('Resultado:', result);
  console.log('Stats:', orchestrator.getStats());
}

async function testConcurrentProcessing() {
  console.log('\n🧪 === TESTE 2: PROCESSAMENTO CONCORRENTE ===');

  const promises = [];

  // Send multiple messages for the same contact
  for (let i = 0; i < 3; i++) {
    promises.push(
      orchestrator.processMessage(
        'contact2',
        { text: `Mensagem ${i + 1}` },
        mockProcessor
      )
    );
  }

  // Send messages for different contacts
  for (let i = 0; i < 2; i++) {
    promises.push(
      orchestrator.processMessage(
        `contact${i + 3}`,
        { text: `Mensagem do contato ${i + 3}` },
        mockProcessor
      )
    );
  }

  const results = await Promise.all(promises);
  console.log('Resultados concorrentes:', results.length);
  console.log('Stats após concorrência:', orchestrator.getStats());
}

async function testQueueSystem() {
  console.log('\n🧪 === TESTE 3: SISTEMA DE FILA ===');

  // Send multiple rapid messages for the same contact
  const promises = [];
  for (let i = 0; i < 5; i++) {
    promises.push(
      orchestrator.processMessage(
        'contact_queue',
        { text: `Mensagem rápida ${i + 1}` },
        mockProcessor
      )
    );
  }

  const results = await Promise.all(promises);

  // Check which were queued vs processed immediately
  const queued = results.filter(r => r.queued);
  const processed = results.filter(r => !r.queued);

  console.log(`Processadas imediatamente: ${processed.length}`);
  console.log(`Enfileiradas: ${queued.length}`);

  // Wait for queue to process
  await new Promise(resolve => setTimeout(resolve, 3000));
  console.log('Stats após processamento da fila:', orchestrator.getStats());
}

async function testTimeoutHandling() {
  console.log('\n🧪 === TESTE 4: TRATAMENTO DE TIMEOUT ===');

  // Test with a processor that takes too long
  const result = await orchestrator.processMessage(
    'contact_slow',
    { text: 'Esta mensagem vai demorar para processar' },
    slowProcessor
  );

  console.log('Resultado com timeout:', result);
  console.log('Stats após timeout:', orchestrator.getStats());
}

async function testErrorHandling() {
  console.log('\n🧪 === TESTE 5: TRATAMENTO DE ERROS ===');

  const result = await orchestrator.processMessage(
    'contact_error',
    { text: 'Esta mensagem vai causar erro' },
    errorProcessor
  );

  console.log('Resultado com erro:', result);
  console.log('Stats após erro:', orchestrator.getStats());
}

async function testDeadlockDetection() {
  console.log('\n🧪 === TESTE 6: DETECÇÃO DE DEADLOCK ===');

  // Manually simulate a deadlock by creating a stuck lock
  orchestrator.contactLocks.set('stuck_contact', {
    processId: 'manual_test',
    startTime: Date.now() - 35000, // 35 seconds ago (older than timeout)
    processor: 'test_processor'
  });

  console.log('Lock manual criado para simular deadlock');
  console.log('Locks ativos antes da detecção:', orchestrator.contactLocks.size);

  // Trigger deadlock detection manually
  const deadlocksResolved = orchestrator.detectAndResolveDeadlocks();

  console.log('Deadlocks resolvidos:', deadlocksResolved);
  console.log('Locks ativos após detecção:', orchestrator.contactLocks.size);
}

async function testEmergencyUnlock() {
  console.log('\n🧪 === TESTE 7: DESBLOQUEIO DE EMERGÊNCIA ===');

  // Create some test locks
  orchestrator.contactLocks.set('emergency1', { processId: 'test1', startTime: Date.now() });
  orchestrator.contactLocks.set('emergency2', { processId: 'test2', startTime: Date.now() });

  console.log('Locks antes do emergency unlock:', orchestrator.contactLocks.size);

  // Test single contact unlock
  const unlocked1 = orchestrator.emergencyUnlock('emergency1');
  console.log('Single unlock resultado:', unlocked1);
  console.log('Locks após single unlock:', orchestrator.contactLocks.size);

  // Test unlock all
  const unlockedAll = orchestrator.emergencyUnlock();
  console.log('Unlock all resultado:', unlockedAll);
  console.log('Locks após unlock all:', orchestrator.contactLocks.size);
}

async function testEventEmitters() {
  console.log('\n🧪 === TESTE 8: EVENT EMITTERS ===');

  // Set up event listeners
  orchestrator.on('messageReceived', (data) => {
    console.log(`   📨 Evento: Mensagem recebida de ${data.contactId}`);
  });

  orchestrator.on('lockAcquired', (data) => {
    console.log(`   🔒 Evento: Lock adquirido para ${data.contactId}`);
  });

  orchestrator.on('lockReleased', (data) => {
    console.log(`   🔓 Evento: Lock liberado para ${data.contactId} (${data.duration}ms)`);
  });

  orchestrator.on('messageQueued', (data) => {
    console.log(`   📥 Evento: Mensagem enfileirada para ${data.contactId} (fila: ${data.queueSize})`);
  });

  // Test the events
  await orchestrator.processMessage(
    'event_test',
    { text: 'Testando eventos' },
    mockProcessor
  );
}

async function showComprehensiveStats() {
  console.log('\n📊 === ESTATÍSTICAS FINAIS COMPLETAS ===');

  const stats = orchestrator.getStats();
  console.log(JSON.stringify(stats, null, 2));
}

// Main test function
async function runAllTests() {
  console.log('🚀 Iniciando testes do MessageOrchestrator...\n');

  try {
    await testBasicProcessing();
    await testConcurrentProcessing();
    await testQueueSystem();
    await testTimeoutHandling();
    await testErrorHandling();
    await testDeadlockDetection();
    await testEmergencyUnlock();
    await testEventEmitters();
    await showComprehensiveStats();

    console.log('\n✅ Todos os testes concluídos com sucesso!');

  } catch (error) {
    console.error('\n❌ Erro durante os testes:', error);
  } finally {
    // Cleanup
    console.log('\n🧹 Fazendo limpeza final...');
    orchestrator.cleanup();

    // Wait a bit before exiting
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  }
}

// Example usage for integration
function exampleIntegration() {
  console.log('\n📖 === EXEMPLO DE INTEGRAÇÃO ===');

  // Example: How to integrate with webhook handler
  const exampleWebhookHandler = async (contactId, messageText) => {
    try {
      // Define your message processor
      const messageProcessor = async (message, context) => {
        // Your actual message processing logic here
        const { processMessage } = await import('./src/core/OrbionHybridAgent.js');
        return await processMessage(context.contactId, message.text, {});
      };

      // Use orchestrator to handle the message
      const result = await orchestrator.processMessage(
        contactId,
        { text: messageText, timestamp: Date.now() },
        messageProcessor
      );

      if (result.success && !result.queued) {
        // Send response back to WhatsApp
        console.log(`Sending response to ${contactId}: ${result.response}`);
      } else if (result.queued) {
        console.log(`Message queued for ${contactId}`);
      } else {
        console.log(`Error processing message for ${contactId}: ${result.error}`);
      }

      return result;

    } catch (error) {
      console.error('Webhook handler error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  };

  console.log('Exemplo de função de webhook criado');
  console.log('Para usar: await exampleWebhookHandler("contact123", "Olá!")');
}

// Run tests if this file is executed directly
if (process.argv[1] === import.meta.url.replace('file://', '')) {
  runAllTests();
} else {
  // Show integration example if imported
  exampleIntegration();
}

export {
  orchestrator,
  runAllTests,
  exampleIntegration
};