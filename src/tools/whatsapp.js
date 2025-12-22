// src/tools/whatsapp.js
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { analyzeAndSelectArchetype, applyArchetypeToScript, generateArchetypeFollowUp } from './archetypes.js';
import { getOutboundDeduplicator } from '../utils/OutboundDeduplicator.js';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const EVOLUTION_BASE_URL = process.env.EVOLUTION_BASE_URL || 'http://localhost:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'digitalboost';

//  FIX CRÍTICO: Validar API key no startup
if (!EVOLUTION_API_KEY || EVOLUTION_API_KEY === 'your-api-key-here') {
  console.error(' [WHATSAPP-SECURITY] EVOLUTION_API_KEY não configurada ou usando valor padrão!');
  console.error(' [WHATSAPP-SECURITY] Configure EVOLUTION_API_KEY no arquivo .env antes de prosseguir');
  throw new Error('EVOLUTION_API_KEY must be configured in .env file');
}

if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-key-here') {
  console.error(' [WHATSAPP-SECURITY] OPENAI_API_KEY não configurada ou usando valor padrão!');
  console.error(' [WHATSAPP-SECURITY] Configure OPENAI_API_KEY no arquivo .env antes de prosseguir');
  throw new Error('OPENAI_API_KEY must be configured in .env file');
}

console.log(' [WHATSAPP-SECURITY] API keys validadas com sucesso');

// Cache global de leads
let leadsCache = null;

/**
 * Limpa o cache de leads para forçar recarga
 */
export function clearLeadsCache() {
  leadsCache = null;
  console.log(' Cache de leads limpo');
}

/**
 * Carrega os dados de leads da planilha CSV
 */
async function loadLeadsData() {
  if (leadsCache) return leadsCache;

  try {
    const ROOT = process.cwd();
    const leadsDir = path.join(ROOT, "data", "leads");

    if (!fs.existsSync(leadsDir)) {
      return [];
    }

    // Procura o arquivo CSV mais recente
    const csvFiles = fs.readdirSync(leadsDir)
      .filter(file => file.toLowerCase().endsWith('.csv'))
      .map(file => ({
        name: file,
        path: path.join(leadsDir, file),
        modified: fs.statSync(path.join(leadsDir, file)).mtime
      }))
      .sort((a, b) => b.modified - a.modified);

    if (csvFiles.length === 0) {
      return [];
    }

    const csvContent = fs.readFileSync(csvFiles[0].path, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());

    // Parse CSV mais robusto para lidar com campos com vírgulas e aspas
    function parseCSVLine(line) {
      const result = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }

      result.push(current.trim());
      return result;
    }

    const headers = parseCSVLine(lines[0]).map(h => h.replace(/"/g, '').trim());

    const leads = lines.slice(1).map(line => {
      const values = parseCSVLine(line).map(v => v.replace(/^"|"$/g, '').trim());
      const lead = {};

      headers.forEach((header, index) => {
        lead[header] = values[index] || '';
      });

      return lead;
    }).filter(lead => {
      // Adaptar filtro para novos campos - usar WhatsApp/Telefone ou E-mail
      const hasContact = (lead['WhatsApp/Telefone'] || lead['E-mail'] || lead.whatsapp || lead.nome);
      return hasContact;
    });

    leadsCache = leads;
    console.log(` ${leads.length} leads carregados em cache (formato: ${csvFiles[0].name})`);
    return leads;

  } catch (error) {
    console.error(' Erro ao carregar leads:', error);
    return [];
  }
}

/**
 * Busca lead por número de telefone
 */
async function findLeadByNumber(number) {
  const leads = await loadLeadsData();
  const cleanNumber = number.toString().replace(/\D/g, '');

  return leads.find(lead => {
    // Tenta buscar em diferentes campos de contato
    let leadNumber = '';

    // Formato novo: WhatsApp/Telefone
    if (lead['WhatsApp/Telefone']) {
      leadNumber = lead['WhatsApp/Telefone'].replace(/\D/g, '');
    }
    // Formato antigo: whatsapp
    else if (lead.whatsapp) {
      leadNumber = lead.whatsapp.replace(/\D/g, '');
    }

    return leadNumber === cleanNumber;
  });
}

/**
 * Envia mensagem via WhatsApp usando Evolution API
 * @param {string} number - Número do destinatário (formato: 5511999999999)
 * @param {string} text - Texto da mensagem
 * @returns {Promise<object>}
 */
export async function sendWhatsAppMessage(number, text) {
  console.warn('[DEPRECATED] sendWhatsAppMessage called. Use WhatsAppAdapter instead.');
  const { sendWhatsAppText } = await import('../services/whatsappAdapterProvider.js');
  const result = await sendWhatsAppText(number, text);
  return result?.raw || result;
}

/**
 * Agenda reunião e notifica via WhatsApp
 * @param {string} number - Número do WhatsApp
 * @param {string} title - Título da reunião
 * @param {string} datetime - Data/hora ISO
 * @param {string} notes - Observações
 * @returns {Promise<object>}
 */
export async function scheduleWhatsAppMeeting(number, email, title, datetime, notes = '') {
  try {
    // 1. Cria evento no Google Calendar usando calendar_enhanced.js
    const { createEvent } = await import('./calendar_enhanced.js');
    const meetingDate = new Date(datetime);
    const dateStr = meetingDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = meetingDate.toLocaleTimeString('pt-BR', { hour12: false }).slice(0, 5); // HH:mm

    // Usa o email fornecido como parâmetro
    const attendees = email ? [email, 'taylorlapenda@gmail.com'] : ['taylorlapenda@gmail.com'];

    let eventResult;
    try {
      eventResult = await createEvent({
        title,
        date: dateStr,
        time: timeStr,
        duration: 60,
        location: 'Google Meet',
        attendees,
        description: notes,
        meetEnabled: true
      });
      console.log(' Evento criado no Google Calendar com convites para:', attendees.join(', '));
    } catch (calendarError) {
      console.log(' Falha ao criar evento no Google Calendar:', calendarError.message);
      // Fallback: evento local apenas
      eventResult = {
        success: false,
        id: `local_${Date.now()}`,
        title,
        datetime,
        error: calendarError.message
      };
    }

    // 2. Formata data/hora para exibição
    const displayDateStr = meetingDate.toLocaleDateString('pt-BR');
    const displayTimeStr = meetingDate.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // 3. Monta mensagem de confirmação
    const message = `*Reunião Agendada com Sucesso!*\n\n` +
                   ` *Data:* ${displayDateStr}\n` +
                   ` *Horário:* ${displayTimeStr}\n` +
                   ` *Assunto:* ${title}\n` +
                   (notes ? ` *Observações:* ${notes}\n` : '') +
                   `\n Entraremos em contato próximo ao horário marcado.\n\n` +
                   `_Agendado pelo ORBION_ `;

    // 4. Envia confirmação via WhatsApp
    await sendWhatsAppMessage(number, message);

    return {
      success: true,
      event: eventResult,
      message: `Reunião agendada para ${displayDateStr} às ${displayTimeStr} e notificação enviada via WhatsApp`
    };

  } catch (error) {
    console.error(' Erro ao agendar reunião WhatsApp:', error);
    
    // Envia mensagem de erro
    try {
      await sendWhatsAppMessage(number, 
        ' *Ops! Houve um problema ao agendar sua reunião.*\n\n' +
        'Por favor, tente novamente ou entre em contato conosco.\n\n' +
        '_ORBION_ '
      );
    } catch (msgError) {
      console.error(' Erro ao enviar mensagem de erro:', msgError);
    }

    throw error;
  }
}

/**
 * Extrai número do WhatsApp de diferentes formatos
 * @param {string} contact - Contato em formato variado
 * @returns {string} Número formatado
 */
export function formatWhatsAppNumber(contact) {
  // Remove caracteres especiais, mantém apenas números
  let number = contact.replace(/[^\d]/g, '');
  
  // Se não tem código do país, adiciona 55 (Brasil)
  if (number.length === 11 && number.startsWith('1')) {
    number = '55' + number;
  } else if (number.length === 10) {
    number = '55' + number;
  }
  
  return number;
}

/**
 * Baixa mídia (áudio, imagem, etc.) do WhatsApp via Evolution API
 * @param {string} messageId - ID da mensagem
 * @returns {Promise<string>} URL ou base64 do arquivo
 */
export async function downloadWhatsAppMedia(messageId, message = null) {
  if (!EVOLUTION_API_KEY) {
    throw new Error('EVOLUTION_API_KEY não configurada no .env');
  }

  try {
    console.log(' Baixando mídia via Evolution API - messageId:', messageId);
    
    // MÉTODO CORRETO: Usar endpoint da Evolution API para obter link seguro
    console.log(' TENTATIVA 1: Endpoint comum /message/download/{instance}');
    const mediaResponse = await fetch(`${EVOLUTION_BASE_URL}/message/download/${EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: {
        'apikey': EVOLUTION_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messageId: messageId
      })
    });

    if (mediaResponse.ok) {
      const mediaData = await mediaResponse.json();
      console.log(' Resposta do endpoint /v1/messages:', JSON.stringify(mediaData, null, 2));
      
      if (mediaData.media_url) {
        console.log(' Link seguro obtido:', mediaData.media_url.substring(0, 60) + '...');
        
        // Baixar o arquivo do link seguro
        console.log(' Baixando arquivo do link seguro...');
        const fileResponse = await fetch(mediaData.media_url, {
          headers: {
            'Authorization': `Bearer ${EVOLUTION_API_KEY}`
          }
        });
        
        if (fileResponse.ok) {
          const fileBuffer = await fileResponse.arrayBuffer();
          const mediaBase64 = Buffer.from(fileBuffer).toString('base64');
          
          console.log(' Arquivo baixado com sucesso:', fileBuffer.byteLength, 'bytes');
          console.log(' Convertido para base64:', mediaBase64.length, 'chars');
          
          // Verificar se é um arquivo válido
          const firstBytes = Buffer.from(fileBuffer).slice(0, 4).toString('hex');
          console.log(' Primeiros bytes do arquivo:', firstBytes);
          console.log(' É OGG válido?', firstBytes === '4f676753');
          
          return mediaBase64;
        } else {
          console.log(' Falha ao baixar do link seguro:', fileResponse.status, fileResponse.statusText);
        }
      }
    } else {
      console.log(' TENTATIVA 1 falhou:', mediaResponse.status, mediaResponse.statusText);
    }
    
    // TENTATIVA 2: Endpoint alternativo de media
    console.log(' TENTATIVA 2: Endpoint /media/{instance}');
    const response2 = await fetch(`${EVOLUTION_BASE_URL}/media/${EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: {
        'apikey': EVOLUTION_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        messageId: messageId
      })
    });

    if (response2.ok) {
      const result2 = await response2.json();
      const mediaBase64 = result2.mediaBase64 || result2.base64 || result2.media;
      
      if (mediaBase64) {
        console.log(' Mídia descriptografada via endpoint automático');
        
        // Verificar se é um arquivo válido
        const buffer = Buffer.from(mediaBase64, 'base64');
        const firstBytes = buffer.slice(0, 4).toString('hex');
        console.log(' Primeiros bytes (TENTATIVA 2):', firstBytes);
        console.log(' É OGG válido?', firstBytes === '4f676753');
        
        return mediaBase64;
      }
    } else {
      console.log(' TENTATIVA 2 falhou:', response2.status, response2.statusText);
    }

    // TENTATIVA 3: Endpoint direto de mensagem
    console.log(' TENTATIVA 3: Endpoint /{instance}/message');
    const response3 = await fetch(`${EVOLUTION_BASE_URL}/${EVOLUTION_INSTANCE}/message`, {
      method: 'GET',
      headers: {
        'apikey': EVOLUTION_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (response3.ok) {
      const result3 = await response3.json();
      const mediaBase64 = result3.mediaBase64 || result3.base64 || result3.data;
      
      if (mediaBase64) {
        console.log(' Mídia baixada via endpoint simples');
        
        // Verificar se é um arquivo válido
        const buffer = Buffer.from(mediaBase64, 'base64');
        const firstBytes = buffer.slice(0, 4).toString('hex');
        console.log(' Primeiros bytes (TENTATIVA 3):', firstBytes);
        console.log(' É OGG válido?', firstBytes === '4f676753');
        
        return mediaBase64;
      }
    } else {
      console.log(' TENTATIVA 3 falhou:', response3.status, response3.statusText);
    }

    throw new Error('Todas as tentativas de download via Evolution API falharam');

  } catch (error) {
    console.error(' Erro no download de mídia:', error.message);
    throw error;
  }
}

/**
 * Busca informações de perfil do contato no WhatsApp
 * @param {string} number - Número do WhatsApp
 * @returns {Promise<object>}
 */
export async function getContactProfile(number) {
  if (!EVOLUTION_API_KEY) {
    throw new Error('EVOLUTION_API_KEY não configurada no .env');
  }

  try {
    // Primeiro, tenta encontrar nos leads (mais confiável)
    const leadData = await findLeadByNumber(number);
    if (leadData) {
      // Mapear campos do formato novo ou antigo
      const companyName = leadData['Empresa'] || leadData.nome || 'Empresa';
      const contactName = leadData['Contato - Nome'] || leadData.nome || 'Contato';
      const painPoints = leadData['Dor principal (1 frase)'] || leadData.dores || '';
      const segment = leadData['Segmento'] || leadData.categoria_inteligente || '';
      const location = leadData['Localização'] || leadData.endereco || '';
      const icpFit = leadData['ICP Fit'] || '';
      const qualification = leadData['Status de qualificação'] || '';
      const totalScore = leadData['Score Total (0-100)'] || '';

      console.log(` Lead encontrado: ${companyName} - ${contactName} (Score: ${totalScore})`);

      return {
        name: contactName,
        number: number,
        isBusiness: true,
        gender: 'neutro',
        status: painPoints || `Lead qualificado - ${segment}`,
        company: companyName,
        pain_points: painPoints ? [painPoints] : [],
        address: location,
        segment: segment,
        icp_fit: icpFit,
        qualification_status: qualification,
        total_score: totalScore,
        instagram: leadData.instagram || '',
        source: 'leads_database'
      };
    }

    // Formatar número corretamente para WhatsApp API
    let formattedNumber = number.toString().trim();
    if (!formattedNumber.includes('@')) {
      formattedNumber = formattedNumber + '@s.whatsapp.net';
    }

    // Primeiro, tenta buscar nos contatos salvos (mais confiável para o nome)
    const contactsResponse = await fetch(`${EVOLUTION_BASE_URL}/chat/findContacts/${EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify({
        where: { id: formattedNumber }
      })
    });

    let contactData = null;
    if (contactsResponse.ok) {
      const contacts = await contactsResponse.json();
      contactData = contacts.find(c => c.remoteJid === formattedNumber);
    }

    // Segundo, busca informações de perfil (para foto e status)
    const profileResponse = await fetch(`${EVOLUTION_BASE_URL}/chat/fetchProfile/${EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify({
        number: formattedNumber
      })
    });

    let profileData = null;
    if (profileResponse.ok) {
      profileData = await profileResponse.json();
    }

    // Combina informações de ambas as fontes
    const name = contactData?.pushName || profileData?.pushName || 'Usuário';
    const picture = contactData?.profilePicUrl || profileData?.picture || null;
    const status = profileData?.status?.status || null;
    const isBusiness = profileData?.isBusiness || false;
    const numberExists = profileData?.numberExists !== false;
    
    // Identificar gênero pelo nome
    const gender = identifyGender(name);
    
    console.log(` Perfil obtido: ${name} (${gender})`);
    
    return {
      number: formattedNumber,
      name: name,
      picture: picture,
      status: status,
      isBusiness: isBusiness,
      gender: gender,
      numberExists: numberExists
    };

  } catch (error) {
    console.error(' Erro ao buscar perfil do contato:', error);
    return {
      number: number,
      name: 'Usuário',
      picture: null,
      status: null,
      isBusiness: false,
      gender: 'neutro',
      numberExists: false
    };
  }
}

/**
 * Identifica gênero baseado no nome (Brasil/português)
 * @param {string} name - Nome do contato
 * @returns {string} - 'masculino', 'feminino' ou 'neutro'
 */
function identifyGender(name) {
  if (!name || typeof name !== 'string') return 'neutro';
  
  const nameStr = name.toLowerCase().trim();
  
  // Nomes tipicamente femininos (terminações comuns)
  const femaleEndings = ['a', 'ana', 'ina', 'ária', 'eira', 'isa', 'osa', 'ura', 'ia', 'ella', 'elle'];
  const femaleNames = [
    'maria', 'ana', 'beatriz', 'carla', 'daniela', 'eliana', 'fernanda', 'gabriela', 
    'helena', 'isabela', 'julia', 'karen', 'laura', 'mariana', 'natalia', 'patricia',
    'raquel', 'sandra', 'tatiana', 'vanessa', 'viviane', 'amanda', 'bruna', 'camila',
    'debora', 'elaine', 'francine', 'giovanna', 'ingrid', 'jessica', 'karina', 'leticia',
    'monica', 'nicole', 'priscila', 'regina', 'silvia', 'thais', 'valeria', 'wendy'
  ];
  
  // Nomes tipicamente masculinos (terminações comuns)
  const maleEndings = ['o', 'os', 'or', 'ar', 'er', 'ir', 'ão', 'el', 'il', 'ul'];
  const maleNames = [
    'antonio', 'bruno', 'carlos', 'diego', 'eduardo', 'fernando', 'gustavo', 'henrique',
    'igor', 'joao', 'kevin', 'leonardo', 'marcelo', 'nicolas', 'otavio', 'paulo',
    'rafael', 'sergio', 'thiago', 'vinicius', 'wellington', 'alexandre', 'andre', 'caio',
    'daniel', 'emerson', 'fabricio', 'gabriel', 'heitor', 'ivan', 'jorge', 'lucas',
    'mateus', 'natan', 'oscar', 'pedro', 'rodrigo', 'samuel', 'vitor', 'yuri'
  ];
  
  // Verifica primeiro nome (mais comum em whatsapp)
  const firstName = nameStr.split(' ')[0];
  
  // Busca exata por nomes conhecidos
  if (femaleNames.includes(firstName)) return 'feminino';
  if (maleNames.includes(firstName)) return 'masculino';
  
  // Verifica terminações típicas
  for (const ending of femaleEndings) {
    if (firstName.endsWith(ending) && firstName.length > ending.length) {
      return 'feminino';
    }
  }
  
  for (const ending of maleEndings) {
    if (firstName.endsWith(ending) && firstName.length > ending.length) {
      return 'masculino';
    }
  }
  
  return 'neutro';
}

/**
 * Verifica se instância Evolution está conectada
 * @returns {Promise<object>}
 */
export async function checkEvolutionStatus() {
  if (!EVOLUTION_API_KEY) {
    return { connected: false, error: 'EVOLUTION_API_KEY não configurada' };
  }

  try {
    const response = await fetch(`${EVOLUTION_BASE_URL}/instance/connectionState/${EVOLUTION_INSTANCE}`, {
      headers: {
        'apikey': EVOLUTION_API_KEY
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    return {
      connected: result.instance?.state === 'open',
      state: result.instance?.state,
      data: result
    };

  } catch (error) {
    return {
      connected: false,
      error: error.message
    };
  }
}

/**
 * Processa áudio WhatsApp usando Whisper (OpenAI)
 * @param {string} audioBase64 - Áudio em base64
 * @param {string} format - Formato do áudio (ogg, mp3, wav, etc.)
 * @returns {Promise<string>} Texto transcrito
 */
export async function transcribeWhatsAppAudio(audioBase64, format = 'ogg') {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY não configurada no .env');
  }

  const startTime = Date.now();
  console.log(' [RÁPIDO] Iniciando transcrição otimizada...');

  try {
    // Converte base64 para buffer (assíncrono)
    const audioBuffer = Buffer.from(audioBase64, 'base64');

    // Criar stream em memória (sem arquivo temporário)
    const { Readable } = await import('stream');
    const audioStream = new Readable();
    audioStream.push(audioBuffer);
    audioStream.push(null);

    // Definir nome do stream para Whisper
    audioStream.path = `audio.${format}`;

    console.log(` [OTIMIZADO] Buffer preparado em ${Date.now() - startTime}ms`);

    // Transcreve usando Whisper com configurações otimizadas
    const transcription = await openai.audio.transcriptions.create({
      file: audioStream,
      model: 'whisper-1',
      language: 'pt',
      response_format: 'text', // Mais rápido que JSON
      temperature: 0.0, // Determinístico e mais rápido
      prompt: 'Áudio em português brasileiro. Resposta curta e direta.' // Contexto para acelerar
    });

    const totalTime = Date.now() - startTime;
    const transcribedText = typeof transcription === 'string' ? transcription : transcription.text;

    console.log(` [PERFORMANCE] Transcrição completa em ${totalTime}ms: "${transcribedText.substring(0, 50)}..."`);
    return transcribedText;
    
  } catch (error) {
    console.error(' Erro na transcrição:', error);
    throw error;
  }
}

/**
 * Transcreve áudio de mensagem WhatsApp completa (download + transcription)
 * @param {object} message - Objeto da mensagem com dados de áudio
 * @returns {Promise<string>} Texto transcrito
 */
export async function transcribeWhatsAppMessage(message) {
  try {
    // Baixa o áudio usando o messageId
    const audioBase64 = await downloadWhatsAppMedia(message.key.id);

    if (!audioBase64) {
      throw new Error('Não foi possível baixar o áudio');
    }

    // Determina o formato baseado no tipo de mídia
    const format = message.message?.audioMessage?.mimetype?.includes('ogg') ? 'ogg' : 'mp3';

    // Transcreve o áudio
    const transcription = await transcribeWhatsAppAudio(audioBase64, format);

    return transcription;

  } catch (error) {
    console.error(' Erro ao transcrever mensagem de áudio WhatsApp:', error);
    throw error;
  }
}

/**
 * Configura settings da instância (incluindo chamadas)
 * @param {object} settings - Configurações da instância
 * @returns {Promise<object>}
 */
export async function updateInstanceSettings(settings = {}) {
  if (!EVOLUTION_API_KEY) {
    throw new Error('EVOLUTION_API_KEY não configurada no .env');
  }

  const defaultSettings = {
    rejectCall: false, // Permitir chamadas
    msgCall: ' Olá! Recebemos sua ligação. No momento estou ocupado, mas responderei em breve via mensagem.',
    groupsIgnore: false,
    alwaysOnline: true,
    readMessages: true,
    readStatus: false,
    syncFullHistory: false,
    ...settings
  };

  try {
    const response = await fetch(`${EVOLUTION_BASE_URL}/settings/set/${EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify(defaultSettings)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Evolution API erro: ${response.status} - ${errorBody}`);
    }

    const result = await response.json();
    console.log(' Configurações da instância atualizadas');
    return result;

  } catch (error) {
    console.error(' Erro ao atualizar configurações:', error);
    throw error;
  }
}

/**
 * Envia áudio via WhatsApp
 * @param {string} number - Número do destinatário
 * @param {string} audioPath - Caminho para o arquivo de áudio
 * @returns {Promise<object>}
 */
export async function sendWhatsAppAudio(number, audioPath) {
  console.warn('[DEPRECATED] sendWhatsAppAudio called. Use WhatsAppAdapter instead.');
  const { sendWhatsAppAudio } = await import('../services/whatsappAdapterProvider.js');
  const result = await sendWhatsAppAudio(number, audioPath);
  return result?.raw || result;
}

/**
 * Envia mídia via WhatsApp (imagem, vídeo, áudio, documento)
 * @param {string} number - Número do destinatário
 * @param {string|Buffer} media - URL, caminho do arquivo ou Buffer
 * @param {Object} options - Opções { type, caption, fileName }
 * @returns {Promise<object>}
 */
export async function sendWhatsAppMedia(number, media, options = {}) {
  console.warn('[DEPRECATED] sendWhatsAppMedia called. Use WhatsAppAdapter instead.');
  const { sendWhatsAppMedia } = await import('../services/whatsappAdapterProvider.js');
  const result = await sendWhatsAppMedia(number, media, options);
  return result?.raw || result;
}

/**
 * Gera áudio usando Text-to-Speech da OpenAI
 * @param {string} text - Texto para converter em áudio
 * @param {string} voice - Voz (alloy, echo, fable, onyx, nova, shimmer)
 * @returns {Promise<string>} Caminho do arquivo de áudio gerado
 */
export async function generateTTSAudio(text, voice = 'nova') {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY não configurada no .env');
  }

  try {
    console.log(' Gerando áudio TTS...');
    
    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: voice,
      input: text,
      response_format: 'mp3',
      speed: 1.0
    });

    // Salva o áudio em arquivo temporário
    const tempFileName = `tts_audio_${Date.now()}.mp3`;
    const tempFilePath = `/tmp/${tempFileName}`;
    
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(tempFilePath, buffer);
    
    console.log(' Áudio TTS gerado:', tempFilePath);
    return tempFilePath;
    
  } catch (error) {
    console.error(' Erro ao gerar TTS:', error);
    throw error;
  }
}

/**
 * Gera e envia mensagem de áudio via WhatsApp
 * @param {string} number - Número do destinatário
 * @param {string} text - Texto para converter em áudio
 * @param {string} voice - Voz do TTS
 * @returns {Promise<object>}
 */
export async function sendTTSWhatsAppMessage(number, text, voice = 'nova') {
  // TTS DESABILITADO - Sistema focado 100% em texto persuasivo
  console.log(' TTS desabilitado. Sistema focado 100% em texto persuasivo.');
  return { success: false, message: 'TTS desabilitado' };
}

/**
 * Envia TTS com arquétipo e inicia conversa automática
 * @param {string} number - Número do WhatsApp
 * @param {string} text - Texto para TTS
 * @param {string} voice - Voz do TTS
 * @param {boolean} startConversation - Se deve iniciar conversa após áudio
 * @returns {Promise<object>}
 */
export async function sendIntelligentTTS(number, text, voice = 'nova', startConversation = true) {
  // TTS DESABILITADO - Sistema focado 100% em texto persuasivo
  console.log(' TTS desabilitado. Sistema focado 100% em texto persuasivo.');
  return { success: false, message: 'TTS desabilitado' };
}

/**
 * Analisa perfil profissionalmente e gera estratégia personalizada
 * @param {object} profile - Perfil do WhatsApp do contato
 * @returns {Promise<object>} Análise e estratégia gerada pela LLM
 */
export async function analyzeProfileAndStrategy(profile) {
  try {
    console.log(' Analisando perfil e gerando estratégia...');
    
    const analysisPrompt = `Como especialista em vendas B2B da Digital Boost, analise este perfil e crie uma estratégia de abordagem:

PERFIL DO CONTATO:
- Nome: ${profile.name}
- Empresa/Negócio: ${profile.company || profile.name}
- Gênero: ${profile.gender}
- Status WhatsApp: ${profile.status || 'Não disponível'}
- É empresa/negócio: ${profile.isBusiness ? 'Sim' : 'Não'}
- Número: ${profile.number}
- Endereço: ${profile.address || 'Não informado'}
- Dores conhecidas: ${profile.pain_points ? profile.pain_points.join(', ') : 'A descobrir'}
- Fonte: ${profile.source || 'whatsapp'}

SOBRE A DIGITAL BOOST:
Somos uma agência de marketing digital especializada em:
- Automação de Processos e Chatbots
- Gestão de Redes Sociais
- Campanhas de Ads (Google, Meta, LinkedIn)
- Criação de Sites e Landing Pages
- Integração de Sistemas (CRM, WhatsApp, APIs)
- Consultoria em Marketing Digital

TAREFA:
1. Analise o perfil (nome, status, se é empresa) para identificar possível área de atuação
2. Identifique dores potenciais que nossos serviços podem resolver
3. Sugira a melhor abordagem considerando o gênero e perfil profissional
4. Crie uma estratégia de value proposition específica

RETORNE UM JSON com esta estrutura:
{
  "profile_analysis": "Análise do perfil e possível área de atuação",
  "pain_points": ["dor1", "dor2", "dor3"],
  "recommended_approach": "Como abordar este perfil específico",
  "value_proposition": "Proposta de valor personalizada",
  "services_focus": ["serviço1", "serviço2"],
  "tone": "formal/informal/consultivo"
}

Seja estratégico e personalizado baseado nas informações disponíveis.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Você é um especialista em vendas B2B e marketing digital. Analise perfis e crie estratégias personalizadas de abordagem comercial.'
        },
        {
          role: 'user',
          content: analysisPrompt
        }
      ],
      response_format: { type: 'json_object' }
    });

    const strategy = JSON.parse(response.choices[0].message.content);
    console.log(' Estratégia gerada:', strategy.recommended_approach);
    
    return strategy;
    
  } catch (error) {
    console.error(' Erro na análise do perfil:', error);
    return {
      profile_analysis: 'Perfil padrão para prospecção geral',
      pain_points: ['falta de presença digital', 'baixa conversão online', 'processos manuais'],
      recommended_approach: 'Abordagem consultiva focada em resultados',
      value_proposition: 'Aumentamos suas vendas através do marketing digital',
      services_focus: ['Automação', 'Ads', 'Redes Sociais'],
      tone: 'consultivo'
    };
  }
}

/**
 * Gera roteiro personalizado de áudio para ligação comercial
 * @param {object} profile - Perfil do contato
 * @param {object} strategy - Estratégia gerada pela análise
 * @param {string} purpose - Propósito específico da ligação
 * @returns {Promise<string>} Roteiro personalizado
 */
export async function generatePersonalizedScript(profile, strategy, purpose = 'apresentação') {
  const name = profile.name || 'profissional';
  const gender = profile.gender || 'neutro';
  const greeting = gender === 'feminino' ? 'Olá' : gender === 'masculino' ? 'E aí' : 'Olá';
  
  try {
    console.log(' Gerando roteiro personalizado...');
    
    // Analisar contexto e selecionar arquétipo
    const contextForAnalysis = `${strategy.profile_analysis} ${strategy.recommended_approach} ${strategy.value_proposition}`;
    const leadProfile = `${profile.name} - ${strategy.profile_analysis}`;
    const selectedArchetype = await analyzeAndSelectArchetype(contextForAnalysis, leadProfile, purpose);
    
    const scriptPrompt = `Crie um roteiro de áudio para ligação comercial com as seguintes informações:

CONTATO:
- Nome: ${name}
- Gênero: ${gender}
- Tom: ${strategy.tone}

ESTRATÉGIA:
- Análise: ${strategy.profile_analysis}
- Abordagem: ${strategy.recommended_approach}  
- Proposta de Valor: ${strategy.value_proposition}
- Serviços Foco: ${strategy.services_focus.join(', ')}
- Dores Identificadas: ${strategy.pain_points.join(', ')}

PROPÓSITO: ${purpose}

DIRETRIZES DO ROTEIRO:
1. Duração: 30-45 segundos máximo
2. Tom natural e conversacional
3. Personalizado com o nome da pessoa
4. Focado na proposta de valor específica
5. Call-to-action claro
6. Mencionar Digital Boost
7. Linguagem adequada ao gênero identificado

ESTRUTURA:
- Saudação personalizada
- Apresentação rápida (ORBION da Digital Boost)
- Gancho baseado na dor/oportunidade identificada
- Proposta de valor específica
- Call-to-action para resposta

Retorne APENAS o texto do roteiro, sem formatação extra, pronto para ser convertido em áudio.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Você é um copywriter especialista em roteiros de áudio para vendas B2B. Crie roteiros naturais, persuasivos e personalizados.'
        },
        {
          role: 'user',
          content: scriptPrompt
        }
      ]
    });

    const baseScript = response.choices[0].message.content.trim();
    console.log(' Roteiro base gerado:', baseScript.substring(0, 100) + '...');
    
    // Aplicar arquétipo ao roteiro
    const archetypeContext = `Lead: ${name}, Estratégia: ${strategy.recommended_approach}`;
    const finalScript = await applyArchetypeToScript(baseScript, selectedArchetype, archetypeContext);
    
    console.log(` Roteiro final (${selectedArchetype}):`, finalScript.substring(0, 100) + '...');
    
    // Retornar apenas o script por enquanto
    return finalScript;
    
  } catch (error) {
    console.error(' Erro ao gerar roteiro:', error);
    return `${greeting} ${name}! Aqui é o ORBION da Digital Boost. ` +
           `Especialista em marketing digital, estou entrando em contato porque identifiquei oportunidades ` +
           `para aumentar seus resultados online. Temos cases de sucesso em automação, ads e redes sociais. ` +
           `Que tal conversarmos sobre como podemos impulsionar seu negócio? Responda este áudio ou me mande uma mensagem!`;
  }
}

/**
 * Executa ligação inteligente com análise de perfil e roteiro personalizado
 * @param {string} number - Número para ligar
 * @param {string} purpose - Propósito da ligação
 * @param {string} voice - Voz do TTS
 * @returns {Promise<object>}
 */
export async function makeIntelligentCall(number, purpose = 'apresentação comercial', voice = 'nova') {
  try {
    console.log(' Iniciando ligação inteligente para:', number);
    
    // 1. Busca perfil detalhado
    const profile = await getContactProfile(number);
    console.log(` Perfil: ${profile.name} (${profile.gender})`);
    
    // 2. Analisa perfil e gera estratégia
    const strategy = await analyzeProfileAndStrategy(profile);
    
    // 3. Gera roteiro personalizado
    const script = await generatePersonalizedScript(profile, strategy, purpose);
    
    // 4. Envia áudio TTS com roteiro usando arquétipos e follow-up automático
    const audioResult = await sendIntelligentTTS(number, script, voice, true);
    
    // 5. Retorna relatório completo
    return {
      success: true,
      contact: {
        name: profile.name,
        number: number,
        gender: profile.gender,
        isBusiness: profile.isBusiness
      },
      strategy: strategy,
      script_used: script,
      audio_sent: true,
      text_sent: true,
      message: `Ligação inteligente realizada para ${profile.name} com estratégia personalizada`
    };
    
  } catch (error) {
    console.error(' Erro na ligação inteligente:', error);
    throw error;
  }
}

/**
 * Carrega lista de leads do arquivo Excel
 * @returns {Promise<Array>} Lista de leads
 */
export async function loadLeadsList() {
  try {
    const leadsPath = './data/leads.xlsx';
    
    if (!fs.existsSync(leadsPath)) {
      console.log(' Arquivo de leads não encontrado');
      return [];
    }
    
    // Importa xlsx dinamicamente
    const XLSX = (await import('xlsx')).default;
    
    const workbook = XLSX.readFile(leadsPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const leads = XLSX.utils.sheet_to_json(worksheet);
    
    // Normaliza os dados dos leads
    return leads.map(lead => ({
      name: lead.Nome || lead.name || 'Lead',
      company: lead.Empresa || lead.company || '',
      contact: lead.Contato || lead.contact || lead.phone || '',
      status: lead.Status || lead.status || 'Ativo',
      notes: lead.Observações || lead.notes || ''
    }));
    
  } catch (error) {
    console.error(' Erro ao carregar leads:', error);
    return [];
  }
}

/**
 * Executa campanha de ligações inteligentes para leads
 * @param {string} campaignType - Tipo de campanha (all, active, specific)
 * @param {Array} targetNumbers - Números específicos (opcional)
 * @param {string} purpose - Propósito da campanha
 * @returns {Promise<object>}
 */
export async function runIntelligentCampaign(campaignType = 'active', targetNumbers = [], purpose = 'prospecção comercial') {
  try {
    console.log(` Iniciando campanha inteligente: ${campaignType}`);
    
    let targets = [];
    
    if (campaignType === 'specific' && targetNumbers.length > 0) {
      // Números específicos fornecidos
      targets = targetNumbers.map(number => ({
        contact: number,
        name: 'Contato',
        source: 'manual'
      }));
    } else {
      // Carrega leads do arquivo
      const leads = await loadLeadsList();
      
      if (campaignType === 'active') {
        targets = leads.filter(lead => 
          lead.status === 'Ativo' && lead.contact && lead.contact.trim()
        );
      } else if (campaignType === 'all') {
        targets = leads.filter(lead => lead.contact && lead.contact.trim());
      }
    }
    
    if (targets.length === 0) {
      return {
        success: false,
        message: 'Nenhum lead encontrado para a campanha',
        results: []
      };
    }
    
    console.log(` Alvo: ${targets.length} contatos`);
    
    const results = [];
    const delay = 10000; // 10 segundos entre chamadas para não sobrecarregar
    
    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      
      try {
        console.log(` ${i + 1}/${targets.length}: Ligando para ${target.name} (${target.contact})`);
        
        const result = await makeIntelligentCall(target.contact, purpose);
        
        results.push({
          ...result,
          lead_name: target.name,
          lead_company: target.company || '',
          order: i + 1
        });
        
        // Aguarda entre chamadas (exceto na última)
        if (i < targets.length - 1) {
          console.log(` Aguardando ${delay / 1000}s antes da próxima ligação...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
      } catch (error) {
        console.error(` Erro na ligação para ${target.name}:`, error);
        results.push({
          success: false,
          contact: { name: target.name, number: target.contact },
          error: error.message,
          order: i + 1
        });
      }
    }
    
    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;
    
    return {
      success: true,
      campaign_type: campaignType,
      purpose: purpose,
      total_targets: targets.length,
      successful_calls: successful,
      failed_calls: failed,
      results: results,
      message: `Campanha concluída: ${successful} sucessos, ${failed} falhas`
    };
    
  } catch (error) {
    console.error(' Erro na campanha inteligente:', error);
    throw error;
  }
}

/**
 * Executa ligação inteligente para um lead específico ou número aleatório
 * @param {string} identifier - Nome do lead, número ou 'random'
 * @param {string} purpose - Propósito da ligação
 * @returns {Promise<object>}
 */
export async function callLeadOrNumber(identifier, purpose = 'apresentação comercial') {
  try {
    console.log(` Buscando contato: ${identifier}`);
    
    let targetNumber = null;
    let leadInfo = null;
    
    // Se for um número direto
    if (identifier.match(/^\d+$/)) {
      targetNumber = identifier;
      console.log(' Número direto identificado');
    } 
    // Se for "random" ou "aleatorio"
    else if (identifier.toLowerCase().includes('random') || identifier.toLowerCase().includes('aleatorio')) {
      const leads = await loadLeadsList();
      const activeLeads = leads.filter(lead => lead.status === 'Ativo' && lead.contact);
      
      if (activeLeads.length > 0) {
        const randomLead = activeLeads[Math.floor(Math.random() * activeLeads.length)];
        targetNumber = randomLead.contact;
        leadInfo = randomLead;
        console.log(` Lead aleatório selecionado: ${randomLead.name}`);
      }
    }
    // Se for nome de um lead
    else {
      const leads = await loadLeadsList();
      const foundLead = leads.find(lead => 
        lead.name.toLowerCase().includes(identifier.toLowerCase()) ||
        identifier.toLowerCase().includes(lead.name.toLowerCase())
      );
      
      if (foundLead) {
        targetNumber = foundLead.contact;
        leadInfo = foundLead;
        console.log(` Lead encontrado: ${foundLead.name}`);
      }
    }
    
    if (!targetNumber) {
      return {
        success: false,
        message: `Contato não encontrado: ${identifier}`,
        suggestion: 'Tente um número direto, nome de um lead da lista, ou "random"'
      };
    }
    
    // Executa ligação inteligente
    const result = await makeIntelligentCall(targetNumber, purpose);
    
    // Adiciona informações do lead se disponível
    if (leadInfo) {
      result.lead_info = leadInfo;
      result.source = 'leads_database';
    } else {
      result.source = 'direct_number';
    }
    
    return result;
    
  } catch (error) {
    console.error(' Erro ao ligar para lead/número:', error);
    throw error;
  }
}

/**
 * Envia mensagem WhatsApp usando número específico como remetente
 * @param {string} fromNumber - Número remetente (formato: 5511999999999@s.whatsapp.net)
 * @param {string} toNumber - Número destinatário
 * @param {string} text - Texto da mensagem
 * @returns {Promise<object>}
 */
export async function sendWhatsAppMessageFrom(fromNumber, toNumber, text) {
  if (!EVOLUTION_API_KEY) {
    throw new Error('EVOLUTION_API_KEY não configurada no .env');
  }

  // Formatar números corretamente
  let formattedTo = toNumber.toString().trim();
  if (!formattedTo.includes('@')) {
    formattedTo = formattedTo + '@s.whatsapp.net';
  }

  let formattedFrom = fromNumber.toString().trim();
  if (!formattedFrom.includes('@')) {
    formattedFrom = formattedFrom + '@s.whatsapp.net';
  }

  try {
    console.log(` Enviando de ${formattedFrom} para ${formattedTo}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const response = await fetch(`${EVOLUTION_BASE_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify({
        number: formattedTo,
        text: text,
        delay: 1000 // Delay de 1 segundo
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Evolution API erro: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    console.log(' Mensagem enviada via ORBION:', result);
    
    return result;
  } catch (error) {
    console.error(' Erro ao enviar via número específico:', error.message);
    // Fallback: envia pela forma padrão
    return await sendWhatsAppMessage(toNumber, text);
  }
}

/**
 * Simula chamada enviando áudio TTS explicativo (versão legada)
 * @param {string} number - Número para "ligar"
 * @param {string} reason - Motivo da ligação
 * @returns {Promise<object>}
 */
export async function makeVirtualCall(number, reason = '') {
  // Versão simplificada - usa a nova função inteligente
  return await makeIntelligentCall(number, reason || 'apresentação comercial');
}

/**
 * Baixa mídia do WhatsApp e analisa o documento
 * @param {string} messageId - ID da mensagem com mídia
 * @param {string} phoneNumber - Número que enviou
 * @returns {Promise<object>}
 */
export async function downloadAndAnalyzeWhatsAppMedia(messageId, phoneNumber) {
  try {
    if (!EVOLUTION_API_KEY) {
      throw new Error('EVOLUTION_API_KEY não configurada');
    }

    console.log(` Baixando mídia do WhatsApp - Message: ${messageId}`);

    // Baixar informações da mídia
    const mediaResponse = await fetch(`${EVOLUTION_BASE_URL}/chat/findMessages/${EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify({
        where: {
          key: {
            id: messageId
          }
        }
      })
    });

    if (!mediaResponse.ok) {
      throw new Error(`Erro ao buscar mensagem: ${mediaResponse.status}`);
    }

    const messageData = await mediaResponse.json();
    const message = messageData[0];

    if (!message || !message.message) {
      throw new Error('Mensagem não encontrada ou não contém mídia');
    }

    // Verificar se é mídia
    let mediaInfo = null;
    let mediaType = null;

    if (message.message.imageMessage) {
      mediaInfo = message.message.imageMessage;
      mediaType = 'image';
    } else if (message.message.documentMessage) {
      mediaInfo = message.message.documentMessage;
      mediaType = 'document';
    } else if (message.message.audioMessage) {
      mediaInfo = message.message.audioMessage;
      mediaType = 'audio';
    } else if (message.message.videoMessage) {
      mediaInfo = message.message.videoMessage;
      mediaType = 'video';
    } else {
      throw new Error('Mensagem não contém mídia suportada');
    }

    // Baixar o arquivo
    const downloadResponse = await fetch(`${EVOLUTION_BASE_URL}/chat/getBase64FromMediaMessage/${EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify({
        message: message.message
      })
    });

    if (!downloadResponse.ok) {
      throw new Error(`Erro ao baixar mídia: ${downloadResponse.status}`);
    }

    const base64Data = await downloadResponse.json();
    
    // Salvar arquivo temporariamente
    const fileName = mediaInfo.caption || `whatsapp_${mediaType}_${Date.now()}`;
    const fileExtension = getFileExtension(mediaInfo.mimetype || '');
    const fullFileName = `${fileName}${fileExtension}`;
    const uploadsDir = path.join(process.cwd(), 'uploads');
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const filePath = path.join(uploadsDir, fullFileName);
    
    // Converter base64 para arquivo
    const buffer = Buffer.from(base64Data.base64, 'base64');
    fs.writeFileSync(filePath, buffer);

    // Analisar o documento usando document_analyzer.js (módulo correto)
    const { analyzeDocument } = await import('./document_analyzer.js');
    const analysis = await analyzeDocument(filePath, {
      customPrompt: `Este documento foi recebido via WhatsApp do contato ${phoneNumber}. Analise detalhadamente seu conteúdo.`
    });

    // Salvar no banco
    try {
      const { saveDocumentAnalysis } = await import('../memory.js');
      await saveDocumentAnalysis({
        ...analysis,
        source: 'whatsapp',
        phoneNumber: phoneNumber,
        messageId: messageId
      });
    } catch (dbError) {
      console.log(' Erro ao salvar análise no banco:', dbError.message);
    }

    // Enviar resumo da análise de volta via WhatsApp
    const responseText = ` *Documento Analisado*\n\n` +
      ` *Arquivo:* ${analysis.fileName}\n` +
      ` *Tipo:* ${analysis.fileType}\n` +
      ` *Analisado em:* ${new Date().toLocaleString('pt-BR')}\n\n` +
      ` *Resumo:*\n${analysis.summary}\n\n` +
      ` *Principais pontos:*\n${Array.isArray(analysis.keyPoints) ? analysis.keyPoints.join('\n') : analysis.keyPoints || 'N/A'}`;

    await sendWhatsAppMessage(phoneNumber, responseText);

    // Limpar arquivo temporário
    setTimeout(() => {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.log(' Erro ao limpar arquivo temporário:', err.message);
      }
    }, 30000);

    return {
      success: true,
      analysis: analysis,
      fileName: fullFileName,
      messageId: messageId,
      phoneNumber: phoneNumber
    };

  } catch (error) {
    console.error(' Erro na análise de mídia WhatsApp:', error);
    
    // Informar erro ao usuário
    try {
      await sendWhatsAppMessage(phoneNumber, 
        ` Erro ao analisar documento: ${error.message}\n\n` +
        `Por favor, tente enviar novamente ou verifique se o formato do arquivo é suportado.`
      );
    } catch (sendError) {
      console.error(' Erro ao enviar mensagem de erro:', sendError);
    }
    
    throw error;
  }
}

/**
 * Helper para determinar extensão do arquivo baseada no mimetype
 */
function getFileExtension(mimetype) {
  const mimeMap = {
    'application/pdf': '.pdf',
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/bmp': '.bmp',
    'image/webp': '.webp',
    'audio/mpeg': '.mp3',
    'audio/wav': '.wav',
    'audio/ogg': '.ogg',
    'audio/mp4': '.m4a',
    'video/mp4': '.mp4',
    'video/avi': '.avi',
    'video/quicktime': '.mov',
    'video/webm': '.webm'
  };
  
  return mimeMap[mimetype.toLowerCase()] || '.bin';
}
