/**
 * @file EmailService.js
 * @description Serviço de envio de emails usando Nodemailer com Gmail
 *
 * ATUALIZADO: Template HTML profissional + anexo PDF convite
 *
 * Para usar com Gmail, você precisa:
 * 1. Ativar verificação em 2 etapas na conta Google
 * 2. Criar uma "Senha de App" em: https://myaccount.google.com/apppasswords
 * 3. Usar essa senha no EMAIL_PASSWORD do .env
 */

import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Caminho do PDF de convite
const CONVITE_PDF_PATH = join(__dirname, '../../assets/convite-demonstrativo.pdf');

// Configuração do transporter
let transporter = null;

/**
 * Inicializa o transporter de email
 */
function initTransporter() {
  if (transporter) return transporter;

  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_PASSWORD;
  const emailHost = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const emailPort = parseInt(process.env.EMAIL_PORT) || 587;

  if (!emailUser || !emailPassword) {
    console.warn('[EMAIL-SERVICE] EMAIL_USER or EMAIL_PASSWORD not configured - emails will be logged only');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: emailHost,
    port: emailPort,
    secure: emailPort === 465, // true for 465, false for other ports
    auth: {
      user: emailUser,
      pass: emailPassword
    }
  });

  console.log(`[EMAIL-SERVICE] Transporter initialized with ${emailUser}`);
  return transporter;
}

/**
 * Envia um email
 * @param {Object} options - Opções do email
 * @param {string} options.to - Destinatário
 * @param {string} options.subject - Assunto
 * @param {string} options.text - Corpo do email (texto)
 * @param {string} options.html - Corpo do email (HTML, opcional)
 * @param {Array} options.attachments - Lista de anexos (opcional)
 * @returns {Promise<Object>} Resultado do envio
 */
export async function sendEmail({ to, subject, text, html, attachments = [] }) {
  try {
    const emailFrom = process.env.EMAIL_FROM || process.env.EMAIL_USER;
    const emailFromName = process.env.EMAIL_FROM_NAME || 'Digital Boost';

    // Tentar inicializar transporter
    const transport = initTransporter();

    if (!transport) {
      // Sem configuração de email - apenas logar
      console.log(`[EMAIL-SERVICE]  Email simulado para ${to}:`);
      console.log(`   Assunto: ${subject}`);
      console.log(`   Corpo: ${text?.substring(0, 100)}...`);

      return {
        success: true,
        simulated: true,
        message: 'Email logged (EMAIL_PASSWORD not configured)'
      };
    }

    // Enviar email real
    const mailOptions = {
      from: `"${emailFromName}" <${emailFrom}>`,
      to,
      subject,
      text,
      html: html || text.replace(/\n/g, '<br>'),
      attachments: attachments.length ? attachments : undefined
    };

    const result = await transport.sendMail(mailOptions);

    console.log(`[EMAIL-SERVICE] Email enviado para ${to}: ${result.messageId}`);

    return {
      success: true,
      messageId: result.messageId,
      response: result.response
    };

  } catch (error) {
    console.error(`[EMAIL-SERVICE] Erro ao enviar email:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Verifica a conexão com o servidor de email
 */
export async function verifyEmailConnection() {
  try {
    const transport = initTransporter();

    if (!transport) {
      return {
        success: false,
        error: 'EMAIL_PASSWORD not configured'
      };
    }

    await transport.verify();
    console.log('[EMAIL-SERVICE] Conexão verificada com sucesso');

    return { success: true };
  } catch (error) {
    console.error('[EMAIL-SERVICE] Erro na verificação:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Gera o template HTML profissional para email de convite
 * Design inspirado no PDF da Digital Boost
 */
function generateConviteHTML(lead = {}) {
  const nome = lead.nome || 'Prezado(a)';
  const empresa = lead.empresa || 'sua empresa';
  const vendedor = process.env.SELLER_NAME || 'Taylor';
  const whatsappLink = 'https://wa.me/5584996311821?text=Ol%C3%A1!%20Vi%20o%20convite%20e%20gostaria%20de%20agendar%20um%20demonstrativo.';
  const siteLink = 'https://orbiondgb.vercel.app';

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Convite Exclusivo - Digital Boost</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0f1a;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0a0f1a;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background: linear-gradient(135deg, #0d1421 0%, #1a2332 100%); border-radius: 16px; border: 1px solid #1e3a5f; box-shadow: 0 20px 40px rgba(0,0,0,0.4);">

          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="margin: 0; color: #00d4ff; font-size: 28px; font-weight: 700; letter-spacing: 2px;">DIGITAL BOOST</h1>
              <p style="margin: 8px 0 0; color: #8892a6; font-size: 14px;">Automacao de Vendas com Inteligencia Artificial</p>
            </td>
          </tr>

          <!-- Badge -->
          <tr>
            <td style="padding: 0 40px; text-align: center;">
              <span style="display: inline-block; background: linear-gradient(135deg, #00d4ff 0%, #0099cc 100%); color: #0a0f1a; padding: 8px 24px; border-radius: 20px; font-size: 12px; font-weight: 600; letter-spacing: 1px;">CONVITE EXCLUSIVO</span>
            </td>
          </tr>

          <!-- Main Title -->
          <tr>
            <td style="padding: 30px 40px 20px; text-align: center;">
              <h2 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; line-height: 1.3;">
                Agende Seu<br>
                <span style="background: linear-gradient(135deg, #00d4ff 0%, #00ff88 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">Demonstrativo Gratuito</span>
              </h2>
            </td>
          </tr>

          <!-- Personalized Greeting -->
          <tr>
            <td style="padding: 0 40px 20px; text-align: center;">
              <p style="margin: 0; color: #b8c5d6; font-size: 16px; line-height: 1.6;">
                Ola, <strong style="color: #00d4ff;">${nome}</strong>!<br><br>
                Descubra como a IA pode responder seus leads 24h,<br>
                qualificar prospects automaticamente e aumentar<br>
                suas vendas em ate <strong style="color: #00ff88;">47%</strong>.
              </p>
            </td>
          </tr>

          <!-- Features Row -->
          <tr>
            <td style="padding: 20px 40px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td width="33%" style="text-align: center; padding: 15px;">
                    <div style="background: rgba(0, 212, 255, 0.1); border-radius: 12px; padding: 20px 10px; border: 1px solid rgba(0, 212, 255, 0.2);">
                      <div style="font-size: 24px; margin-bottom: 8px;">&#128337;</div>
                      <p style="margin: 0; color: #ffffff; font-size: 14px; font-weight: 600;">30 minutos</p>
                    </div>
                  </td>
                  <td width="33%" style="text-align: center; padding: 15px;">
                    <div style="background: rgba(0, 212, 255, 0.1); border-radius: 12px; padding: 20px 10px; border: 1px solid rgba(0, 212, 255, 0.2);">
                      <div style="font-size: 24px; margin-bottom: 8px;">&#128187;</div>
                      <p style="margin: 0; color: #ffffff; font-size: 14px; font-weight: 600;">100% Online</p>
                    </div>
                  </td>
                  <td width="33%" style="text-align: center; padding: 15px;">
                    <div style="background: rgba(0, 212, 255, 0.1); border-radius: 12px; padding: 20px 10px; border: 1px solid rgba(0, 212, 255, 0.2);">
                      <div style="font-size: 24px; margin-bottom: 8px;">&#10003;</div>
                      <p style="margin: 0; color: #ffffff; font-size: 14px; font-weight: 600;">Sem Compromisso</p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Benefits -->
          <tr>
            <td style="padding: 10px 40px 30px;">
              <div style="background: rgba(0, 255, 136, 0.05); border-radius: 12px; padding: 25px; border-left: 4px solid #00ff88;">
                <p style="margin: 0 0 15px; color: #00ff88; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">O que voce vai descobrir:</p>
                <ul style="margin: 0; padding-left: 20px; color: #b8c5d6; font-size: 14px; line-height: 2;">
                  <li>Como responder leads automaticamente 24/7</li>
                  <li>Qualificacao inteligente com IA (BANT framework)</li>
                  <li>Integracao com WhatsApp e CRM</li>
                  <li>Resultados reais de empresas como a ${empresa}</li>
                </ul>
              </div>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 40px 30px; text-align: center;">
              <a href="${whatsappLink}" style="display: inline-block; background: linear-gradient(135deg, #25d366 0%, #128c7e 100%); color: #ffffff; text-decoration: none; padding: 18px 40px; border-radius: 30px; font-size: 16px; font-weight: 700; box-shadow: 0 10px 30px rgba(37, 211, 102, 0.3);">
                &#128172; Agendar pelo WhatsApp
              </a>
              <p style="margin: 15px 0 0; color: #8892a6; font-size: 12px;">Ou acesse: <a href="${siteLink}" style="color: #00d4ff; text-decoration: none;">${siteLink}</a></p>
            </td>
          </tr>

          <!-- PDF Attachment Notice -->
          <tr>
            <td style="padding: 0 40px 30px; text-align: center;">
              <div style="background: rgba(255, 193, 7, 0.1); border-radius: 8px; padding: 15px; border: 1px solid rgba(255, 193, 7, 0.3);">
                <p style="margin: 0; color: #ffc107; font-size: 13px;">
                  &#128206; <strong>Convite em PDF anexo</strong> - Compartilhe com seu time!
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid #1e3a5f; text-align: center;">
              <p style="margin: 0 0 10px; color: #8892a6; font-size: 13px;">
                Enviado por <strong style="color: #ffffff;">${vendedor}</strong> | Digital Boost
              </p>
              <p style="margin: 0; color: #5a6a7a; font-size: 11px;">
                ${siteLink} | contato@digitalboost.com.br
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Envia email de convite com PDF anexo
 * @param {string} to - Email do destinatário
 * @param {Object} lead - Dados do lead para personalização
 * @param {Object} options - Opções adicionais
 * @returns {Promise<Object>} Resultado do envio
 */
export async function sendConviteEmail(to, lead = {}, options = {}) {
  try {
    const emailFrom = process.env.EMAIL_FROM || process.env.EMAIL_USER;
    const emailFromName = process.env.EMAIL_FROM_NAME || 'Digital Boost';
    const vendedor = process.env.SELLER_NAME || 'Taylor';

    // Personalizar assunto
    const nome = lead.nome || '';
    const subject = options.subject || `${nome ? nome + ', ' : ''}Convite Exclusivo: Demonstrativo de IA para Vendas`;

    // Gerar HTML
    const html = generateConviteHTML(lead);

    // Texto alternativo
    const text = `
Olá ${lead.nome || ''}!

CONVITE EXCLUSIVO - Digital Boost

Descubra como a IA pode responder seus leads 24h, qualificar prospects automaticamente e aumentar suas vendas em até 47%.

O que você vai descobrir:
- Como responder leads automaticamente 24/7
- Qualificação inteligente com IA (BANT framework)
- Integração com WhatsApp e CRM
- Resultados reais de empresas como a sua

Duração: 30 minutos | 100% Online | Sem Compromisso

Agende agora pelo WhatsApp: https://wa.me/5584996311821

Ou acesse: https://orbiondgb.vercel.app

---
Enviado por ${vendedor} | Digital Boost
contato@digitalboost.com.br
    `.trim();

    // Tentar inicializar transporter
    const transport = initTransporter();

    if (!transport) {
      console.log(`[EMAIL-SERVICE]  Email convite simulado para ${to}:`);
      console.log(`   Assunto: ${subject}`);
      console.log(`   Lead: ${lead.nome} (${lead.empresa})`);

      return {
        success: true,
        simulated: true,
        message: 'Email logged (EMAIL_PASSWORD not configured)'
      };
    }

    // Preparar anexos
    const attachments = [];
    if (existsSync(CONVITE_PDF_PATH)) {
      attachments.push({
        filename: 'Convite-Demonstrativo-Digital-Boost.pdf',
        path: CONVITE_PDF_PATH,
        contentType: 'application/pdf'
      });
      console.log('[EMAIL-SERVICE] PDF anexo encontrado:', CONVITE_PDF_PATH);
    } else {
      console.warn('[EMAIL-SERVICE] PDF anexo não encontrado:', CONVITE_PDF_PATH);
    }

    // Enviar email
    const mailOptions = {
      from: `"${emailFromName}" <${emailFrom}>`,
      to,
      subject,
      text,
      html,
      attachments
    };

    const result = await transport.sendMail(mailOptions);

    console.log(`[EMAIL-SERVICE]  Email convite enviado para ${to}: ${result.messageId}`);

    return {
      success: true,
      messageId: result.messageId,
      response: result.response,
      hasAttachment: attachments.length > 0
    };

  } catch (error) {
    console.error(`[EMAIL-SERVICE]  Erro ao enviar email convite:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Envia email de follow-up da cadência
 * ATUALIZADO: Agora usa o template de convite com PDF para emails de cadência
 * @param {string} to - Email do destinatário
 * @param {string} subject - Assunto (pode conter variáveis)
 * @param {string} body - Corpo do email (pode conter variáveis)
 * @param {Object} lead - Dados do lead para personalização
 */
export async function sendCadenceEmail(to, subject, body, lead = {}) {
  // Para emails de cadência, usar o template de convite com PDF
  // Isso garante que todos os emails tenham o design profissional e o PDF anexo
  return sendConviteEmail(to, lead, { subject: personalizeContent(subject, lead) });
}

/**
 * Personaliza conteúdo com dados do lead
 */
function personalizeContent(content, lead) {
  if (!content) return '';

  return content
    .replace(/\{\{nome\}\}/gi, lead.nome || '')
    .replace(/\{\{empresa\}\}/gi, lead.empresa || '')
    .replace(/\{\{cidade\}\}/gi, lead.cidade || '')
    .replace(/\[nome\]/gi, lead.nome || '')
    .replace(/\[empresa\]/gi, lead.empresa || '')
    .replace(/\[cidade\]/gi, lead.cidade || '')
    .replace(/\{\{vendedor_nome\}\}/gi, process.env.SELLER_NAME || 'Taylor')
    .replace(/\[vendedor_nome\]/gi, process.env.SELLER_NAME || 'Taylor');
}

export default {
  sendEmail,
  sendCadenceEmail,
  sendConviteEmail,
  verifyEmailConnection
};
