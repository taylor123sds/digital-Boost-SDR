// Test bot detection logic
import { trackMessageTiming, isProbableBot } from '../src/utils/bot_detector.js';

console.log('🧪 TESTE DE DETECÇÃO DE BOT\n');

// Teste 1: Mensagem humana normal
console.log('📝 Teste 1: Mensagem humana normal');
const score1 = trackMessageTiming('5584999999991', 'Qual o custo?');
const check1 = isProbableBot('5584999999991');
console.log(`   Score: ${(score1.totalScore * 100).toFixed(1)}% | Bot: ${check1.isBot}\n`);

// Teste 2: Mensagem com padrões de bot
console.log('📝 Teste 2: Menu de bot');
const botMessage = `Olá! Bem vindo ao nosso atendimento automático.
Digite:
1 - Vendas
2 - Suporte
3 - Financeiro`;
const score2 = trackMessageTiming('5584888888888', botMessage);
const check2 = isProbableBot('5584888888888');
console.log(`   Score: ${(score2.totalScore * 100).toFixed(1)}% | Bot: ${check2.isBot}\n`);

// Teste 3: Mensagem suspeita mas não bot
console.log('📝 Teste 3: Mensagem suspeita (60-70%)');
const score3 = trackMessageTiming('5584777777777', 'Obrigado pelo contato! Pode me enviar mais informações?');
const check3 = isProbableBot('5584777777777');
console.log(`   Score: ${(score3.totalScore * 100).toFixed(1)}% | Bot: ${check3.isBot}\n`);

console.log('✅ Testes concluídos!');
