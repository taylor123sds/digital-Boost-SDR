/**
 * @file MeetingAnalysisService.js
 * @description Serviço de análise de transcrições com GPT-4
 * @architecture Layer: Business Logic - AI Analysis
 *
 * Pipeline de análise em 5 camadas:
 * 1. Preprocessing - Extração de metadados e limpeza
 * 2. Sentiment Analysis - Análise de sentimento e engajamento
 * 3. Methodology Validation - SPIN, BANT, Challenger scoring
 * 4. Outcome Prediction - Previsão de resultado
 * 5. Insights Generation - Recomendações acionáveis
 */

import openaiClient from '../../core/openai_client.js';
import MeetingTranscription from '../../models/MeetingTranscription.js';
import MeetingAnalysis from '../../models/MeetingAnalysis.js';
import MeetingScore from '../../models/MeetingScore.js';
import MeetingInsight from '../../models/MeetingInsight.js';

/**
 * MeetingAnalysisService
 * Orquestra análise completa de transcrições usando GPT-4
 */
class MeetingAnalysisService {
  constructor() {
    this.model = 'gpt-4o-mini'; // Usar gpt-4o-mini para análise rápida
    this.promptVersion = 'v1.0';
  }

  /**
   * Analisa transcrição completa (pipeline completo)
   * @param {string} transcriptionId - ID da transcrição
   * @returns {Promise<Object>} Resultado completo da análise
   */
  async analyzeTranscription(transcriptionId) {
    const startTime = Date.now();
    console.log(` [MEETING-ANALYSIS] Iniciando análise de transcrição ${transcriptionId}`);

    try {
      // 1. Buscar transcrição
      const transcription = MeetingTranscription.findById(transcriptionId);
      if (!transcription) {
        throw new Error(`Transcription ${transcriptionId} not found`);
      }

      // Atualizar status para 'processing'
      MeetingTranscription.updateStatus(transcriptionId, 'processing');

      const texto = transcription.texto_completo;
      const participantes = transcription.participantes;

      // 2. Layer 1: Preprocessing (extração de metadados já foi feita no MeetingTranscriptionService)
      console.log(' [MEETING-ANALYSIS] Layer 1: Preprocessing complete (metadata extracted)');

      // 3. Layer 2: Sentiment Analysis
      console.log(' [MEETING-ANALYSIS] Layer 2: Analyzing sentiment and engagement...');
      const sentimentAnalysis = await this._analyzeSentiment(texto, participantes);

      // 4. Layer 3: Methodology Validation
      console.log(' [MEETING-ANALYSIS] Layer 3: Validating sales methodologies...');
      const methodologyScores = await this._validateMethodologies(texto);

      // 5. Layer 4: Outcome Prediction
      console.log(' [MEETING-ANALYSIS] Layer 4: Predicting meeting outcome...');
      const outcomePredicton = await this._predictOutcome(texto, sentimentAnalysis, methodologyScores);

      // 6. Layer 5: Insights Generation
      console.log(' [MEETING-ANALYSIS] Layer 5: Generating actionable insights...');
      const insights = await this._generateInsights(texto, sentimentAnalysis, methodologyScores, outcomePredicton);

      // 7. Salvar análise no banco
      const totalTokens = sentimentAnalysis.tokens + methodologyScores.tokens + outcomePredicton.tokens + insights.tokens;
      const processingTime = Date.now() - startTime;

      const analysis = MeetingAnalysis.create({
        transcription_id: transcriptionId,
        meeting_id: transcription.meeting_id,
        ...sentimentAnalysis.data,
        ...outcomePredicton.data,
        model_usado: this.model,
        prompt_version: this.promptVersion,
        tokens_usados: totalTokens,
        processing_time_ms: processingTime
      });

      // 8. Salvar scores
      const score = MeetingScore.create({
        analysis_id: analysis.id,
        meeting_id: transcription.meeting_id,
        ...methodologyScores.data
      });

      // 9. Salvar insights
      for (const insight of insights.data) {
        MeetingInsight.create({
          analysis_id: analysis.id,
          meeting_id: transcription.meeting_id,
          ...insight
        });
      }

      // 10. Atualizar status da transcrição
      MeetingTranscription.updateStatus(transcriptionId, 'completed');

      console.log(` [MEETING-ANALYSIS] Análise completa em ${processingTime}ms (${totalTokens} tokens)`);

      return {
        success: true,
        transcription_id: transcriptionId,
        analysis_id: analysis.id,
        score_id: score.id,
        insights_count: insights.data.length,
        processing_time_ms: processingTime,
        tokens_used: totalTokens,
        results: {
          sentiment: sentimentAnalysis.data,
          methodology: methodologyScores.data,
          outcome: outcomePredicton.data,
          insights: insights.data
        }
      };
    } catch (error) {
      console.error(` [MEETING-ANALYSIS] Error analyzing transcription ${transcriptionId}:`, error);
      MeetingTranscription.updateStatus(transcriptionId, 'failed', error.message);
      throw error;
    }
  }

  /**
   * Layer 2: Análise de sentimento e engajamento
   * @private
   */
  async _analyzeSentiment(texto, participantes) {
    const prompt = `Você é um analista de reuniões de vendas B2B especializado em análise de sentimento e engajamento.

TRANSCRIÇÃO DA REUNIÃO:
${texto}

PARTICIPANTES DETECTADOS:
${JSON.stringify(participantes, null, 2)}

TAREFA: Analise a reunião e retorne JSON com:

{
  "sentimento_geral": "muito_positivo|positivo|neutro|negativo|muito_negativo",
  "sentimento_score": -1.0 a 1.0,
  "confianca_sentimento": 0.0 a 1.0,
  "talk_ratio_vendedor": 0-100 (% tempo de fala do vendedor),
  "talk_ratio_cliente": 0-100 (% tempo de fala do cliente),
  "num_perguntas_vendedor": número de perguntas feitas pelo vendedor,
  "num_perguntas_cliente": número de perguntas feitas pelo cliente,
  "num_interrupcoes": número de interrupções,
  "silencio_desconfortavel": número de pausas longas (>5 segundos),
  "objecoes_detectadas": [
    {
      "tipo": "preco|timing|autoridade|necessidade|concorrencia",
      "texto": "citação exata da objeção",
      "respondida": true|false,
      "qualidade_resposta": "excelente|boa|regular|ruim|nao_respondida"
    }
  ],
  "momentos_chave": [
    {
      "timestamp": "timestamp ou 'início'/'meio'/'fim'",
      "tipo": "objecao|acordo|duvida|insight|commitment",
      "texto": "resumo do momento",
      "impacto": "positivo|negativo|neutro"
    }
  ]
}

REGRAS:
- Talk ratio ideal: vendedor ~30%, cliente ~70%
- Perguntas abertas do vendedor são positivas
- Muitas interrupções são negativas
- Objeções bem respondidas são positivas
- Cliente fazendo muitas perguntas é positivo (engajamento)
`;

    const response = await openaiClient.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(response.choices[0].message.content);

    return {
      data: result,
      tokens: response.usage.total_tokens
    };
  }

  /**
   * Layer 3: Validação de metodologias de venda
   * @private
   */
  async _validateMethodologies(texto) {
    const prompt = `Você é um especialista em metodologias de venda B2B (SPIN Selling, BANT, Challenger Sale).

TRANSCRIÇÃO DA REUNIÃO:
${texto}

TAREFA: Analise se a reunião seguiu as metodologias de venda e atribua scores. Retorne JSON:

{
  "spin_situation_score": 0-25 (perguntas sobre situação atual),
  "spin_problem_score": 0-25 (perguntas sobre problemas/dores),
  "spin_implication_score": 0-25 (perguntas sobre consequências),
  "spin_needpayoff_score": 0-25 (perguntas sobre valor da solução),
  "bant_budget_score": 0-25 (discutiu orçamento/investimento),
  "bant_authority_score": 0-25 (identificou decisor),
  "bant_need_score": 0-25 (entendeu necessidade de negócio),
  "bant_timeline_score": 0-25 (estabeleceu timeline),
  "challenger_teach_score": 0-33 (ensinou novos insights),
  "challenger_tailor_score": 0-33 (personalizou para o cliente),
  "challenger_control_score": 0-34 (tomou controle da conversa),
  "metodologia_primaria": "spin|bant|challenger|consultiva|mista|nenhuma",
  "metodologia_secundaria": "spin|bant|challenger|consultiva|null",
  "confianca_deteccao": 0-100,
  "evidencias": {
    "spin_situation": ["exemplo de pergunta 1", "exemplo 2"],
    "spin_problem": ["exemplo 1", "exemplo 2"],
    "bant_budget": ["citação sobre orçamento"],
    "bant_authority": ["citação sobre decisor"],
    "challenger_teach": ["insight compartilhado"],
    ... (pelo menos 2 exemplos por score > 15)
  }
}

CRITÉRIOS DE PONTUAÇÃO:

SPIN Selling:
- Situation (0-25): Perguntas sobre contexto atual, situação, ferramentas usadas
- Problem (0-25): Perguntas sobre dores, desafios, frustrações
- Implication (0-25): Perguntas sobre impacto dos problemas, custos, riscos
- Need-Payoff (0-25): Perguntas sobre benefícios da solução, ROI, valor

BANT:
- Budget (0-25): Discutiu valores, investimento disponível, orçamento
- Authority (0-25): Identificou quem decide, envolveu decisor, entendeu processo
- Need (0-25): Compreendeu necessidade real de negócio, alinhamento estratégico
- Timeline (0-25): Definiu prazos, urgência, quando precisa implementar

Challenger Sale:
- Teach (0-33): Compartilhou insights únicos, desafiou status quo, trouxe dados novos
- Tailor (0-33): Personalizou mensagem para o setor/empresa/dor específica
- Control (0-34): Conduziu conversa, fez follow-ups, assumiu liderança

REGRAS:
- Score 0-10: Não abordou
- Score 11-17: Mencionou superficialmente
- Score 18-22: Abordou adequadamente
- Score 23-25: Abordou de forma excelente
- Sempre forneça evidências (citações) para scores > 15
`;

    const response = await openaiClient.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(response.choices[0].message.content);

    return {
      data: result,
      tokens: response.usage.total_tokens
    };
  }

  /**
   * Layer 4: Previsão de resultado
   * @private
   */
  async _predictOutcome(texto, sentimentAnalysis, methodologyScores) {
    const context = {
      sentimento: sentimentAnalysis.data.sentimento_geral,
      talk_ratio_vendedor: sentimentAnalysis.data.talk_ratio_vendedor,
      num_objecoes: sentimentAnalysis.data.objecoes_detectadas.length,
      taxa_resolucao: sentimentAnalysis.data.objecoes_detectadas.filter(o => o.respondida).length / (sentimentAnalysis.data.objecoes_detectadas.length || 1),
      spin_total: methodologyScores.data.spin_situation_score + methodologyScores.data.spin_problem_score + methodologyScores.data.spin_implication_score + methodologyScores.data.spin_needpayoff_score,
      bant_total: methodologyScores.data.bant_budget_score + methodologyScores.data.bant_authority_score + methodologyScores.data.bant_need_score + methodologyScores.data.bant_timeline_score
    };

    const prompt = `Você é um analista de vendas B2B especializado em prever resultados de reuniões.

CONTEXTO DA REUNIÃO:
${JSON.stringify(context, null, 2)}

TRANSCRIÇÃO:
${texto.substring(0, 2000)}... (primeiros 2000 caracteres)

TAREFA: Baseado na análise, preveja o resultado e retorne JSON:

{
  "resultado_previsto": "venda_provavel|followup_necessario|perdido|neutro",
  "probabilidade_fechamento": 0-100,
  "confianca_predicao": 0-100,
  "razoes": [
    "razão 1 para a previsão",
    "razão 2",
    "razão 3"
  ],
  "proximos_passos_recomendados": [
    "passo 1",
    "passo 2"
  ]
}

CRITÉRIOS:
- "venda_provavel": Alta probabilidade (>70%), BANT completo, sentimento muito positivo, cliente engajado
- "followup_necessario": Média probabilidade (40-70%), algum BANT faltando, interesse mas objeções
- "perdido": Baixa probabilidade (<40%), BANT incompleto, desinteresse, objeções não resolvidas
- "neutro": Impossível determinar, reunião inicial exploratória

SINAIS POSITIVOS:
- Cliente faz muitas perguntas
- Objeções bem respondidas
- BANT score alto (>75/100)
- Sentimento positivo
- Talk ratio vendedor baixo (~30%)
- Próximos passos claros acordados

SINAIS NEGATIVOS:
- Vendedor falou muito (>50%)
- Objeções não respondidas
- BANT incompleto (<50/100)
- Cliente desengajado
- Sem próximos passos definidos
`;

    const response = await openaiClient.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(response.choices[0].message.content);

    return {
      data: result,
      tokens: response.usage.total_tokens
    };
  }

  /**
   * Layer 5: Geração de insights acionáveis
   * @private
   */
  async _generateInsights(texto, sentimentAnalysis, methodologyScores, outcomePredicton) {
    const prompt = `Você é um coach de vendas B2B especializado em feedback construtivo.

ANÁLISE DA REUNIÃO:
Sentimento: ${sentimentAnalysis.data.sentimento_geral}
Talk Ratio Vendedor: ${sentimentAnalysis.data.talk_ratio_vendedor}%
Objeções: ${sentimentAnalysis.data.objecoes_detectadas.length}
SPIN Total: ${methodologyScores.data.spin_situation_score + methodologyScores.data.spin_problem_score + methodologyScores.data.spin_implication_score + methodologyScores.data.spin_needpayoff_score}/100
BANT Total: ${methodologyScores.data.bant_budget_score + methodologyScores.data.bant_authority_score + methodologyScores.data.bant_need_score + methodologyScores.data.bant_timeline_score}/100
Resultado Previsto: ${outcomePredicton.data.resultado_previsto}

TAREFA: Gere 3-7 insights acionáveis. Retorne JSON array:

[
  {
    "tipo": "melhoria|alerta|destaque|coaching|proximo_passo",
    "categoria": "metodologia|objecao|engajamento|comunicacao|timing",
    "prioridade": "alta|media|baixa",
    "titulo": "Título curto do insight (max 60 chars)",
    "descricao": "Descrição detalhada do que observou e por que é importante",
    "exemplo_transcricao": "Citação exata da transcrição que ilustra o ponto (se aplicável)",
    "acao_recomendada": "O que o vendedor deve fazer na próxima vez",
    "impacto_esperado": "alto|medio|baixo"
  }
]

TIPOS DE INSIGHTS:
- "melhoria": Algo que pode melhorar (ex: fazer mais perguntas SPIN)
- "alerta": Algo preocupante (ex: talk ratio muito alto)
- "destaque": Algo que foi muito bem feito (reforço positivo)
- "coaching": Oportunidade de desenvolvimento de habilidade
- "proximo_passo": Ação específica para dar continuidade

PRIORIZAÇÃO:
- "alta": Impacta diretamente probabilidade de fechamento
- "media": Importante para processo mas não crítico
- "baixa": Nice to have, otimização

REGRAS:
- Seja específico e acionável
- Use dados da análise
- Forneça exemplos da transcrição quando possível
- Foque em 2-3 melhorias prioritárias
- Sempre dê pelo menos 1 destaque (reforço positivo)
- Sugira próximos passos concretos
`;

    const response = await openaiClient.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(response.choices[0].message.content);

    // GPT pode retornar objeto com array "insights", extrair
    const insightsArray = result.insights || result;

    return {
      data: Array.isArray(insightsArray) ? insightsArray : [insightsArray],
      tokens: response.usage.total_tokens
    };
  }

  /**
   * Análise rápida (apenas sentiment, sem metodologias)
   * Para preview ou análise em tempo real
   */
  async quickAnalysis(texto) {
    console.log(' [MEETING-ANALYSIS] Quick analysis mode');
    const sentimentAnalysis = await this._analyzeSentiment(texto, []);
    return {
      success: true,
      sentiment: sentimentAnalysis.data.sentimento_geral,
      sentiment_score: sentimentAnalysis.data.sentimento_score,
      talk_ratio_vendedor: sentimentAnalysis.data.talk_ratio_vendedor,
      num_objecoes: sentimentAnalysis.data.objecoes_detectadas.length,
      tokens_used: sentimentAnalysis.tokens
    };
  }

  /**
   * Re-analisa transcrição existente (força nova análise)
   */
  async reanalyzeTranscription(transcriptionId) {
    console.log(` [MEETING-ANALYSIS] Re-analyzing transcription ${transcriptionId}`);

    // Deletar análises existentes
    const existingAnalysis = MeetingAnalysis.findByTranscriptionId(transcriptionId);
    if (existingAnalysis) {
      const existingScore = MeetingScore.findByAnalysisId(existingAnalysis.id);
      if (existingScore) MeetingScore.delete(existingScore.id);
      MeetingAnalysis.delete(existingAnalysis.id);
    }

    return this.analyzeTranscription(transcriptionId);
  }
}

export default new MeetingAnalysisService();
