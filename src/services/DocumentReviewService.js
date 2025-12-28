import OpenAI from 'openai';
import { defaultLogger } from '../utils/logger.enhanced.js';

const logger = defaultLogger.child({ module: 'DocumentReviewService' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

function normalizeText(value) {
  return (value || '').toString();
}

function extractDateCandidates(text) {
  const matches = text.match(/\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b/g) || [];
  return matches.slice(0, 4);
}

function heuristicReview(text) {
  const normalized = normalizeText(text).toLowerCase();
  const isAtestado = normalized.includes('atestado');
  const isFerias = normalized.includes('ferias');

  let type = 'outro';
  if (isAtestado) type = 'atestado';
  if (isFerias) type = 'ferias';

  const dates = extractDateCandidates(text);
  const hasCRM = /\bcrm\b/i.test(text);
  const hasCID = /\bcid\b/i.test(text);

  const extracted = {
    employeeName: null,
    periodStart: dates[0] || null,
    periodEnd: dates[1] || null,
    issuer: null,
    cid: hasCID ? 'presente' : null,
    crm: hasCRM ? 'presente' : null
  };

  const missingFields = [];
  if (type === 'atestado') {
    if (!extracted.periodStart) missingFields.push('data');
    if (!extracted.crm && !extracted.cid) missingFields.push('crm_ou_cid');
  }
  if (type === 'ferias') {
    if (!extracted.periodStart || !extracted.periodEnd) missingFields.push('periodo_completo');
  }

  const decision = missingFields.length === 0 ? 'aprovado' : 'revisao_manual';

  return {
    type,
    confidence: 0.4,
    summary: 'Revisao heuristica aplicada devido a falha na analise avançada.',
    decision,
    extracted,
    missingFields
  };
}

export async function reviewDocumentText(text, options = {}) {
  if (!text || text.trim().length === 0) {
    return {
      type: 'desconhecido',
      confidence: 0,
      summary: 'Nao foi possivel extrair texto do documento.',
      decision: 'revisao_manual',
      extracted: {},
      missingFields: ['texto_ilegivel']
    };
  }

  const prompt = `
Analise o documento abaixo e responda em JSON puro.
Classifique o tipo: "atestado", "ferias" ou "outro".
Extraia campos se possivel:
- employeeName
- periodStart
- periodEnd
- issuer
- cid
- crm
Avalie se o documento esta completo e defina decision: "aprovado" ou "revisao_manual".
Liste missingFields quando houver lacunas relevantes.
Inclua um resumo curto (summary) com 1-2 frases.
Retorne JSON com as chaves: type, confidence (0-1), summary, decision, extracted, missingFields.

Documento:
${text.substring(0, 9000)}
`.trim();

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Voce e um analista de documentos trabalhistas. Responda apenas em JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 600
    });

    const content = response.choices?.[0]?.message?.content || '';
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    const jsonPayload = start >= 0 && end > start ? content.slice(start, end + 1) : content;
    const parsed = JSON.parse(jsonPayload);

    return {
      type: parsed.type || 'outro',
      confidence: Number.isFinite(parsed.confidence) ? parsed.confidence : 0.6,
      summary: parsed.summary || options.fallbackSummary || 'Resumo nao disponivel.',
      decision: parsed.decision || 'revisao_manual',
      extracted: parsed.extracted || {},
      missingFields: parsed.missingFields || []
    };
  } catch (error) {
    logger.warn('Falha na revisao com IA, usando heuristica', {
      error: error.message
    });
    return heuristicReview(text);
  }
}
