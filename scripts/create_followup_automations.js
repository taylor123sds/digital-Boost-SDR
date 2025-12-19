/**
 * @file create_followup_automations.js
 * @description Creates dynamic follow-up automations for lead nurturing
 */

import Database from 'better-sqlite3';
import { randomBytes } from 'crypto';

const db = new Database('./orbion.db');

function generateId() {
  return `auto_${Date.now()}_${randomBytes(4).toString('hex')}`;
}

const followups = [
  {
    id: generateId(),
    name: 'Follow-up D+0 - Competindo com Notificações',
    description: 'Primeiro follow-up humorístico para leads sem resposta no mesmo dia (6h+)',
    category: 'follow_up',
    trigger: {
      type: 'schedule',
      cron: '0 18 * * *', // Todo dia às 18h
      target: 'leads'
    },
    conditions: [
      { field: 'ultimo_contato', operator: 'older_than', value: '6h' },
      { field: 'ultimo_contato', operator: 'newer_than', value: '24h' },
      { field: 'status', operator: 'not_in', value: ['convertido', 'desqualificado', 'descartado'] },
      { field: 'followup_stage', operator: 'less_than', value: 1 }
    ],
    actions: [
      {
        type: 'send_whatsapp',
        template: `{{nome}}, tô oficialmente competindo com:

 grupos da família
 promo de iFood
 mensagem aleatória de "boa noite abençoado"

por 10 segundos da sua atenção aqui 

Brincadeiras à parte: nossa conversa ficou parada bem na parte em que eu ia te mostrar como sair de {{dor_resumida}} e chegar em {{resultado_desejado}}.

Quer que eu te mande:

1⃣ Um resumo em 3 linhas
2⃣ Um áudio explicando em 30 segundos
3⃣ Nada por enquanto (pode ser sincero, não vou chorar… muito )`
      },
      {
        type: 'update_field',
        field: 'followup_stage',
        value: 1
      },
      {
        type: 'update_field',
        field: 'last_followup_date',
        value: '{{now}}'
      },
      {
        type: 'log',
        message: 'Follow-up D+0 enviado para {{nome}}'
      }
    ]
  },
  {
    id: generateId(),
    name: 'Follow-up D+1 - Boleto no Começo do Mês',
    description: 'Segundo follow-up com humor e virada séria (24h após D+0)',
    category: 'follow_up',
    trigger: {
      type: 'schedule',
      cron: '0 10 * * *', // Todo dia às 10h
      target: 'leads'
    },
    conditions: [
      { field: 'last_followup_date', operator: 'older_than', value: '20h' },
      { field: 'last_followup_date', operator: 'newer_than', value: '48h' },
      { field: 'followup_stage', operator: 'equals', value: 1 },
      { field: 'status', operator: 'not_in', value: ['convertido', 'desqualificado', 'descartado'] }
    ],
    actions: [
      {
        type: 'send_whatsapp',
        template: `Apareci aqui de novo igual boleto no começo do mês 

Prometo ser mais útil que ele:

• Você me contou que hoje a maior dor é {{dor_resumida}}
• Eu fiquei de te mostrar um caminho que {{beneficio_chave}}

Se você me der só uma resposta aqui, eu já consigo te dizer se:

1⃣ Vale a pena dar o próximo passo agora
2⃣ Melhor deixar pra depois e não te encher o saco`
      },
      {
        type: 'update_field',
        field: 'followup_stage',
        value: 2
      },
      {
        type: 'update_field',
        field: 'last_followup_date',
        value: '{{now}}'
      },
      {
        type: 'log',
        message: 'Follow-up D+1 enviado para {{nome}}'
      }
    ]
  },
  {
    id: generateId(),
    name: 'Follow-up D+3 - Auto-zoação de Vendedor',
    description: 'Terceiro e último follow-up antes de descartar (48h após D+1)',
    category: 'follow_up',
    trigger: {
      type: 'schedule',
      cron: '0 14 * * *', // Todo dia às 14h
      target: 'leads'
    },
    conditions: [
      { field: 'last_followup_date', operator: 'older_than', value: '44h' },
      { field: 'last_followup_date', operator: 'newer_than', value: '96h' },
      { field: 'followup_stage', operator: 'equals', value: 2 },
      { field: 'status', operator: 'not_in', value: ['convertido', 'desqualificado', 'descartado'] }
    ],
    actions: [
      {
        type: 'send_whatsapp',
        template: `Prometo que essa é a mensagem mais honesta de vendedor que você vai receber hoje 

Eu: tentando te ajudar a resolver {{dor_resumida}}
Você: vivendo, trabalhando, apagando incêndio
WhatsApp: enchendo a caixa de notificação

Se você quiser, eu sumo e marco aqui pra te chamar só daqui a 30 dias.

Se preferir aproveitar agora, me responde só:

• "sim"  que eu te mando um resumo mastigado
• "depois"  que eu te deixo respirar e marco pra te chamar mais pra frente`
      },
      {
        type: 'update_field',
        field: 'followup_stage',
        value: 3
      },
      {
        type: 'update_field',
        field: 'last_followup_date',
        value: '{{now}}'
      },
      {
        type: 'log',
        message: 'Follow-up D+3 (último) enviado para {{nome}}'
      }
    ]
  },
  {
    id: generateId(),
    name: 'Descarte Automático - Sem Resposta D+5',
    description: 'Descarta lead que não respondeu após 3 follow-ups (48h após D+3)',
    category: 'follow_up',
    trigger: {
      type: 'schedule',
      cron: '0 9 * * *', // Todo dia às 9h
      target: 'leads'
    },
    conditions: [
      { field: 'last_followup_date', operator: 'older_than', value: '44h' },
      { field: 'followup_stage', operator: 'equals', value: 3 },
      { field: 'status', operator: 'not_in', value: ['convertido', 'desqualificado', 'descartado'] }
    ],
    actions: [
      {
        type: 'update_field',
        field: 'status',
        value: 'descartado'
      },
      {
        type: 'update_field',
        field: 'motivo_descarte',
        value: 'Sem resposta após 3 follow-ups (D+0, D+1, D+3)'
      },
      {
        type: 'send_notification',
        notification_type: 'info',
        title: 'Lead descartado automaticamente',
        message: '{{nome}} foi descartado após 3 follow-ups sem resposta'
      },
      {
        type: 'log',
        message: 'Lead {{nome}} descartado - sem resposta após ciclo completo de follow-up'
      }
    ]
  }
];

console.log('Creating follow-up automations...\n');

const insertStmt = db.prepare(`
  INSERT INTO automations (id, name, description, trigger_config, conditions, actions, enabled, category, created_at)
  VALUES (?, ?, ?, ?, ?, ?, 1, ?, datetime('now'))
`);

for (const followup of followups) {
  try {
    insertStmt.run(
      followup.id,
      followup.name,
      followup.description,
      JSON.stringify(followup.trigger),
      JSON.stringify(followup.conditions),
      JSON.stringify(followup.actions),
      followup.category
    );
    console.log(` ${followup.name}`);
  } catch (error) {
    console.error(` ${followup.name}: ${error.message}`);
  }
}

db.close();

console.log('\n Follow-up automations created successfully!');
console.log('\nCiclo de follow-up:');
console.log('  D+0 (18h)  Competindo com Notificações');
console.log('  D+1 (10h)  Boleto no Começo do Mês');
console.log('  D+3 (14h)  Auto-zoação de Vendedor');
console.log('  D+5 (9h)   Descarte Automático');
console.log('\nReinicie o servidor para carregar as novas automações.');
