/**
 * Script para atualizar mensagens de cadência no banco de dados
 * Substitui placeholders por mensagens contextualizadas
 */

import Database from 'better-sqlite3';

const DB_PATH = process.env.DB_PATH || '/app/data/orbion.db';
const db = new Database(DB_PATH);

console.log('=== ATUALIZANDO MENSAGENS DE CADÊNCIA ===\n');

// Mensagens contextualizadas para cada dia
const FOLLOWUP_MESSAGES = {
  2: {
    name: 'Follow-up D2 - Competindo com Notificações',
    content: `{{nome}}, tô oficialmente competindo com:

 grupos da família
 promo de iFood
 mensagem aleatória de "boa noite abençoado"

por 10 segundos da sua atenção aqui 

Brincadeiras à parte: nossa conversa ficou parada.

Quer que eu te mande:
1⃣ Um resumo em 3 linhas
2⃣ Um áudio explicando em 30 segundos
3⃣ Nada por enquanto (pode ser sincero, não vou chorar… muito )`
  },
  3: {
    name: 'Follow-up D3 - Boleto no Começo do Mês',
    content: `Apareci aqui de novo igual boleto no começo do mês 

Prometo ser mais útil que ele:

• Você me contou sobre os desafios da {{empresa}}
• Eu fiquei de te mostrar um caminho que pode ajudar

Se você me der só uma resposta aqui, eu já consigo te dizer se:
1⃣ Vale a pena dar o próximo passo agora
2⃣ Melhor deixar pra depois e não te encher o saco`
  },
  5: {
    name: 'Follow-up D5 - Auto-zoação de Vendedor',
    content: `Prometo que essa é a mensagem mais honesta de vendedor que você vai receber hoje 

Eu: tentando te ajudar com a {{empresa}}
Você: vivendo, trabalhando, apagando incêndio
WhatsApp: enchendo a caixa de notificação

Se você quiser, eu sumo e marco aqui pra te chamar só daqui a 30 dias.

Se preferir aproveitar agora, me responde só:
• "sim"  que eu te mando um resumo mastigado
• "depois"  que eu te deixo respirar`
  },
  7: {
    name: 'Follow-up D7 - Última Tentativa',
    content: `{{nome}}, essa é minha última mensagem por aqui.

Sei que o WhatsApp tá cheio de spam, então não quero ser mais um incômodo.

Se em algum momento fizer sentido conversar sobre como a Digital Boost pode ajudar a {{empresa}}, é só me chamar aqui mesmo.

Desejo sucesso! `
  }
};

// Estado antes
console.log('ANTES:');
const before = db.prepare('SELECT day, name, substr(content, 1, 50) as inicio FROM cadence_steps ORDER BY day').all();
before.forEach(row => console.log(`  D${row.day}: ${row.name} -> "${row.inicio}..."`));

// Atualizar cada mensagem
const updateStmt = db.prepare('UPDATE cadence_steps SET name = ?, content = ? WHERE day = ?');

let updated = 0;
for (const [day, msg] of Object.entries(FOLLOWUP_MESSAGES)) {
  try {
    const result = updateStmt.run(msg.name, msg.content, parseInt(day));
    if (result.changes > 0) {
      console.log(`\n D${day} atualizado: ${msg.name}`);
      updated++;
    } else {
      console.log(`\n D${day} não encontrado no banco`);
    }
  } catch (error) {
    console.error(`\n Erro ao atualizar D${day}:`, error.message);
  }
}

// Estado depois
console.log('\n\nDEPOIS:');
const after = db.prepare('SELECT day, name, substr(content, 1, 50) as inicio FROM cadence_steps ORDER BY day').all();
after.forEach(row => console.log(`  D${row.day}: ${row.name} -> "${row.inicio}..."`));

console.log(`\n=== ${updated} MENSAGENS ATUALIZADAS ===`);

db.close();
