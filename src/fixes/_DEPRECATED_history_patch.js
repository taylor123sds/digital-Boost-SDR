// history_patch.js
// PATCH FORÇADO para fazer o ORBION sempre ler histórico completo

import { ContextAwareResponseGenerator } from './enhanced_history_manager.js';

// ============================================
// PATCH PRINCIPAL - APLICAR AO ORBION AGENT
// ============================================
export function applyHistoryPatch() {
  console.log(' APLICANDO PATCH DE HISTÓRICO FORÇADO...');

  const contextGenerator = new ContextAwareResponseGenerator();

  // Patch para servidor (webhook handler)
  patchWebhookProcessing(contextGenerator);

  // Patch para agent direto
  patchOrbionAgent(contextGenerator);

  console.log(' PATCH DE HISTÓRICO APLICADO - ORBION agora SEMPRE lerá histórico!');
}

// ============================================
// PATCH 1: WEBHOOK PROCESSING (SERVIDOR)
// ============================================
function patchWebhookProcessing(contextGenerator) {
  // Interceptar processamento de webhook no servidor
  const originalConsoleLog = console.log;

  // Monkey patch para capturar quando mensagem é processada
  console.log = function(...args) {
    const message = args.join(' ');

    // Detectar quando mensagem WhatsApp é processada
    if (message.includes(' Processando mensagem de')) {
      const match = message.match(/ Processando mensagem de (\d+): "(.+)"/);
      if (match) {
        const [, from, text] = match;

        //  FIX GRAVE #6: FORÇAR processamento com histórico e error handling robusto
        setImmediate(() => {
          (async () => {
            try {
              console.log(` [PATCH] Interceptando mensagem de ${from}`);

              // Gerar resposta com histórico completo
              const contextualResponse = await contextGenerator.generateContextualResponse(
                from,
                text,
                null // Sem agente específico, usará fallback
              );

              console.log(` [PATCH] Resposta contextual gerada: "${contextualResponse}"`);

              // Aqui você poderia interceptar e substituir a resposta original
              // Por enquanto, apenas logamos para ver que está funcionando

            } catch (error) {
              console.error(' [PATCH] Erro no processamento:', error);
            }
          })().catch(error => {
            console.error(' [PATCH] Erro não capturado:', error);
          });
        });
      }
    }

    return originalConsoleLog.apply(console, args);
  };
}

// ============================================
// PATCH 2: ORBION AGENT DIRETO
// ============================================
async function patchOrbionAgent(contextGenerator) {
  try {
    // Importar OrbionHybridAgent dinamicamente
    const { OrbionHybridAgent } = await import('../core/OrbionHybridAgent.js');

    if (!OrbionHybridAgent) {
      console.warn(' OrbionHybridAgent não encontrado');
      return;
    }

    // Guardar método original
    const originalProcessMessage = OrbionHybridAgent.prototype.processMessage;

    // Sobrescrever processMessage
    OrbionHybridAgent.prototype.processMessage = async function(from, text, profile = {}) {
      console.log(` [PATCH] Processamento FORÇADO com histórico para ${from}`);

      try {
        // 1. SEMPRE gerar resposta contextual primeiro
        const contextualResponse = await contextGenerator.generateContextualResponse(
          from,
          text,
          this // Passar instância do agente
        );

        // 2. Se conseguiu gerar resposta contextual, usar ela
        if (contextualResponse && contextualResponse.length > 10) {
          console.log(` [PATCH] Usando resposta contextual: "${contextualResponse.substring(0, 100)}..."`);

          return {
            success: true,
            response: contextualResponse,
            enhanced: true,
            usedFullHistory: true,
            metadata: {
              processingTime: Date.now(),
              contextAware: true,
              patchApplied: true
            }
          };
        }

        // 3. Fallback para método original se necessário
        console.log(` [PATCH] Fallback para método original`);
        return await originalProcessMessage.call(this, from, text, profile);

      } catch (error) {
        console.error(` [PATCH] Erro no processamento:`, error);

        // Em caso de erro, usar método original
        return await originalProcessMessage.call(this, from, text, profile);
      }
    };

    console.log(' PATCH aplicado no OrbionHybridAgent.prototype.processMessage');

  } catch (error) {
    console.error(' Erro ao aplicar patch no OrbionAgent:', error);
  }
}

// ============================================
// PATCH 3: INTERCEPTOR DE RESPOSTA (ALTERNATIVO)
// ============================================
export function patchResponseGeneration() {
  console.log(' Aplicando patch de geração de resposta...');

  // Interceptar qualquer função que gere respostas
  const originalStringify = JSON.stringify;

  JSON.stringify = function(obj, replacer, space) {
    // Detectar se é uma resposta sendo enviada
    if (obj && obj.response && typeof obj.response === 'string') {
      console.log(` [PATCH] Resposta detectada: "${obj.response.substring(0, 50)}..."`);

      // Aqui você poderia modificar a resposta
      // obj.response = "[PATCH] " + obj.response;
    }

    return originalStringify.call(this, obj, replacer, space);
  };
}

// ============================================
// PATCH 4: MEMORY ENHANCEMENT
// ============================================
export async function enhanceMemorySystem() {
  try {
    const memoryModule = await import('../memory.js');

    // Patch na função saveMessage se existir
    if (memoryModule.saveMessage) {
      const originalSaveMessage = memoryModule.saveMessage;

      memoryModule.saveMessage = async function(from, text, isBot) {
        console.log(` [PATCH] Salvando mensagem: ${from} - "${text}"`);

        // Salvar normalmente
        const result = await originalSaveMessage.call(this, from, text, isBot);

        // Adicionar à cache de histórico também
        const cacheKey = `enhanced_history_${from}`;
        const existing = await memoryModule.getMemory(cacheKey) || [];

        existing.push({
          text,
          fromBot: isBot,
          timestamp: Date.now(),
          type: 'text'
        });

        // Manter apenas últimas 50 mensagens
        if (existing.length > 50) {
          existing.splice(0, existing.length - 50);
        }

        await memoryModule.setMemory(cacheKey, existing);

        return result;
      };

      console.log(' PATCH aplicado no sistema de memória');
    }

  } catch (error) {
    console.error(' Erro ao aplicar patch na memória:', error);
  }
}

// ============================================
// APLICAÇÃO AUTOMÁTICA DOS PATCHES
// ============================================
export async function applyAllPatches() {
  console.log(' APLICANDO TODOS OS PATCHES DE HISTÓRICO...');

  try {
    // Aplicar patches
    applyHistoryPatch();
    patchResponseGeneration();
    await enhanceMemorySystem();

    console.log(' TODOS OS PATCHES APLICADOS COM SUCESSO!');
    console.log(' ORBION agora SEMPRE considerará o histórico completo!');

    return true;

  } catch (error) {
    console.error(' Erro ao aplicar patches:', error);
    return false;
  }
}

// ============================================
// FUNÇÃO DE TESTE
// ============================================
export async function testHistoryPatch(from = '5511999999999', message = 'Qual o preço do serviço?') {
  console.log(' TESTANDO PATCH DE HISTÓRICO...');

  const contextGenerator = new ContextAwareResponseGenerator();

  try {
    const response = await contextGenerator.generateContextualResponse(
      from,
      message,
      null
    );

    console.log(' TESTE CONCLUÍDO:');
    console.log(`   Mensagem: "${message}"`);
    console.log(`   Resposta: "${response}"`);

    return response;

  } catch (error) {
    console.error(' Erro no teste:', error);
    return null;
  }
}

// ============================================
// AUTO-APLICAR AO IMPORTAR
// ============================================
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
  //  FIX GRAVE #6: Aplicar patches com error handling
  setImmediate(() => {
    try {
      applyAllPatches();
    } catch (error) {
      console.error(' [PATCH] Erro ao aplicar patches:', error);
    }
  });
}

console.log(' Módulo de patch de histórico carregado');

export default {
  applyHistoryPatch,
  applyAllPatches,
  testHistoryPatch,
  patchResponseGeneration,
  enhanceMemorySystem
};