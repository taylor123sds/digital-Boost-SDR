// specialist_agent.js
// AGENTE 2: Specialist Agent - Qualificação Consultiva Inteligente
//
// RESPONSABILIDADES:
// 1. Receber lead do SDR Agent (após confirmar humano + perfil coletado)
// 2. Conduzir conversa consultiva para qualificação BANT
// 3. Adaptar tom baseado no arquétipo detectado
// 4. Passar bastão para Scheduler Agent quando qualificado
//
// USA: DynamicConsultativeEngine v2 (Planner + Writer)
// ARQUITETURA:
// - Planner: decide O QUE perguntar (JSON rígido)
// - Writer: decide COMO falar (100% livre)
// - Checker: valida antes de enviar

import { DynamicConsultativeEngine } from '../core/DynamicConsultativeEngine.js';
import { getIntelligenceOrchestrator } from '../intelligence/IntelligenceOrchestrator.js';
import { detectShowPlansIntent } from '../utils/intent_detectors.js';
import { formatPlansPresentation } from '../utils/plan_presenter.js';
import { getMediaSender } from '../messaging/MediaSender.js';
//  FIX: Bot Detection também no Specialist
import simpleBotDetector from '../security/SimpleBotDetector.js';
import humanVerificationStore from '../utils/human_verification_store.js';
import { removeBotFromSheets } from '../utils/sheetsManager.js';
//  NEW: Sistema INTELIGENTE de entendimento usando GPT
import messageUnderstanding from '../intelligence/MessageUnderstanding.js';

export class SpecialistAgent {
  constructor() {
    this.hub = null;
    this.name = 'specialist';
    this.engineByContact = new Map(); // ConsultativeEngine por contato
    this.engineLastAccess = new Map(); //  FIX #14: Timestamp de último acesso
    this.intelligence = getIntelligenceOrchestrator();
    this.mediaSender = getMediaSender();

    //  FIX #14: Cleanup periódico de cache stale (a cada 5 minutos)
    this._cacheCleanupInterval = setInterval(() => {
      this._cleanupStaleCache();
    }, 5 * 60 * 1000);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  FIX #14: GERENCIAMENTO DE CACHE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Limpa engines que não foram acessados em mais de 30 minutos
   * Isso força a restauração do DB na próxima mensagem, mantendo sincronizado
   */
  _cleanupStaleCache() {
    const STALE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutos
    const now = Date.now();
    let cleaned = 0;

    for (const [contactId, lastAccess] of this.engineLastAccess.entries()) {
      if ((now - lastAccess) > STALE_THRESHOLD_MS) {
        this.engineByContact.delete(contactId);
        this.engineLastAccess.delete(contactId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(` [SPECIALIST] Cache cleanup: ${cleaned} engines removidos (stale > 30min)`);
    }
  }

  /**
   * Marca engine como acessado (para tracking de cache)
   */
  _markEngineAccess(contactId) {
    this.engineLastAccess.set(contactId, Date.now());
  }

  /**
   * Obtém estatísticas do cache
   */
  getCacheStats() {
    const now = Date.now();
    return {
      totalEngines: this.engineByContact.size,
      engines: Array.from(this.engineLastAccess.entries()).map(([id, lastAccess]) => ({
        contact: id.substring(0, 8) + '...',
        lastAccess: Math.round((now - lastAccess) / 1000) + 's ago'
      }))
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDOFF DO SDR - Inicialização do ConsultativeEngine
  // ═══════════════════════════════════════════════════════════════════════════

  async onHandoffReceived(leadPhone, leadState) {
    console.log(`\n [SPECIALIST] ═══════════════════════════════════════`);
    console.log(`    Recebendo handoff do SDR para ${leadPhone}`);

    // Extrair perfil da empresa do handoff
    let companyProfile = {};

    if (leadState.companyProfile) {
      companyProfile = leadState.companyProfile;
      console.log(`    Perfil recebido:`, JSON.stringify(companyProfile, null, 2));
    }

    //  FIX: Extrair contexto da cadência se vier de prospecção
    const contextFromSDR = leadState.handoffHistory?.[leadState.handoffHistory.length - 1]?.data?.contextFromSDR;
    const isFromCadence = contextFromSDR?.fromCadence || leadState.metadata?.wasProspected;
    const agentInstructions = contextFromSDR?.agentInstructions || leadState.metadata?.agentInstructions;

    if (isFromCadence) {
      console.log(`    Lead de CADÊNCIA detectado!`);
      console.log(`    Dia da cadência: ${contextFromSDR?.cadenceDay || leadState.metadata?.cadenceDay}`);
      if (agentInstructions) {
        console.log(`    Instruções especiais: ${agentInstructions.substring(0, 100)}...`);
      }
    }

    // Criar nova instância do DynamicConsultativeEngine v2
    const engine = new DynamicConsultativeEngine(leadPhone);
    this.engineByContact.set(leadPhone, engine);
    this._markEngineAccess(leadPhone); //  FIX #14: Track cache access

    // Configurar engine com dados do SDR
    if (Object.keys(companyProfile).length > 0) {
      engine.setLeadProfile(companyProfile);
      console.log(`    Perfil configurado no engine`);
    }

    //  FIX: Configurar contexto da cadência no engine se aplicável
    if (isFromCadence && agentInstructions) {
      engine.setCadenceContext({
        isFromCadence: true,
        cadenceDay: contextFromSDR?.cadenceDay || leadState.metadata?.cadenceDay,
        agentInstructions: agentInstructions,
        empresa: companyProfile.empresa || leadState.metadata?.empresaProspectada
      });
      console.log(`    Contexto de cadência configurado no engine`);
    }

    //  CANONICAL: Arquétipo APENAS em metadata.archetype
    const archetype = leadState.metadata?.archetype || 'default';
    engine.setArchetype(archetype);
    console.log(`    Arquétipo: ${archetype}`);

    // IMPORTANTE: Não enviar mensagem de abertura
    // O SDR já fez a transição com pergunta sobre dificuldade
    // A próxima mensagem do lead será processada pelo process()

    return {
      message: null, // Sem mensagem - SDR já fez a transição
      updateState: {
        consultativeEngine: engine.getState(),
        companyProfile,
        metadata: {
          ...leadState.metadata,
          isFromCadence,
          agentInstructions
        }
      },
      metadata: {
        bantStage: 'need',
        fieldsPreFilled: Object.keys(companyProfile).filter(k => companyProfile[k]),
        isFromCadence
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCESSAMENTO DE MENSAGEM
  // ═══════════════════════════════════════════════════════════════════════════

  async process(message, context) {
    const { leadState } = context;

    // Extrair dados da mensagem
    const text = message.text || message.message || message.body || '';
    const fromContact = message.fromContact || message.from;

    console.log(`\n [SPECIALIST] ═══════════════════════════════════════`);
    console.log(`    Contato: ${fromContact}`);
    console.log(`    Mensagem: "${text.substring(0, 60)}..."`);

    // Validar texto
    if (!text || typeof text !== 'string') {
      console.error(`    Texto inválido:`, text);
      return {
        message: 'Desculpe, não consegui entender. Pode repetir?',
        success: false,
        error: 'invalid_text'
      };
    }

    try {
      // ═══════════════════════════════════════════════════════════════════
      // 0.  ANÁLISE INTELIGENTE DE CONTEXTO (GPT-Powered)
      // Entende o que a pessoa está querendo dizer ANTES de processar
      // ═══════════════════════════════════════════════════════════════════

      const understanding = await messageUnderstanding.understand(text, fromContact, {
        leadProfile: leadState.companyProfile,
        stage: 'specialist'
      });

      console.log(`    Entendimento: ${understanding.messageType}/${understanding.senderIntent}`);

      // CASO: Deve esperar (transferência, etc)
      if (understanding.shouldWait) {
        console.log(`    Aguardando - não responder`);
        return {
          message: null,
          silent: true,
          metadata: { waiting: true, reason: understanding.senderIntent }
        };
      }

      // CASO: Bot/Menu detectado - tratar adaptativamente
      if (understanding.isBot || understanding.isMenu) {
        console.log(`    Bot/Menu detectado - respondendo adaptativamente`);
        const adaptiveResponse = await messageUnderstanding.generateAdaptiveResponse(understanding);

        if (adaptiveResponse.message) {
          return {
            message: adaptiveResponse.message,
            metadata: { adaptiveResponse: true, action: adaptiveResponse.action }
          };
        }
      }

      // CASO: Deve sair graciosamente
      if (understanding.shouldExit) {
        console.log(`    Encerrando graciosamente`);
        return {
          message: understanding.suggestedResponse || 'Entendi! Se precisar de algo, estou por aqui. Sucesso!',
          updateState: {
            metadata: {
              ...leadState.metadata,
              optedOut: true,
              optOutAt: new Date().toISOString()
            }
          },
          metadata: { optOut: true }
        };
      }

      // CASO: Precisa clarificar
      if (understanding.shouldClarify) {
        console.log(`    Clarificando...`);
        return {
          message: understanding.suggestedResponse || 'Posso explicar melhor o que fazemos? Trabalhamos com marketing digital para empresas de energia solar.',
          metadata: { clarified: true }
        };
      }

      // Registrar contexto do entendimento para uso posterior
      if (understanding.emotionalState) {
        leadState.metadata = {
          ...leadState.metadata,
          lastEmotionalState: understanding.emotionalState,
          lastIntent: understanding.senderIntent
        };
      }

      // ═══════════════════════════════════════════════════════════════════
      // 1. ANÁLISE DE INTENÇÃO ESPECIAL (planos, preços, etc)
      // ═══════════════════════════════════════════════════════════════════

      // Detectar pedido para ver planos
      if (detectShowPlansIntent(text)) {
        console.log(`    Lead pediu para ver planos`);

        const plansMessage = formatPlansPresentation({
          painType: leadState.painType || 'dre',
          companySize: leadState.consultativeEngine?.bantData?.need?.funcionarios,
          monthlyRevenue: leadState.consultativeEngine?.bantData?.need?.receita_mensal
        });

        return {
          message: plansMessage,
          metadata: { showedPlans: true }
        };
      }

      // ═══════════════════════════════════════════════════════════════════
      // 2. OBTER/CRIAR ENGINE
      // ═══════════════════════════════════════════════════════════════════

      // ═══════════════════════════════════════════════════════════════════════
      //  FIX P0 #2: SEMPRE restaurar engine do DB, não confiar apenas no cache
      // PROBLEMA ANTERIOR: Se engine existia no Map, usava sem restaurar do DB
      // SOLUÇÃO: Sempre restaurar do DB para garantir consistência
      // ═══════════════════════════════════════════════════════════════════════

      let engine = this.engineByContact.get(fromContact);
      let engineWasRestored = false;

      if (!engine) {
        console.log(`    Engine não encontrado no cache, criando novo`);
        engine = new DynamicConsultativeEngine(fromContact);
        this.engineByContact.set(fromContact, engine);
      }

      //  FIX P1 #7: SEMPRE restaurar estado do DB (com validação)
      if (leadState.consultativeEngine) {
        try {
          // Validar que o estado tem campos mínimos necessários
          const savedState = leadState.consultativeEngine;
          if (savedState && typeof savedState === 'object') {
            engine.restoreState(savedState);
            engineWasRestored = true;
            console.log(`    Estado restaurado do banco (stage: ${savedState.stage || 'unknown'})`);
          } else {
            console.warn(`    Estado salvo inválido, usando engine limpo`);
          }
        } catch (restoreError) {
          console.error(`    Erro ao restaurar estado: ${restoreError.message}`);
          console.log(`    Criando engine limpo como fallback`);
          // Criar novo engine limpo em caso de erro
          engine = new DynamicConsultativeEngine(fromContact);
          this.engineByContact.set(fromContact, engine);
        }
      }

      // Configurar perfil se disponível
      if (leadState.companyProfile) {
        engine.setLeadProfile(leadState.companyProfile);
      }

      // Configurar arquétipo (de metadata)
      if (leadState.metadata?.archetype) {
        engine.setArchetype(leadState.metadata.archetype);
      }

      //  FIX #14: Marcar acesso ao cache
      this._markEngineAccess(fromContact);

      // Log de debug
      console.log(`    Engine status: cache=${!!this.engineByContact.get(fromContact)}, restored=${engineWasRestored}`);

      // ═══════════════════════════════════════════════════════════════════
      // 3. PROCESSAR COM CONSULTATIVE ENGINE
      // ═══════════════════════════════════════════════════════════════════

      const result = await engine.processMessage(text);

      console.log(`    Stage: ${result.stage}`);
      console.log(`    Progresso: ${result.progress?.percentComplete}%`);
      console.log(`    Pronto para agendar: ${result.readyForScheduling}`);

      // ═══════════════════════════════════════════════════════════════════
      // 4. HANDOFF PARA SCHEDULER (se pronto)
      // Nova lógica: estado FECHAMENTO ou AGENDAMENTO = handoff
      // ═══════════════════════════════════════════════════════════════════

      const shouldHandoff = result.isComplete || result.readyForScheduling;

      if (shouldHandoff) {
        console.log(`    Pronto para agendar - handoff para Scheduler`);
        console.log(`    Estado: ${result.stage} | Progresso: ${result.progress?.percentComplete}%`);

        const bantSummary = engine.getBANTSummary();

        // ═══════════════════════════════════════════════════════════════════════
        //  FIX P0 #4: Detectar e definir painType para o Scheduler
        // PROBLEMA ANTERIOR: painType nunca era definido, Scheduler usava fallback
        // SOLUÇÃO: Detectar painType baseado nos dados coletados durante BANT
        // ═══════════════════════════════════════════════════════════════════════
        const painType = this._detectPainType(bantSummary, leadState, result);
        console.log(`    Pain Type detectado: ${painType}`);

        return {
          message: result.message, // Enviar última resposta antes do handoff
          handoff: true,
          nextAgent: 'scheduler',
          handoffData: {
            consultativeEngine: engine.getState(),
            bantSummary: bantSummary,
            companyProfile: leadState.companyProfile || {},
            painType: painType, //  FIX P0 #4: Incluir painType no handoff
            metadata: {
              ...leadState.metadata,
              bantComplete: true,
              bantCompletedAt: new Date().toISOString(),
              qualificationScore: result.progress?.percentComplete,
              painType: painType //  Também salvar em metadata
            }
          },
          updateState: {
            consultativeEngine: engine.getState(),
            painType: painType //  Salvar no estado principal
          },
          metadata: {
            bantComplete: true,
            readyForScheduling: true,
            qualificationScore: result.progress?.percentComplete,
            painType: painType
          }
        };
      }

      // ═══════════════════════════════════════════════════════════════════
      // 5. CONTINUAR QUALIFICAÇÃO
      // ═══════════════════════════════════════════════════════════════════

      // Registrar interação para aprendizado (não-blocking)
      this.intelligence.recordInteraction(fromContact, text, result.message)
        .catch(err => console.error(' [SPECIALIST] Erro ao registrar:', err.message));

      return {
        message: result.message,
        updateState: {
          consultativeEngine: engine.getState()
        },
        metadata: {
          bantStage: result.stage,
          progress: result.progress,
          analysis: result.analysis
        }
      };

    } catch (error) {
      console.error(`    Erro:`, error.message);
      console.error(`   Stack:`, error.stack);

      return {
        message: 'Desculpe, tive um problema. Pode repetir?',
        metadata: {
          error: error.message,
          errorType: error.name
        }
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITÁRIOS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   *  FIX P0 #4: Detectar painType baseado nos dados coletados
   * O painType é usado pelo Scheduler para personalizar mensagens
   *
   * @param {Object} bantSummary - Resumo do BANT
   * @param {Object} leadState - Estado do lead
   * @param {Object} result - Resultado do processamento
   * @returns {string} Tipo de dor detectada
   */
  _detectPainType(bantSummary, leadState, result) {
    // Prioridade 1: Se já existe painType no estado
    if (leadState.painType) {
      return leadState.painType;
    }

    if (leadState.metadata?.painType) {
      return leadState.metadata.painType;
    }

    // Prioridade 2: Detectar baseado no setor da empresa
    const setor = leadState.companyProfile?.setor?.toLowerCase() || '';
    const sectorPainMap = {
      'saúde': 'pacientes',
      'clinica': 'pacientes',
      'médico': 'pacientes',
      'dentista': 'pacientes',
      'advocacia': 'clientes',
      'advogado': 'clientes',
      'contabilidade': 'clientes',
      'contador': 'clientes',
      'varejo': 'vendas',
      'loja': 'vendas',
      'ecommerce': 'vendas',
      'restaurante': 'clientes',
      'alimentação': 'clientes',
      'educação': 'alunos',
      'escola': 'alunos',
      'curso': 'alunos',
      'energia solar': 'leads',
      'solar': 'leads',
      'imobiliária': 'leads',
      'imóveis': 'leads'
    };

    for (const [keyword, pain] of Object.entries(sectorPainMap)) {
      if (setor.includes(keyword)) {
        return pain;
      }
    }

    // Prioridade 3: Detectar baseado nas dores mencionadas no BANT
    const needData = bantSummary?.need || {};
    const problema = needData.problema_principal?.toLowerCase() || '';
    const desafio = needData.desafio?.toLowerCase() || '';

    const painKeywords = {
      'leads': ['lead', 'captar', 'prospectar', 'cliente novo', 'vendas'],
      'vendas': ['vender', 'faturamento', 'receita', 'conversão'],
      'tempo': ['tempo', 'produtividade', 'eficiência', 'automatizar'],
      'custo': ['custo', 'economia', 'caro', 'barato', 'investimento'],
      'gestão': ['gerenciar', 'controle', 'organização', 'processo'],
      'marketing': ['marketing', 'divulgação', 'presença', 'digital']
    };

    for (const [painType, keywords] of Object.entries(painKeywords)) {
      const foundInProblema = keywords.some(kw => problema.includes(kw));
      const foundInDesafio = keywords.some(kw => desafio.includes(kw));

      if (foundInProblema || foundInDesafio) {
        return painType;
      }
    }

    // Fallback: tipo genérico baseado no produto (DRE = Digital Result Engine)
    return 'dre';
  }

  /**
   * Limpar engine de um contato (para testes ou reset)
   */
  clearEngine(contactId) {
    this.engineByContact.delete(contactId);
    this.engineLastAccess.delete(contactId); //  FIX #14: Limpar tracking também
  }

  /**
   * Obter engine de um contato (para debug)
   */
  getEngine(contactId) {
    return this.engineByContact.get(contactId);
  }

  /**
   *  FIX #14: Limpar todos os caches e parar cleanup interval
   * Útil para shutdown gracioso do servidor
   */
  destroy() {
    if (this._cacheCleanupInterval) {
      clearInterval(this._cacheCleanupInterval);
      this._cacheCleanupInterval = null;
    }
    this.engineByContact.clear();
    this.engineLastAccess.clear();
    console.log(` [SPECIALIST] Todos os recursos liberados`);
  }
}

export default SpecialistAgent;
