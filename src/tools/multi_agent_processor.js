/**
 * Multi-Agent Processor - Orquestrador dos 3 Agentes
 * Agente 1 (ORBION) → Agente 3 (Document Analyzer) → Agente 2 (Research) → ORBION
 */

import { analyzeDocument, isFileSupported } from './document_analyzer_simple.js';
import { callResearchAgent } from './research_agent.js';
import { sendWhatsAppMessage } from './whatsapp.js';
import { saveMessage } from '../memory.js';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

/**
 * Processa mídia recebida via WhatsApp com fluxo multi-agentes
 * @param {Object} mediaMessage - Mensagem de mídia do WhatsApp
 * @param {string} phoneNumber - Número que enviou
 * @param {string} filePath - Caminho do arquivo baixado
 * @param {Object} conversationContext - Contexto da conversa
 */
export async function processMultiAgentMedia(mediaMessage, phoneNumber, filePath, conversationContext = {}) {
    try {
        console.log('🔄 Iniciando processamento multi-agente para mídia');
        
        // ETAPA 1: Notificar usuário que está processando
        await sendWhatsAppMessage(phoneNumber, 
            '🔍 *Analisando documento...*\n\n' +
            'Estou processando seu arquivo com minha equipe de agentes especializados:\n' +
            '📄 Agente de Análise de Documentos\n' +
            '🔬 Agente de Pesquisa Avançada\n\n' +
            '_Aguarde alguns instantes..._'
        );

        // ETAPA 2: Agente 3 - Análise do documento
        console.log('📄 Agente 3: Iniciando análise do documento');
        
        const documentAnalysis = await analyzeDocument(filePath, {
            customPrompt: `Analise detalhadamente este documento recebido via WhatsApp. 
            Extraia todas as informações relevantes, identifique o contexto, propósito e 
            qualquer elemento que possa ser importante para uma resposta comercial ou de suporte.`,
            phoneNumber: phoneNumber // Passar número para notificações em tempo real
        });

        console.log('✅ Agente 3: Análise concluída');

        // ETAPA 3: Se for áudio transcrito com sucesso, enviar transcrição imediatamente
        if (documentAnalysis.fileType === 'audio' && 
            documentAnalysis.metadata?.status === 'successfully_transcribed' && 
            documentAnalysis.content && 
            documentAnalysis.content.trim().length > 0) {
            
            console.log('🎉 Áudio transcrito com sucesso! Enviando transcrição...');
            
            await sendWhatsAppMessage(phoneNumber, 
                '🎯 *Transcrição Finalizada*\n\n' +
                `📝 *Sua mensagem completa:*\n"${documentAnalysis.content}"\n\n` +
                '🔬 _Agora vou pesquisar informações relacionadas e preparar uma resposta completa..._'
            );
        }

        // ETAPA 4: Preparar contexto para Agente 2
        let researchQuery;
        
        // Se for um áudio que não foi transcrito ou não é suportado, fazer pesquisa específica
        if (documentAnalysis.fileType === 'audio' && 
            (documentAnalysis.metadata?.status === 'audio_received_but_not_transcribed' || 
             documentAnalysis.metadata?.status === 'audio_format_not_supported')) {
            researchQuery = `
            ÁUDIO DO WHATSAPP RECEBIDO:
            
            Situação: Cliente enviou um áudio via WhatsApp de ${Math.round(documentAnalysis.fileSize / 1024)} KB
            Formato: OGG/Opus do WhatsApp
            Status: Não foi possível transcrever automaticamente
            
            CONTEXTO COMERCIAL:
            O cliente está tentando comunicar algo importante por áudio, mas nossa transcrição falhou.
            Preciso de uma resposta comercial inteligente que:
            1. Reconheça que recebemos o áudio
            2. Explique brevemente a situação técnica
            3. Ofereça alternativas práticas
            4. Mantenha engajamento comercial
            5. Demonstre que valorizamos a comunicação dele
            
            SOLICITAÇÃO:
            Forneça estratégias de como responder profissionalmente a um cliente que enviou áudio,
            mantendo o relacionamento e oferecendo soluções práticas.
            `;
        } else {
            researchQuery = `
            ANÁLISE DE DOCUMENTO RECEBIDA:
            
            Tipo de arquivo: ${documentAnalysis.fileType}
            Nome do arquivo: ${documentAnalysis.fileName}
            Tamanho: ${Math.round(documentAnalysis.fileSize / 1024)} KB
            
            CONTEÚDO EXTRAÍDO:
            ${documentAnalysis.content}
            
            RESUMO:
            ${documentAnalysis.summary}
            
            PONTOS-CHAVE:
            ${Array.isArray(documentAnalysis.keyPoints) ? documentAnalysis.keyPoints.join('\n') : documentAnalysis.keyPoints || 'N/A'}
            
            SOLICITAÇÃO:
            Com base nesta análise, preciso de uma pesquisa aprofundada sobre o assunto principal 
            identificado no documento. Forneça informações relevantes, contexto adicional e 
            insights que me ajudem a responder de forma inteligente ao cliente que enviou este documento.
            `;
        }

        // ETAPA 5: Agente 2 - Pesquisa avançada
        console.log('🔬 Agente 2: Iniciando pesquisa avançada');
        
        const researchContext = {
            businessInfo: conversationContext.businessInfo || 'Agente comercial ORBION',
            clientPhone: phoneNumber,
            documentType: documentAnalysis.fileType,
            conversationHistory: conversationContext.history || []
        };

        const researchResult = await callResearchAgent(researchQuery, researchContext);
        console.log('✅ Agente 2: Pesquisa concluída');

        // ETAPA 6: Gerar resposta integrada com OpenAI
        console.log('🤖 ORBION: Gerando resposta integrada');
        
        const finalResponse = await generateIntegratedResponse(
            documentAnalysis, 
            researchResult, 
            phoneNumber, 
            conversationContext
        );

        // ETAPA 7: Enviar resposta final ao cliente
        await sendWhatsAppMessage(phoneNumber, finalResponse);

        // ETAPA 8: Salvar interação completa no histórico
        await saveMessage(phoneNumber, 
            `[DOCUMENTO ANALISADO] ${documentAnalysis.fileName}`, 
            true, 'document'
        );
        await saveMessage(phoneNumber, finalResponse, true, 'text');

        console.log('✅ Processamento multi-agente concluído com sucesso');

        return {
            success: true,
            documentAnalysis,
            researchResult,
            finalResponse,
            phoneNumber
        };

    } catch (error) {
        console.error('❌ Erro no processamento multi-agente:', error);
        
        // Resposta de erro para o usuário
        try {
            await sendWhatsAppMessage(phoneNumber, 
                '❌ *Erro no processamento*\n\n' +
                'Desculpe, ocorreu um erro ao analisar seu documento. ' +
                'Por favor, tente enviar novamente ou entre em contato conosco.\n\n' +
                `_Detalhes: ${error.message}_`
            );
        } catch (sendError) {
            console.error('❌ Erro ao enviar mensagem de erro:', sendError);
        }
        
        throw error;
    }
}

/**
 * Gera resposta integrada combinando análise do documento e pesquisa
 */
async function generateIntegratedResponse(documentAnalysis, researchResult, phoneNumber, context) {
    try {
        const systemPrompt = `Você é ORBION, um agente comercial inteligente e prestativo. 
        
        Você acabou de receber e analisar um documento do cliente ${phoneNumber} usando sua 
        equipe de agentes especializados:
        
        1. Agente de Análise de Documentos extraiu informações detalhadas
        2. Agente de Pesquisa forneceu contexto e informações adicionais
        
        Sua tarefa é criar uma resposta COMPLETA, ÚTIL e COMERCIALMENTE INTELIGENTE que:
        
        ✅ Demonstre que você analisou o documento profundamente
        ✅ Forneça valor adicional baseado na pesquisa realizada
        ✅ Mantenha tom comercial mas cordial
        ✅ Ofereça próximos passos ou soluções
        ✅ Use emojis e formatação WhatsApp (*negrito*, _itálico_)
        
        IMPORTANTE: 
        - Não mencione "agentes" ou aspectos técnicos do processamento
        - Foque no valor que você está entregando ao cliente
        - Seja específico sobre o que foi identificado no documento
        - Ofereça ajuda prática e concreta`;

        const userPrompt = `
        ANÁLISE DO DOCUMENTO RECEBIDO:
        
        📄 Tipo: ${documentAnalysis.fileType}
        📋 Nome: ${documentAnalysis.fileName}
        📏 Tamanho: ${Math.round(documentAnalysis.fileSize / 1024)} KB
        
        🔍 CONTEÚDO IDENTIFICADO:
        ${documentAnalysis.content}
        
        📝 RESUMO DA ANÁLISE:
        ${documentAnalysis.summary}
        
        🎯 PONTOS-CHAVE:
        ${Array.isArray(documentAnalysis.keyPoints) ? documentAnalysis.keyPoints.join('\n• ') : documentAnalysis.keyPoints || 'N/A'}
        
        🔬 PESQUISA COMPLEMENTAR REALIZADA:
        ${researchResult.response || 'Pesquisa não disponível'}
        
        ${researchResult.data ? `\n📊 DADOS ADICIONAIS:\n${JSON.stringify(researchResult.data, null, 2)}` : ''}
        
        Agora crie uma resposta completa e valiosa para o cliente.
        `;

        const response = await openai.chat.completions.create({
            model: process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: systemPrompt
                },
                {
                    role: "user", 
                    content: userPrompt
                }
            ],
            max_tokens: 1500,
            temperature: 0.7
        });

        return response.choices[0].message.content;

    } catch (error) {
        console.error('❌ Erro ao gerar resposta integrada:', error);
        
        // Fallback para resposta básica
        return `📄 *Documento Analisado*\n\n` +
               `Analisei seu ${documentAnalysis.fileType}: *${documentAnalysis.fileName}*\n\n` +
               `📋 *Resumo:*\n${documentAnalysis.summary}\n\n` +
               `🔍 *Principais pontos identificados:*\n${Array.isArray(documentAnalysis.keyPoints) ? documentAnalysis.keyPoints.join('\n• ') : documentAnalysis.keyPoints || 'N/A'}\n\n` +
               `Como posso ajudar você com isso? 🤝`;
    }
}

/**
 * Verifica se uma mensagem do WhatsApp contém mídia suportada
 */
export function hasAnalyzableMedia(message) {
    if (!message) return false;
    
    // Verifica se tem anexos de mídia
    const hasImageMessage = message.imageMessage;
    const hasDocumentMessage = message.documentMessage;
    const hasAudioMessage = message.audioMessage;
    const hasVideoMessage = message.videoMessage;
    
    return !!(hasImageMessage || hasDocumentMessage || hasAudioMessage || hasVideoMessage);
}

/**
 * Extrai informações da mídia da mensagem WhatsApp
 */
export function extractMediaInfo(message) {
    let mediaType = null;
    let mediaInfo = null;
    
    if (message.imageMessage) {
        mediaType = 'image';
        mediaInfo = message.imageMessage;
    } else if (message.documentMessage) {
        mediaType = 'document';
        mediaInfo = message.documentMessage;
    } else if (message.audioMessage) {
        mediaType = 'audio';
        mediaInfo = message.audioMessage;
    } else if (message.videoMessage) {
        mediaType = 'video';
        mediaInfo = message.videoMessage;
    }
    
    return {
        mediaType,
        mediaInfo,
        caption: mediaInfo?.caption || '',
        mimetype: mediaInfo?.mimetype || '',
        fileName: mediaInfo?.fileName || `media_${Date.now()}`
    };
}

export default {
    processMultiAgentMedia,
    hasAnalyzableMedia,
    extractMediaInfo
};