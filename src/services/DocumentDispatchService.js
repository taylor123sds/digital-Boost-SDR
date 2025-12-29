/**
 * @file DocumentDispatchService.js
 * @description Orquestra o fluxo completo do Document Handler:
 *   1. Recebe documento (PDF, imagem, texto)
 *   2. Analisa e extrai informações
 *   3. Classifica tipo de documento
 *   4. Envia para destinatários configurados (email + WhatsApp)
 *
 * Exemplo de uso:
 *   - Sistema de RH envia PDF de férias
 *   - Agente analisa: "João Silva, férias 01/01 a 15/01"
 *   - Agente envia WhatsApp: "Funcionário João Silva entrará de férias..."
 */

import { analyzeDocument } from '../tools/document_analyzer.js';
import { DocumentExtractorService } from './DocumentExtractorService.js';
import { sendEmail } from './EmailService.js';
import { defaultLogger } from '../utils/logger.enhanced.js';
import fs from 'fs';
import path from 'path';

const logger = defaultLogger.child({ module: 'DocumentDispatchService' });

// Evolution API config
const EVOLUTION_BASE_URL = process.env.EVOLUTION_BASE_URL || 'http://localhost:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'default';

/**
 * Serviço de dispatch de documentos
 */
export class DocumentDispatchService {
  constructor() {
    this.extractorService = new DocumentExtractorService();
  }

  /**
   * Processa documento e envia para destinatários
   * @param {Object} params
   * @param {string} params.filePath - Caminho do arquivo
   * @param {string} params.fileName - Nome original do arquivo
   * @param {string} params.mimeType - Tipo MIME
   * @param {Object} params.agentConfig - Configuração do agente
   * @param {Object} params.metadata - Metadados adicionais (origem, etc)
   * @returns {Promise<Object>} Resultado do processamento
   */
  async processAndDispatch({ filePath, fileName, mimeType, agentConfig, metadata = {} }) {
    const startTime = Date.now();
    const result = {
      success: false,
      documentId: null,
      classification: null,
      extraction: null,
      notifications: [],
      errors: []
    };

    try {
      logger.info('Starting document dispatch', { fileName, agentId: agentConfig?.id });

      // 1. Analisar documento (extrair texto)
      const analysis = await analyzeDocument(filePath);

      if (!analysis?.content) {
        throw new Error('Não foi possível extrair conteúdo do documento');
      }

      logger.info('Document analyzed', {
        pageCount: analysis.pageCount,
        contentLength: analysis.content?.length,
        ocrApplied: analysis.ocrApplied
      });

      // 2. Classificar tipo de documento
      const classification = await this.extractorService.classifyDocument(analysis.content);
      result.classification = classification;

      logger.info('Document classified', { type: classification.type, confidence: classification.confidence });

      // 3. Extrair campos estruturados
      let extraction = null;
      if (['licitacao', 'contrato', 'termo_referencia', 'atestado', 'ferias', 'nota_fiscal'].includes(classification.type)) {
        extraction = await this.extractorService.extractFields(analysis.content, classification.type);
        result.extraction = extraction;

        logger.info('Fields extracted', {
          success: extraction.success,
          fieldCount: Object.keys(extraction.fields || {}).length
        });
      }

      // 4. Gerar resumo para notificação
      const summary = await this.generateNotificationSummary(classification, extraction, analysis.content);

      // 5. Encontrar rota correspondente
      const route = this.findMatchingRoute(classification.type, agentConfig);

      if (!route) {
        logger.warn('No matching route found', { documentType: classification.type });
        result.warnings = ['Nenhuma rota configurada para este tipo de documento'];
      }

      // 6. Enviar notificações
      if (route) {
        const notifications = await this.sendNotifications({
          route,
          summary,
          classification,
          extraction,
          filePath,
          fileName,
          agentConfig,
          metadata
        });
        result.notifications = notifications;
      }

      result.success = true;
      result.processingTimeMs = Date.now() - startTime;

      logger.info('Document dispatch completed', {
        success: true,
        classificationType: classification.type,
        notificationsSent: result.notifications.filter(n => n.success).length,
        processingTimeMs: result.processingTimeMs
      });

      return result;

    } catch (error) {
      logger.error('Document dispatch failed', { error: error.message, fileName });
      result.errors.push(error.message);
      result.processingTimeMs = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Gera resumo formatado para notificação
   */
  async generateNotificationSummary(classification, extraction, textContent) {
    const fields = extraction?.fields || {};

    // Templates por tipo de documento
    const templates = {
      ferias: () => {
        const nome = fields.nome?.value || fields.funcionario?.value || 'Funcionário';
        const inicio = fields.data_inicio?.value || fields.periodo_inicio?.value || '—';
        const fim = fields.data_fim?.value || fields.periodo_fim?.value || '—';
        const setor = fields.setor?.value || fields.departamento?.value || '';

        return {
          titulo: '🏖️ Aviso de Férias',
          corpo: `O funcionário ${nome}${setor ? ` (${setor})` : ''} entrará de férias no período de ${inicio} a ${fim}.`,
          acao: 'Providenciar cobertura se necessário.'
        };
      },

      atestado: () => {
        const nome = fields.nome?.value || fields.paciente?.value || 'Funcionário';
        const dias = fields.dias_afastamento?.value || fields.periodo?.value || '—';
        const data = fields.data?.value || '—';
        const cid = fields.cid?.value || '';

        return {
          titulo: '🏥 Atestado Médico Recebido',
          corpo: `${nome} apresentou atestado médico${cid ? ` (CID: ${cid})` : ''} com afastamento de ${dias} dias a partir de ${data}.`,
          acao: 'Registrar no sistema de ponto.'
        };
      },

      nota_fiscal: () => {
        const numero = fields.numero?.value || fields.numero_nf?.value || '—';
        const valor = fields.valor?.value || fields.valor_total?.value || '—';
        const fornecedor = fields.fornecedor?.value || fields.emitente?.value || '—';
        const data = fields.data_emissao?.value || fields.data?.value || '—';

        return {
          titulo: '🧾 Nota Fiscal Recebida',
          corpo: `NF ${numero} do fornecedor ${fornecedor}, valor ${typeof valor === 'number' ? `R$ ${valor.toFixed(2)}` : valor}, emitida em ${data}.`,
          acao: 'Verificar e dar entrada no sistema.'
        };
      },

      contrato: () => {
        const partes = fields.partes?.value || fields.contratante?.value || '—';
        const objeto = fields.objeto?.value || '—';
        const valor = fields.valor?.value || fields.valor_total?.value || '—';
        const vigencia = fields.vigencia?.value || fields.prazo?.value || '—';

        return {
          titulo: '📝 Contrato Recebido',
          corpo: `Contrato referente a: ${objeto}. Partes: ${partes}. Valor: ${typeof valor === 'number' ? `R$ ${valor.toFixed(2)}` : valor}. Vigência: ${vigencia}.`,
          acao: 'Revisar termos e cláusulas.'
        };
      },

      licitacao: () => {
        const numero = fields.numero_processo?.value || fields.numero_edital?.value || '—';
        const orgao = fields.orgao?.value || '—';
        const objeto = fields.objeto?.value || fields.objeto_resumo?.value || '—';
        const dataAbertura = fields.data_abertura?.value || '—';

        return {
          titulo: '📋 Documento de Licitação',
          corpo: `Processo ${numero} - ${orgao}. Objeto: ${objeto}. Abertura: ${dataAbertura}.`,
          acao: 'Analisar requisitos de habilitação.'
        };
      },

      termo_referencia: () => {
        const objeto = fields.objeto?.value || '—';
        const orgao = fields.orgao?.value || '—';

        return {
          titulo: '📄 Termo de Referência',
          corpo: `TR recebido de ${orgao}. Objeto: ${objeto}.`,
          acao: 'Verificar especificações técnicas.'
        };
      },

      default: () => {
        // Tentar extrair informações genéricas do texto
        const preview = textContent?.substring(0, 200) || '';

        return {
          titulo: '📄 Documento Recebido',
          corpo: `Novo documento recebido (tipo: ${classification.type || 'não identificado'}). ${preview}...`,
          acao: 'Revisar documento anexo.'
        };
      }
    };

    const templateFn = templates[classification.type] || templates.default;
    return templateFn();
  }

  /**
   * Encontra rota correspondente ao tipo de documento
   */
  findMatchingRoute(documentType, agentConfig) {
    const routes = agentConfig?.config?.documentRoutes || [];

    // Busca rota exata
    let route = routes.find(r => r.documentType === documentType);

    // Se não encontrar, busca rota genérica (*)
    if (!route) {
      route = routes.find(r => r.documentType === '*' || r.documentType === 'outro');
    }

    return route;
  }

  /**
   * Envia notificações para destinatários
   */
  async sendNotifications({ route, summary, classification, extraction, filePath, fileName, agentConfig, metadata }) {
    const notifications = [];
    const agentName = agentConfig?.name || 'Document Handler';

    // Formatar mensagem
    const formattedMessage = this.formatNotificationMessage(summary, classification, extraction, agentName, metadata);

    // Enviar emails
    if (route.emailTo && route.emailTo.length > 0) {
      for (const email of route.emailTo) {
        try {
          const attachments = route.sendDocument !== false ? [
            {
              filename: fileName,
              path: filePath
            }
          ] : [];

          await sendEmail({
            to: email,
            subject: `${summary.titulo} - ${agentName}`,
            text: formattedMessage.text,
            html: formattedMessage.html,
            attachments
          });

          notifications.push({
            type: 'email',
            to: email,
            success: true,
            timestamp: new Date().toISOString()
          });

          logger.info('Email notification sent', { to: email });
        } catch (error) {
          logger.error('Failed to send email', { to: email, error: error.message });
          notifications.push({
            type: 'email',
            to: email,
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    // Enviar WhatsApp
    if (route.whatsappTo && route.whatsappTo.length > 0) {
      for (const number of route.whatsappTo) {
        try {
          await this.sendWhatsAppMessage(number, formattedMessage.whatsapp);

          // Se configurado para enviar documento, envia o arquivo
          if (route.sendDocument !== false && filePath) {
            await this.sendWhatsAppDocument(number, filePath, fileName);
          }

          notifications.push({
            type: 'whatsapp',
            to: number,
            success: true,
            timestamp: new Date().toISOString()
          });

          logger.info('WhatsApp notification sent', { to: number });
        } catch (error) {
          logger.error('Failed to send WhatsApp', { to: number, error: error.message });
          notifications.push({
            type: 'whatsapp',
            to: number,
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    return notifications;
  }

  /**
   * Formata mensagem de notificação
   */
  formatNotificationMessage(summary, classification, extraction, agentName, metadata) {
    const timestamp = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const origem = metadata?.origin || 'API';

    // Versão texto
    const text = `
${summary.titulo}

${summary.corpo}

${summary.acao ? `⚡ Ação requerida: ${summary.acao}` : ''}

---
📅 Recebido em: ${timestamp}
📥 Origem: ${origem}
🤖 Processado por: ${agentName}
    `.trim();

    // Versão WhatsApp (mais concisa)
    const whatsapp = `${summary.titulo}

${summary.corpo}

${summary.acao ? `⚡ *Ação:* ${summary.acao}` : ''}

_Processado em ${timestamp}_`;

    // Versão HTML para email
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #00d4aa, #7c3aed); color: white; padding: 20px; }
    .header h1 { margin: 0; font-size: 20px; }
    .content { padding: 24px; }
    .content p { margin: 0 0 16px; line-height: 1.6; color: #333; }
    .action { background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px 16px; margin: 16px 0; border-radius: 4px; }
    .action strong { color: #856404; }
    .footer { background: #f8f9fa; padding: 16px 24px; font-size: 12px; color: #6c757d; border-top: 1px solid #e9ecef; }
    .meta { display: flex; gap: 16px; flex-wrap: wrap; }
    .meta span { display: flex; align-items: center; gap: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${summary.titulo}</h1>
    </div>
    <div class="content">
      <p>${summary.corpo}</p>
      ${summary.acao ? `
      <div class="action">
        <strong>⚡ Ação requerida:</strong> ${summary.acao}
      </div>
      ` : ''}
    </div>
    <div class="footer">
      <div class="meta">
        <span>📅 ${timestamp}</span>
        <span>📥 Origem: ${origem}</span>
        <span>🤖 ${agentName}</span>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();

    return { text, whatsapp, html };
  }

  /**
   * Envia mensagem de texto via WhatsApp (Evolution API)
   */
  async sendWhatsAppMessage(number, message) {
    if (!EVOLUTION_API_KEY) {
      logger.warn('EVOLUTION_API_KEY not configured, skipping WhatsApp');
      return { success: false, error: 'WhatsApp not configured' };
    }

    // Formatar número (garantir formato internacional)
    const formattedNumber = number.replace(/\D/g, '');
    const remoteJid = formattedNumber.includes('@') ? formattedNumber : `${formattedNumber}@s.whatsapp.net`;

    const response = await fetch(`${EVOLUTION_BASE_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify({
        number: remoteJid,
        text: message
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`WhatsApp API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Envia documento via WhatsApp (Evolution API)
   */
  async sendWhatsAppDocument(number, filePath, fileName) {
    if (!EVOLUTION_API_KEY) {
      return { success: false, error: 'WhatsApp not configured' };
    }

    const formattedNumber = number.replace(/\D/g, '');
    const remoteJid = formattedNumber.includes('@') ? formattedNumber : `${formattedNumber}@s.whatsapp.net`;

    // Ler arquivo como base64
    const fileBuffer = fs.readFileSync(filePath);
    const base64 = fileBuffer.toString('base64');
    const mimeType = fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg';

    const response = await fetch(`${EVOLUTION_BASE_URL}/message/sendMedia/${EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify({
        number: remoteJid,
        mediatype: 'document',
        mimetype: mimeType,
        caption: fileName,
        media: base64,
        fileName: fileName
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`WhatsApp media API error: ${response.status} - ${error}`);
    }

    return response.json();
  }
}

export default DocumentDispatchService;
