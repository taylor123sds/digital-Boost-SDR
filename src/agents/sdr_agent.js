// sdr_agent.js
// AGENTE 1: SDR Agent - Coleta de Dados Iniciais (REFATORADO)

//  FIX: Use singleton OpenAI client for connection reuse
import openaiClient from '../core/openai_client.js';

//  SISTEMA UNIFICADO DE MENSAGENS
import { buildUnifiedFirstMessage } from '../messaging/UnifiedMessageBuilder.js';
import { getIntelligenceOrchestrator } from '../intelligence/IntelligenceOrchestrator.js';
import { getMediaSender } from '../messaging/MediaSender.js';
import { INTENT_TYPES } from '../core/IntentRouter.js';
import { ARCHETYPES } from '../tools/archetypes.js';
//  FIX AUDIT: SimpleBotDetector é a ÚNICA fonte de verdade para detecção de bots
// O pipeline (MessagePipeline.js) já usa SimpleBotDetector - NÃO duplicar aqui
import simpleBotDetector from '../security/SimpleBotDetector.js';
//  FIX: Sheets Manager para remover bots da planilha
import { removeBotFromSheets } from '../utils/sheetsManager.js';
//  REMOVIDO: humanVerificationStore - conflitava com SimpleBotDetector no pipeline
//  FIX: Context Analyzer para entender melhor as mensagens recebidas
import messageContextAnalyzer from '../utils/message_context_analyzer.js';
//  NEW: Sistema INTELIGENTE de entendimento usando GPT
import messageUnderstanding from '../intelligence/MessageUnderstanding.js';

//  STYLE GUIDE GLOBAL - ÚNICA FONTE DE VERDADE
import {
  BRAND,
  STYLE_RULES,
  OPT_OUT,
  FIRST_MESSAGE,
  getFallbackTone
} from '../config/brand-style-guide.js';

/**
 * SDR Agent - Agente de Prospecção (REFATORADO)
 *
 * RESPONSABILIDADES:
 * 1. Enviar mensagem de introdução personalizada
 * 2. Coletar dados iniciais (nome, empresa, setor)
 * 3. Fazer handoff para Specialist
 *
 * INTEGRAÇÃO COM INTENT ROUTER:
 * - Recebe intentResult do AgentHub
 * - Usa arquétipo para adaptar comunicação
 * - Fluxo mais natural e menos robótico
 */
export class SDRAgent {
  constructor() {
    this.hub = null;
    this.name = 'sdr';
    this.intelligence = getIntelligenceOrchestrator();
    this.mediaSender = getMediaSender();
  }

  /**
   * Processa mensagem do lead
   *  REFATORADO: Usa intentResult do AgentHub para fluxo mais inteligente
   *  FIX: Detecta auto-responders antes de processar
   */
  async process(message, context) {
    const { fromContact, text } = message;
    const { leadState, intentResult, metadata } = context;

    console.log(`\n [SDR] Processando mensagem de ${fromContact}`);
    console.log(` [SDR] Intenção: ${intentResult?.intent || 'não classificada'}`);

    try {
      // ═══════════════════════════════════════════════════════════════════════
      // 0.  FIX AUDIT: VERIFICAÇÃO DE BOT CENTRALIZADA NO PIPELINE
      // O MessagePipeline.js já usa SimpleBotDetector - NÃO duplicar verificação aqui
      // Se chegou aqui, o lead já passou pela verificação do pipeline
      // ═══════════════════════════════════════════════════════════════════════

      // 0.1 Verificar se está bloqueado pelo SimpleBotDetector (única fonte de verdade)
      if (simpleBotDetector.isBlocked(fromContact)) {
        console.log(` [SDR] ${fromContact} está BLOQUEADO pelo SimpleBotDetector`);
        return {
          message: null,
          silent: true,
          metadata: { blocked: true, skipProcessing: true }
        };
      }

      // ═══════════════════════════════════════════════════════════════════════
      // 0.2  SISTEMA INTELIGENTE DE ENTENDIMENTO (GPT-Powered)
      // Analisa QUALQUER mensagem e entende o contexto real
      //  FIX P0: SEMPRE analisar - não pular em conversas iniciais!
      //    O problema era que não detectava bots/menus nas primeiras msgs
      // ═══════════════════════════════════════════════════════════════════════
      //  FIX AUDIT: Usar SimpleBotDetector para verificar se já passou pela verificação
      const isAlreadyVerified = !simpleBotDetector.isBlocked(fromContact);
      const isEarlyConversation = (leadState.messageCount || 0) < 3;
      //  FIX P0: REMOVER condição !isEarlyConversation - SEMPRE analisar!
      const shouldAnalyzeIntelligently = text && text !== '/start' && !metadata?.isCampaign;

      console.log(` [SDR] MessageUnderstanding: ${shouldAnalyzeIntelligently ? 'ATIVO' : 'DESATIVADO'} (msg #${leadState.messageCount || 0}, early=${isEarlyConversation})`);

      if (isEarlyConversation) {
        console.log(` [SDR] Conversa inicial - usando MessageUnderstanding em MODO EARLY para detectar bots/menus`);
      }

      if (shouldAnalyzeIntelligently) {
        // Análise INTELIGENTE usando GPT
        const understanding = await messageUnderstanding.understand(text, fromContact, {
          leadProfile: leadState.companyProfile,
          isVerified: isAlreadyVerified
        });

        console.log(` [SDR] Entendimento: ${understanding.messageType}/${understanding.senderIntent}`);
        console.log(` [SDR] Ação sugerida: ${understanding.suggestedAction} (conf: ${understanding.confidence})`);

        // ═══════════════════════════════════════════════════════════════════
        // TRATAMENTO ADAPTATIVO BASEADO NO ENTENDIMENTO
        // ═══════════════════════════════════════════════════════════════════

        // CASO 1: DEVE ESPERAR (transferência, etc)
        if (understanding.shouldWait) {
          console.log(` [SDR] Entendimento indica AGUARDAR - não respondendo`);

          return {
            message: null,
            silent: true,
            updateState: {
              metadata: {
                ...leadState.metadata,
                waitingForHuman: true,
                waitReason: understanding.senderIntent,
                lastAnalysis: understanding.messageType
              }
            },
            metadata: { waiting: true, reason: understanding.senderIntent }
          };
        }

        // CASO 2: MENU DETECTADO - Responder de forma inteligente
        if (understanding.isMenu) {
          console.log(` [SDR] MENU detectado pelo GPT - respondendo adaptativamente`);

          const adaptiveResponse = await messageUnderstanding.generateAdaptiveResponse(understanding);

          return {
            message: adaptiveResponse.message || '1',
            updateState: {
              metadata: {
                ...leadState.metadata,
                receivedMenu: true,
                menuAnalysis: understanding.senderIntent,
                respondedToMenu: adaptiveResponse.message,
                lastMenuAt: new Date().toISOString()
              }
            },
            metadata: { menuDetected: true, intelligent: true }
          };
        }

        // CASO 3: BOT/AUTOMAÇÃO - Pedir humano de forma natural
        if (understanding.isBot && !understanding.isMenu) {
          console.log(` [SDR] BOT/AUTOMAÇÃO detectado - pedindo humano`);

          const adaptiveResponse = await messageUnderstanding.generateAdaptiveResponse(understanding);

          return {
            message: adaptiveResponse.message || 'Gostaria de falar com alguém da área comercial sobre marketing digital para energia solar.',
            updateState: {
              metadata: {
                ...leadState.metadata,
                botDetected: true,
                botType: understanding.messageType,
                botIntent: understanding.senderIntent,
                requestedHuman: true
              }
            },
            metadata: { botDetected: true, requestedHuman: true }
          };
        }

        // CASO 4: DEVE SAIR GRACIOSAMENTE
        if (understanding.shouldExit) {
          console.log(` [SDR] Entendimento indica ENCERRAR - saindo graciosamente`);

          return {
            message: understanding.suggestedResponse || 'Entendi, sem problemas! Se precisar de algo, estou por aqui. Sucesso!',
            updateState: {
              metadata: {
                ...leadState.metadata,
                optedOut: true,
                optOutAt: new Date().toISOString(),
                optOutReason: understanding.senderIntent
              }
            },
            metadata: { optOut: true, gracefulExit: true }
          };
        }

        // CASO 5: PRECISA CLARIFICAR
        if (understanding.shouldClarify) {
          console.log(` [SDR] Entendimento indica CLARIFICAR - esclarecendo`);

          return {
            message: understanding.suggestedResponse || 'Oi! Sou da Digital Boost, trabalhamos com marketing digital para empresas de energia solar. Queria entender como vocês captam clientes hoje. Posso explicar melhor?',
            updateState: {
              metadata: {
                ...leadState.metadata,
                clarificationSent: true,
                clarificationReason: understanding.senderIntent
              }
            },
            metadata: { clarified: true }
          };
        }

        // CASO 6: RESPOSTA SUGERIDA DISPONÍVEL (para cenários específicos)
        if (understanding.suggestedResponse && understanding.suggestedAction !== 'continue_normal_flow') {
          console.log(` [SDR] Usando resposta sugerida pelo GPT`);

          // Registrar resposta no contexto
          messageUnderstanding.recordAgentResponse(fromContact, understanding.suggestedResponse);

          return {
            message: understanding.suggestedResponse,
            updateState: {
              metadata: {
                ...leadState.metadata,
                lastIntelligentResponse: true,
                responseAction: understanding.suggestedAction
              }
            },
            metadata: { intelligentResponse: true, action: understanding.suggestedAction }
          };
        }

        // CASO 7: HUMANO NORMAL - Continuar fluxo (mas registrar contexto)
        if (understanding.isHuman) {
          console.log(` [SDR] Humano normal detectado - continuando fluxo`);
          // Não retornar aqui - deixar o fluxo normal continuar
          // Mas salvamos o entendimento para uso posterior
          leadState.metadata = {
            ...leadState.metadata,
            lastUnderstanding: {
              type: understanding.messageType,
              intent: understanding.senderIntent,
              emotion: understanding.emotionalState,
              confidence: understanding.confidence
            }
          };
        }
      }

      // ═══════════════════════════════════════════════════════════════════════
      //  FIX AUDIT: DETECÇÃO DE BOT REMOVIDA DO SDR
      // A detecção de bot (tempo de resposta, auto-response) é feita CENTRALMENTE
      // no MessagePipeline.js > SimpleBotDetector. Não duplicar aqui.
      // Se chegou ao SDR, o lead já passou pela verificação do pipeline.
      // ═══════════════════════════════════════════════════════════════════════

      // ═══════════════════════════════════════════════════════════════════════
      // 1. CAMPANHA: Detectar comando /start
      // ═══════════════════════════════════════════════════════════════════════
      const isCampaignStart = text === '/start' || (text === '' && metadata?.isCampaign);

      if (isCampaignStart) {
        console.log(` [SDR] Campanha detectada - enviando mensagem inicial`);

        // Detectar arquétipo para personalizar mensagem
        const archetypeData = await this.intelligence.detectArchetype(fromContact, {
          leadProfile: leadState.companyProfile || {},
          sector: leadState.sector
        });

        const firstMessage = await buildUnifiedFirstMessage(fromContact, {
          ...leadState,
          archetype: archetypeData.archetype,
          source: 'campaign' //  v4.0 - Indica que é campanha para usar mensagem correta
        });

        return {
          message: firstMessage,
          updateState: {
            metadata: {
              ...leadState.metadata,
              introductionSent: true,
              sdr_initial_data_stage: 'collecting_profile',
              campaignTriggered: true,
              campaignStartedAt: new Date().toISOString(),
              archetype: archetypeData.archetype //  FIX: Armazenar em metadata (campo persistido)
            }
          }
        };
      }

      // ═══════════════════════════════════════════════════════════════════════
      // 2. DADOS JÁ COLETADOS: Handoff direto
      // ═══════════════════════════════════════════════════════════════════════
      if (leadState.metadata?.sdr_initial_data_collected) {
        console.log(` [SDR] Dados já coletados - handoff para Specialist`);

        return {
          message: null,
          handoff: true,
          nextAgent: 'specialist',
          silent: true,
          handoffData: {
            bantStages: null,
            metadata: {
              ...leadState.metadata,
              lastInteractionAt: new Date().toISOString()
            }
          },
          metadata: { handoff: true, alreadyCollected: true }
        };
      }

      // ═══════════════════════════════════════════════════════════════════════
      // 3. PRIMEIRA INTERAÇÃO: Enviar introdução
      //  FIX: Leads de cadência NÃO recebem introdução (já receberam a mensagem D1)
      // ═══════════════════════════════════════════════════════════════════════
      const introductionSent = leadState.metadata?.introductionSent;
      const isFromProspecting = context.isFromProspecting || context.wasProspected || context.isInCadence;

      //  Se lead veio de cadência de prospecção, NÃO enviar intro novamente
      if (isFromProspecting && !introductionSent) {
        console.log(` [SDR] Lead de PROSPECÇÃO detectado - pulando intro, direto para qualificação`);
        console.log(`    Cadência dia: ${context.cadenceDay}`);
        console.log(`    Instruções: ${context.agentInstructions ? 'SIM' : 'NÃO'}`);

        // Marcar como intro enviada (foi enviada pela cadência)
        leadState.metadata = {
          ...leadState.metadata,
          introductionSent: true,
          introSentByCadence: true,
          cadenceDay: context.cadenceDay,
          wasProspected: true,
          introSkippedReason: 'cadence_prospecting'
        };

        // Se tem empresa do lead da cadência, salvar no perfil
        if (context.cadenceLead?.empresa) {
          leadState.companyProfile = {
            ...leadState.companyProfile,
            empresa: context.cadenceLead.empresa,
            source: 'cadence'
          };
          console.log(`    Empresa da cadência: ${context.cadenceLead.empresa}`);
        }

        // Fazer handoff direto para Specialist para continuar qualificação
        return {
          message: null,
          handoff: true,
          nextAgent: 'specialist',
          silent: false,
          handoffData: {
            bantStages: null,
            companyProfile: leadState.companyProfile,
            contextFromSDR: {
              leadMessage: text,
              fromCadence: true,
              cadenceDay: context.cadenceDay,
              agentInstructions: context.agentInstructions
            },
            metadata: {
              ...leadState.metadata,
              sdr_initial_data_collected: true,
              sdr_initial_data_stage: 'completed_from_cadence'
            }
          },
          metadata: {
            handoff: true,
            fromCadence: true,
            cadenceDay: context.cadenceDay
          }
        };
      }

      if (!introductionSent) {
        console.log(` [SDR] Primeira interação - enviando introdução`);

        // Detectar arquétipo pelo que o lead disse
        const archetypeData = await this.intelligence.detectArchetype(fromContact, {
          message: text,
          leadProfile: {},
          sector: null
        });

        // Gerar mensagem de introdução personalizada
        const firstMessage = await this._generateIntroduction(text, archetypeData, intentResult);

        return {
          message: firstMessage,
          updateState: {
            metadata: {
              ...leadState.metadata,
              introductionSent: true,
              introduction_sent_at: new Date().toISOString(),
              sdr_initial_data_stage: 'collecting_profile',
              firstMessageFromLead: text,
              archetype: archetypeData.archetype //  FIX: Armazenar em metadata (campo persistido)
            }
          },
          metadata: {
            firstInteraction: true,
            archetype: archetypeData.archetype
          }
        };
      }

      // ═══════════════════════════════════════════════════════════════════════
      // 4. RESPONDEU AO GANCHO: Fazer handoff para Specialist continuar
      // ═══════════════════════════════════════════════════════════════════════
      // O SDR NÃO fica coletando dados - só usa o gancho e passa para o Specialist
      // O Specialist usa o DynamicConsultativeEngine para qualificar

      if (introductionSent) {
        console.log(` [SDR] Lead respondeu ao gancho - handoff para Specialist`);
        console.log(` [SDR] Resposta: "${text.substring(0, 100)}..."`);

        // Extrair dados básicos se mencionou (mas não é obrigatório)
        const extractedProfile = await this._extractProfileData(text, leadState);

        // Detectar contexto da resposta para o Specialist
        const dorMencionada = this._detectarDorMencionada(text);

        // Registrar interação
        this.intelligence.recordInteraction(fromContact, text, null)
          .catch(err => console.error(' [SDR] Erro:', err.message));

        // HANDOFF DIRETO para Specialist - ele vai continuar a qualificação BANT
        return {
          message: null, // Specialist vai responder
          handoff: true,
          nextAgent: 'specialist',
          silent: false, // Specialist deve processar e responder
          handoffData: {
            bantStages: null,
            companyProfile: {
              ...extractedProfile,
              rawResponse: text,
              collectedAt: new Date().toISOString()
            },
            //  REMOVIDO: archetype aqui (duplicado) - usar APENAS metadata.archetype
            contextFromSDR: {
              leadMessage: text,
              dorDetectada: dorMencionada,
              ganchoUsado: 'invisibilidade_digital'
            },
            metadata: {
              ...leadState.metadata,
              sdr_initial_data_collected: true,
              sdr_initial_data_stage: 'completed',
              firstLeadResponse: text,
              archetype: leadState.metadata?.archetype || 'default' //  CANONICAL: único local
            }
          },
          metadata: {
            handoff: true,
            ganchoUsado: 'invisibilidade_digital',
            dorDetectada: dorMencionada?.tipo || null
          }
        };
      }

      // Fallback: não deveria chegar aqui
      console.warn(` [SDR] Estado inesperado`);
      return {
        message: null,
        silent: true,
        metadata: { unexpectedState: true }
      };

    } catch (error) {
      console.error(` [SDR] Erro:`, error);
      return {
        message: "Desculpe, tive um problema. Pode repetir?",
        metadata: { error: error.message }
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MÉTODOS AUXILIARES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Gera mensagem de introdução personalizada
   *  v11 - GANCHO DA INVISIBILIDADE DIGITAL
   *
   * ESTRATÉGIA DE VENDAS:
   * 1. Gancho: "Pesquisei e não encontrei vocês no Google"
   * 2. Pergunta consultiva sobre presença digital
   * 3. NÃO pedir nome/empresa (extrai automaticamente depois)
   * 4. Opt-out
   */
  async _generateIntroduction(leadMessage, archetypeData, intentResult) {
    const rawArchetype = archetypeData?.archetype || 'PESSOA_COMUM';
    const arch = archetypeData?.archetypeData || {};
    console.log(`    [SDR] Arquétipo para intro: ${rawArchetype}`);
    console.log(`    [SDR] Tom: ${arch.voiceStyle?.substring(0, 50) || 'padrão'}...`);

    try {
      //  FIX: Use singleton OpenAI client instead of creating new instance
      const openai = openaiClient.getClient();

      const prompt = `Você é o ${BRAND.agentName}, VENDEDOR da ${BRAND.name}.
Você vende canais digitais de orçamento para integradoras de energia solar.

═══════════════════════════════════════════════════════════════════════════════
 ESTRUTURA OBRIGATÓRIA DA PRIMEIRA MENSAGEM (5 ELEMENTOS)
═══════════════════════════════════════════════════════════════════════════════

1. INTRODUÇÃO: Quem você é, de onde fala (1 linha)
2. GANCHO + GATILHO: Pesquisei vocês + dado que gera interesse
3. PERMISSÃO: Pedir pra fazer perguntas rápidas
4. OPT-OUT: "${OPT_OUT.message}"

═══════════════════════════════════════════════════════════════════════════════
 SEU TOM: ${arch.name || 'Direto e consultivo'}
═══════════════════════════════════════════════════════════════════════════════
ESTILO: Vendedor, não terapeuta. Objetivo, não educado demais.

═══════════════════════════════════════════════════════════════════════════════
 PROIBIÇÕES ABSOLUTAS:
═══════════════════════════════════════════════════════════════════════════════
- NUNCA começar com: ${STYLE_RULES.forbiddenStarters.slice(0, 5).join(', ')}
- NUNCA fazer pergunta aberta sem contexto ("como posso ajudar?")
- NUNCA ser genérico ou educado demais
- NUNCA fazer mais de 1 pergunta

═══════════════════════════════════════════════════════════════════════════════
 EXEMPLO DE MENSAGEM IDEAL:
═══════════════════════════════════════════════════════════════════════════════

"Oi! Aqui é o Taylor, da Digital Boost.

Eu tava pesquisando integradoras de energia solar no Nordeste e vi que a empresa de vocês não aparece no Google. Isso é bem comum — mais de 80% das integradoras dependem só de indicação.

Posso fazer 2 perguntas rápidas pra entender como funciona a captação de orçamentos de vocês?

${OPT_OUT.message}"

═══════════════════════════════════════════════════════════════════════════════
 TAREFA: Escreva a mensagem de abertura seguindo esta estrutura
═══════════════════════════════════════════════════════════════════════════════

${leadMessage ? `O lead disse: "${leadMessage}" - adapte a saudação se fizer sentido.` : ''}

REGRAS RÍGIDAS:
- Máximo 4 parágrafos curtos
- Terminar PEDINDO PERMISSÃO para fazer perguntas (não com uma pergunta aberta)
- Tom de VENDEDOR que quer ajudar, não de terapeuta educado

Escreva APENAS a mensagem:`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.85,
        max_tokens: 400
      });

      const generatedMessage = completion.choices[0].message.content.trim();
      console.log(`    [SDR] Intro com gancho invisibilidade gerada (${generatedMessage.length} chars)`);
      return generatedMessage;

    } catch (error) {
      console.error(`    [SDR] Erro ao gerar intro:`, error.message);

      //  FALLBACK: Mensagem canônica do brand-style-guide
      console.log(`    [SDR] Usando FIRST_MESSAGE.canonical como fallback`);
      return FIRST_MESSAGE.canonical;
    }
  }

  /**
   * Extrai dados do perfil da resposta do lead
   */
  async _extractProfileData(text, leadState) {
    try {
      //  FIX: Use singleton OpenAI client instead of creating new instance
      const openai = openaiClient.getClient();

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Extraia as seguintes informações da mensagem do lead:
- nome: Nome da pessoa
- empresa: Nome da empresa
- setor: Setor/ramo de atuação
- cargo: Cargo/função (se mencionado)
- tamanho: Tamanho da empresa (se mencionado)

Retorne APENAS JSON válido:
{"nome": "...", "empresa": "...", "setor": "...", "cargo": null, "tamanho": null}

Use null para campos não encontrados. Não invente dados.`
          },
          { role: 'user', content: text }
        ],
        temperature: 0.3,
        max_tokens: 150,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(completion.choices[0].message.content);
      console.log(` [SDR] Perfil extraído:`, result);
      return result;

    } catch (error) {
      console.error(` [SDR] Erro na extração:`, error.message);
      return { rawResponse: text };
    }
  }

  /**
   * Constrói mensagem de transição para Specialist
   *  v12 - USA STYLE GUIDE GLOBAL + Fallback com arquétipo
   */
  async _buildTransitionMessage(profile, archetypeName = 'PESSOA_COMUM') {
    const nome = profile.nome || 'você';
    const empresa = profile.empresa;
    const setor = profile.setor;
    const rawResponse = profile.rawResponse || '';

    // Buscar dados do arquétipo
    const arch = ARCHETYPES[archetypeName] || ARCHETYPES.PESSOA_COMUM;
    console.log(`    [SDR] Transição com arquétipo: ${archetypeName}`);

    // Detectar se o lead já mencionou uma dor/objetivo
    const dorMencionada = this._detectarDorMencionada(rawResponse);

    try {
      //  FIX: Use singleton OpenAI client instead of creating new instance
      const openai = openaiClient.getClient();

      const prompt = `Você é a ${BRAND.agentName}, SDR da ${BRAND.name}. Acabou de receber os dados do lead e vai fazer a TRANSIÇÃO para a fase de qualificação.

═══════════════════════════════════════════════════════════════════════════════
 SEU ARQUÉTIPO DE COMUNICAÇÃO: ${arch.name || 'Pessoa Comum'}
═══════════════════════════════════════════════════════════════════════════════
MOTIVAÇÃO: ${arch.coreMotivation || 'Conectar-se genuinamente'}
VALORES: ${(arch.coreValues || ['praticidade', 'simplicidade']).join(', ')}
ESTILO DE VOZ: "${arch.voiceStyle || 'Olha, vou ser direto com você...'}"

CARACTERÍSTICAS DO SEU TOM:
${(arch.traits || ['Tom natural e acessível']).map(t => `- ${t}`).join('\n')}

═══════════════════════════════════════════════════════════════════════════════
 PROIBIÇÕES (NUNCA começar mensagem com):
${STYLE_RULES.forbiddenStarters.join(', ')}

 ALTERNATIVAS PERMITIDAS:
${STYLE_RULES.allowedAcknowledgments.join(', ')}
═══════════════════════════════════════════════════════════════════════════════

 DADOS DO LEAD:
Nome: ${nome}
Empresa: ${empresa || 'não informada'}
Setor: ${setor || 'não informado'}
${dorMencionada ? `Dor mencionada: ${dorMencionada.contextualizacao}` : 'Ainda não mencionou uma dor específica'}

 TAREFA: Escreva a mensagem de TRANSIÇÃO

A mensagem DEVE:
1. Cumprimentar pelo nome (se tiver)
2. Mostrar que registrou empresa/setor
3. ${dorMencionada ? 'Contextualizar a dor mencionada e aprofundar' : 'Perguntar qual o maior desafio/dor da empresa'}
4. Terminar com UMA pergunta apenas
5. MÁXIMO ${STYLE_RULES.maxLines} linhas curtas
6. Tom do arquétipo ${arch.name}

Escreva APENAS a mensagem.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 200
      });

      const generatedMessage = completion.choices[0].message.content.trim();
      console.log(`    [SDR] Transição personalizada (${generatedMessage.length} chars)`);
      return generatedMessage;

    } catch (error) {
      console.error(`    [SDR] Erro na transição:`, error.message);

      //  FALLBACK com arquétipo usando STYLE GUIDE
      const fallbackTone = getFallbackTone(archetypeName);
      console.log(`    [SDR] Usando fallback transição tom: ${fallbackTone.tone}`);
      return fallbackTone.transition(nome, empresa);
    }
  }

  /**
   * Detecta se o lead já mencionou uma dor/contexto na resposta
   *  v11 - SOLAR REBRAND - Contexto de integradoras de energia solar
   */
  _detectarDorMencionada(texto) {
    if (!texto) return null;

    const textoLower = texto.toLowerCase();

    // Mapeamento de palavras-chave para contextualizações SOLAR
    const doresMap = {
      // DEPENDÊNCIA DE INDICAÇÃO
      indicacao: {
        keywords: ['indicação', 'indicacao', 'indicaçao', 'indica', 'boca a boca', 'cliente indica'],
        contextualizacao: `Indicação funciona, mas não dá previsibilidade.

A gente cria canais digitais que captam orçamentos mesmo quando as indicações estão fracas.`,
        perguntaAprofundamento: `Tem mês que sobra procura e mês que falta?`
      },
      // SÓ USA INSTAGRAM
      instagram: {
        keywords: ['instagram', 'insta', 'rede social', 'redes sociais', 'só posto', 'stories'],
        contextualizacao: `Instagram é bom pra atenção, mas Google pega quem já quer contratar.

A gente cria landing pages focadas em conversão pra captar quem busca energia solar na região.`,
        perguntaAprofundamento: `Vocês têm site ou só o Instagram mesmo?`
      },
      // SITE FRACO / NÃO CONVERTE
      site_fraco: {
        keywords: ['site não funciona', 'site fraco', 'site antigo', 'site institucional', 'site não gera', 'não converte'],
        contextualizacao: `Acontece muito. Site institucional é bonito, mas não foi feito pra gerar orçamento.

A gente cria landing pages com 1 objetivo só: pedido de orçamento.`,
        perguntaAprofundamento: `Quantos orçamentos o site gera por mês hoje?`
      },
      // DEMANDA IRREGULAR
      demanda: {
        keywords: ['irregular', 'mês bom', 'mês ruim', 'quando tem', 'sem demanda', 'fraco', 'parado'],
        contextualizacao: `Demanda irregular é o pesadelo de toda integradora.

Canal digital ajuda a ter um fluxo mais constante de pedidos de orçamento.`,
        perguntaAprofundamento: `O que vocês fazem quando a demanda cai?`
      },
      // ENERGIA SOLAR / INSTALAÇÃO
      energia_solar: {
        keywords: ['energia solar', 'placa', 'painel', 'fotovoltaic', 'instalação solar', 'integradora', 'instalador'],
        contextualizacao: `Legal! O mercado solar está aquecido.

A Digital Boost é especializada em canal digital pra integradoras - site, SEO local e captação de orçamentos.`,
        perguntaAprofundamento: `Como os clientes chegam até vocês hoje?`
      },
      // FINANCIAMENTO / DIFERENCIAL
      financiamento: {
        keywords: ['financiamento', 'financia', 'parcela', 'facilita', 'entrada', 'condição'],
        contextualizacao: `Financiamento é um baita diferencial! Tem muita gente que só compra se puder parcelar.

Isso é algo que destacamos muito na landing page - converte bem.`,
        perguntaAprofundamento: `Vocês trabalham com quais financeiras?`
      },
      // QUER CRESCER / ESCALAR
      crescer: {
        keywords: ['crescer', 'escalar', 'aumentar', 'mais clientes', 'mais orçamentos', 'expandir'],
        contextualizacao: `Faz sentido! Crescer de forma organizada é o objetivo.

A gente ajuda integradoras a ter um canal digital que funciona como vendedor 24h.`,
        perguntaAprofundamento: `Qual a capacidade de instalação de vocês hoje?`
      }
    };

    // Buscar qual contexto foi mencionado
    for (const [tipo, config] of Object.entries(doresMap)) {
      for (const keyword of config.keywords) {
        if (textoLower.includes(keyword)) {
          console.log(`    [SDR] Contexto detectado: ${tipo} (keyword: "${keyword}")`);
          return config;
        }
      }
    }

    return null;
  }
}

export default SDRAgent;
