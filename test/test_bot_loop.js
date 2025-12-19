import { trackMessageTiming, isProbableBot } from '../src/utils/bot_detector.js';

console.log('🧪 TESTE DE LOOP COM BOT\n');

const botId = '5584BOT12345';
const botMenu = `Bem vindo! Digite:
1 - Vendas
2 - Suporte
3 - Financeiro`;

// Simular 5 mensagens repetidas do bot
for (let i = 1; i <= 5; i++) {
  console.log(`\n📨 Mensagem ${i} do bot:`);
  const score = trackMessageTiming(botId, botMenu);
  const check = isProbableBot(botId);
  console.log(`   Score: ${(score.totalScore * 100).toFixed(1)}% | Bloqueado: ${check.isBot}`);
  
  if (check.isBot) {
    console.log(`   🛑 BOT DETECTADO E BLOQUEADO na mensagem ${i}!`);
    break;
  }
  
  // Simular intervalo muito curto (bot responde em 100ms)
  await new Promise(r => setTimeout(r, 100));
}
