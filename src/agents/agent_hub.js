// agent_hub.js
// Hub de Comunicação Central - Orquestra os agentes com ROTEAMENTO INTELIGENTE

//  REFACTORED: Use new State Manager with canonical schema
import { getLeadState, saveLeadState } from '../utils/stateManager.js';
//  Canonical schema helpers (single source of truth)
import { createInitialState as createCanonicalState, LEAD_STATE_SCHEMA } from '../schemas/leadState.schema.js';
//  PHASE 2: Use new unified Sheets Manager
import { syncLeadToSheets } from '../utils/sheetsManager.js';
import { trackAgentMetric } from '../memory.js';
//  NOVO: Intent Router para roteamento inteligente
import { getIntentRouter, INTENT_TYPES, AGENT_MODES } from '../core/IntentRouter.js';
//  NOVO: Intelligence Orchestrator para arquétipos e scoring
import { getIntelligenceOrchestrator } from '../intelligence/IntelligenceOrchestrator.js';
//  FIX #6: Contact Lock para prevenir race conditions
import { acquireContactLock, releaseContactLock, withContactLock } from '../utils/contact_lock.js';
//  FIX #20: Phone normalization centralizado
import { normalizePhone } from '../utils/phone_normalizer.js';
//  FIX P0: Outcome Tracker para aprendizado real
import { getOutcomeTracker } from '../intelligence/ConversationOutcomeTracker.js';
//  NIVEL 5: AutoOptimizer para auto-otimizacao e deteccao de risco
import { getAutoOptimizer } from '../intelligence/AutoOptimizer.js';
//  NIVEL 5: PromptAdaptation para prompts dinamicos
import { getPromptAdaptationSystem } from '../intelligence/PromptAdaptationSystem.js';
//  FIX GAP-005: Lead Repository para atualizar pipeline durante handoff
import { leadRepository } from '../repositories/lead.repository.js';

/**
 * Agent Hub - Orquestrador Central com ROTEAMENTO INTELIGENTE
 *
 * MUDANÇA ARQUITETURAL:
 * - Antes: Fluxo linear SDR  Specialist  Scheduler
 * - Agora: Roteamento dinâmico baseado em INTENÇÃO
 *
 * MODOS DE OPERAÇÃO:
 * - SDR: Qualificação consultiva (BANT fluido)
 * - ATENDIMENTO: FAQ, preços, objeções
 * - SCHEDULER: Agendamento de reunião
 *
 * O lead pode estar em qualquer modo e transitar entre eles
 * baseado no que diz, não em um fluxo rígido
 */
export class AgentHub {
  constructor() {
    this.agents = {}; // Será populado com os agentes
    this.activeConversations = new Map(); // Rastreia agente ativo por contato
    this.intentRouter = getIntentRouter(); //  Classificador de intenções
    this.intelligence = getIntelligenceOrchestrator(); //  Sistema de inteligência
    this.outcomeTracker = getOutcomeTracker(); //  FIX P0: Rastreador de outcomes
    this.autoOptimizer = getAutoOptimizer(); //  NIVEL 5: Auto-otimizacao
    this.promptAdaptation = getPromptAdaptationSystem(); //  NIVEL 5: Prompts dinamicos
  }

  /**
   * Deep Merge Recursivo (P1-1)
   * Merge objetos preservando propriedades aninhadas
   * @param {Object} target - Objeto destino
   * @param {Object} source - Objeto fonte
   * @param {number} maxDepth - Profundidade máxima (proteção contra stack overflow)
   * @param {number} currentDepth - Profundidade atual
   * @param {Set} visited -  FIX CRÍTICO: Set para detectar ciclos
   * @returns {Object} Objeto merged
   */
  deepMerge(target, source, maxDepth = 3, currentDepth = 0, visited = new Set()) {
    //  PROTEÇÃO #1: Limitar profundidade para evitar stack overflow
    if (currentDepth >= maxDepth) {
      console.warn(` [MERGE] Max depth ${maxDepth} atingido, fazendo shallow merge`);
      return { ...target, ...source };
    }

    //  FIX CRÍTICO: Detectar referências circulares
    if (typeof source === 'object' && source !== null) {
      if (visited.has(source)) {
        console.warn(` [MERGE-CYCLE] Referência circular detectada em depth ${currentDepth}, ignorando`);
        return target; // Retorna target sem merge para evitar loop infinito
      }
      visited.add(source);
    }

    const result = { ...target };

    for (const [key, value] of Object.entries(source)) {
      if (value === null || value === undefined) {
        //  Permitir limpeza explícita de campos
        result[key] = value;
      } else if (Array.isArray(value)) {
        //  Arrays sempre substituem (não mergeiam)
        result[key] = value;
      } else if (typeof value === 'object') {
        //  FIX: Verificar ciclos antes de recursão
        if (typeof target[key] === 'object' && target[key] !== null && !Array.isArray(target[key])) {
          result[key] = this.deepMerge(target[key], value, maxDepth, currentDepth + 1, visited);
        } else {
          result[key] = value;
        }
      } else {
        //  Primitivos substituem
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Registra um agente no hub
   * @param {string} name - Nome do agente ('sdr', 'specialist', 'scheduler')
   * @param {Object} agent - Instância do agente
   */
  registerAgent(name, agent) {
    this.agents[name] = agent;
    agent.hub = this; // Injeta referência do hub no agente
    console.log(` [HUB] Agente '${name}' registrado`);
  }

  /**
   * Processa mensagem do lead
   *  NOVO: Usa IntentRouter para roteamento inteligente
   *  FIX #6: Usa lock por contato para evitar race conditions
   *  FIX #20: Normaliza phone na entrada
   */
  async processMessage(message, context = {}) {
    //  FIX #20: Normalizar telefone ANTES de qualquer operação
    const rawContact = message.fromContact;
    const fromContact = normalizePhone(rawContact) || rawContact;
    const text = message.text;

    // Atualizar message com telefone normalizado
    message.fromContact = fromContact;

    console.log(`\n [HUB] ===== NOVA MENSAGEM =====`);
    console.log(` Contato: ${fromContact}${rawContact !== fromContact ? ` (normalizado de ${rawContact})` : ''}`);
    console.log(` Mensagem: "${text}"`);

    // ═══════════════════════════════════════════════════════════════════════════
    //  FIX #6: Adquirir lock ANTES de qualquer operação de estado
    // PROBLEMA ANTERIOR: Múltiplos saves simultâneos causavam perda de dados
    // SOLUÇÃO: Lock por contato durante todo o processamento
    // ═══════════════════════════════════════════════════════════════════════════
    const lockResult = await acquireContactLock(fromContact, 'processMessage');

    if (!lockResult.acquired) {
      console.warn(` [HUB] Não foi possível adquirir lock para ${fromContact}: ${lockResult.error}`);
      return {
        success: false,
        error: 'lock_timeout',
        message: 'Estou processando sua mensagem anterior. Um momento, por favor.'
      };
    }

    const lockId = lockResult.lockId;

    try {
      // 1. Recuperar estado do lead (sempre canônico)
      let leadState = await this.getLeadState(fromContact);

      // 2. Check if conversation is already completed
      if (leadState.metadata?.conversationCompleted) {
        console.log(` [HUB] Conversa já concluída - respondendo com mensagem padrão`);
        return {
          message: 'Obrigado! Sua reunião já está agendada. Em breve entraremos em contato. Se precisar de algo urgente, entre em contato com nossa equipe.',
          updateState: null,
          handoff: null
        };
      }

      //  CORREÇÃO #1: Incrementar messageCount ANTES do processamento
      leadState.messageCount = (leadState.messageCount || 0) + 1;
      console.log(` [HUB] Message count: ${leadState.messageCount}`);

      // ═══════════════════════════════════════════════════════════════════════
      //  NOVO: ROTEAMENTO INTELIGENTE BASEADO EM INTENÇÃO
      // ═══════════════════════════════════════════════════════════════════════

      // 3. Classificar intenção da mensagem
      const currentMode = leadState.currentAgent || 'sdr';
      const intentResult = await this.intentRouter.classifyIntent(text, {
        currentMode,
        conversationHistory: leadState.conversationHistory || [],
        leadProfile: leadState.companyProfile || {}
      });

      console.log(` [HUB] Intenção: ${intentResult.intent} (${(intentResult.confidence * 100).toFixed(0)}%)`);
      console.log(` [HUB] Modo atual: ${currentMode}  Modo sugerido: ${intentResult.targetMode}`);

      // 4. Tratar intenções especiais ANTES de rotear
      if (intentResult.isSpecialIntent) {
        const specialResult = await this._handleSpecialIntent(intentResult, fromContact, leadState);
        if (specialResult) {
          return specialResult;
        }
      }

      // 5. Determinar agente de destino
      let targetAgent = this._mapModeToAgent(intentResult.targetMode, leadState);

      // ═══════════════════════════════════════════════════════════════════════
      //  FIX P1 #9: Melhorar lógica de switch do IntentRouter
      // PROBLEMA ANTERIOR: Com confidence < 0.7, ignorava completamente o targetAgent
      // SOLUÇÃO: Para intents de alto valor (scheduling, pricing), usar threshold menor
      // ═══════════════════════════════════════════════════════════════════════
      const highValueIntents = ['scheduling_request', 'pricing_question', 'meeting_request'];
      const isHighValueIntent = highValueIntents.includes(intentResult.intent);
      const confidenceThreshold = isHighValueIntent ? 0.5 : 0.7;

      // Se deve trocar de modo E tem confiança suficiente, fazer troca
      if (intentResult.shouldSwitch && intentResult.confidence >= confidenceThreshold) {
        console.log(` [HUB] Trocando modo: ${currentMode}  ${intentResult.targetMode} (threshold: ${confidenceThreshold})`);
        leadState.previousAgent = leadState.currentAgent;
        leadState.currentAgent = targetAgent;

        // Registrar mudança de contexto
        leadState.contextSwitches = leadState.contextSwitches || [];
        leadState.contextSwitches.push({
          from: currentMode,
          to: intentResult.targetMode,
          intent: intentResult.intent,
          confidence: intentResult.confidence,
          timestamp: new Date().toISOString()
        });

        //  FIX P1: Limitar tamanho do contextSwitches para evitar memory leak
        if (leadState.contextSwitches.length > 20) {
          leadState.contextSwitches = leadState.contextSwitches.slice(-20);
          console.log(` [HUB] contextSwitches truncado para ${fromContact} (limite: 20)`);
        }

        //  FIX P1: Detectar switches excessivos (possível erro de classificação)
        const recentSwitches = leadState.contextSwitches.filter(s => {
          const switchTime = new Date(s.timestamp).getTime();
          return Date.now() - switchTime < 5 * 60 * 1000; // últimos 5 minutos
        });

        if (recentSwitches.length >= 3) {
          console.warn(` [HUB] Muitos switches recentes (${recentSwitches.length}) para ${fromContact} - possível problema de classificação`);

          // Se houver mais de 3 switches em 5 min, reverter para agente anterior
          if (recentSwitches.length >= 4 && leadState.previousAgent) {
            console.log(` [HUB] Revertendo para agente anterior: ${leadState.previousAgent}`);
            targetAgent = leadState.previousAgent;
            leadState.currentAgent = targetAgent;
            leadState.contextSwitches.push({
              from: intentResult.targetMode,
              to: leadState.previousAgent,
              intent: 'auto_revert',
              confidence: 1.0,
              timestamp: new Date().toISOString(),
              reason: 'excessive_switches'
            });
          }
        }
      } else {
        //  FIX: Log quando NÃO troca para debug
        console.log(` [HUB] Mantendo modo atual: ${currentMode} (switch=${intentResult.shouldSwitch}, conf=${intentResult.confidence}, threshold=${confidenceThreshold})`);
        targetAgent = leadState.currentAgent || 'sdr';
      }

      console.log(` [HUB] Agente de destino: ${targetAgent}`);

      // 6. Verificar se agente existe
      if (!this.agents[targetAgent]) {
        console.warn(` [HUB] Agente '${targetAgent}' não registrado, usando SDR`);
        targetAgent = 'sdr';
      }

      // ═══════════════════════════════════════════════════════════════════════
      //  NIVEL 5: Deteccao de Risco em Tempo Real
      // ═══════════════════════════════════════════════════════════════════════
      let riskAnalysis = { atRisk: false };
      try {
        riskAnalysis = await this.autoOptimizer.detectRiskAndSuggest(
          fromContact,
          targetAgent,
          text,
          leadState
        );

        if (riskAnalysis.atRisk) {
          console.log(` [HUB] RISCO DETECTADO para ${fromContact}:`);
          console.log(`   Nivel: ${riskAnalysis.riskLevel}`);
          console.log(`   Sugestao: ${riskAnalysis.suggestion?.suggestion || 'N/A'}`);
        }
      } catch (riskError) {
        console.warn(` [HUB] Erro na deteccao de risco (nao-bloqueante):`, riskError.message);
      }

      // ═══════════════════════════════════════════════════════════════════════
      //  NIVEL 5: Buscar Prompt Otimizado do PromptAdaptation
      // ═══════════════════════════════════════════════════════════════════════
      let optimizedPrompt = null;
      try {
        const promptResult = await this.promptAdaptation.getBestPrompt(targetAgent, {
          contactId: fromContact,
          leadProfile: leadState.companyProfile || {},
          currentExperiment: null
        });

        if (promptResult.prompt) {
          optimizedPrompt = promptResult;
          console.log(` [HUB] Prompt otimizado: ${promptResult.version} (exp: ${promptResult.isExperiment})`);
        }
      } catch (promptError) {
        console.warn(` [HUB] Erro ao buscar prompt (nao-bloqueante):`, promptError.message);
      }

      // 7. Enriquecer contexto com intenção e arquétipo
      const enrichedContext = {
        ...context,
        leadState,
        intentResult,
        suggestedAction: this.intentRouter.suggestAction(intentResult),
        //  NIVEL 5: Adicionar dados de otimizacao
        riskAnalysis,
        optimizedPrompt
      };

      //  FIX: Injetar instruções específicas da cadência no contexto
      // Isso permite que o agente saiba que o lead veio de prospecção
      if (context.agentInstructions) {
        console.log(` [HUB] Injetando instruções da cadência no contexto`);
        enrichedContext.agentInstructions = context.agentInstructions;
        enrichedContext.isFromProspecting = context.wasProspected || context.isInCadence;
        enrichedContext.cadenceDay = context.cadenceDay;

        // Também salvar no leadState.metadata para persistência
        leadState.metadata = leadState.metadata || {};
        leadState.metadata.wasProspected = context.wasProspected;
        leadState.metadata.isInCadence = context.isInCadence;
        leadState.metadata.cadenceDay = context.cadenceDay;
        if (context.cadenceLead?.empresa) {
          leadState.metadata.empresaProspectada = context.cadenceLead.empresa;
          leadState.companyProfile = leadState.companyProfile || {};
          leadState.companyProfile.empresa = context.cadenceLead.empresa;
        }
      }

      // 8. Processar com agente de destino
      const agent = this.agents[targetAgent];
      const enrichedMessage = {
        ...message,
        metadata: context.metadata || message.metadata
      };

      const result = await agent.process(enrichedMessage, enrichedContext);

      //  TRACK METRIC: Agent processed message
      trackAgentMetric(targetAgent, fromContact, 'processed', true, {
        messageCount: leadState.messageCount,
        text: text ? text.substring(0, 50) : '',
        intent: intentResult.intent,
        confidence: intentResult.confidence
      });

      //  NOVO: Atualizar lead score baseado na intenção
      await this._updateLeadScore(fromContact, intentResult, leadState);

      // 9. Verificar se há handoff tradicional (SDR  Specialist, etc)
      if (result.handoff) {
        console.log(` [HUB] HANDOFF detectado: ${targetAgent}  ${result.nextAgent}`);

        //  TRACK METRIC: Agent handoff
        trackAgentMetric(targetAgent, fromContact, 'handoff', true, {
          nextAgent: result.nextAgent,
          handoffReason: result.handoffData?.reason || 'unknown'
        });

        leadState.lastMessage = text;
        leadState.lastUpdate = new Date().toISOString();
        await this.saveLeadState(fromContact, leadState);

        return await this.executeHandoff(fromContact, targetAgent, result);
      }

      // 10. Verificar se Atendimento quer retornar ao modo anterior
      if (result.shouldReturn && result.returnTo) {
        console.log(` [HUB] Atendimento retornando controle para: ${result.returnTo}`);
        leadState.currentAgent = this._mapModeToAgent(result.returnTo, leadState);
      }

      // 11. Atualizar estado do lead
      leadState.lastMessage = text;
      leadState.lastUpdate = new Date().toISOString();

      // Deep Merge Recursivo
      if (result.updateState) {
        leadState = this.deepMerge(leadState, result.updateState, 3);
        console.log(` [HUB] Estado merged com deep merge recursivo`);
      }

      //  TRACK METRIC: Agent success
      if (result.success !== false) {
        trackAgentMetric(targetAgent, fromContact, 'success', true, {
          messageCount: leadState.messageCount,
          intent: intentResult.intent
        });
      }

      await this.saveLeadState(fromContact, leadState);

      //  PHASE 2: Unified Sheets Sync in BACKGROUND (non-blocking)
      // Replaces both saveBANTData() and syncLeadWithGoogleSheets()
      setImmediate(async () => {
        try {
          console.log(` [HUB-SYNC] Starting unified Sheets sync for ${fromContact}...`);
          const syncResult = await syncLeadToSheets(leadState);

          if (syncResult.success) {
            console.log(` [HUB-SYNC] Lead ${fromContact} ${syncResult.action} in Google Sheets (row ${syncResult.row})`);
          } else {
            console.warn(` [HUB-SYNC] Sheets sync failed for ${fromContact}: ${syncResult.error}`);
          }
        } catch (sheetsError) {
          console.error(` [HUB-SYNC] Sheets sync error:`, sheetsError.message);
          // Don't fail the flow if Google Sheets has issues
        }
      });

      //  FIX P0: Rastrear atividade para FeedbackLoop (aprendizado)
      setImmediate(async () => {
        try {
          await this.outcomeTracker.trackActivity(fromContact, {
            userMessage: text,
            botMessage: result.message,
            currentStage: leadState.currentAgent,
            bantCompletionPercent: leadState.qualification?.score || 0,
            leadState
          });

          //  Registrar SUCESSO se reunião foi agendada
          if (result.metadata?.meetingScheduled || result.metadata?.conversationCompleted) {
            await this.outcomeTracker.recordSuccess(fromContact, {
              finalStage: 'meeting_scheduled',
              messageCount: leadState.messageCount,
              lastBotMessage: result.message,
              lastUserMessage: text,
              bantCompletionPercent: leadState.qualification?.score || 100,
              conversionScore: 100,
              reason: 'meeting_scheduled'
            });
            console.log(` [HUB] Sucesso registrado no FeedbackLoop para ${fromContact}`);

            //  NIVEL 5: Registrar outcome do prompt (para A/B testing)
            if (optimizedPrompt?.variationId) {
              await this.promptAdaptation.recordPromptOutcome(
                optimizedPrompt.variationId,
                fromContact,
                'success',
                {
                  conversionScore: 100,
                  stageCompleted: true
                }
              );
              console.log(` [HUB] Prompt outcome registrado: success`);
            }
          }
        } catch (trackError) {
          console.error(` [HUB] Erro ao rastrear outcome:`, trackError.message);
        }
      });

      return {
        success: true,
        agent: targetAgent,
        message: result.message,
        followUpMessage: result.followUpMessage,
        //  INTELLIGENT FOLLOW-UP: Include leadState for context saving
        leadState: leadState,
        metadata: {
          ...(result.metadata || {}),
          intent: intentResult.intent,
          intentConfidence: intentResult.confidence,
          modeSwitch: intentResult.shouldSwitch
        }
      };

    } catch (error) {
      console.error(` [HUB] Erro ao processar mensagem:`, error);
      return {
        success: false,
        error: error.message,
        message: 'Desculpe, tive um problema técnico. Pode repetir a mensagem?',
        leadState: null // Even on error, include field for consistency
      };
    } finally {
      //  FIX #6: SEMPRE liberar lock, mesmo em caso de erro
      releaseContactLock(fromContact, lockId);
    }
  }

  //  PHASE 2: Old syncLeadWithGoogleSheets() method REMOVED
  // Now using unified syncLeadToSheets() from sheetsManager.js
  // This eliminates duplication between saveBANTData() and updateFunnelLead()

  /**
   * Executa handoff (passagem de bastão) entre agentes
   *  FIX #6: Usa lock por contato durante handoff
   *  FIX #20: Normaliza phone na entrada
   */
  async executeHandoff(leadPhone, fromAgent, result) {
    //  FIX #20: Normalizar telefone
    const normalizedPhone = normalizePhone(leadPhone) || leadPhone;
    const { nextAgent, handoffData } = result;

    console.log(`\n [HUB] ===== EXECUTANDO HANDOFF =====`);
    console.log(` De: ${fromAgent}`);
    console.log(` Para: ${nextAgent}`);
    console.log(` Contato: ${normalizedPhone}`);
    console.log(` Dados:`, JSON.stringify(handoffData, null, 2));

    //  FIX #6: Lock durante handoff (operação crítica de estado)
    const lockResult = await acquireContactLock(normalizedPhone, 'executeHandoff');

    if (!lockResult.acquired) {
      console.warn(` [HUB] Não foi possível adquirir lock para handoff de ${normalizedPhone}`);
      return {
        success: false,
        handoffFailed: true,
        error: 'lock_timeout',
        message: 'Aguarde um momento, estou finalizando o processamento anterior.'
      };
    }

    const lockId = lockResult.lockId;

    try {
      // 1. Recuperar estado atual (usando telefone normalizado)
      let leadState = await this.getLeadState(normalizedPhone);

      // 2. Atualizar estado com dados do handoff
      leadState.currentAgent = nextAgent;
      leadState.previousAgent = fromAgent;
      leadState.metadata = leadState.metadata || {};
      leadState.metadata.handoffHistory = leadState.metadata.handoffHistory || [];
      leadState.metadata.handoffHistory.push({
        from: fromAgent,
        to: nextAgent,
        timestamp: new Date().toISOString(),
        data: handoffData
      });

      //  CORREÇÃO CRÍTICA: Deep merge de handoffData preservando metadata
      // O handoffData pode conter ...leadState do agente anterior, que tem currentAgent antigo
      const { currentAgent: _, previousAgent: __, ...safeHandoffData } = handoffData;

      //  DEBUG: Log do handoff data antes do merge
      console.log(` [HUB-DEBUG] handoffData.companyProfile:`, JSON.stringify(handoffData.companyProfile, null, 2));
      console.log(` [HUB-DEBUG] safeHandoffData.companyProfile:`, JSON.stringify(safeHandoffData.companyProfile, null, 2));

      // ═══════════════════════════════════════════════════════════════════════
      //  FIX P0 #5: Deep merge CORRETO preservando estruturas existentes
      // PROBLEMA ANTERIOR: delete metadata fazia com que campos fossem perdidos
      // SOLUÇÃO: Fazer deep merge de TODOS os campos sem deletar nada
      // ═══════════════════════════════════════════════════════════════════════

      // 1. Primeiro, fazer deep merge de metadata (campo mais crítico)
      if (safeHandoffData.metadata) {
        leadState.metadata = this.deepMerge(
          leadState.metadata || {},
          safeHandoffData.metadata,
          5 // Increase maxDepth for BANT data
        );
        // NÃO deletar - deixar o deepMerge principal lidar
      }

      // 2. Deep merge de companyProfile (segundo campo mais crítico)
      if (safeHandoffData.companyProfile) {
        leadState.companyProfile = this.deepMerge(
          leadState.companyProfile || {},
          safeHandoffData.companyProfile,
          5
        );
      }

      // 3. Deep merge de consultativeEngine (estado do SPIN)
      if (safeHandoffData.consultativeEngine) {
        leadState.consultativeEngine = this.deepMerge(
          leadState.consultativeEngine || {},
          safeHandoffData.consultativeEngine,
          5
        );
      }

      // 4. Deep merge de scheduler (estado do agendamento)
      if (safeHandoffData.scheduler) {
        leadState.scheduler = this.deepMerge(
          leadState.scheduler || {},
          safeHandoffData.scheduler,
          5
        );
      }

      // 5. Campos simples podem ser sobrescritos diretamente
      const simpleFields = ['bantSummary', 'qualificationScore', 'painType'];
      for (const field of simpleFields) {
        if (safeHandoffData[field] !== undefined) {
          leadState[field] = safeHandoffData[field];
        }
      }

      // 6. Log para debug
      console.log(` [HUB] Deep merge completo - campos preservados`);
      console.log(`    companyProfile: ${JSON.stringify(Object.keys(leadState.companyProfile || {}))}`);
      console.log(`    metadata: ${JSON.stringify(Object.keys(leadState.metadata || {}))}`);
      console.log(`    painType: ${leadState.painType || leadState.metadata?.painType || 'N/A'}`);

      //  DEBUG: Log do leadState após merge
      console.log(` [HUB-DEBUG] leadState.companyProfile após merge:`, JSON.stringify(leadState.companyProfile, null, 2));

      // 3. Salvar estado atualizado
      await this.saveLeadState(normalizedPhone, leadState);

      //  FIX GAP-005: Atualizar pipeline no SQLite quando faz handoff
      // Mapear agente para estágio do pipeline
      const agentToStageMap = {
        'sdr': 'stage_respondeu',      // SDR = Lead respondeu
        'specialist': 'stage_qualificado', // Specialist = Em qualificação BANT
        'scheduler': 'stage_triagem_agendada', // Scheduler = Agendando reunião
        'atendimento': 'stage_respondeu' // Atendimento = Lead respondeu
      };

      const newStage = agentToStageMap[nextAgent] || 'stage_respondeu';

      try {
        leadRepository.upsert(normalizedPhone, {
          stage_id: newStage,
          stage_entered_at: new Date().toISOString(),
          current_agent: nextAgent
        });
        console.log(` [HUB] Pipeline atualizado: ${fromAgent}  ${nextAgent} (stage: ${newStage})`);
      } catch (pipelineError) {
        console.error(` [HUB] Erro ao atualizar pipeline:`, pipelineError.message);
        // Não bloquear o handoff se a atualização do pipeline falhar
      }

      // 4. Processar primeira mensagem do novo agente
      const newAgent = this.agents[nextAgent];

      if (!newAgent) {
        throw new Error(`Agente de destino '${nextAgent}' não encontrado`);
      }

      // Chamar método de inicialização do novo agente (se existir)
      if (newAgent.onHandoffReceived) {
        const initResult = await newAgent.onHandoffReceived(normalizedPhone, leadState);

        //  CORREÇÃO CRÍTICA: Processar updateState do onHandoffReceived
        if (initResult.updateState) {
          for (const [key, value] of Object.entries(initResult.updateState)) {
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
              // Merge profundo para objetos aninhados
              leadState[key] = { ...(leadState[key] || {}), ...value };
            } else {
              // Substituição direta para primitivos e arrays
              leadState[key] = value;
            }
          }

          // Salvar estado atualizado com dados do onHandoffReceived
          await this.saveLeadState(normalizedPhone, leadState);
          console.log(` [HUB] Estado atualizado após onHandoffReceived:`, JSON.stringify(initResult.updateState, null, 2));
        }

        //  FIX CRÍTICO: Incluir mensagem do agente anterior para envio sequencial
        const currentAgentMessage = result.message || null;

        // ═══════════════════════════════════════════════════════════════════════
        //  FIX P1 #3: SEMPRE processar mensagem original em handoff não-silencioso
        // PROBLEMA ANTERIOR: Se initResult.message existia, ignorava a mensagem original
        // SOLUÇÃO: Processar a mensagem original SEMPRE que silent=false
        // ═══════════════════════════════════════════════════════════════════════
        if (!result.silent && handoffData?.contextFromSDR?.leadMessage) {
          console.log(` [HUB] Handoff não-silencioso - processando mensagem original com ${nextAgent}`);
          console.log(`    Mensagem original: "${handoffData.contextFromSDR.leadMessage.substring(0, 50)}..."`);
          console.log(`    Mensagem do onHandoffReceived: ${initResult.message ? 'SIM' : 'NÃO'}`);

          const originalMessage = {
            fromContact: normalizedPhone,
            text: handoffData.contextFromSDR.leadMessage,
            from: normalizedPhone
          };

          const context = {
            leadState,
            intentResult: { intent: 'statement', confidence: 0.5 },
            metadata: { handoffImmediate: true }
          };

          try {
            const processResult = await newAgent.process(originalMessage, context);

            // Atualizar estado se o novo agente retornou updateState
            if (processResult.updateState) {
              leadState = this.deepMerge(leadState, processResult.updateState, 5);
              await this.saveLeadState(normalizedPhone, leadState);
            }

            console.log(` [HUB] Mensagem processada pelo ${nextAgent} após handoff`);

            //  FIX P1 #3: Combinar mensagem do initResult com processResult se ambas existirem
            const finalMessage = processResult.message;
            const handoffInitMessage = initResult.message; // Mensagem de boas-vindas do novo agente

            return {
              success: true,
              handoffCompleted: true,
              agent: nextAgent,
              preHandoffMessage: currentAgentMessage,
              handoffInitMessage: handoffInitMessage, //  Mensagem de init (se houver)
              message: finalMessage, //  Resposta contextualizada do novo agente
              response: finalMessage, //  Alias para compatibilidade
              followUpMessage: processResult.followUpMessage,
              //  INTELLIGENT FOLLOW-UP: Include leadState for context saving
              leadState: leadState,
              metadata: {
                ...(processResult.metadata || {}),
                processedOriginalMessage: true
              }
            };
          } catch (processError) {
            console.error(` [HUB] Erro ao processar com ${nextAgent}:`, processError.message);
            // Fallback: retornar mensagem do initResult se existir
            if (initResult.message) {
              return {
                success: true,
                handoffCompleted: true,
                agent: nextAgent,
                preHandoffMessage: currentAgentMessage,
                message: initResult.message,
                leadState: leadState,
                metadata: { ...initResult.metadata, processError: processError.message }
              };
            }
          }
        }

        return {
          success: true,
          handoffCompleted: true,
          agent: nextAgent,
          preHandoffMessage: currentAgentMessage, //  Mensagem do agente ANTES do handoff
          message: initResult.message, // Mensagem do NOVO agente (handoff)
          followUpMessage: initResult.followUpMessage, //  FIX: Passar follow-up do handoff
          leadState: leadState,
          metadata: initResult.metadata || {}
        };
      }

      // Se não tem onHandoffReceived, retorna mensagem de transição
      const currentAgentMessage = result.message || null;

      return {
        success: true,
        handoffCompleted: true,
        agent: nextAgent,
        preHandoffMessage: currentAgentMessage, //  Mensagem do agente ANTES do handoff
        message: 'Vamos continuar!',
        leadState: leadState,
        metadata: { handoff: true }
      };

    } catch (error) {
      console.error(` [HUB] Erro no handoff:`, error);

      // Rollback: voltar para agente anterior
      console.log(` [HUB] Executando rollback para ${fromAgent}`);

      let rollbackState = await this.getLeadState(normalizedPhone);
      rollbackState.currentAgent = fromAgent;
      await this.saveLeadState(normalizedPhone, rollbackState);

      return {
        success: false,
        handoffFailed: true,
        message: 'Desculpe, vamos continuar nossa conversa.',
        error: error.message,
        leadState: rollbackState // Include for consistency
      };
    } finally {
      //  FIX #6: SEMPRE liberar lock após handoff
      releaseContactLock(normalizedPhone, lockId);
    }
  }

  /**
   * Recupera estado do lead
   */
  async getLeadState(leadPhone) {
    try {
      let state = await getLeadState(leadPhone);

      if (!state) {
        state = this.createInitialState(leadPhone);
      }

      // Reidratar dados extras guardados em metadata (compatibilidade legado)
      if (state?.metadata?.agentData) {
        const extras = state.metadata.agentData;
        state = { ...state, ...extras };
      }

      // Garantir estrutura canônica mínima
      if (!state.phoneNumber) {
        state.phoneNumber = leadPhone;
      }
      if (!state.metadata) {
        state.metadata = {};
      }
      if (!state.metadata.handoffHistory) {
        state.metadata.handoffHistory = [];
      }
      state.handoffHistory = state.metadata.handoffHistory;

      return state;
    } catch (error) {
      console.error(` [HUB] Erro ao recuperar estado:`, error);
      return null;
    }
  }

  /**
   * Salva estado do lead
   */
  async saveLeadState(leadPhone, state) {
    try {
      // Garantir metadados
      state.metadata = state.metadata || {};

      //  CORREÇÃO CRÍTICA #11: Limitar tamanho do handoffHistory para evitar memory leak
      if (state.metadata.handoffHistory && state.metadata.handoffHistory.length > 10) {
        state.metadata.handoffHistory = state.metadata.handoffHistory.slice(-10); // Manter apenas os últimos 10
        console.log(` [HUB] handoffHistory truncado para ${leadPhone} (limite: 10)`);
      }

      //  PERSISTÊNCIA CANÔNICA: Merge com schema padrão e embalar extras em metadata
      const base = JSON.parse(JSON.stringify(LEAD_STATE_SCHEMA));
      base.phoneNumber = normalizePhone(leadPhone) || leadPhone;

      const merged = this.deepMerge(base, { ...state, phoneNumber: base.phoneNumber }, 5);

      // Guardar dados extras (compatibilidade legacy) em metadata.agentData
      const extraFields = ['qualification', 'qualificationScore', 'painType', 'bantSummary', 'consultativeEngine'];
      merged.metadata.agentData = merged.metadata.agentData || {};
      for (const field of extraFields) {
        if (state[field] !== undefined) {
          merged.metadata.agentData[field] = state[field];
        }
      }

      await saveLeadState(merged);
      console.log(` [HUB] Estado salvo para ${leadPhone}`);
    } catch (error) {
      console.error(` [HUB] Erro ao salvar estado:`, error);
      throw error;
    }
  }

  /**
   * Cria estado inicial para lead novo (schema canônico)
   */
  createInitialState(leadPhone) {
    const state = createCanonicalState(normalizePhone(leadPhone) || leadPhone);
    state.metadata = state.metadata || {};
    state.metadata.handoffHistory = [];
    return state;
  }

  /**
   * Reseta conversa (útil para testes)
   */
  async resetConversation(leadPhone) {
    console.log(` [HUB] Resetando conversa para ${leadPhone}`);

    const initialState = this.createInitialState(leadPhone);
    await this.saveLeadState(leadPhone, initialState);

    return {
      success: true,
      message: 'Conversa resetada para o início (SDR Agent)'
    };
  }

  /**
   * Obtém estatísticas do hub
   */
  getStats() {
    return {
      registeredAgents: Object.keys(this.agents),
      activeConversations: this.activeConversations.size,
      agents: {
        sdr: this.agents.sdr ? 'ativo' : 'inativo',
        specialist: this.agents.specialist ? 'ativo' : 'inativo',
        scheduler: this.agents.scheduler ? 'ativo' : 'inativo'
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  NOVOS MÉTODOS: Roteamento Inteligente
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Mapeia modo de operação para agente concreto
   * @param {string} mode - Modo de operação (sdr, atendimento, scheduler)
   * @param {Object} leadState - Estado do lead
   * @returns {string} Nome do agente
   */
  _mapModeToAgent(mode, leadState) {
    const modeToAgent = {
      [AGENT_MODES.SDR]: this._getSdrAgentForState(leadState),
      [AGENT_MODES.ATENDIMENTO]: 'atendimento',
      [AGENT_MODES.SCHEDULER]: 'scheduler'
    };

    return modeToAgent[mode] || 'sdr';
  }

  /**
   * Determina qual agente SDR usar baseado no estado
   * - Se ainda não coletou perfil: sdr
   * - Se já está em qualificação: specialist
   */
  _getSdrAgentForState(leadState) {
    // Se já passou pela coleta inicial, usa specialist
    if (leadState.metadata?.sdr_initial_data_collected) {
      return 'specialist';
    }

    // Se já está no specialist (handoff feito), mantém
    if (leadState.currentAgent === 'specialist') {
      return 'specialist';
    }

    return 'sdr';
  }

  /**
   * Trata intenções especiais (opt-out, humano, etc)
   * @param {Object} intentResult - Resultado da classificação
   * @param {string} fromContact - Contato do lead
   * @param {Object} leadState - Estado do lead
   * @returns {Object|null} Resultado ou null para continuar fluxo normal
   */
  async _handleSpecialIntent(intentResult, fromContact, leadState) {
    console.log(` [HUB] Tratando intenção especial: ${intentResult.intent}`);

    switch (intentResult.intent) {
      case INTENT_TYPES.OPT_OUT:
        // Processar opt-out
        console.log(` [HUB] Lead ${fromContact} solicitou opt-out`);

        leadState.metadata = leadState.metadata || {};
        leadState.metadata.optedOut = true;
        leadState.metadata.optedOutAt = new Date().toISOString();
        await this.saveLeadState(fromContact, leadState);

        //  FIX P0: Registrar opt-out no FeedbackLoop para aprendizado
        setImmediate(async () => {
          try {
            await this.outcomeTracker.recordOptOut(fromContact, {
              finalStage: leadState.currentAgent,
              messageCount: leadState.messageCount,
              reason: 'user_requested_opt_out'
            });
            console.log(` [HUB] Opt-out registrado no FeedbackLoop para ${fromContact}`);
          } catch (error) {
            console.error(` [HUB] Erro ao registrar opt-out:`, error.message);
          }
        });

        return {
          success: true,
          agent: 'hub',
          message: `Entendido! Você foi removido da nossa lista de contatos.

Se mudar de ideia, é só mandar uma mensagem que retomamos nossa conversa.

Obrigado pelo seu tempo!`,
          metadata: {
            optedOut: true,
            intent: 'opt_out'
          }
        };

      case INTENT_TYPES.HUMAN_REQUEST:
        // Lead quer falar com humano - Taylor É o vendedor, então ele pode ajudar
        console.log(` [HUB] Lead ${fromContact} solicitou atendimento humano`);

        leadState.metadata = leadState.metadata || {};
        leadState.metadata.humanRequested = true;
        leadState.metadata.humanRequestedAt = new Date().toISOString();
        await this.saveLeadState(fromContact, leadState);

        return {
          success: true,
          agent: 'hub',
          message: `Claro! Eu sou o Taylor, da Digital Boost, e posso te ajudar aqui mesmo.

Se preferir falar por telefone, pode ligar: (84) 99679-1624
Horário: Seg-Sex 9h às 18h

Em que posso ajudar?`,
          metadata: {
            humanRequested: true,
            intent: 'human_request',
            needsHumanFollowUp: false // Taylor JÁ É o vendedor
          }
        };

      default:
        // Não é intenção especial que precisa tratamento imediato
        return null;
    }
  }

  /**
   * Atualiza lead score baseado na interação
   * @param {string} fromContact - Contato do lead
   * @param {Object} intentResult - Resultado da intenção
   * @param {Object} leadState - Estado do lead
   */
  async _updateLeadScore(fromContact, intentResult, leadState) {
    try {
      // Pontuação por tipo de intenção
      const intentScores = {
        [INTENT_TYPES.PRICING_QUESTION]: 5,   // Perguntou preço = interesse alto
        [INTENT_TYPES.MEETING_REQUEST]: 10,   // Quer agendar = muito qualificado
        [INTENT_TYPES.FEATURE_QUESTION]: 3,   // Quer detalhes = interesse médio
        [INTENT_TYPES.INTEREST]: 4,           // Demonstrou interesse
        [INTENT_TYPES.PROBLEM_SHARE]: 5,      // Compartilhou dor = engajado
        [INTENT_TYPES.OBJECTION]: 2,          // Objeção = ainda considerando
        [INTENT_TYPES.FAQ_QUESTION]: 2        // Curiosidade
      };

      const points = intentScores[intentResult.intent] || 1;

      // Registrar atividade no intelligence system
      await this.intelligence.recordLeadActivity(
        fromContact,
        intentResult.intent,
        `${intentResult.intent} (confidence: ${intentResult.confidence})`,
        points
      );

      console.log(` [HUB] Lead score atualizado: +${points} pontos`);

    } catch (error) {
      console.error(' [HUB] Erro ao atualizar lead score:', error.message);
      // Não falha o fluxo por erro de scoring
    }
  }

  /**
   * Retorna estatísticas do roteamento
   */
  getRoutingStats() {
    return {
      intentRouterCache: this.intentRouter?.classificationCache?.size || 0,
      registeredAgents: Object.keys(this.agents),
      availableModes: Object.values(AGENT_MODES)
    };
  }
}

//  FIX: Duplicate registration removed - use getAgentHub() from agent_hub_init.js instead
// All agent initialization is now centralized in agent_hub_init.js as singleton pattern
