// src/tools/conversation_manager.js
import OpenAI from 'openai';
import { analyzeAndSelectArchetype, applyArchetypeToScript, ARCHETYPES } from './archetypes.js';
import { generateTTSAudio, getContactProfile } from './whatsapp.js';
import { sendWhatsAppText, sendWhatsAppAudio } from '../services/whatsappAdapterProvider.js';
import { saveMessage, getRecentMessages } from '../memory.js';
// DEPRECATED: sales_intelligence.js foi removido do projeto
// As funções abaixo foram migradas para outros módulos ou descontinuadas
// TODO: Este arquivo (conversation_manager.js) não está sendo usado - considerar remoção
/*
import {
  analyzeConversationFlow,
  generateSalesResponse,
  extractEmailFromMessage,
  detectSchedulingIntent,
  shouldRequestMeeting,
  shouldCollectEmail,
  SALES_STAGES
} from './sales_intelligence.js';
*/

// Stubs para evitar erros se algum código ainda referenciar estas funções
const analyzeConversationFlow = () => ({ stage: 'unknown', confidence: 0 });
const generateSalesResponse = () => '';
const extractEmailFromMessage = () => null;
const detectSchedulingIntent = () => false;
const shouldRequestMeeting = () => false;
const shouldCollectEmail = () => false;
const SALES_STAGES = {};
import {
  completeSchedulingProcess
} from './meeting_scheduler.js';
import dotenv from 'dotenv';

// ============================================================
// CONFIG LOADER - Carrega config dinamica do banco ou defaults
// ============================================================
import { getConfigLoader, DEFAULT_COMPANY_CONTEXT } from '../config/AgentConfigLoader.js';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Contexto da empresa - agora carregado dinamicamente
 * Mantem retrocompatibilidade com DIGITAL_BOOST_CONTEXT
 *
 * @param {string} tenantId - ID do tenant (opcional)
 * @param {string} agentId - ID do agente (opcional)
 * @returns {Promise<object>} Contexto da empresa
 */
async function getCompanyContext(tenantId = null, agentId = null) {
  const configLoader = getConfigLoader();
  return await configLoader.getCompanyContext(tenantId, agentId);
}

// Retrocompatibilidade: export padrao para codigo que usa DIGITAL_BOOST_CONTEXT
const DIGITAL_BOOST_CONTEXT = DEFAULT_COMPANY_CONTEXT;

/**
 * Verifica se a mensagem está dentro do escopo da Digital Boost
 * @param {string} message - Mensagem do usuário
 * @returns {Promise<object>} Resultado da análise de escopo
 */
export async function analyzeMessageScope(message) {
  try {
    console.log(' Analisando escopo da mensagem...');
    
    const analysisPrompt = `
Como especialista em comunicação empresarial, analise se esta mensagem está relacionada ao escopo de negócios da Digital Boost.

MENSAGEM DO USUÁRIO: "${message}"

ESCOPO DA DIGITAL BOOST:
- Empresa: Digital Boost (marketing digital)
- Serviços: ${DIGITAL_BOOST_CONTEXT.services.join(', ')}
- Palavras-chave relevantes: ${DIGITAL_BOOST_CONTEXT.scope.join(', ')}

ANÁLISE NECESSÁRIA:
1. A mensagem está relacionada a marketing digital, vendas online, negócios ou serviços da Digital Boost?
2. É uma pergunta sobre os serviços ou interesse comercial?
3. É uma resposta positiva/interesse em saber mais?
4. É cumprimento, agradecimento ou continuação natural da conversa comercial?

RESPONDA EM JSON:
{
  "inScope": true/false,
  "confidence": 0.0-1.0,
  "category": "interesse_comercial" | "pergunta_servicos" | "resposta_positiva" | "cumprimento" | "fora_escopo",
  "intent": "breve descrição da intenção do usuário",
  "suggestedResponse": "tipo de resposta sugerida"
}
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'user', content: analysisPrompt }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 200,
      temperature: 0.2 // Máxima precisão para identificação de contexto
    });

    const analysis = JSON.parse(response.choices[0].message.content);
    console.log(' Análise de escopo:', analysis);
    
    return analysis;
    
  } catch (error) {
    console.error(' Erro ao analisar escopo:', error);
    return {
      inScope: true,
      confidence: 0.5,
      category: "interesse_comercial",
      intent: "mensagem do cliente",
      suggestedResponse: "resposta_comercial"
    };
  }
}

/**
 * Gera resposta inteligente de vendas baseada na análise da conversa
 * @param {string} incomingMessage - Mensagem recebida
 * @param {string} senderNumber - Número do remetente
 * @param {array} conversationHistory - Histórico da conversa
 * @returns {Promise<object>} Resposta e ações executadas
 */
export async function generateIntelligentSalesResponse(incomingMessage, senderNumber, conversationHistory = []) {
  try {
    console.log(' Gerando resposta inteligente de vendas...');
    
    // 1. Analisar escopo da mensagem
    const scopeAnalysis = await analyzeMessageScope(incomingMessage);
    
    if (!scopeAnalysis.inScope && scopeAnalysis.confidence > 0.7) {
      // Mensagem fora do escopo - redirecionar educadamente
      const redirectResponse = await generateRedirectResponse(incomingMessage, scopeAnalysis);
      return {
        response: redirectResponse,
        actions: ['redirect'],
        stage: SALES_STAGES.INITIAL_CONTACT
      };
    }
    
    // 2. Buscar perfil do contato para personalização
    const clientProfile = await getContactProfile(senderNumber);
    
    // 3. Analisar fluxo da conversa para vendas
    const salesAnalysis = await analyzeConversationFlow(incomingMessage, conversationHistory);
    
    // 4. Verificar se há email na mensagem
    const extractedEmail = extractEmailFromMessage(incomingMessage);
    const hasSchedulingIntent = detectSchedulingIntent(incomingMessage);

    if (extractedEmail) {
      console.log(' Email detectado na mensagem:', extractedEmail);

      // Verificar se devemos agendar reunião
      if (salesAnalysis.current_stage === SALES_STAGES.EMAIL_COLLECTION ||
          salesAnalysis.ready_for_meeting || hasSchedulingIntent) {

        try {
          // Processar agendamento completo
          const schedulingResult = await completeSchedulingProcess(
            clientProfile.name || 'Cliente',
            extractedEmail,
            senderNumber,
            salesAnalysis
          );

          return {
            response: `Perfeito! Sua reunião estratégica foi agendada com sucesso. Em breves instantes você receberá todos os detalhes aqui mesmo!`,
            actions: ['meeting_scheduled'],
            stage: SALES_STAGES.COMPLETED,
            meetingDetails: schedulingResult.meeting
          };

        } catch (error) {
          console.error(' Erro ao agendar reunião:', error);
          return {
            response: `Recebi seu email! Vou processar o agendamento da reunião e te enviar os detalhes em instantes. Obrigado! `,
            actions: ['email_received'],
            stage: SALES_STAGES.MEETING_SCHEDULING
          };
        }
      }
    }

    // 4.1. Verificar se há intenção de agendamento sem email
    if (hasSchedulingIntent && !extractedEmail && salesAnalysis.ready_for_meeting) {
      console.log(' Intenção de agendamento detectada - solicitando email');

      return {
        response: `Perfeito! Vou agendar nossa reunião estratégica. Para enviar o convite, preciso do seu email. Qual o melhor email para contato? `,
        actions: ['request_email_for_scheduling'],
        stage: SALES_STAGES.EMAIL_COLLECTION
      };
    }
    
    // 5. Gerar resposta baseada na análise de vendas
    const salesResponse = await generateSalesResponse(salesAnalysis, incomingMessage, clientProfile);
    
    // 6. Determinar ações adicionais baseadas no estágio
    const actions = [];
    
    // Verificar se deve solicitar reunião
    if (shouldRequestMeeting(salesAnalysis)) {
      actions.push('request_meeting');
    }
    
    // Verificar se deve coletar email
    if (shouldCollectEmail(salesAnalysis, incomingMessage) ||
        (hasSchedulingIntent && !extractedEmail && salesAnalysis.ready_for_meeting)) {
      actions.push('collect_email');
    }
    
    console.log(` Estágio: ${salesAnalysis.current_stage}  ${salesAnalysis.next_stage}`);
    console.log(` Interesse: ${salesAnalysis.interest_level}/10`);
    console.log(` Ações: ${actions.join(', ')}`);
    
    return {
      response: salesResponse,
      actions: actions,
      stage: salesAnalysis.next_stage,
      analysis: salesAnalysis,
      clientProfile: clientProfile
    };
    
  } catch (error) {
    console.error(' Erro ao gerar resposta inteligente:', error);
    return {
      response: `Obrigado pelo seu interesse! Com base no que você me contou, acredito que podemos ajudar muito no crescimento do seu negócio. Que tal conversarmos sobre uma estratégia específica para você? `,
      actions: ['fallback'],
      stage: SALES_STAGES.INTEREST_DISCOVERY
    };
  }
}

/**
 * Gera resposta de redirecionamento para assuntos fora do escopo
 * @param {string} message - Mensagem original
 * @param {object} scopeAnalysis - Análise de escopo
 * @returns {Promise<string>} Resposta de redirecionamento
 */
export async function generateRedirectResponse(message, scopeAnalysis) {
  try {
    console.log(' Gerando resposta de redirecionamento...');
    
    const redirectPrompt = `
Como ORBION da Digital Boost, responda educadamente a uma mensagem que está fora do escopo de marketing digital.

MENSAGEM RECEBIDA: "${message}"
CATEGORIA: ${scopeAnalysis.category}
INTENÇÃO: ${scopeAnalysis.intent}

DIRETRIZES:
1. Seja educado e respeitoso
2. Agradeça o contato
3. Explique brevemente seu foco (marketing digital)
4. Redirecione para o escopo da Digital Boost de forma natural
5. Faça uma pergunta relacionada a marketing/negócios
6. Máximo 2 frases

EXEMPLOS:
- Para assuntos pessoais: "Obrigado pelo contato! Como especialista da Digital Boost, foco em soluções de marketing digital. Que tal conversarmos sobre como impulsionar seu negócio online?"
- Para outros assuntos: "Agradeço seu contato! Minha especialidade é marketing digital na Digital Boost. Posso ajudar com alguma estratégia para seu negócio?"

Responda apenas com a mensagem:
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'user', content: redirectPrompt }
      ],
      max_tokens: 100,
      temperature: 0.4 // Reduzido para melhor qualidade gramatical
    });

    const redirectResponse = response.choices[0].message.content.trim();
    console.log(' Resposta de redirecionamento gerada:', redirectResponse);
    
    return redirectResponse;
    
  } catch (error) {
    console.error(' Erro ao gerar redirecionamento:', error);
    return "Obrigado pelo contato! Sou especialista em marketing digital da Digital Boost. Como posso ajudar a impulsionar seu negócio online? ";
  }
}

/**
 * Processa mensagem recebida e envia resposta automática
 * @param {string} senderNumber - Número do remetente
 * @param {string} message - Mensagem recebida
 * @param {string} messageType - Tipo da mensagem
 * @returns {Promise<object>} Resultado do processamento
 */
export async function processIncomingMessage(senderNumber, message, messageType = 'text') {
  try {
    console.log(` Processando mensagem de ${senderNumber}: ${message.substring(0, 50)}...`);
    
    // Salvar mensagem recebida no histórico
    await saveMessage(senderNumber, message, false, messageType);
    
    // Buscar histórico recente da conversa
    const conversationHistory = await getRecentMessages(senderNumber, 5);
    
    // Verificar se é a primeira conversa e enviar áudio de apresentação
    let audioResult = null;
    if (isFirstConversation(conversationHistory)) {
      console.log(' Primeira conversa detectada - enviando apresentação em áudio');
      try {
        audioResult = await sendIntroductionAudio(senderNumber);
        
        // Aguardar 2 segundos para o áudio ser processado
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (audioError) {
        console.error(' Erro ao enviar áudio de apresentação:', audioError);
        // Continua mesmo se o áudio falhar
      }
    }
    
    // Gerar resposta inteligente de vendas
    const intelligentResponse = await generateIntelligentSalesResponse(message, senderNumber, conversationHistory);
    
    // Enviar resposta
    const sendResult = await sendWhatsAppText(senderNumber, intelligentResponse.response);
    
    // Salvar resposta no histórico com metadados de vendas
    const responseMetadata = `[${intelligentResponse.stage}] ${intelligentResponse.response}`;
    await saveMessage(senderNumber, responseMetadata, true, 'text');
    
    // Log detalhado do processo de vendas
    console.log(' Processo de vendas executado:');
    console.log(`    Estágio: ${intelligentResponse.stage}`);
    console.log(`    Ações: ${intelligentResponse.actions?.join(', ') || 'Nenhuma'}`);
    if (intelligentResponse.analysis) {
      console.log(`    Interesse: ${intelligentResponse.analysis.interest_level}/10`);
      console.log(`    Estratégia: ${intelligentResponse.analysis.sales_strategy}`);
    }
    console.log(' Mensagem processada com inteligência de vendas');
    
    return {
      success: true,
      originalMessage: message,
      response: intelligentResponse.response,
      sendResult: sendResult,
      introductionAudio: audioResult,
      isFirstContact: audioResult !== null,
      salesData: {
        stage: intelligentResponse.stage,
        actions: intelligentResponse.actions,
        analysis: intelligentResponse.analysis,
        clientProfile: intelligentResponse.clientProfile,
        meetingDetails: intelligentResponse.meetingDetails
      }
    };
    
  } catch (error) {
    console.error(' Erro ao processar mensagem:', error);
    
    // Resposta de fallback em caso de erro
    const fallbackResponse = "Olá! Obrigado pelo contato. Sou a Leadly da Digital Boost. Como posso ajudar com seu marketing digital? ";
    
    try {
      await sendWhatsAppText(senderNumber, fallbackResponse);
      await saveMessage(senderNumber, fallbackResponse, true, 'text');
    } catch (sendError) {
      console.error(' Erro ao enviar resposta de fallback:', sendError);
    }
    
    return {
      success: false,
      error: error.message,
      fallbackSent: true
    };
  }
}

/**
 * Gera áudio de apresentação do ORBION e Digital Boost
 * @param {string} senderNumber - Número do remetente  
 * @returns {Promise<string>} Script do áudio de apresentação
 */
export async function generateIntroductionAudio(senderNumber) {
  try {
    console.log(' Gerando áudio de apresentação do ORBION...');
    
    const introScript = `Olá! Eu sou a Leadly da Digital Boost.
    Somos especialistas em marketing digital, automação de processos, gestão de redes sociais e campanhas de ads.
    Estou aqui para ajudar a impulsionar seu negócio online e aumentar suas vendas através de estratégias digitais comprovadas.
    Vamos conversar sobre como podemos transformar seus resultados?`;

    console.log(' Script da apresentação:', introScript);
    return introScript;

  } catch (error) {
    console.error(' Erro ao gerar apresentação:', error);
    return `Olá! Eu sou a Leadly da Digital Boost, especialista em marketing digital. Como posso ajudar a impulsionar seu negócio online?`;
  }
}

/**
 * Verifica se é a primeira conversa com o contato
 * @param {array} conversationHistory - Histórico da conversa
 * @returns {boolean} Se é primeira conversa
 */
export function isFirstConversation(conversationHistory) {
  // Considera primeira conversa se não há histórico ou apenas mensagens do cliente
  const ourMessages = conversationHistory.filter(msg => msg.fromMe);
  return ourMessages.length === 0;
}

/**
 * Envia apresentação em áudio para novos contatos
 * @param {string} senderNumber - Número do remetente
 * @returns {Promise<object>} Resultado do envio
 */
export async function sendIntroductionAudio(senderNumber) {
  try {
    console.log(' Enviando áudio de apresentação para:', senderNumber);
    
    // Gera script de apresentação
    const introScript = await generateIntroductionAudio(senderNumber);
    
    // Gera áudio TTS (voz feminina mais acolhedora)
    const audioPath = await generateTTSAudio(introScript, 'nova');
    
    // Envia áudio via WhatsApp
    const audioResult = await sendWhatsAppAudio(senderNumber, audioPath);
    
    // Remove arquivo temporário
    const fs = await import('fs');
    fs.unlinkSync(audioPath);
    
    // Salva no histórico que enviamos apresentação
    await saveMessage(senderNumber, '[ÁUDIO] Apresentação ORBION - Digital Boost', true, 'audio');
    
    console.log(' Áudio de apresentação enviado com sucesso');
    
    return {
      success: true,
      audioResult: audioResult,
      script: introScript,
      message: 'Áudio de apresentação enviado'
    };
    
  } catch (error) {
    console.error(' Erro ao enviar apresentação em áudio:', error);
    throw error;
  }
}
