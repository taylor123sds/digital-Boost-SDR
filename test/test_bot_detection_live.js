// test_bot_detection_live.js - Testa o sistema de detecção de bots em funcionamento
import Database from 'better-sqlite3';
import { analyzeBotSignals, trackMessageTiming, isProbableBot } from '../src/utils/bot_detector.js';

console.log('🧪 TESTE DO SISTEMA DE DETECÇÃO DE BOTS\n');
console.log('═'.repeat(80));

const db = new Database('./orbion.db');

// Pegar as últimas 10 mensagens recebidas (from_me = 0)
console.log('\n📊 ANÁLISE DAS ÚLTIMAS MENSAGENS RECEBIDAS:\n');

const messages = db.prepare(`
  SELECT phone_number, message_text, created_at
  FROM whatsapp_messages
  WHERE from_me = 0
  ORDER BY created_at DESC
  LIMIT 10
`).all();

messages.forEach((msg, i) => {
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`📱 MENSAGEM ${i + 1}: ${msg.phone_number}`);
  console.log(`📅 Data: ${msg.created_at}`);
  console.log(`💬 Texto: ${msg.message_text?.substring(0, 100)}${msg.message_text?.length > 100 ? '...' : ''}`);

  // 1. Análise de conteúdo
  const contentAnalysis = analyzeMessageForBotSignals(msg.message_text || '');
  console.log(`\n🔍 ANÁLISE DE CONTEÚDO:`);
  console.log(`   Sinais detectados: ${contentAnalysis.signalCount}`);
  console.log(`   É bot?: ${contentAnalysis.isBot}`);
  if (contentAnalysis.signals && contentAnalysis.signals.length > 0) {
    console.log(`   Sinais: ${contentAnalysis.signals.join(', ')}`);
  }

  // 2. Análise de tempo (simular)
  const previousMessages = db.prepare(`
    SELECT created_at
    FROM whatsapp_messages
    WHERE phone_number = ? AND created_at < ?
    ORDER BY created_at DESC
    LIMIT 1
  `).get(msg.phone_number, msg.created_at);

  let timeAnalysis = null;
  if (previousMessages) {
    const prevTime = new Date(previousMessages.created_at).getTime();
    const currTime = new Date(msg.created_at).getTime();
    timeAnalysis = isTimeBasedBot(msg.phone_number, prevTime, currTime);

    console.log(`\n⏱️ ANÁLISE DE TEMPO:`);
    console.log(`   Resposta rápida?: ${timeAnalysis.isBot}`);
    console.log(`   Score temporal: ${(timeAnalysis.score * 100).toFixed(1)}%`);
    console.log(`   Intervalo: ${timeAnalysis.interval}ms`);
  } else {
    console.log(`\n⏱️ ANÁLISE DE TEMPO:`);
    console.log(`   Primeira mensagem - sem análise temporal`);
    timeAnalysis = { isBot: false, score: 0, interval: null };
  }

  // 3. Score comportamental
  const behaviorScore = analyzeBotScore(msg.phone_number);
  console.log(`\n📊 SCORE COMPORTAMENTAL:`);
  console.log(`   Score total: ${(behaviorScore.totalScore * 100).toFixed(1)}%`);
  console.log(`   Nível: ${behaviorScore.level}`);
  console.log(`   Ação recomendada: ${behaviorScore.action}`);

  // 4. DECISÃO FINAL (lógica híbrida)
  const isBotConfirmed =
    (timeAnalysis.isBot && contentAnalysis.signalCount >= 1) || // Resposta rápida + sinais
    (behaviorScore.totalScore >= 0.6 && contentAnalysis.signalCount >= 2); // Score alto + múltiplos sinais

  console.log(`\n🎯 DECISÃO FINAL:`);
  if (isBotConfirmed) {
    console.log(`   ⚠️  BOT DETECTADO - Enviaria "HUMANO OK"`);
    console.log(`   Razão: ${timeAnalysis.isBot ? 'Resposta rápida + conteúdo bot' : 'Score alto + múltiplos sinais'}`);
  } else {
    console.log(`   ✅ HUMANO CONFIRMADO - Responder normalmente`);
  }
});

console.log(`\n${'═'.repeat(80)}`);

// Estatísticas gerais
const stats = db.prepare(`
  SELECT
    COUNT(*) as total,
    SUM(CASE WHEN from_me = 0 THEN 1 ELSE 0 END) as received,
    SUM(CASE WHEN from_me = 1 THEN 1 ELSE 0 END) as sent
  FROM whatsapp_messages
`).get();

console.log('\n📈 ESTATÍSTICAS GERAIS:\n');
console.log(`   Total de mensagens: ${stats.total}`);
console.log(`   Recebidas: ${stats.received}`);
console.log(`   Enviadas: ${stats.sent}`);

db.close();

console.log('\n' + '═'.repeat(80));
console.log('\n✅ Teste concluído!\n');
