// src/tools/sales_intelligence.js
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Estágios da jornada de vendas
 */
export const SALES_STAGES = {
  INITIAL_CONTACT: 'initial_contact',
  INTEREST_DISCOVERY: 'interest_discovery', 
  PROBLEM_IDENTIFICATION: 'problem_identification',
  SOLUTION_PRESENTATION: 'solution_presentation',
  OBJECTION_HANDLING: 'objection_handling',
  MEETING_REQUEST: 'meeting_request',
  EMAIL_COLLECTION: 'email_collection',
  MEETING_SCHEDULING: 'meeting_scheduling',
  COMPLETED: 'completed'
};

/**
 * Analisa o estágio atual da conversa e determina a próxima ação
 * @param {string} currentMessage - Mensagem atual do cliente
 * @param {array} conversationHistory - Histórico da conversa
 * @returns {Promise<object>} Análise da conversa e estratégia
 */
export async function analyzeConversationFlow(currentMessage, conversationHistory) {
  try {
    console.log('🧠 Analisando fluxo da conversa para vendas...');

    // Monta contexto da conversa
    const conversationContext = conversationHistory
      .slice(-10) // Últimas 10 mensagens
      .map(msg => `${msg.fromMe ? 'ORBION' : 'Cliente'}: ${msg.text}`)
      .join('\n');

    const analysisPrompt = `Você é ORBION, especialista SDR da Digital Boost. Seja consultivo MAS apresente a empresa quando relevante.

CLIENTE DISSE: "${currentMessage}"

CONTEXTO DA DIGITAL BOOST:
- Startup de Natal/RN, reconhecida pelo Sebrae (top 15 tech do Brasil)
- Especializamos em CRM + Automação + IA para PMEs
- Agentes IA 24/7, dashboards inteligentes, integração Kommo
- Clientes: empresas de 50-200 funcionários que querem escalar vendas

ESTRATÉGIA DE RESPOSTA:
1. Se cliente pergunta "o que você faz" → Apresente Digital Boost com foco no problema dele
2. Se demonstra interesse → Compartilhe case específico e proponha reunião
3. Se pede agendamento → Colete APENAS nome, email e horário preferido (sem listas)
4. Se fornece dados completos → Confirme agendamento
5. Senão → Seja consultivo e descubra dores

REGRAS:
- Máximo 2-3 frases
- Uma pergunta por vez quando descobrindo
- Apresente Digital Boost quando apropriado
- Seja direto sobre agendamento

Resposta:`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Você é um consultor de negócios genuinamente curioso. Seja conciso como uma conversa informal de WhatsApp. Responda apenas o texto da mensagem, sem JSON.'
        },
        {
          role: 'user',
          content: analysisPrompt
        }
      ],
      temperature: 0.4,
      max_tokens: 80
    });

    const salesResponse = response.choices[0].message.content.trim();
    console.log('🎯 Resposta consultiva gerada:', salesResponse);

    // Retornar resposta consultiva simples
    return {
      current_stage: 'interest_discovery',
      next_stage: 'solution_presentation',
      response: salesResponse,
      interest_level: 6,
      ready_for_meeting: false
    };

  } catch (error) {
    console.error('❌ Erro na análise da conversa:', error);
    return {
      current_stage: SALES_STAGES.INTEREST_DISCOVERY,
      next_stage: SALES_STAGES.SOLUTION_PRESENTATION,
      client_intent: 'interesse em crescimento digital',
      pain_points: ['oportunidades de crescimento'],
      interest_level: 6,
      ready_for_meeting: false,
      sales_strategy: 'apresentar casos de sucesso relevantes',
      response_tone: 'consultivo',
      call_to_action: 'compartilhar case específico',
      email_detected: null
    };
  }
}

/**
 * Gera resposta inteligente baseada na análise da conversa
 * @param {object} analysis - Análise da conversa
 * @param {string} currentMessage - Mensagem atual do cliente
 * @param {object} clientProfile - Perfil do cliente se disponível
 * @returns {Promise<string>} Resposta estratégica
 */
export async function generateSalesResponse(analysis, currentMessage, clientProfile = {}) {
  try {
    console.log('💬 Gerando resposta de vendas inteligente...');
    
    const responsePrompt = `Responda como um consultor curioso:

CLIENTE DISSE: "${currentMessage}"

REGRAS:
- Máximo 2 frases
- Uma pergunta por vez
- Seja genuinamente curioso

Resposta:`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Você é um consultor de negócios genuinamente curioso. Sua única missão é descobrir profundamente os desafios do cliente através de perguntas simples e diretas. Seja conciso como uma conversa informal de WhatsApp.'
        },
        {
          role: 'user',
          content: responsePrompt
        }
      ],
      temperature: 0.6,
      max_tokens: 80
    });

    const salesResponse = response.choices[0].message.content.trim();
    console.log('💬 Resposta de vendas gerada:', salesResponse.substring(0, 100) + '...');
    
    return salesResponse;
    
  } catch (error) {
    console.error('❌ Erro ao gerar resposta de vendas:', error);
    return `Interessante! Como está funcionando o marketing hoje?`;
  }
}

/**
 * Extrai email da mensagem do cliente
 * @param {string} message - Mensagem do cliente
 * @returns {string|null} Email encontrado ou null
 */
export function extractEmailFromMessage(message) {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emails = message.match(emailRegex);
  return emails ? emails[0] : null;
}

/**
 * Verifica se o cliente está pronto para reunião baseado na análise
 * @param {object} analysis - Análise da conversa
 * @returns {boolean} Se deve solicitar reunião
 */
export function shouldRequestMeeting(analysis) {
  return (
    analysis.interest_level >= 6 &&
    analysis.pain_points.length >= 1 &&
    !analysis.ready_for_meeting &&
    analysis.current_stage !== SALES_STAGES.EMAIL_COLLECTION &&
    analysis.current_stage !== SALES_STAGES.MEETING_SCHEDULING
  );
}

/**
 * Detecta intenção de agendamento baseado em menções de horários ou disponibilidade
 * @param {string} message - Mensagem do cliente
 * @returns {boolean} Se o cliente indicou disponibilidade para agendamento
 */
export function detectSchedulingIntent(message) {
  const messageLower = message.toLowerCase();

  // Palavras que indicam disponibilidade temporal
  const timeIndicators = [
    'manhã', 'tarde', 'noite',
    'amanhã', 'hoje', 'semana',
    'segunda', 'terça', 'quarta', 'quinta', 'sexta',
    'posso', 'disponível', 'livre',
    'horário', 'hora', 'às',
    'depois do', 'antes do',
    'qualquer hora', 'quando quiser',
    'vou estar', 'estarei',
    'reunião', 'reuniao', 'conversa',
    'agendar', 'marcar'
  ];

  // Padrões de horário (ex: "14h", "às 15h", "15:30")
  const timePatterns = [
    /\b\d{1,2}h\b/,
    /\b\d{1,2}:\d{2}\b/,
    /\bàs \d{1,2}/,
    /\b\d{1,2} horas?\b/
  ];

  // Verifica se contém indicadores de tempo/disponibilidade
  const hasTimeIndicator = timeIndicators.some(indicator =>
    messageLower.includes(indicator)
  );

  // Verifica padrões de horário
  const hasTimePattern = timePatterns.some(pattern =>
    pattern.test(messageLower)
  );

  // Frases que confirmam interesse em reunião
  const confirmationPhrases = [
    'aceito a reunião',
    'pode agendar',
    'vamos marcar',
    'quero a reunião',
    'quando pode ser',
    'qual horário'
  ];

  const hasConfirmation = confirmationPhrases.some(phrase =>
    messageLower.includes(phrase)
  );

  return hasTimeIndicator || hasTimePattern || hasConfirmation;
}

/**
 * Determina se deve coletar dados para agendamento
 * @param {object} analysis - Análise da conversa
 * @param {string} message - Mensagem atual
 * @returns {object} Dados sobre coleta necessária
 */
export function shouldCollectContactData(analysis, message) {
  const hasPositiveResponse = /\b(sim|claro|pode|quero|gostaria|aceito|vamos|ok|certo|agendar|marcar|reunião)\b/i.test(message);
  const hasNegativeResponse = /\b(não|nao|depois|mais tarde|não tenho tempo|ocupado)\b/i.test(message);

  // Detecta se já tem email na mensagem
  const emailInMessage = extractEmailFromMessage(message);

  // Detecta se já tem nome na mensagem (padrão simples)
  const namePattern = /\b(meu nome é|me chamo|sou|eu sou)\s+([a-zA-ZÀ-ÿ\s]{2,})/i;
  const nameMatch = message.match(namePattern);
  const nameInMessage = nameMatch ? nameMatch[2].trim() : null;

  // Detecta se expressa interesse em agendamento
  const schedulingIntent = detectSchedulingIntent(message);

  return {
    shouldCollect: (schedulingIntent || hasPositiveResponse) && !hasNegativeResponse,
    hasEmail: !!emailInMessage,
    hasName: !!nameInMessage,
    email: emailInMessage,
    name: nameInMessage,
    schedulingIntent: schedulingIntent,
    nextStep: emailInMessage && nameInMessage ? 'schedule' : 'collect_missing_data'
  };
}