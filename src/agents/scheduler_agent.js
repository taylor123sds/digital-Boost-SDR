// scheduler_agent.js
// AGENTE 3: Scheduler Agent - Agendamento de Reuniões
// v2.0 - Integração com STYLE GUIDE GLOBAL

import { getRecentMessages } from '../memory.js';
import openaiClient from '../core/openai_client.js';
import { createEvent, updateEvent } from '../tools/calendar_enhanced.js';
import { detectChangeType } from '../utils/intent_detectors.js';
//  FIX P0: Adicionar MessageUnderstanding para validação de contexto
import messageUnderstanding from '../intelligence/MessageUnderstanding.js';

//  STYLE GUIDE GLOBAL - ÚNICA FONTE DE VERDADE
import {
  BRAND,
  STYLE_RULES,
  getMeetingTheme
} from '../config/brand-style-guide.js';

/**
 * Scheduler Agent - Agente de Agendamento
 * Responsável por:
 * 1. Receber lead qualificado do Specialist (score >= 70%)
 * 2. Propor horários de reunião
 * 3. Negociar disponibilidade
 * 4. Criar evento no Google Calendar
 * 5. Enviar confirmação
 */
export class SchedulerAgent {
  constructor() {
    this.hub = null; // Será injetado pelo AgentHub
    this.name = 'scheduler';
  }

  /**
   *  FIX #4: Helper para obter painType de forma consolidada
   * Busca painType em múltiplas localizações possíveis
   * @param {Object} leadState - Estado do lead
   * @returns {string} - Tipo de dor detectada
   */
  _getPainType(leadState) {
    // Prioridade 1: Campo direto no estado (canonical)
    if (leadState.painType) {
      return leadState.painType;
    }

    // Prioridade 2: Em metadata
    if (leadState.metadata?.painType) {
      return leadState.metadata.painType;
    }

    // Prioridade 3: No bantSummary
    if (leadState.bantSummary?.painType) {
      return leadState.bantSummary.painType;
    }

    // Prioridade 4: No companyProfile
    if (leadState.companyProfile?.painType) {
      return leadState.companyProfile.painType;
    }

    // Fallback: tipo genérico
    return 'dre';
  }

  /**
   * Método chamado quando recebe handoff do Specialist
   */
  async onHandoffReceived(leadPhone, leadState) {
    console.log(`\n [SCHEDULER] Recebendo handoff do Specialist`);
    console.log(` Score de qualificação: ${leadState.qualificationScore}%`);
    console.log(` BANT:`, JSON.stringify(leadState.bantStages, null, 2));

    //  FIX #4: Usar helper consolidado para painType
    const painType = this._getPainType(leadState);
    console.log(` [SCHEDULER] PainType: ${painType}`);

    //  NOVO: Primeiro solicitar email antes de propor horários
    const emailRequest = this.getEmailRequestMessage(painType);

    //  FIX: Use canonical schema (scheduler object)
    return {
      message: emailRequest,
      metadata: {
        stage: 'collecting_email',
        qualified: true,
        score: leadState.qualificationScore
      },
      updateState: {
        scheduler: {
          stage: 'collecting_email'
        }
      }
    };
  }

  /**
   * Processa mensagem do lead
   */
  async process(message, context) {
    const { fromContact, text } = message;
    const { leadState } = context;

    console.log(`\n [SCHEDULER] Processando mensagem de ${fromContact}`);
    console.log(` [SCHEDULER] Stage atual: ${leadState.scheduler?.stage || 'N/A'}`);

    try {
      //  CANONICAL: Verificar se já tem reunião agendada (prevenir duplicatas)
      if (leadState.scheduler?.meetingData?.eventId) {
        console.log(` [SCHEDULER] Reunião já agendada: ${leadState.scheduler.meetingData.eventId}`);

        //  NOVO: Detectar tipo específico de mudança solicitada
        const changeType = detectChangeType(text);

        if (changeType.detected) {
          console.log(` [SCHEDULER] Mudança detectada - tipo: ${changeType.type}`);

          switch (changeType.type) {
            case 'email':
              return await this.handleEmailChange(leadState);

            case 'time':
              return await this.handleTimeChange(leadState);

            case 'date':
              return await this.handleDateChange(leadState);

            case 'full':
              return await this.handleFullReschedule(leadState);
          }
        } else {
          const slotDate = leadState.scheduler.selectedSlot?.date || 'a data agendada';
          const slotTime = leadState.scheduler.selectedSlot?.time || 'o horário agendado';
          return {
            message: `Sua reunião já está agendada para ${slotDate} às ${slotTime}.\n\nLink: ${leadState.scheduler.meetingData.meetLink}\n\nQuer remarcar?`,
            metadata: { alreadyScheduled: true }
          };
        }
      }

      //  CANONICAL: Use canonical schema (scheduler object)
      let currentStage;

      // Priority: use canonical schema location
      if (leadState.scheduler?.stage) {
        currentStage = leadState.scheduler.stage;
      } else if (leadState.scheduler?.meetingData?.eventId) {
        currentStage = 'confirmed';
      } else if (leadState.scheduler?.leadEmail) {
        // If email exists in canonical location, we're proposing times
        currentStage = 'proposing_times';
      } else {
        currentStage = 'collecting_email';
      }

      console.log(` [SCHEDULER] schedulerStage detectado: ${currentStage}`);
      console.log(` [SCHEDULER] Email salvo: ${leadState.scheduler?.leadEmail || 'N/A'}`);

      // ═══════════════════════════════════════════════════════════════════
      //  FIX P0: VALIDAR CONTEXTO COM MessageUnderstanding
      // Antes de assumir collecting_email, verificar se a mensagem faz sentido
      // ═══════════════════════════════════════════════════════════════════
      const understanding = await messageUnderstanding.understand(text, fromContact, {
        leadProfile: leadState.companyProfile,
        stage: 'scheduler',
        expectedResponseType: currentStage === 'collecting_email' ? 'email' : 'time_selection'
      });

      console.log(` [SCHEDULER] Entendimento: ${understanding.messageType}/${understanding.senderIntent}`);

      // CASO: Bot/Menu detectado - não pedir email, retornar ao fluxo
      if (understanding.isBot || understanding.isMenu) {
        console.log(` [SCHEDULER] Bot/Menu detectado - redirecionando ao invés de pedir email`);
        return {
          message: 'Parece que você respondeu a um menu. Vamos continuar: preciso do seu email para enviar o convite da reunião. Pode me informar?',
          metadata: { botDetected: true, stage: currentStage }
        };
      }

      // CASO: Resposta fora de contexto (não é email, não é horário)
      if (currentStage === 'collecting_email' && understanding.messageType === 'question' && !understanding.senderIntent?.includes('email')) {
        console.log(` [SCHEDULER] Lead fez pergunta ao invés de dar email`);
        return {
          message: understanding.suggestedResponse || 'Ótima pergunta! Vou responder durante nossa reunião. Para agendar, só preciso do seu email. Qual é?',
          metadata: { questionDetected: true, originalQuestion: text }
        };
      }

      // ESTÁGIO 1: Coletando email
      if (currentStage === 'collecting_email') {
        console.log(` [SCHEDULER] Processando coleta de email`);

        // Detectar email na mensagem
        const emailDetection = this.detectEmail(text);

        if (emailDetection.found) {
          console.log(` [SCHEDULER] Email detectado: ${emailDetection.email}`);

          // Salvar email e avançar para propor horários
          const slots = this.getAvailableTimeSlots();
          const timeProposal = await this.proposeTimeSlots(leadState, slots);

          //  FIX: Save to canonical schema location (scheduler object)
          return {
            message: timeProposal,
            metadata: {
              stage: 'proposing_times',
              emailCollected: true
            },
            updateState: {
              scheduler: {
                stage: 'proposing_times',
                leadEmail: emailDetection.email,
                proposedSlots: slots
              }
            }
          };
        } else {
          // Email não detectado - pedir novamente
          console.log(` [SCHEDULER] Email não detectado na mensagem: "${text}"`);
          return {
            message: "Não consegui identificar o email. Pode enviar no formato: seu@email.com?",
            metadata: { stage: 'collecting_email', emailNotFound: true }
          };
        }
      }

      // ESTÁGIO 2: Propondo horários / Negociando
      if (currentStage === 'proposing_times') {
        console.log(` [SCHEDULER] Processando escolha de horário`);

        // 1. Recuperar histórico de conversa
        const conversationHistory = await getRecentMessages(fromContact, 5);
        const historyTexts = conversationHistory.map(m => m.text || '');

        //  CANONICAL: Usar slots salvos no estado ao invés de recalcular
        const proposedSlots = leadState.scheduler.proposedSlots || this.getAvailableTimeSlots();

        //  NULL-SAFE: Validar slots antes de prosseguir
        if (!proposedSlots || !Array.isArray(proposedSlots) || proposedSlots.length === 0) {
          console.error(` [SCHEDULER] No slots available for ${fromContact}`);
          return {
            message: "Desculpe, estou tendo problemas ao carregar os horários. Pode me dar alguns minutos e tentar novamente?",
            metadata: { error: 'no_slots_available', stage: 'proposing_times' },
            updateState: {
              scheduler: {
                stage: 'error_state',
                leadEmail: leadState.scheduler?.leadEmail || null,
                proposedSlots: [],
                selectedSlot: null,
                meetingData: {
                  eventId: null,
                  meetLink: null,
                  confirmedAt: null
                }
              }
            }
          };
        }

        // 2. Detectar se lead confirmou horário
        const confirmation = this.detectTimeConfirmation(text, historyTexts, leadState, proposedSlots);

        //  NULL-SAFE: Validar confirmation antes de processar
        if (!confirmation || typeof confirmation !== 'object') {
          console.error(` [SCHEDULER] Invalid confirmation object`);
          return {
            message: "Não consegui processar sua resposta. Pode repetir qual horário prefere?",
            metadata: { error: 'invalid_confirmation' }
          };
        }

        if (confirmation.confirmed) {
          //  NULL-SAFE: Validar campos obrigatórios
          if (!confirmation.date || !confirmation.time) {
            console.error(` [SCHEDULER] Missing date/time in confirmation`);
            return {
              message: "Detectei sua confirmação, mas não consegui identificar o horário. Pode me dizer novamente?",
              metadata: { error: 'missing_datetime' }
            };
          }

          console.log(` [SCHEDULER] Horário confirmado: ${confirmation.date} ${confirmation.time}`);

          // 3. Criar evento no Google Calendar
          const eventResult = await this.createCalendarEvent(
            leadState,
            confirmation,
            fromContact
          );

          if (eventResult.success) {
            //  CORREÇÃO: Adicionar date e time do confirmation ao eventResult para a mensagem
            const eventResultWithDateTime = {
              ...eventResult,
              date: confirmation.date,
              time: confirmation.time,
              dateLabel: confirmation.label || `${confirmation.date} às ${confirmation.time}`
            };

            //  NOVO: Criar oportunidade no Pipeline automaticamente (SQLite primary)
            try {
              const { leadRepository } = await import('../repositories/lead.repository.js');

              //  CANONICAL: Usar consultativeEngine.slots (fonte correta do SPIN/BANT)
              const slots = leadState.consultativeEngine?.slots || {};

              const opportunityData = {
                nome: leadState.companyProfile?.nome || 'Lead',
                empresa: leadState.companyProfile?.empresa || 'Empresa não informada',
                email: leadState.scheduler.leadEmail,
                telefone: message.fromContact,
                segmento: leadState.companyProfile?.setor || 'Não especificado',

                // Dados BANT/SPIN - usando consultativeEngine.slots (canonical)
                interesse: slots.need_problema_sazonalidade || slots.need_problema_dependencia || 'Não especificado',
                valor: slots.budget_interesse || slots.budget_escopo || null,

                // Dados da reunião
                meeting_date: confirmation.date,
                meeting_time: confirmation.time,
                meet_link: eventResult.meetLink,
                calendar_event_id: eventResult.eventId,

                // Pipeline stage - qualificado após reunião agendada
                stage_id: 'stage_qualificado',
                bant_score: leadState.qualification?.score || 70,

                // Origem
                origem: 'BANT Completo',
                status: 'ativo'
              };

              // Usar upsert para criar ou atualizar lead existente
              leadRepository.upsert(message.fromContact, opportunityData);

              console.log(` [SCHEDULER] Oportunidade criada no Pipeline SQLite: ${message.fromContact}`);
            } catch (error) {
              console.error(` [SCHEDULER] Erro ao criar oportunidade no Pipeline:`, error);
              // Não bloquear o fluxo se der erro - a reunião foi agendada com sucesso
            }

            return {
              message: this.getConfirmationMessage(eventResultWithDateTime, this._getPainType(leadState)),
              metadata: {
                meetingScheduled: true,
                conversationCompleted: true, //  FIX: Use metadata flag instead of 'completed' agent
                eventId: eventResult.eventId,
                meetLink: eventResult.meetLink
              },
              updateState: {
                currentAgent: 'scheduler', //  FIX: Keep as scheduler (no 'completed' agent exists)
                metadata: {
                  ...leadState.metadata,
                  conversationCompleted: true, // Mark conversation as complete
                  completedAt: new Date().toISOString()
                },
                bantStages: {
                  ...leadState.bantStages,
                  currentStage: 'timing', //  FIX: Keep as 'timing' (last valid stage)
                  isComplete: true //  Mark BANT as complete
                },
                scheduler: {
                  stage: 'confirmed',
                  leadEmail: leadState.scheduler.leadEmail,
                  proposedSlots: proposedSlots,
                  selectedSlot: {
                    date: confirmation.date,
                    time: confirmation.time,
                    label: confirmation.label || `${confirmation.date} às ${confirmation.time}`
                  },
                  meetingData: {
                    eventId: eventResult.eventId,
                    meetLink: eventResult.meetLink,
                    confirmedAt: new Date().toISOString()
                  }
                },
                metadata: {
                  ...leadState.metadata,
                  meetingScheduled: true, //  Marcar flag de reunião agendada
                  completedAt: new Date().toISOString() //  Timestamp de conclusão do funil
                }
              }
            };
          } else {
            // Erro ao criar evento - pedir para escolher outro horário
            return {
              message: "Ops, esse horário não está mais disponível. Você prefere terça às 10h ou quinta às 15h?",
              metadata: { error: 'slot_unavailable' }
            };
          }
        }

        // 4. Se não confirmou, processar negociação de horário
        return await this.negotiateTimeSlot(text, historyTexts, leadState, proposedSlots);
      }

      // ═══════════════════════════════════════════════════════════════
      // NOVOS ESTÁGIOS: Atualização de Reunião
      // ═══════════════════════════════════════════════════════════════

      // ESTÁGIO: Atualizando email
      if (currentStage === 'updating_email') {
        console.log(` [SCHEDULER] Processando novo email`);

        const emailDetection = this.detectEmail(text);

        if (emailDetection.found) {
          try {
            // Atualizar evento no Google Calendar
            const eventId = leadState.scheduler.meetingData.eventId;
            const updateResult = await updateEvent(eventId, {
              attendees: [emailDetection.email]
            });

            if (updateResult.success) {
              return {
                message: ` Email atualizado!\n\nAgora você vai receber o convite em: ${emailDetection.email}\n\nMeet: ${leadState.scheduler.meetingData.meetLink}`,
                metadata: { emailUpdated: true },
                updateState: {
                  scheduler: {
                    ...leadState.scheduler,
                    leadEmail: emailDetection.email,
                    stage: 'confirmed'
                  }
                }
              };
            } else {
              return {
                message: `Tive um problema ao atualizar o email. Pode tentar novamente?`,
                metadata: { error: 'update_failed' }
              };
            }
          } catch (error) {
            console.error(` [SCHEDULER] Erro ao atualizar email:`, error);
            return {
              message: `Ops, tive um erro. Pode me enviar o email novamente?`,
              metadata: { error: error.message }
            };
          }
        } else {
          return {
            message: `Não consegui identificar o email. Pode enviar no formato: seu@email.com?`,
            metadata: { emailNotFound: true }
          };
        }
      }

      // ESTÁGIO: Atualizando horário
      if (currentStage === 'updating_time') {
        console.log(` [SCHEDULER] Processando novo horário`);

        // Detectar horário escolhido
        const availableTimes = leadState.scheduler.availableTimes || ['10:00', '15:00'];
        let newTime = null;

        // Verificar menções específicas
        const lowerText = text.toLowerCase();
        if (lowerText.includes('10') || lowerText.includes('manhã') || lowerText.includes('primeiro')) {
          newTime = availableTimes[0];
        } else if (lowerText.includes('15') || lowerText.includes('tarde') || lowerText.includes('segundo')) {
          newTime = availableTimes[1];
        }

        if (newTime) {
          try {
            //  FIX #5: Validar dados antes de atualizar
            const eventId = leadState.scheduler?.meetingData?.eventId;
            const currentDate = leadState.scheduler?.selectedSlot?.date;

            if (!eventId || !currentDate) {
              console.error(` [SCHEDULER] Dados inválidos: eventId=${eventId}, currentDate=${currentDate}`);
              return {
                message: `Tive um problema ao identificar sua reunião. Pode me dizer qual data você prefere?`,
                metadata: { error: 'missing_meeting_data' }
              };
            }

            const updateResult = await updateEvent(eventId, {
              date: currentDate,
              time: newTime,
              duration: 30
            });

            if (updateResult.success) {
              const dateFormatted = this.formatDateBR(currentDate);
              return {
                message: ` Horário atualizado!\n\nReunião agora é ${dateFormatted} às ${newTime}.\n\nMeet: ${leadState.scheduler.meetingData.meetLink}`,
                metadata: { timeUpdated: true },
                updateState: {
                  scheduler: {
                    ...leadState.scheduler,
                    selectedSlot: {
                      ...(leadState.scheduler?.selectedSlot || {}),
                      date: currentDate,
                      time: newTime
                    },
                    stage: 'confirmed'
                  }
                }
              };
            } else {
              return {
                message: `Esse horário não está mais disponível. Qual outro funciona?`,
                metadata: { error: 'time_unavailable' }
              };
            }
          } catch (error) {
            console.error(` [SCHEDULER] Erro ao atualizar horário:`, error);
            return {
              message: `Ops, tive um problema. Qual horário você prefere?`,
              metadata: { error: error.message }
            };
          }
        } else {
          return {
            message: `Não consegui identificar o horário. Você prefere:\n• ${availableTimes[0]}\n• ${availableTimes[1]}?`,
            metadata: { timeNotFound: true }
          };
        }
      }

      // ESTÁGIO: Atualizando data
      if (currentStage === 'updating_date') {
        console.log(` [SCHEDULER] Processando nova data`);

        // Detectar data escolhida
        const availableDates = leadState.scheduler.availableDates || [];
        let newDate = null;

        const lowerText = text.toLowerCase();

        // Tentar detectar por dia da semana
        for (const dateOption of availableDates) {
          if (lowerText.includes(dateOption.dayName.toLowerCase())) {
            newDate = dateOption.date;
            break;
          }
        }

        // Tentar detectar por "primeiro" ou "segundo"
        if (!newDate) {
          if (lowerText.includes('primeiro') || lowerText.includes('primeira') || lowerText.includes('1')) {
            newDate = availableDates[0]?.date;
          } else if (lowerText.includes('segundo') || lowerText.includes('segunda') || lowerText.includes('2')) {
            newDate = availableDates[1]?.date;
          }
        }

        if (newDate) {
          try {
            //  FIX #5: Validar dados antes de atualizar
            const eventId = leadState.scheduler?.meetingData?.eventId;
            const currentTime = leadState.scheduler?.selectedSlot?.time;

            if (!eventId || !currentTime) {
              console.error(` [SCHEDULER] Dados inválidos: eventId=${eventId}, currentTime=${currentTime}`);
              return {
                message: `Tive um problema ao identificar sua reunião. Pode me dizer qual horário você prefere?`,
                metadata: { error: 'missing_meeting_data' }
              };
            }

            const updateResult = await updateEvent(eventId, {
              date: newDate,
              time: currentTime,
              duration: 30
            });

            if (updateResult.success) {
              const dateFormatted = this.formatDateBR(newDate);
              return {
                message: ` Data atualizada!\n\nReunião agora é ${dateFormatted} às ${currentTime}.\n\nMeet: ${leadState.scheduler?.meetingData?.meetLink || ''}`,
                metadata: { dateUpdated: true },
                updateState: {
                  scheduler: {
                    ...leadState.scheduler,
                    selectedSlot: {
                      ...(leadState.scheduler?.selectedSlot || {}),
                      date: newDate,
                      time: currentTime
                    },
                    stage: 'confirmed'
                  }
                }
              };
            } else {
              return {
                message: `Essa data não está mais disponível. Qual outra funciona?`,
                metadata: { error: 'date_unavailable' }
              };
            }
          } catch (error) {
            console.error(` [SCHEDULER] Erro ao atualizar data:`, error);
            return {
              message: `Ops, tive um problema. Qual data você prefere?`,
              metadata: { error: error.message }
            };
          }
        } else {
          return {
            message: `Não consegui identificar a data. Você prefere:\n• ${availableDates[0]?.label}\n• ${availableDates[1]?.label}?`,
            metadata: { dateNotFound: true }
          };
        }
      }

      // ESTÁGIO 3: Reunião confirmada - manter relacionamento
      if (currentStage === 'confirmed') {
        console.log(` [SCHEDULER] Reunião já confirmada - processando follow-up`);
        const slotDate = leadState.scheduler.selectedSlot?.date || 'a data agendada';
        const slotTime = leadState.scheduler.selectedSlot?.time || 'o horário agendado';
        const meetLink = leadState.scheduler.meetingData?.meetLink || '';
        return {
          message: `Sua reunião está confirmada para ${slotDate} às ${slotTime}.\n\nLink: ${meetLink}\n\nQualquer dúvida, é só chamar! `,
          metadata: { stage: 'confirmed' }
        };
      }

    } catch (error) {
      console.error(` [SCHEDULER] Erro:`, error);
      return {
        message: 'Desculpe, tive um problema. Você prefere marcar para terça ou quinta?',
        metadata: { error: error.message }
      };
    }
  }

  /**
   * Propõe horários de reunião baseado na qualificação
   *  v4.0 - SOLAR: Diagnóstico do Canal Digital de Orçamentos
   */
  async proposeTimeSlots(leadState) {
    // Calcular próximos dias úteis
    const slots = this.getAvailableTimeSlots();

    //  SOLAR: Tema único - Diagnóstico do Canal Digital
    const meetingTheme = 'Diagnóstico do Canal Digital de Orçamentos (20-30 min)';

    console.log(` [SCHEDULER] Tema da reunião: ${meetingTheme}`);

    //  MENSAGEM SEM PALAVRAS PROIBIDAS (sem "Perfeito!", "Ótimo!", "Show!")
    const proposal = `Faz sentido! Vou analisar o que vocês têm hoje e mostrar o que faria sentido implementar.

Vamos agendar o diagnóstico de 20-30 min?

Tenho disponibilidade:
• ${slots[0].label}
• ${slots[1].label}

Qual funciona melhor pra vocês?`;

    return proposal;
  }

  /**
   * Calcula slots de horário disponíveis
   */
  getAvailableTimeSlots() {
    const now = new Date();
    const slots = [];

    // Próximos 2 dias úteis
    let daysAhead = 1;
    let slotsFound = 0;

    while (slotsFound < 2 && daysAhead < 10) {
      const date = new Date(now);
      date.setDate(date.getDate() + daysAhead);

      // Pular fins de semana
      if (date.getDay() !== 0 && date.getDay() !== 6) {
        const dayName = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][date.getDay()];
        const dayMonth = `${date.getDate()}/${date.getMonth() + 1}`;

        // Alternar entre manhã (10h) e tarde (15h)
        const time = slotsFound === 0 ? '10:00' : '15:00';
        const period = slotsFound === 0 ? '10h' : '15h';

        slots.push({
          date: this.formatDate(date), // YYYY-MM-DD
          time: time,
          label: `${dayName} (${dayMonth}) às ${period}`,
          dayName,
          dayMonth,
          period
        });

        slotsFound++;
      }

      daysAhead++;
    }

    return slots;
  }

  /**
   * Detecta se lead confirmou horário
   */
  detectTimeConfirmation(message, historyTexts) {
    //  NULL-SAFE: Validar inputs
    if (!message || typeof message !== 'string') {
      console.warn(` [SCHEDULER] Invalid message in detectTimeConfirmation`);
      return { confirmed: false, error: 'invalid_message' };
    }

    const lowerMsg = message.toLowerCase();

    // Padrões de confirmação
    const confirmPatterns = [
      /\b(sim|confirmo|confirmado|pode ser|perfeito|ótimo|beleza|top)\b/i,
      /\b(terça|terca|segunda|quarta|quinta|sexta)\b/i,
      /\b(10h|15h|14h|16h|manhã|tarde)\b/i,
      /\b(esse|esse horário|esse dia|essa data)\b/i
    ];

    const hasConfirmation = confirmPatterns.some(p => p.test(lowerMsg));

    if (!hasConfirmation) {
      return { confirmed: false };
    }

    // Extrair horário mencionado (buscar na última mensagem do agente)
    const lastAgentMessage = historyTexts[historyTexts.length - 1] || '';

    // Tentar extrair data e hora do histórico
    const timeSlots = this.getAvailableTimeSlots();

    //  NULL-SAFE: Validar timeSlots antes de usar
    if (!timeSlots || !Array.isArray(timeSlots) || timeSlots.length === 0) {
      console.warn(` [SCHEDULER] No valid timeSlots in detectTimeConfirmation`);
      return { confirmed: false, error: 'no_slots' };
    }

    // Detectar qual slot foi escolhido
    let chosenSlot = null;

    // Verificar se mencionou "terça", "quinta", etc.
    for (const slot of timeSlots) {
      //  NULL-SAFE: Validar slot antes de acessar propriedades
      if (!slot || typeof slot !== 'object') {
        console.warn(` [SCHEDULER] Invalid slot object in timeSlots`);
        continue;
      }

      if (!slot.dayName) {
        console.warn(` [SCHEDULER] Slot missing dayName:`, slot);
        continue;
      }

      if (lowerMsg.includes(slot.dayName.toLowerCase())) {
        chosenSlot = slot;
        break;
      }
    }

    // Verificar se mencionou "10h", "15h", etc.
    if (!chosenSlot) {
      for (const slot of timeSlots) {
        //  NULL-SAFE: Validar slot antes de acessar propriedades
        if (!slot || typeof slot !== 'object' || !slot.period) {
          continue;
        }

        if (lowerMsg.includes(slot.period.toLowerCase())) {
          chosenSlot = slot;
          break;
        }
      }
    }

    // Se mencionou "primeiro", "primeira opção", etc.
    if (!chosenSlot && /\b(primeiro|primeira|1)/i.test(lowerMsg)) {
      //  NULL-SAFE: Validar primeiro slot
      if (timeSlots[0] && typeof timeSlots[0] === 'object') {
        chosenSlot = timeSlots[0];
      }
    }

    // Se mencionou "segundo", "segunda opção", etc.
    if (!chosenSlot && /\b(segundo|segunda|2)/i.test(lowerMsg)) {
      //  NULL-SAFE: Validar segundo slot
      if (timeSlots.length > 1 && timeSlots[1] && typeof timeSlots[1] === 'object') {
        chosenSlot = timeSlots[1];
      }
    }

    // Padrão: assumir primeiro horário se confirmou mas não especificou
    if (!chosenSlot && hasConfirmation) {
      //  NULL-SAFE: Validar primeiro slot
      if (timeSlots[0] && typeof timeSlots[0] === 'object') {
        chosenSlot = timeSlots[0];
      }
    }

    //  NULL-SAFE: Validar chosen slot tem campos obrigatórios
    if (chosenSlot && chosenSlot.date && chosenSlot.time) {
      return {
        confirmed: true,
        date: chosenSlot.date,
        time: chosenSlot.time,
        label: chosenSlot.label || `${chosenSlot.date} ${chosenSlot.time}`
      };
    }

    return { confirmed: false };
  }

  /**
   * Negocia horário alternativo com GPT
   */
  async negotiateTimeSlot(message, historyTexts, leadState) {
    console.log(` [SCHEDULER] Negociando horário...`);

    const slots = this.getAvailableTimeSlots();

    const prompt = `Você é LEADLY, agente de agendamento da Digital Boost.

O cliente está negociando horário para reunião de diagnóstico de Growth.

HORÁRIOS DISPONÍVEIS:
• ${slots[0].label}
• ${slots[1].label}

MENSAGEM DO CLIENTE: "${message}"

 SUA TAREFA:
1. Se o cliente sugeriu outro horário, aceite com flexibilidade: "Combinado! [horário sugerido] funciona sim. Vou confirmar e te mando o convite."
2. Se o cliente pediu mais opções, ofereça 2 novos horários próximos
3. Se o cliente não está disponível, pergunte: "Qual dia e horário funcionam melhor pra você?"

REGRAS:
- Máximo 2 linhas
- Tom casual e flexível
- Não usar emojis excessivos
- Sempre oferecer solução

Responda APENAS a mensagem, sem explicações.`;

    try {
      const response = await openaiClient.createChatCompletion([
        { role: 'system', content: 'Você é especialista em agendamento consultivo.' },
        { role: 'user', content: prompt }
      ], {
        temperature: 0.3,
        max_tokens: 150
      });

      const negotiationMessage = response.choices[0].message.content.trim();

      return {
        message: negotiationMessage,
        metadata: { negotiating: true }
      };

    } catch (error) {
      console.error(` [SCHEDULER] Erro ao negociar:`, error);
      return {
        //  Sem "Entendi" (palavra proibida) - usa reconhecimento permitido
        message: `Faz sentido. Qual dia e horário funcionam melhor pra você? Posso encaixar na agenda.`,
        metadata: { negotiating: true, fallback: true }
      };
    }
  }

  /**
   * Cria evento no Google Calendar
   */
  async createCalendarEvent(leadState, confirmation, leadPhone) {
    console.log(` [SCHEDULER] Criando evento no Google Calendar...`);

    try {
      // Extrair informações do lead
      const leadName = leadState.companyProfile?.nome || leadState.metadata?.contactProfileName || leadPhone;
      const leadCompany = leadState.companyProfile?.empresa || '';

      //  CANONICAL: USAR EMAIL COLETADO (leadState.scheduler.leadEmail)
      // Email foi coletado no estágio 'collecting_email' e salvo no leadState
      const leadEmail = leadState.scheduler?.leadEmail || null;

      console.log(` [SCHEDULER] Email do lead: ${leadEmail || 'ERRO: Email não coletado!'}`);
      console.log(` [SCHEDULER] Nome do lead: ${leadName}`);
      console.log(` [SCHEDULER] Empresa do lead: ${leadCompany}`);

      //  VALIDAÇÃO: Email DEVE existir neste ponto
      if (!leadEmail) {
        throw new Error('Email não foi coletado antes de criar evento. Estado inconsistente.');
      }

      // Montar título da reunião com nome e empresa
      let meetingTitle = 'Reunião Estratégica - ';

      if (leadName && leadCompany) {
        meetingTitle += `${leadName} (${leadCompany})`;
      } else if (leadName) {
        meetingTitle += leadName;
      } else if (leadCompany) {
        meetingTitle += leadCompany;
      } else {
        meetingTitle += `${leadPhone} (${this.getPainTypeLabel(this._getPainType(leadState))})`;
      }

      // Preparar dados do evento
      const eventData = {
        title: meetingTitle,
        date: confirmation.date, // YYYY-MM-DD
        time: confirmation.time, // HH:mm
        duration: 30, // minutos
        location: 'Online - Google Meet',
        attendees: [leadEmail], // Email sempre presente aqui
        description: this.generateMeetingNotes(leadState), //  FIX: usar 'description' ao invés de 'notes'
        meet: 'google',
        timezone: 'America/Fortaleza'
      };

      console.log(` [SCHEDULER] Dados do evento:`, JSON.stringify(eventData, null, 2));

      // Criar evento via Google Calendar (calendar_enhanced.js)
      const result = await createEvent(eventData);

      console.log(` [SCHEDULER] Evento criado: ${result.eventId}`);
      console.log(` [SCHEDULER] Link: ${result.eventLink}`);
      console.log(` [SCHEDULER] Meet: ${result.meetLink}`);

      return {
        success: result.success,
        eventId: result.eventId,
        htmlLink: result.eventLink,
        meetLink: result.meetLink
      };

    } catch (error) {
      console.error(` [SCHEDULER] Erro ao criar evento:`, error);

      // Se erro for de autenticação, orientar usuário
      if (error.message.includes('TOKEN_MISSING')) {
        console.error(` [SCHEDULER] Token do Google não encontrado. Usuário precisa autorizar em /auth/google`);
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Gera notas da reunião baseado no BANT
   *  v4.0 - SOLAR: Diagnóstico do Canal Digital
   */
  generateMeetingNotes(leadState) {
    //  CANONICAL: Use consultativeEngine slots and companyProfile
    const solarBant = leadState.consultativeEngine || {};
    const companyProfile = leadState.companyProfile || {};
    const qualificationScore = leadState.qualification?.score || 0;

    let notes = ` DIAGNÓSTICO DO CANAL DIGITAL - DIGITAL BOOST\n`;
    notes += ` Lead qualificado via LEADLY AI Agent\n`;
    notes += ` Foco: Canal de Orçamento para Integradora Solar\n\n`;

    // ===== RESUMO EXECUTIVO =====
    notes += ` RESUMO EXECUTIVO\n`;
    notes += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    if (companyProfile.nome) notes += ` Contato: ${companyProfile.nome}\n`;
    if (companyProfile.empresa) notes += ` Integradora: ${companyProfile.empresa}\n`;
    notes += ` WhatsApp: ${leadState.phoneNumber || 'Não informado'}\n`;
    notes += ` Score de Qualificação: ${qualificationScore}%\n`;
    notes += `\n`;

    // ===== SOLAR-SITE BANT =====
    notes += ` SOLAR-SITE BANT (Qualificação)\n`;
    notes += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // Extract data from consultativeEngine slots
    const slots = solarBant.slots || {};

    // NEED - Presença Digital
    notes += ` SITUAÇÃO DIGITAL ATUAL:\n`;
    if (slots.need_presenca_digital) notes += `  • Presença Digital: ${slots.need_presenca_digital}\n`;
    if (slots.need_caminho_orcamento) notes += `  • Como Cliente Chega: ${slots.need_caminho_orcamento}\n`;
    if (slots.need_regiao) notes += `  • Região Atendida: ${slots.need_regiao}\n`;
    if (slots.need_volume) notes += `  • Volume/Mês: ${slots.need_volume}\n`;
    if (slots.need_ticket) notes += `  • Ticket Médio: ${slots.need_ticket}\n`;
    if (slots.need_diferencial) notes += `  • Diferencial: ${slots.need_diferencial}\n`;
    notes += `\n`;

    // TIMING
    if (slots.timing_prazo) {
      notes += ` TIMING:\n`;
      notes += `  • Prazo: ${slots.timing_prazo}\n`;
      notes += `\n`;
    }

    // AUTHORITY
    if (slots.authority_decisor) {
      notes += ` DECISÃO:\n`;
      notes += `  • Decisor: ${slots.authority_decisor}\n`;
      notes += `\n`;
    }

    // BUDGET (proxy)
    if (slots.budget_escopo) {
      notes += ` ESCOPO:\n`;
      notes += `  • Tipo de Projeto: ${slots.budget_escopo}\n`;
      notes += `\n`;
    }

    // ===== OBJETIVOS DO DIAGNÓSTICO =====
    notes += ` OBJETIVOS DO DIAGNÓSTICO\n`;
    notes += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    notes += `   • Analisar presença digital atual\n`;
    notes += `   • Identificar gaps no caminho do orçamento\n`;
    notes += `   • Mostrar exemplos de sites de integradoras\n`;
    notes += `   • Propor estrutura de canal digital\n`;
    notes += `   • Apresentar escopo e investimento\n\n`;

    // ===== PREPARAÇÃO =====
    notes += ` PREPARAÇÃO\n`;
    notes += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    notes += `   • Buscar site/Instagram atual (se houver)\n`;
    notes += `   • Preparar exemplos de landing pages solares\n`;
    notes += `   • Verificar concorrência na região ${slots.need_regiao || 'informada'}\n`;
    notes += `   • Preparar proposta de escopo ${slots.budget_escopo || 'a definir'}\n\n`;

    // ===== PRÓXIMOS PASSOS =====
    notes += ` PRÓXIMOS PASSOS\n`;
    notes += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    notes += `   1⃣ Fazer diagnóstico visual do canal atual\n`;
    notes += `   2⃣ Mostrar caminho de implementação\n`;
    notes += `   3⃣ Apresentar proposta de escopo\n`;
    notes += `   4⃣ Alinhar prazo e investimento\n`;
    notes += `   5⃣ Enviar proposta formal\n\n`;

    notes += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    notes += ` Digital Boost - Canal Digital para Integradoras\n`;
    notes += ` Qualificação automatizada via LEADLY AI Agent`;

    return notes;
  }

  /**
   * Retorna objetivos específicos da reunião
   *  v4.0 - SOLAR: Objetivos únicos para diagnóstico de canal digital
   */
  getMeetingObjectives(painType, needData, budgetData) {
    //  SOLAR: Objetivos únicos para diagnóstico de canal digital
    return [
      'Analisar presença digital atual (site, Instagram, Google)',
      'Identificar gaps no caminho do orçamento',
      'Mostrar exemplos de landing pages para integradoras',
      'Propor estrutura de canal digital',
      'Apresentar escopo e faixa de investimento'
    ];
  }

  /**
   * Solicita email do lead
   *  v4.0 - SOLAR: Diagnóstico do Canal Digital
   */
  getEmailRequestMessage(painType) {
    //  SOLAR: Mensagem única para diagnóstico de canal digital
    // Sem palavras proibidas (sem "Perfeito!", "Show!", "Ótimo!", "Fechou!")
    return `Combinado! Pra enviar o convite do diagnóstico do canal digital pelo Google Calendar, preciso do seu email.

Qual email vocês usam?`;
  }

  /**
   * Detecta email na mensagem do lead
   */
  detectEmail(text) {
    //  REGEX ROBUSTO - Captura emails em qualquer posição do texto
    // Aceita formatos complexos: name.surname@domain.com, user+tag@example.co.uk, etc.
    const emailRegex = /\b[A-Za-z0-9][A-Za-z0-9._%+-]*@[A-Za-z0-9][A-Za-z0-9.-]*\.[A-Za-z]{2,}\b/gi;
    const matches = text.match(emailRegex);

    if (matches && matches.length > 0) {
      // Pegar o primeiro email encontrado
      const email = matches[0].toLowerCase().trim();

      //  VALIDAÇÃO ADICIONAL: Verificar formato básico
      // Deve ter pelo menos um caractere antes do @, domínio válido, e extensão válida
      const isValidFormat = /^[A-Za-z0-9][A-Za-z0-9._%+-]*@[A-Za-z0-9][A-Za-z0-9.-]*\.[A-Za-z]{2,}$/.test(email);

      if (isValidFormat) {
        console.log(` [SCHEDULER] Email válido detectado: ${email}`);
        return {
          found: true,
          email: email
        };
      } else {
        console.log(` [SCHEDULER] Email com formato inválido: ${email}`);
      }
    }

    console.log(` [SCHEDULER] Nenhum email detectado em: "${text}"`);
    return {
      found: false,
      email: null
    };
  }

  /**
   * Mensagem de confirmação após criar evento
   *  v4.0 - SOLAR: Diagnóstico do Canal Digital
   */
  getConfirmationMessage(eventResult, painType) {
    //  CORREÇÃO: Usar dateLabel (formato amigável) se disponível, senão usar date/time
    const dateTimeDisplay = eventResult.dateLabel || `${this.formatDateBR(eventResult.date)} às ${eventResult.time}`;

    //  SOLAR: Mensagem única para diagnóstico de canal digital
    return `Diagnóstico agendado para ${dateTimeDisplay}!

 Link: ${eventResult.meetLink}

Vou analisar o que vocês têm hoje e mostrar o que faria sentido pro canal de orçamentos.

Nos vemos lá!`;
  }

  /**
   * Formata data YYYY-MM-DD para formato brasileiro
   */
  formatDateBR(dateStr) {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}`;
  }

  /**
   * Formata data para YYYY-MM-DD
   */
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * HANDLERS DE REAGENDAMENTO GRANULAR
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * Handler para mudança de email
   */
  async handleEmailChange(leadState) {
    console.log(` [SCHEDULER] Iniciando mudança de email`);

    return {
      message: `Claro! Qual o novo email que você quer usar?\n\n Pode enviar no formato: seu@email.com`,
      metadata: { changingEmail: true },
      updateState: {
        scheduler: {
          ...leadState.scheduler,
          stage: 'updating_email'
        }
      }
    };
  }

  /**
   * Handler para mudança de horário (mantendo data)
   */
  async handleTimeChange(leadState) {
    console.log(` [SCHEDULER] Iniciando mudança de horário`);

    const currentDate = leadState.scheduler.selectedSlot?.date;

    if (!currentDate) {
      return {
        message: `Para mudar o horário, preciso saber qual dia você prefere. Pode me dizer?`,
        metadata: { error: 'no_current_date' }
      };
    }

    // Buscar horários disponíveis para o mesmo dia
    const availableTimes = this.getAvailableTimesForDate(currentDate);

    return {
      message: `Sem problemas! Para ${this.formatDateBR(currentDate)}, tenho disponível:\n• ${availableTimes[0]}\n• ${availableTimes[1]}\n\nQual prefere?`,
      metadata: { changingTime: true },
      updateState: {
        scheduler: {
          ...leadState.scheduler,
          stage: 'updating_time',
          availableTimes
        }
      }
    };
  }

  /**
   * Handler para mudança de data (mantendo horário)
   */
  async handleDateChange(leadState) {
    console.log(` [SCHEDULER] Iniciando mudança de data`);

    const currentTime = leadState.scheduler.selectedSlot?.time;

    if (!currentTime) {
      return {
        message: `Para mudar a data, qual horário você prefere manter?`,
        metadata: { error: 'no_current_time' }
      };
    }

    // Buscar datas disponíveis para o mesmo horário
    const availableDates = this.getAvailableDatesForTime(currentTime);

    return {
      message: `Beleza! Para ${currentTime}, posso encaixar:\n• ${availableDates[0].label}\n• ${availableDates[1].label}\n\nQual funciona melhor?`,
      metadata: { changingDate: true },
      updateState: {
        scheduler: {
          ...leadState.scheduler,
          stage: 'updating_date',
          availableDates
        }
      }
    };
  }

  /**
   * Handler para reagendamento completo
   */
  async handleFullReschedule(leadState) {
    console.log(` [SCHEDULER] Iniciando reagendamento completo`);

    const newSlots = this.getAvailableTimeSlots();

    return {
      message: `Sem problemas! Vamos remarcar.\n\nQual horário funciona melhor pra você:\n• ${newSlots[0].label}\n• ${newSlots[1].label}?`,
      metadata: { rescheduling: true },
      updateState: {
        scheduler: {
          stage: 'proposing_times',
          leadEmail: leadState.scheduler.leadEmail, // Keep email
          proposedSlots: newSlots,
          selectedSlot: null,
          meetingData: {
            eventId: null,
            meetLink: null,
            confirmedAt: null
          }
        }
      }
    };
  }

  /**
   * Busca horários disponíveis para uma data específica
   */
  getAvailableTimesForDate(date) {
    // Horários padrão: manhã (10h) e tarde (15h)
    return ['10:00', '15:00'];
  }

  /**
   * Busca datas disponíveis para um horário específico
   */
  getAvailableDatesForTime(time) {
    const now = new Date();
    const dates = [];
    let daysAhead = 1;
    let found = 0;

    while (found < 2 && daysAhead < 10) {
      const date = new Date(now);
      date.setDate(date.getDate() + daysAhead);

      // Pular fins de semana
      if (date.getDay() !== 0 && date.getDay() !== 6) {
        const dayName = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][date.getDay()];
        const dayMonth = `${date.getDate()}/${date.getMonth() + 1}`;

        dates.push({
          date: this.formatDate(date),
          time: time,
          label: `${dayName} (${dayMonth})`,
          dayName,
          dayMonth
        });

        found++;
      }

      daysAhead++;
    }

    return dates;
  }

  /**
   * Retorna label do tipo de gargalo
   *  v4.0 - SOLAR: Label único
   */
  getPainTypeLabel(painType) {
    //  SOLAR: Label único para canal digital
    return 'Canal Digital de Orçamentos para Integradora Solar';
  }
}

export default SchedulerAgent;
