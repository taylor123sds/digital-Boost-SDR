import { addTask, listTasks } from './tools/tasks.js';
import { searchKnowledge } from './tools/search_knowledge.js';
import { getTime } from './tools/time.js';
import { createEvent, listEvents } from './tools/calendar_enhanced.js';
import { sendWhatsAppMessage, scheduleWhatsAppMeeting, checkEvolutionStatus, getContactProfile, transcribeWhatsAppAudio, updateInstanceSettings, sendWhatsAppAudio, sendTTSWhatsAppMessage, sendIntelligentTTS, makeVirtualCall, makeIntelligentCall, callLeadOrNumber, runIntelligentCampaign } from './tools/whatsapp.js';
import { analyzeDocument, getSupportedTypes, isFileSupported } from './tools/document_analyzer.js';
import { getDocumentHistory, getDocumentAnalysisStats } from './memory.js';
//  ENHANCED TOOLS IMPORT
// Legacy import removed - now using 3-agent system (SDR  Specialist  Scheduler)

export const toolsSpec = [
  {
    type: 'function',
    function: {
      name: 'add_task',
      description: 'Cria uma tarefa no banco local.',
      parameters: { type: 'object', properties: { title: { type: 'string' } }, required: ['title'] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_tasks',
      description: 'Lista tarefas existentes.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_knowledge',
      description: 'Busca por conhecimento na base local (RAG) e retorna trechos relevantes.',
      parameters: { type: 'object', properties: { query: { type: 'string' }, k: { type: 'number' } }, required: ['query'] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_time',
      description: 'Retorna a hora local do servidor.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'add_event',
      description: 'Adiciona um evento ao calendário local (simples).',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          datetime: { type: 'string', description: 'ISO 8601' },
          notes: { type: 'string' }
        },
        required: ['title', 'datetime']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_events',
      description: 'Lista eventos do calendário local.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'send_whatsapp_message',
      description: 'Envia mensagem via WhatsApp usando Evolution API.',
      parameters: {
        type: 'object',
        properties: {
          number: { type: 'string', description: 'Número do WhatsApp (ex: 5511999999999)' },
          text: { type: 'string', description: 'Mensagem a ser enviada' }
        },
        required: ['number', 'text']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'schedule_whatsapp_meeting',
      description: 'Agenda reunião e notifica o cliente via WhatsApp automaticamente.',
      parameters: {
        type: 'object',
        properties: {
          number: { type: 'string', description: 'Número do WhatsApp (ex: 5511999999999)' },
          title: { type: 'string', description: 'Título/assunto da reunião' },
          datetime: { type: 'string', description: 'Data e hora em formato ISO 8601' },
          notes: { type: 'string', description: 'Observações sobre a reunião' }
        },
        required: ['number', 'title', 'datetime']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'check_evolution_status',
      description: 'Verifica se a instância WhatsApp Evolution está conectada.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_contact_profile',
      description: 'Busca informações do perfil do contato WhatsApp: nome, foto, gênero e status.',
      parameters: {
        type: 'object',
        properties: {
          number: { type: 'string', description: 'Número do WhatsApp (ex: 5511999999999)' }
        },
        required: ['number']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'transcribe_whatsapp_audio',
      description: 'Transcreve áudio WhatsApp usando Whisper AI para texto.',
      parameters: {
        type: 'object',
        properties: {
          audioBase64: { type: 'string', description: 'Áudio em base64' },
          format: { type: 'string', description: 'Formato do áudio (ogg, mp3, wav)', default: 'ogg' }
        },
        required: ['audioBase64']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_instance_settings',
      description: 'Atualiza configurações da instância WhatsApp (chamadas, mensagens automáticas, etc.).',
      parameters: {
        type: 'object',
        properties: {
          settings: { 
            type: 'object',
            description: 'Configurações da instância',
            properties: {
              rejectCall: { type: 'boolean', description: 'Rejeitar chamadas automaticamente' },
              msgCall: { type: 'string', description: 'Mensagem automática para chamadas' },
              alwaysOnline: { type: 'boolean', description: 'Sempre online' },
              readMessages: { type: 'boolean', description: 'Marcar mensagens como lidas' }
            }
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'send_whatsapp_audio',
      description: 'Envia arquivo de áudio via WhatsApp.',
      parameters: {
        type: 'object',
        properties: {
          number: { type: 'string', description: 'Número do WhatsApp (ex: 5511999999999)' },
          audioPath: { type: 'string', description: 'Caminho para arquivo de áudio' }
        },
        required: ['number', 'audioPath']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'send_tts_whatsapp_message',
      description: 'Gera áudio usando Text-to-Speech e envia via WhatsApp.',
      parameters: {
        type: 'object',
        properties: {
          number: { type: 'string', description: 'Número do WhatsApp (ex: 5511999999999)' },
          text: { type: 'string', description: 'Texto para converter em áudio' },
          voice: { 
            type: 'string', 
            description: 'Voz do TTS (alloy, echo, fable, onyx, nova, shimmer)', 
            default: 'nova' 
          }
        },
        required: ['number', 'text']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'send_intelligent_tts',
      description: 'Envia áudio TTS com análise de arquétipos (Mestre/Aventureiro) e inicia conversa automática.',
      parameters: {
        type: 'object',
        properties: {
          number: { type: 'string', description: 'Número do WhatsApp (ex: 5511999999999)' },
          text: { type: 'string', description: 'Texto para converter em áudio com arquétipo' },
          voice: { 
            type: 'string', 
            description: 'Voz do TTS (alloy, echo, fable, onyx, nova, shimmer)', 
            default: 'nova' 
          },
          startConversation: {
            type: 'boolean',
            description: 'Se deve enviar follow-up automático para iniciar conversa',
            default: true
          }
        },
        required: ['number', 'text']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'make_virtual_call',
      description: 'Simula uma chamada telefônica enviando áudio TTS personalizado seguido de mensagem explicativa.',
      parameters: {
        type: 'object',
        properties: {
          number: { type: 'string', description: 'Número do WhatsApp para "ligar" (ex: 5511999999999)' },
          reason: { type: 'string', description: 'Motivo da ligação (opcional)' }
        },
        required: ['number']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'make_intelligent_call',
      description: 'Executa ligação inteligente com análise completa de perfil, geração de estratégia personalizada e roteiro criado pela IA.',
      parameters: {
        type: 'object',
        properties: {
          number: { type: 'string', description: 'Número do WhatsApp (ex: 5511999999999)' },
          purpose: { type: 'string', description: 'Propósito da ligação', default: 'apresentação comercial' },
          voice: { type: 'string', description: 'Voz do TTS (nova, alloy, echo, fable, onyx, shimmer)', default: 'nova' }
        },
        required: ['number']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'call_lead_or_number',
      description: 'Liga para um lead específico por nome, número direto ou seleciona lead aleatório ("random"). Analisa perfil e cria roteiro personalizado.',
      parameters: {
        type: 'object',
        properties: {
          identifier: { 
            type: 'string', 
            description: 'Nome do lead, número direto, ou "random"/"aleatorio" para lead aleatório' 
          },
          purpose: { 
            type: 'string', 
            description: 'Propósito da ligação', 
            default: 'apresentação comercial' 
          }
        },
        required: ['identifier']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'run_intelligent_campaign',
      description: 'Executa campanha de ligações inteligentes para múltiplos leads com análise personalizada para cada contato.',
      parameters: {
        type: 'object',
        properties: {
          campaignType: { 
            type: 'string', 
            description: 'Tipo de campanha: "active" (leads ativos), "all" (todos), "specific" (números específicos)',
            default: 'active'
          },
          targetNumbers: { 
            type: 'array', 
            items: { type: 'string' },
            description: 'Números específicos para campanha tipo "specific"' 
          },
          purpose: { 
            type: 'string', 
            description: 'Propósito da campanha', 
            default: 'prospecção comercial' 
          }
        }
      }
    }
  },
  //  ENHANCED CONVERSATION TOOLS
  {
    type: 'function',
    function: {
      name: 'get_conversation_state',
      description: 'Obtém o estado atual da conversa com análise enhanced (DISCOVERY, QUALIFICATION, SOLUTION_FIT, etc.).',
      parameters: {
        type: 'object',
        properties: {
          from: { type: 'string', description: 'Número do contato (ex: 5511999999999)' }
        },
        required: ['from']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_qualification_score',
      description: 'Calcula score de qualificação do lead (0-100) baseado em critérios enhanced.',
      parameters: {
        type: 'object',
        properties: {
          from: { type: 'string', description: 'Número do contato (ex: 5511999999999)' },
          text: { type: 'string', description: 'Mensagem para análise' }
        },
        required: ['from', 'text']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'analyze_sentiment',
      description: 'Analisa sentimento e emoção da mensagem (excited, interested, neutral, concerned, frustrated, angry, disappointed).',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Texto para análise de sentimento' }
        },
        required: ['text']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_next_best_action',
      description: 'Sugere próxima melhor ação baseada no estado atual da conversa.',
      parameters: {
        type: 'object',
        properties: {
          from: { type: 'string', description: 'Número do contato (ex: 5511999999999)' },
          text: { type: 'string', description: 'Última mensagem do cliente' }
        },
        required: ['from', 'text']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'process_enhanced_message',
      description: 'Processa mensagem com sistema enhanced completo (estado, sentimento, qualificação, ações).',
      parameters: {
        type: 'object',
        properties: {
          from: { type: 'string', description: 'Número do contato (ex: 5511999999999)' },
          text: { type: 'string', description: 'Mensagem para processamento enhanced' },
          profile: {
            type: 'object',
            description: 'Perfil do contato',
            properties: {
              pushName: { type: 'string' },
              profileName: { type: 'string' }
            }
          }
        },
        required: ['from', 'text']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_supported_document_types',
      description: 'Lista os tipos de arquivos suportados para análise (PDF, imagens, áudio, vídeo).',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'check_file_support',
      description: 'Verifica se um tipo de arquivo específico é suportado para análise.',
      parameters: {
        type: 'object',
        properties: {
          fileName: { type: 'string', description: 'Nome do arquivo com extensão' }
        },
        required: ['fileName']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_document_analysis_history',
      description: 'Busca histórico de análises de documentos realizadas.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Número máximo de análises a retornar', default: 10 }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_document_analysis_stats',
      description: 'Obtém estatísticas sobre análises de documentos por tipo de arquivo.',
      parameters: { type: 'object', properties: {} }
    }
  }
];

export async function dispatchTool(name, args) {
  switch (name) {
    case 'add_task': return addTask(args.title);
    case 'list_tasks': return listTasks();
    case 'search_knowledge': return searchKnowledge(args.query, args.k || 4);
    case 'get_time': return getTime();
    case 'add_event': return createEvent({
      title: args.title,
      date: args.datetime.split('T')[0],
      time: args.datetime.split('T')[1]?.substring(0, 5) || '09:00',
      description: args.notes || '',
      duration: 60
    });
    case 'list_events': return listEvents();
    case 'send_whatsapp_message': return sendWhatsAppMessage(args.number, args.text);
    case 'schedule_whatsapp_meeting': return scheduleWhatsAppMeeting(args.number, args.title, args.datetime, args.notes || '');
    case 'check_evolution_status': return checkEvolutionStatus();
    case 'get_contact_profile': return getContactProfile(args.number);
    case 'transcribe_whatsapp_audio': return transcribeWhatsAppAudio(args.audioBase64, args.format || 'ogg');
    case 'update_instance_settings': return updateInstanceSettings(args.settings || {});
    case 'send_whatsapp_audio': return sendWhatsAppAudio(args.number, args.audioPath);
    case 'send_tts_whatsapp_message': return sendTTSWhatsAppMessage(args.number, args.text, args.voice || 'nova');
    case 'send_intelligent_tts': return sendIntelligentTTS(args.number, args.text, args.voice || 'nova', args.startConversation !== false);
    case 'make_virtual_call': return makeVirtualCall(args.number, args.reason || '');
    case 'make_intelligent_call': return makeIntelligentCall(args.number, args.purpose || 'apresentação comercial', args.voice || 'nova');
    case 'call_lead_or_number': return callLeadOrNumber(args.identifier, args.purpose || 'apresentação comercial');
    case 'run_intelligent_campaign': return runIntelligentCampaign(args.campaignType || 'active', args.targetNumbers || [], args.purpose || 'prospecção comercial');
    case 'get_supported_document_types': return getSupportedTypes();
    case 'check_file_support': return { supported: isFileSupported(args.fileName), fileName: args.fileName };
    case 'get_document_analysis_history': return getDocumentHistory(args.limit || 10);
    case 'get_document_analysis_stats': return getDocumentAnalysisStats();
    //  ENHANCED TOOLS DISPATCH
    // Legacy tools removed - now using 3-agent system (SDR  Specialist  Scheduler)
    // The following tools were deprecated as they relied on OrbionHybridAgent:
    // - get_conversation_state, get_qualification_score, analyze_sentiment,
    // - get_next_best_action, process_enhanced_message
    default: return `Tool '${name}' não encontrada.`;
  }
}

//  ENHANCED TOOLS HELPER FUNCTIONS - LEGACY (Removed)
// These functions depended on OrbionHybridAgent which has been replaced by the 3-agent system.
// Current system uses: SDR Agent  Specialist Agent (BANT)  Scheduler Agent
// Conversation state is now managed by AgentHub in src/agents/agent_hub_init.js
