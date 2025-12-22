/**
 * ULTRA-SIMPLE CAMPAIGN TRIGGER
 *
 * Dashboard  Trigger  Chama SDR Agent  SDR envia mensagem inicial
 *
 * REGRA: Campaign trigger APENAS chama o SDR, não manipula dados.
 * O SDR Agent que decide o que fazer com a primeira mensagem.
 *
 *  LOCK: Usa first_contact_lock para evitar duplicação com ProspectingEngine
 */

import { getAgentHub } from '../agents/agent_hub_init.js';
import { sendWhatsAppText } from '../services/whatsappAdapterProvider.js';
import { normalizePhone } from '../utils/phone_normalizer.js';
import { resetLead } from '../utils/stateManager.js';
import { acquireFirstContactLock, markFirstMessageSent, wasFirstMessageSent } from '../utils/first_contact_lock.js';

/**
 * Trigger de campanha - chama SDR Agent para enviar primeira mensagem
 *
 * @param {string} phone - Telefone do lead
 */
export async function triggerSDRForPhone(phone) {
  try {
    console.log(` [CAMPAIGN-TRIGGER] Chamando SDR para ${phone}`);

    const normalizedPhone = normalizePhone(phone);

    //  VERIFICAR LOCK - Evita duplicação com ProspectingEngine
    const lockResult = acquireFirstContactLock(normalizedPhone, 'campaign_trigger');
    if (!lockResult.acquired) {
      console.log(` [CAMPAIGN-TRIGGER] Lead ${normalizedPhone} bloqueado: ${lockResult.reason} (por ${lockResult.lockedBy})`);
      return {
        success: false,
        phone: normalizedPhone,
        skipped: true,
        reason: `Bloqueado: ${lockResult.reason} por ${lockResult.lockedBy}`
      };
    }

    const agentHub = getAgentHub();

    //  FIX: Resetar lead para começar do zero (SDR Agent)
    // Campanha sempre começa nova conversa, mesmo se lead já existir
    console.log(` [CAMPAIGN-TRIGGER] Resetando lead ${normalizedPhone} para começar do SDR`);

    await resetLead(normalizedPhone);

    // Chamar SDR Agent com mensagem especial de campanha
    //  IMPORTANTE: SDR Agent detecta text vazio e envia mensagem inicial
    const result = await agentHub.processMessage(
      {
        fromContact: normalizedPhone,
        text: '/start' // Comando especial para iniciar campanha
      },
      {
        messageType: 'text',
        metadata: {
          origin: 'campaign_trigger',
          isCampaign: true
        },
        hasHistory: false,
        from: normalizedPhone,
        fromWhatsApp: true,
        platform: 'whatsapp'
      }
    );

    // Enviar mensagem via WhatsApp
    if (result.message) {
      console.log(` [CAMPAIGN-TRIGGER] Enviando mensagem SDR para ${phone}`);
      await sendWhatsAppText(normalizedPhone, result.message);
      console.log(` [CAMPAIGN-TRIGGER] Mensagem enviada com sucesso`);

      //  Marcar primeira mensagem como enviada (impede duplicação)
      markFirstMessageSent(normalizedPhone, 'campaign_trigger');
    } else {
      console.log(`  [CAMPAIGN-TRIGGER] SDR não retornou mensagem para ${phone}`);
    }

    return {
      success: true,
      phone: normalizedPhone,
      message: result.message || null
    };

  } catch (error) {
    console.error(` [CAMPAIGN-TRIGGER] Erro para ${phone}:`, error.message);
    return {
      success: false,
      phone,
      error: error.message
    };
  }
}

/**
 * Trigger de campanha para múltiplos telefones (batch)
 *
 * @param {Array<string>} phones - Lista de telefones
 * @param {Object} options - Opções de delay e limite
 */
export async function triggerCampaign(phones, options = {}) {
  const {
    delayMs = 7000,     // 7 segundos entre mensagens
    maxPhones = null     // Limite de telefones (null = todos)
  } = options;

  console.log(` [CAMPAIGN-TRIGGER] Iniciando campanha para ${phones.length} telefone(s)`);

  const phonesToProcess = maxPhones ? phones.slice(0, maxPhones) : phones;

  const results = {
    total: phonesToProcess.length,
    sent: 0,
    failed: 0,
    details: []
  };

  for (let i = 0; i < phonesToProcess.length; i++) {
    const phone = phonesToProcess[i];

    console.log(`\n [${i + 1}/${phonesToProcess.length}] Processando ${phone}`);

    const result = await triggerSDRForPhone(phone);

    if (result.success && result.message) {
      results.sent++;
      results.details.push({
        phone: result.phone,
        status: 'sent',
        message: result.message
      });
    } else {
      results.failed++;
      results.details.push({
        phone: result.phone,
        status: 'failed',
        error: result.error || 'No message returned'
      });
    }

    // Delay entre telefones (evitar rate limit)
    if (i < phonesToProcess.length - 1) {
      console.log(`  Aguardando ${(delayMs / 1000).toFixed(1)}s antes do próximo...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  console.log(`\n [CAMPAIGN-TRIGGER] Campanha finalizada`);
  console.log(`    Total: ${results.total}`);
  console.log(`    Enviados: ${results.sent}`);
  console.log(`    Falhados: ${results.failed}`);

  return results;
}
