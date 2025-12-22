// src/tools/meeting_scheduler.js
// Sistema profissional de agendamento integrado com ORBION
import crypto from 'crypto';
import openaiClient from '../core/openai_client.js';
import { createEvent, suggestMeetingTimes, getCalendarStatus } from './calendar_enhanced.js';
import { getMemory, setMemory } from '../memory.js';
import { leadRepository } from '../repositories/lead.repository.js';
import { DEFAULT_TENANT_ID } from '../utils/tenantCompat.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Cria evento no Google Calendar usando sistema enhanced
 * @param {object} eventData - Dados do evento
 * @returns {Promise<object>} Resultado da criação
 */
async function createGoogleCalendarEvent(eventData, options = {}) {
  try {
    // Converte formato do evento para o sistema enhanced
    const enhancedEventData = {
      title: eventData.summary || eventData.title,
      date: eventData.date || new Date(eventData.startDateTime || eventData.start).toISOString().split('T')[0],
      time: eventData.time || new Date(eventData.startDateTime || eventData.start).toTimeString().substr(0, 5),
      duration: eventData.duration || 60,
      description: eventData.description || '',
      location: eventData.location || 'Online - Google Meet',
      attendees: eventData.attendees || [],
      meetEnabled: true,
      sendNotifications: true
    };

    const result = await createEvent(enhancedEventData, options);

    if (!result.success) {
      throw new Error(result.error || 'Falha ao criar evento');
    }

    console.log(' Evento criado no Google Calendar:', result.event.id);
    return result.event;

  } catch (error) {
    console.error(' Erro ao criar evento no Google Calendar:', error);
    throw error;
  }
}

/**
 * Tipos de reunião suportados pelo sistema
 * Importante: Os nomes são usados para busca de transcrições no Google Drive
 */
export const MEETING_TYPES = {
  DISCOVERY: 'discovery',      // Reunião inicial de descoberta/qualificação
  NEGOTIATION: 'negotiation',  // Reunião de apresentação de proposta/negociação
  FOLLOWUP: 'followup',        // Reunião de acompanhamento
  CLOSING: 'closing'           // Reunião de fechamento
};

/**
 * Gera título da reunião no padrão correto para busca de transcrições
 * Formato: "Reunião de [Tipo] - [Nome do Lead/Empresa]"
 *
 * @param {string} meetingType - Tipo da reunião (discovery, negotiation, etc)
 * @param {string} leadName - Nome do lead ou empresa
 * @returns {string} Título formatado
 */
function generateMeetingTitle(meetingType, leadName) {
  const typeLabels = {
    [MEETING_TYPES.DISCOVERY]: 'Discovery',
    [MEETING_TYPES.NEGOTIATION]: 'Negociação',
    [MEETING_TYPES.FOLLOWUP]: 'Follow-up',
    [MEETING_TYPES.CLOSING]: 'Fechamento'
  };

  const typeLabel = typeLabels[meetingType] || 'Discovery';
  return `Reunião de ${typeLabel} - ${leadName}`;
}

/**
 * Agenda reunião estratégica com o cliente
 * @param {string} clientName - Nome do cliente/empresa
 * @param {string} clientEmail - Email do cliente
 * @param {string} clientPhone - Telefone do cliente
 * @param {object} analysis - Análise da conversa
 * @param {object} options - Opções adicionais
 * @param {string} options.meetingType - Tipo de reunião (discovery, negotiation, followup, closing)
 * @param {string} options.companyName - Nome da empresa (se diferente do clientName)
 * @returns {Promise<object>} Detalhes da reunião agendada
 */
export async function scheduleStrategicMeeting(clientName, clientEmail, clientPhone, analysis, options = {}) {
  try {
    const tenantId = options.tenantId || DEFAULT_TENANT_ID;
    // Determina tipo de reunião baseado no contexto
    // Se não especificado, usa interesse para decidir
    let meetingType = options.meetingType;
    if (!meetingType) {
      // Se interesse alto (>=8) e já tem dores identificadas, é negociação
      // Caso contrário, é discovery
      meetingType = (analysis.interest_level >= 8 && analysis.pain_points?.length > 2)
        ? MEETING_TYPES.NEGOTIATION
        : MEETING_TYPES.DISCOVERY;
    }

    // Nome para usar no título (prioriza empresa sobre nome pessoal)
    const displayName = options.companyName || clientName;

    console.log(` Agendando reunião de ${meetingType}...`);

    // Sugere horários baseado na análise de urgência
    const urgencyLevel = analysis.interest_level >= 8 ? 'alta' : analysis.interest_level >= 6 ? 'média' : 'baixa';
    const suggestedDays = urgencyLevel === 'alta' ? 1 : urgencyLevel === 'média' ? 2 : 3;

    // Calcula data sugerida (próximos dias úteis)
    const meetingDate = getNextBusinessDay(suggestedDays);
    const meetingTime = getOptimalMeetingTime();

    // Cria descrição personalizada da reunião
    const meetingDescription = await generateMeetingDescription(analysis, clientName, clientPhone);

    // Gera título no padrão correto para busca de transcrições
    const meetingTitle = generateMeetingTitle(meetingType, displayName);

    // Agenda no Google Calendar via API
    const startDateTime = new Date(meetingDate);
    startDateTime.setHours(parseInt(meetingTime.split(':')[0]), parseInt(meetingTime.split(':')[1]), 0, 0);

    const endDateTime = new Date(startDateTime);
    endDateTime.setMinutes(endDateTime.getMinutes() + 30);

    const eventResult = await createGoogleCalendarEvent({
      summary: meetingTitle,
      description: meetingDescription,
      startDateTime: startDateTime.toISOString(),
      endDateTime: endDateTime.toISOString(),
      location: 'Online - Google Meet'
    }, { tenantId });

    //  FIX: Atualizar estágio do lead no pipeline para o estágio correto
    // CRÍTICO: Esta lógica estava FALTANDO - leads ficavam em "discovery" mesmo após agendar
    // Estágios do pipeline:
    //   - stage_triagem_agendada: Reunião de triagem/discovery (default)
    //   - stage_oportunidade: Após triagem bem sucedida, vai para diagnóstico
    //   - stage_proposta: Proposta enviada
    //   - stage_negociacao: Em negociação
    try {
      const normalizedPhone = clientPhone?.replace(/\D/g, '');
      if (normalizedPhone) {
        // Determinar o estágio correto baseado no tipo de reunião
        let newStageId = 'stage_triagem_agendada'; // Default: Triagem Agendada
        if (meetingType === MEETING_TYPES.NEGOTIATION) {
          newStageId = 'stage_oportunidade'; // Oportunidade - Diagnóstico
        } else if (meetingType === MEETING_TYPES.CLOSING) {
          newStageId = 'stage_negociacao'; // Negociação
        } else if (meetingType === MEETING_TYPES.FOLLOWUP) {
          // Follow-up mantém no estágio atual ou vai para oportunidade
          newStageId = 'stage_oportunidade';
        }

        leadRepository.upsert(normalizedPhone, {
          stage_id: newStageId,
          stage_entered_at: new Date().toISOString(),
          meeting_scheduled_at: new Date().toISOString(),
          meeting_type: meetingType,
          meeting_calendar_id: eventResult.id,
          cadence_status: 'meeting_scheduled'
        }, tenantId);

        console.log(` Lead ${normalizedPhone} movido para estágio: ${newStageId}`);

        //  FIX P0: PARAR CADÊNCIA EXPLICITAMENTE quando reunião é agendada
        // Leads com reunião agendada NÃO devem receber mais mensagens de cadência
        try {
          const { getCadenceIntegrationService } = await import('../services/CadenceIntegrationService.js');
          const cadenceService = getCadenceIntegrationService();

          const stopResult = await cadenceService.stopCadenceForLead(normalizedPhone, {
            reason: 'meeting_scheduled',
            newStage: newStageId,
            meetingId: eventResult.id
          });

          if (stopResult.success) {
            console.log(` Cadência PARADA para ${normalizedPhone} - reunião agendada`);
          } else if (stopResult.error !== 'no_active_enrollment') {
            console.warn(` Não foi possível parar cadência: ${stopResult.error}`);
          }
        } catch (cadenceError) {
          console.warn(' Erro ao parar cadência após agendar reunião:', cadenceError.message);
          // Não quebrar o fluxo - a reunião foi agendada com sucesso
        }
      }
    } catch (stageError) {
      console.warn(' Erro ao atualizar estágio do lead:', stageError.message);
      // Não quebrar o fluxo - a reunião foi criada com sucesso
    }

    // Prepara detalhes da reunião
    const meetingDetails = {
      id: eventResult.id,
      title: meetingTitle,
      meetingType: meetingType,
      leadName: displayName,
      date: meetingDate.toLocaleDateString('pt-BR'),
      time: meetingDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      duration: '30 minutos',
      participants: [
        {
          name: 'Taylor Lapenda',
          email: 'boost@odigitalboost.com',
          role: 'CEO Digital Boost'
        },
        {
          name: clientName,
          email: clientEmail,
          role: 'Cliente'
        }
      ],
      description: meetingDescription,
      meetingLink: eventResult.meet || generateMeetingLink(),
      clientPhone: clientPhone,
      analysis: analysis
    };

    console.log(' Reunião agendada:', meetingDetails.title);

    return meetingDetails;

  } catch (error) {
    console.error(' Erro ao agendar reunião:', error);
    throw error;
  }
}

/**
 * Agenda reunião de Discovery com lead
 * Atalho para scheduleStrategicMeeting com tipo discovery
 */
export async function scheduleDiscoveryMeeting(clientName, clientEmail, clientPhone, analysis, companyName = null) {
  return scheduleStrategicMeeting(clientName, clientEmail, clientPhone, analysis, {
    meetingType: MEETING_TYPES.DISCOVERY,
    companyName: companyName
  });
}

/**
 * Agenda reunião de Negociação com lead
 * Atalho para scheduleStrategicMeeting com tipo negotiation
 */
export async function scheduleNegotiationMeeting(clientName, clientEmail, clientPhone, analysis, companyName = null) {
  return scheduleStrategicMeeting(clientName, clientEmail, clientPhone, analysis, {
    meetingType: MEETING_TYPES.NEGOTIATION,
    companyName: companyName
  });
}

/**
 * Gera descrição personalizada da reunião baseada na análise e conversa
 * @param {object} analysis - Análise da conversa
 * @param {string} clientName - Nome do cliente
 * @param {string} phoneNumber - Telefone para buscar histórico
 * @returns {Promise<string>} Descrição da reunião
 */
async function generateMeetingDescription(analysis, clientName, phoneNumber) {
  try {
    // Buscar histórico da conversa para criar resumo
    const { getConversationHistory } = await import('../memory.js');
    const conversationHistory = await getConversationHistory(phoneNumber);

    // Criar resumo conciso da conversa (últimas 10 mensagens)
    const recentMessages = conversationHistory.slice(-10);
    const conversationText = recentMessages
      .map(msg => `${msg.isBot ? 'LEADLY' : 'Cliente'}: ${msg.text}`)
      .join('\n');

    const descriptionPrompt = `Crie uma descrição profissional para reunião estratégica. Analise a conversa abaixo e extraia os pontos mais importantes:

CLIENTE: ${clientName}
NÍVEL DE INTERESSE: ${analysis.interest_level}/10

CONVERSA NO WHATSAPP:
${conversationText}

DORES IDENTIFICADAS: ${(analysis.pain_points || []).join(', ') || 'Não identificadas'}
INTENÇÃO: ${analysis.client_intent || 'Não identificada'}
ESTRATÉGIA: ${analysis.sales_strategy || 'A definir'}

Crie uma descrição CONCISA (máximo 300 palavras) que inclua:

1.  RESUMO DA CONVERSA: 2-3 frases sobre o que foi discutido
2.  OBJETIVO DA REUNIÃO: O que queremos alcançar
3.  PONTOS A DISCUTIR: Tópicos específicos mencionados pelo cliente
4.  PREPARAÇÃO: Dados/materiais necessários
5.  PRÓXIMOS PASSOS: Resultados esperados

Seja objetivo, profissional e use informações REAIS da conversa.`;

    const response = await openaiClient.createChatCompletion([
      {
        role: 'system',
        content: 'Você é especialista em preparar reuniões B2B. Crie descrições concisas, objetivas e acionáveis que capturam o essencial da conversa.'
      },
      {
        role: 'user',
        content: descriptionPrompt
      }
    ], {
      max_tokens: 350,
      temperature: 0.5
    });

    return response.choices[0].message.content.trim();

  } catch (error) {
    console.error(' Erro ao gerar descrição:', error);
    return ` RESUMO DA CONVERSA:
Cliente entrou em contato via WhatsApp interessado em soluções da Digital Boost.

 OBJETIVO DA REUNIÃO:
- Analisar necessidades específicas do negócio
- Apresentar cases de sucesso relevantes
- Desenhar estratégia digital personalizada
- Definir próximos passos para implementação

 DORES IDENTIFICADAS:
${(analysis.pain_points || ['Não identificadas ainda']).join('\n')}

 NÍVEL DE INTERESSE: ${analysis.interest_level || 5}/10

 PRÓXIMOS PASSOS:
- Apresentar proposta comercial
- Validar fit da solução
- Definir cronograma de implementação`;
  }
}

/**
 * Calcula próximo dia útil
 * @param {number} daysAhead - Dias à frente
 * @returns {Date} Data do próximo dia útil
 */
function getNextBusinessDay(daysAhead = 1) {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  
  // Ajusta para dia útil se cair em fim de semana
  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() + 1);
  }
  
  return date;
}

/**
 * Determina melhor horário para reunião baseado na urgência
 * @returns {string} Horário sugerido
 */
function getOptimalMeetingTime() {
  const now = new Date();
  const currentHour = now.getHours();
  
  // Horários preferenciais: 9h, 14h, 16h
  if (currentHour < 9) return '09:00';
  if (currentHour < 14) return '14:00';
  if (currentHour < 16) return '16:00';
  return '09:00'; // Próximo dia
}

/**
 * Gera link da reunião (Google Meet)
 * @returns {string} Link da reunião
 */
function generateMeetingLink() {
  // Em produção, integrar com Google Calendar API para gerar link real
  const meetingId = crypto.randomUUID().slice(0, 8);
  return `https://meet.google.com/orbion-${meetingId}`;
}

/**
 * Envia confirmação da reunião via WhatsApp
 * @param {string} phoneNumber - Número do cliente
 * @param {object} meetingDetails - Detalhes da reunião
 * @returns {Promise<object>} Resultado do envio
 */
export async function sendMeetingConfirmation(phoneNumber, meetingDetails) {
  try {
    const { sendWhatsAppText } = await import('../services/whatsappAdapterProvider.js');
    
    const confirmationMessage = ` **REUNIÃO CONFIRMADA!**

 **${meetingDetails.title}**

 **Data:** ${meetingDetails.date}
 **Horário:** ${meetingDetails.time}
 **Duração:** ${meetingDetails.duration}

 **Participantes:**
• Taylor Lapenda (CEO Digital Boost)
• ${meetingDetails.participants[1].name}

 **Objetivo:** 
${meetingDetails.description.split('\n')[0]}

 **Link da Reunião:**
${meetingDetails.meetingLink}

 **Convite enviado para:** ${meetingDetails.participants[1].email}

---
*Em caso de dúvidas ou necessidade de reagendamento, responda esta mensagem.*

**Digital Boost** `;

    const result = await sendWhatsAppText(phoneNumber, confirmationMessage);
    
    console.log(' Confirmação de reunião enviada via WhatsApp');
    return result;
    
  } catch (error) {
    console.error(' Erro ao enviar confirmação:', error);
    throw error;
  }
}

/**
 * Salva dados da reunião no banco
 * @param {object} meetingDetails - Detalhes da reunião
 * @param {string} phoneNumber - Número do cliente
 * @returns {Promise<object>} Resultado da operação
 */
export async function saveMeetingToDatabase(meetingDetails, phoneNumber) {
  try {
    const { saveMessage } = await import('../memory.js');
    
    // Salva como mensagem especial no histórico
    const meetingRecord = `[REUNIÃO AGENDADA] ${meetingDetails.title} - ${meetingDetails.date} ${meetingDetails.time} - Email: ${meetingDetails.participants[1].email}`;
    
    await saveMessage(phoneNumber, meetingRecord, true, 'meeting');
    
    console.log(' Reunião salva no banco de dados');
    
    return {
      success: true,
      message: 'Reunião salva com sucesso'
    };
    
  } catch (error) {
    console.error(' Erro ao salvar reunião:', error);
    throw error;
  }
}

/**
 * Processo completo de agendamento
 * @param {string} clientName - Nome do cliente
 * @param {string} clientEmail - Email do cliente  
 * @param {string} phoneNumber - Número do WhatsApp
 * @param {object} analysis - Análise da conversa
 * @returns {Promise<object>} Resultado completo
 */
export async function completeSchedulingProcess(clientName, clientEmail, phoneNumber, analysis) {
  let meetingDetails = null;
  let whatsappConfirmationSent = false;

  try {
    console.log(' Iniciando processo completo de agendamento...');

    // 1. Agenda a reunião (CRÍTICO - deve sempre funcionar)
    meetingDetails = await scheduleStrategicMeeting(clientName, clientEmail, phoneNumber, analysis);
    console.log(' Reunião criada no Google Calendar:', meetingDetails.id);

    // 2. Salva no banco de dados (CRÍTICO - deve sempre funcionar)
    await saveMeetingToDatabase(meetingDetails, phoneNumber);
    console.log(' Reunião salva no banco de dados');

    // 3. Tenta enviar confirmação via WhatsApp (OPCIONAL - não deve quebrar o processo)
    try {
      await sendMeetingConfirmation(phoneNumber, meetingDetails);
      whatsappConfirmationSent = true;
      console.log(' Confirmação enviada via WhatsApp');
    } catch (whatsappError) {
      console.warn(' Falha ao enviar confirmação via WhatsApp:', whatsappError.message);
      console.log(' Usuário receberá convite apenas por email');
      // Não quebra o processo - reunião foi agendada com sucesso
    }

    console.log(' Processo de agendamento concluído com sucesso!');

    return {
      success: true,
      meeting: meetingDetails,
      message: whatsappConfirmationSent
        ? 'Reunião agendada e confirmação enviada via WhatsApp'
        : 'Reunião agendada com sucesso. Convite enviado por email.',
      whatsappConfirmation: whatsappConfirmationSent
    };

  } catch (error) {
    console.error(' Erro crítico no processo de agendamento:', error);

    // Se a reunião foi criada mas houve erro depois, retorna parcial sucesso
    if (meetingDetails) {
      console.log(' Reunião foi criada no Google Calendar, mas houve erro nas etapas posteriores');
      return {
        success: true,
        meeting: meetingDetails,
        message: 'Reunião agendada no Google Calendar. Houve problemas com confirmações adicionais.',
        partial: true
      };
    }

    // Se nem a reunião foi criada, é erro total
    throw error;
  }
}
