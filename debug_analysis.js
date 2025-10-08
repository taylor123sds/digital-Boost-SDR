/**
 * DEBUG DA ANÁLISE DE RESPOSTA
 * Verifica como o sistema está interpretando a mensagem
 */

import structuredFlow from './src/tools/structured_flow_system.js';

async function debugAnalysis() {
  console.log('🔍 DEBUG DA ANÁLISE DE RESPOSTA\n');

  const flowManager = new structuredFlow.constructor();

  const testMessage = 'Ola orbion, poderia me falar o que vocês fazem?';
  const conversationState = {
    current_phase: 'identification',
    message_count: 0,
    client_responses: [],
    identified_pains: [],
    objections_raised: [],
    business_context: null,
    last_agent_action: null,
    phase_completion: {
      identification: false,
      business_discovery: false,
      solution_presentation: false,
      scheduling: false
    },
    created_at: Date.now()
  };

  console.log('📝 Mensagem a analisar:', testMessage);
  console.log('📊 Estado da conversa:', conversationState.current_phase);
  console.log(''.padEnd(50, '-'));

  // 1. Análise da resposta do cliente
  console.log('\n🔍 ANÁLISE DA RESPOSTA:');
  const responseAnalysis = flowManager.analyzeClientResponse(testMessage, conversationState);
  console.log('Resultado:', JSON.stringify(responseAnalysis, null, 2));

  // 2. Decisão do fluxo
  console.log('\n🎯 DECISÃO DO FLUXO:');
  const flowDecision = flowManager.determineFlowAction(responseAnalysis, conversationState);
  console.log('Resultado:', JSON.stringify(flowDecision, null, 2));

  // 3. Teste individual das detecções
  console.log('\n🧪 TESTE DAS DETECÇÕES:');

  const lowerText = testMessage.toLowerCase().trim();

  // Testa detecção de parada
  const stopWords = ['parar', 'sair', 'stop', 'não quero', 'remover', 'cancelar'];
  const hasStop = stopWords.some(word => lowerText.includes(word));
  console.log('🛑 Palavras de parada:', hasStop, stopWords.filter(word => lowerText.includes(word)));

  // Testa detecção de reunião
  const meetingWords = ['agendar', 'reunião', 'conversar', 'falar', 'interessado', 'aceito', 'sim', 'vamos', 'ok'];
  const hasMeeting = meetingWords.some(word => lowerText.includes(word));
  console.log('🗓️ Palavras de reunião:', hasMeeting, meetingWords.filter(word => lowerText.includes(word)));

  // Testa detecção de objeções
  const objections = flowManager.detectSpecificObjections(lowerText);
  console.log('🚫 Objeções detectadas:', objections);

  // Testa detecção de perguntas
  const questions = flowManager.detectQuestions(lowerText);
  console.log('❓ Perguntas detectadas:', questions);

  // Testa sentimento
  const positiveWords = ['interessante', 'legal', 'ótimo', 'bom', 'sim', 'entendi', 'faz sentido'];
  const negativeWords = ['não', 'ruim', 'complicado', 'difícil'];
  const hasPositive = positiveWords.some(word => lowerText.includes(word));
  const hasNegative = negativeWords.some(word => lowerText.includes(word));
  console.log('😊 Sentimento positivo:', hasPositive, positiveWords.filter(word => lowerText.includes(word)));
  console.log('😞 Sentimento negativo:', hasNegative, negativeWords.filter(word => lowerText.includes(word)));
}

await debugAnalysis();