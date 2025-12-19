/**
 * @file templates.js
 * @description Message templates for the follow-up automation system
 * @module automation/followup/templates
 */

import { TEMPLATE_VARIABLES } from './constants.js';

const { NAME, PAIN_SUMMARY, DESIRED_RESULT, KEY_BENEFIT } = TEMPLATE_VARIABLES;

/**
 * D+0 Template: "Competindo com Notificações"
 * First follow-up with humor to break the ice
 * @type {string}
 */
export const TEMPLATE_D0_COMPETING = `${NAME}, tô oficialmente competindo com:

 grupos da família
 promo de iFood
 mensagem aleatória de "boa noite abençoado"

por 10 segundos da sua atenção aqui 

Brincadeiras à parte: nossa conversa ficou parada bem na parte em que eu ia te mostrar como sair de ${PAIN_SUMMARY} e chegar em ${DESIRED_RESULT}.

Quer que eu te mande:

1⃣ Um resumo em 3 linhas
2⃣ Um áudio explicando em 30 segundos
3⃣ Nada por enquanto (pode ser sincero, não vou chorar… muito )`;

/**
 * D+1 Template: "Boleto no Começo do Mês"
 * Second follow-up with humor and serious pivot
 * @type {string}
 */
export const TEMPLATE_D1_INVOICE = `Apareci aqui de novo igual boleto no começo do mês 

Prometo ser mais útil que ele:

• Você me contou que hoje a maior dor é ${PAIN_SUMMARY}
• Eu fiquei de te mostrar um caminho que ${KEY_BENEFIT}

Se você me der só uma resposta aqui, eu já consigo te dizer se:

1⃣ Vale a pena dar o próximo passo agora
2⃣ Melhor deixar pra depois e não te encher o saco`;

/**
 * D+3 Template: "Auto-zoação de Vendedor"
 * Final follow-up before discard - honest and respectful
 * @type {string}
 */
export const TEMPLATE_D3_SELF_DEPRECATING = `Prometo que essa é a mensagem mais honesta de vendedor que você vai receber hoje 

Eu: tentando te ajudar a resolver ${PAIN_SUMMARY}
Você: vivendo, trabalhando, apagando incêndio
WhatsApp: enchendo a caixa de notificação

Se você quiser, eu sumo e marco aqui pra te chamar só daqui a 30 dias.

Se preferir aproveitar agora, me responde só:

• "sim"  que eu te mando um resumo mastigado
• "depois"  que eu te deixo respirar e marco pra te chamar mais pra frente`;

/**
 * Get template by stage identifier
 * @param {string} stageId - Stage identifier (D0, D1, D3)
 * @returns {string|null} Template string or null if not found
 */
export function getTemplateByStage(stageId) {
  const templates = {
    D0: TEMPLATE_D0_COMPETING,
    D1: TEMPLATE_D1_INVOICE,
    D3: TEMPLATE_D3_SELF_DEPRECATING
  };

  return templates[stageId] || null;
}

/**
 * All templates collection
 * @type {Object}
 */
export const TEMPLATES = {
  D0: TEMPLATE_D0_COMPETING,
  D1: TEMPLATE_D1_INVOICE,
  D3: TEMPLATE_D3_SELF_DEPRECATING
};

export default {
  TEMPLATE_D0_COMPETING,
  TEMPLATE_D1_INVOICE,
  TEMPLATE_D3_SELF_DEPRECATING,
  getTemplateByStage,
  TEMPLATES
};
