import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Módulo para explicar a Digital Boost por áudio ou texto
 * GENERIC v6.0 - Sites Profissionais para Empresas de Qualquer Setor
 */

// Texto explicativo sobre a Digital Boost (versão completa para mensagem) - GENERIC v6.0
export const DIGITAL_BOOST_EXPLANATION_TEXT = `*Digital Boost - Sites Profissionais que Geram Clientes*

Somos de Natal/RN e criamos sites profissionais para empresas de qualquer setor.

*O que fazemos:*
Criamos sites focados em captação de clientes - design profissional, SEO local e integração com WhatsApp.

*Na prática:*
• Site/Landing page profissional (design focado em conversão)
• Páginas SEO por região/cidade que você atende
• Integração WhatsApp + Formulário
• Prova social (fotos, avaliações)
• Tracking básico (Pixel + GA4)

*Para quem é:*
• Empresas que dependem de indicação
• Quem tem Instagram mas não converte
• Quem não tem site ou tem site institucional
• Quem quer ter canal de captação próprio

*O que NÃO prometemos:*
• Posição específica no Google (SEO leva tempo)
• Quantidade de leads por mês (depende do mercado)
• Milagres sem investimento

*Como funciona:*
1. Diagnóstico gratuito (20-30 min) - analisamos o que vocês têm hoje
2. Proposta personalizada - escopo e investimento sob medida

Quer saber mais sobre algum ponto específico?`;

// Texto para áudio (20-25 segundos) - GENERIC v6.0
export const DIGITAL_BOOST_AUDIO_SCRIPT = `
Olá! A Digital Boost cria sites profissionais focados em gerar clientes para empresas.

Na prática: site focado em captação, SEO local pra aparecer no Google da sua região, e integração com WhatsApp pra não perder lead.

Somos de Natal e atendemos empresas de todo o Brasil. Quer que eu explique como funciona na prática?
`;

/**
 * Envia áudio explicativo sobre a Digital Boost via WhatsApp
 * @param {string} to - Número do destinatário
 * @param {Function} sendAudioFunc - Função para enviar áudio (Evolution API)
 * @returns {Promise<Object>} - Resultado do envio
 */
export async function sendDigitalBoostAudioExplanation(to, sendAudioFunc) {
  try {
    console.log(` [DIGITAL-BOOST] Gerando áudio explicativo para ${to}...`);

    // Importar módulo ElevenLabs
    const { generateElevenLabsTTS } = await import('./elevenlabs_tts.js');

    // Gerar áudio
    const audioBuffer = await generateElevenLabsTTS(DIGITAL_BOOST_AUDIO_SCRIPT);

    // Salvar temporariamente
    const fs = await import('fs');
    const audioDir = path.join(__dirname, '../../audio');

    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }

    const tempPath = path.join(audioDir, `digitalboost_${Date.now()}.mp3`);
    fs.writeFileSync(tempPath, audioBuffer);

    console.log(` [DIGITAL-BOOST] Áudio salvo: ${tempPath}`);

    // Enviar via função fornecida
    const result = await sendAudioFunc(to, tempPath);

    // Limpar arquivo temporário
    setTimeout(() => {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
        console.log(` [DIGITAL-BOOST] Arquivo removido: ${tempPath}`);
      }
    }, 5000);

    return {
      success: true,
      type: 'audio',
      result
    };

  } catch (error) {
    console.error(' [DIGITAL-BOOST] Erro ao enviar áudio:', error);
    throw error;
  }
}

/**
 * Detecta se usuário quer conhecer a Digital Boost
 * @param {string} message - Mensagem do usuário
 * @returns {boolean} - True se detectar intenção
 */
export function detectDigitalBoostIntent(message) {
  const messageLower = message.toLowerCase();

  // Detectar combinações de palavras-chave
  const hasDigitalBoost = messageLower.includes('digital boost');
  const hasEmpresa = messageLower.includes('empresa');
  const hasVoces = messageLower.includes('voces') || messageLower.includes('vocês');

  // Palavras de ação para perguntar sobre a empresa
  const actionKeywords = [
    'o que é',
    'o que e',
    'quem é',
    'quem e',
    'conhecer',
    'me fala',
    'me explica',
    'explica',
    'explicar',
    'sobre',
    'apresenta',
    'apresentação',
    'apresentacao',
    'como funciona',
    'o que faz',
    'fazem',
    'faz',
    'quem são',
    'quem sao'
  ];

  // Padrões específicos que sempre detectam (com regex flexível)
  const specificPatterns = [
    /o que.*voce?s.*fazem/i,          // "o que vocês fazem", "o que voces da DB fazem"
    /o que.*voc[eê].*faz(?:es)?/i,   // "o que você faz", "o que voce faz" (SINGULAR)
    /o que.*digital boost.*faz/i,     // "o que a digital boost faz"
    /quem.*digital boost/i,           // "quem é a digital boost"
    /me.*explica.*digital boost/i,    // "me explica sobre digital boost"
    /fala.*digital boost/i,           // "me fala da digital boost"
    /conhecer.*digital boost/i,       // "quero conhecer a digital boost"
    /voc[eê].*[ée].*atendente/i,     // "você é atendente", "voce e atendente"
    /atendente.*digital boost/i,      // "atendente da digital boost"
    /trabalha.*digital boost/i        // "trabalha na/para digital boost"
  ];

  // Verificar padrões específicos primeiro
  if (specificPatterns.some(pattern => pattern.test(messageLower))) {
    return true;
  }

  // Se menciona "digital boost" + palavra de ação
  if (hasDigitalBoost && actionKeywords.some(kw => messageLower.includes(kw))) {
    return true;
  }

  // Se menciona "vocês" + "fazem/faz" (perguntando sobre a empresa)
  if (hasVoces && (messageLower.includes('fazem') || messageLower.includes('faz'))) {
    return true;
  }

  // Se menciona "empresa" + palavra de ação (em contexto de conhecer)
  if (hasEmpresa && (messageLower.includes('sobre') || messageLower.includes('conhecer') || messageLower.includes('explica'))) {
    return true;
  }

  return false;
}

/**
 * Detecta se usuário escolheu áudio ou texto
 * @param {string} message - Mensagem do usuário
 * @returns {string|null} - 'audio', 'texto' ou null
 */
export function detectPreferenceChoice(message) {
  const messageLower = message.toLowerCase().trim();

  // Detectar áudio
  const audioKeywords = ['audio', 'áudio', 'voz', 'som', 'falado', 'gravação', 'gravacao'];
  if (audioKeywords.some(kw => messageLower.includes(kw))) {
    return 'audio';
  }

  // Detectar texto
  const textKeywords = ['texto', 'mensagem', 'escrito', 'escrever', 'ler', 'leitura'];
  if (textKeywords.some(kw => messageLower.includes(kw))) {
    return 'texto';
  }

  return null;
}
