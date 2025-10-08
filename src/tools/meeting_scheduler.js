// src/tools/meeting_scheduler.js
// Sistema profissional de agendamento integrado com ORBION
import openaiClient from '../core/openai_client.js';
import { createEvent, suggestMeetingTimes, getCalendarStatus } from './calendar_enhanced.js';
import { getMemory, setMemory } from '../memory.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Cria evento no Google Calendar usando sistema enhanced
 * @param {object} eventData - Dados do evento
 * @returns {Promise<object>} Resultado da criação
 */
async function createGoogleCalendarEvent(eventData) {
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

    const result = await createEvent(enhancedEventData);

    if (!result.success) {
      throw new Error(result.error || 'Falha ao criar evento');
    }

    console.log('📅 Evento criado no Google Calendar:', result.event.id);
    return result.event;

  } catch (error) {
    console.error('❌ Erro ao criar evento no Google Calendar:', error);
    throw error;
  }
}

/**
 * Agenda reunião estratégica com o cliente
 * @param {string} clientName - Nome do cliente
 * @param {string} clientEmail - Email do cliente
 * @param {string} clientPhone - Telefone do cliente
 * @param {object} analysis - Análise da conversa
 * @returns {Promise<object>} Detalhes da reunião agendada
 */
export async function scheduleStrategicMeeting(clientName, clientEmail, clientPhone, analysis) {
  try {
    console.log('📅 Agendando reunião estratégica...');
    
    // Sugere horários baseado na análise de urgência
    const urgencyLevel = analysis.interest_level >= 8 ? 'alta' : analysis.interest_level >= 6 ? 'média' : 'baixa';
    const suggestedDays = urgencyLevel === 'alta' ? 1 : urgencyLevel === 'média' ? 2 : 3;
    
    // Calcula data sugerida (próximos dias úteis)
    const meetingDate = getNextBusinessDay(suggestedDays);
    const meetingTime = getOptimalMeetingTime();
    
    // Cria descrição personalizada da reunião
    const meetingDescription = await generateMeetingDescription(analysis, clientName);
    
    // Agenda no Google Calendar via API
    const startDateTime = new Date(meetingDate);
    startDateTime.setHours(parseInt(meetingTime.split(':')[0]), parseInt(meetingTime.split(':')[1]), 0, 0);

    const endDateTime = new Date(startDateTime);
    endDateTime.setMinutes(endDateTime.getMinutes() + 30);

    const eventResult = await createGoogleCalendarEvent({
      summary: `Reunião Estratégica Digital Boost - ${clientName}`,
      description: meetingDescription,
      startDateTime: startDateTime.toISOString(),
      endDateTime: endDateTime.toISOString(),
      location: 'Online - Google Meet'
    });
    
    // Prepara detalhes da reunião
    const meetingDetails = {
      id: eventResult.id,
      title: `Reunião Estratégica Digital Boost - ${clientName}`,
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
    
    console.log('✅ Reunião agendada:', meetingDetails.title);
    
    return meetingDetails;
    
  } catch (error) {
    console.error('❌ Erro ao agendar reunião:', error);
    throw error;
  }
}

/**
 * Gera descrição personalizada da reunião baseada na análise
 * @param {object} analysis - Análise da conversa
 * @param {string} clientName - Nome do cliente
 * @returns {Promise<string>} Descrição da reunião
 */
async function generateMeetingDescription(analysis, clientName) {
  try {
    const descriptionPrompt = `Crie uma descrição profissional para reunião estratégica baseada nesta análise:

CLIENTE: ${clientName}
NÍVEL DE INTERESSE: ${analysis.interest_level}/10
DORES IDENTIFICADAS: ${analysis.pain_points.join(', ')}
INTENÇÃO DO CLIENTE: ${analysis.client_intent}
ESTRATÉGIA: ${analysis.sales_strategy}

Crie uma descrição que inclua:
1. Objetivo da reunião
2. Pontos a serem discutidos
3. Resultados esperados
4. Preparação necessária

Mantenha tom profissional e orientado a resultados.`;

    const response = await openaiClient.createChatCompletion([
      {
        role: 'system',
        content: 'Você é especialista em reuniões estratégicas B2B. Crie descrições profissionais e orientadas a resultados.'
      },
      {
        role: 'user',
        content: descriptionPrompt
      }
    ], {
      max_tokens: 300,
      temperature: 0.6
    });

    return response.choices[0].message.content.trim();
    
  } catch (error) {
    console.error('❌ Erro ao gerar descrição:', error);
    return `Reunião estratégica para discutir oportunidades de crescimento digital e apresentar soluções personalizadas da Digital Boost.

OBJETIVO:
- Analisar necessidades específicas do negócio
- Apresentar cases de sucesso relevantes  
- Desenhar estratégia digital personalizada
- Definir próximos passos para implementação

O cliente demonstrou interesse em: ${analysis.pain_points.join(', ')}`;
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
    const { sendWhatsAppMessage } = await import('./whatsapp.js');
    
    const confirmationMessage = `🎯 **REUNIÃO CONFIRMADA!**

📅 **${meetingDetails.title}**

🗓️ **Data:** ${meetingDetails.date}
🕐 **Horário:** ${meetingDetails.time}
⏱️ **Duração:** ${meetingDetails.duration}

👥 **Participantes:**
• Taylor Lapenda (CEO Digital Boost)
• ${meetingDetails.participants[1].name}

🎯 **Objetivo:** 
${meetingDetails.description.split('\n')[0]}

📞 **Link da Reunião:**
${meetingDetails.meetingLink}

📧 **Convite enviado para:** ${meetingDetails.participants[1].email}

---
*Em caso de dúvidas ou necessidade de reagendamento, responda esta mensagem.*

**Digital Boost** 🚀`;

    const result = await sendWhatsAppMessage(phoneNumber, confirmationMessage);
    
    console.log('📨 Confirmação de reunião enviada via WhatsApp');
    return result;
    
  } catch (error) {
    console.error('❌ Erro ao enviar confirmação:', error);
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
    
    console.log('💾 Reunião salva no banco de dados');
    
    return {
      success: true,
      message: 'Reunião salva com sucesso'
    };
    
  } catch (error) {
    console.error('❌ Erro ao salvar reunião:', error);
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
    console.log('🎯 Iniciando processo completo de agendamento...');

    // 1. Agenda a reunião (CRÍTICO - deve sempre funcionar)
    meetingDetails = await scheduleStrategicMeeting(clientName, clientEmail, phoneNumber, analysis);
    console.log('✅ Reunião criada no Google Calendar:', meetingDetails.id);

    // 2. Salva no banco de dados (CRÍTICO - deve sempre funcionar)
    await saveMeetingToDatabase(meetingDetails, phoneNumber);
    console.log('✅ Reunião salva no banco de dados');

    // 3. Tenta enviar confirmação via WhatsApp (OPCIONAL - não deve quebrar o processo)
    try {
      await sendMeetingConfirmation(phoneNumber, meetingDetails);
      whatsappConfirmationSent = true;
      console.log('✅ Confirmação enviada via WhatsApp');
    } catch (whatsappError) {
      console.warn('⚠️ Falha ao enviar confirmação via WhatsApp:', whatsappError.message);
      console.log('📧 Usuário receberá convite apenas por email');
      // Não quebra o processo - reunião foi agendada com sucesso
    }

    console.log('✅ Processo de agendamento concluído com sucesso!');

    return {
      success: true,
      meeting: meetingDetails,
      message: whatsappConfirmationSent
        ? 'Reunião agendada e confirmação enviada via WhatsApp'
        : 'Reunião agendada com sucesso. Convite enviado por email.',
      whatsappConfirmation: whatsappConfirmationSent
    };

  } catch (error) {
    console.error('❌ Erro crítico no processo de agendamento:', error);

    // Se a reunião foi criada mas houve erro depois, retorna parcial sucesso
    if (meetingDetails) {
      console.log('⚠️ Reunião foi criada no Google Calendar, mas houve erro nas etapas posteriores');
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