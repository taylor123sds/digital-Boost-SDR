// src/tools/objection_handler.js
// Sistema proativo de detecção e tratamento de objeções

import { db } from '../memory.js';

/**
 * OBJECTION HANDLING SYSTEM
 *
 * Detecta e responde objeções de vendas de forma profissional
 * Baseado em frameworks clássicos: Feel-Felt-Found, Boomerang, etc.
 */

export class ObjectionHandler {
  constructor() {
    this.initDatabase();

    // Biblioteca de objeções e respostas treinadas
    this.objections = {
      // PREÇO
      PRICE_TOO_EXPENSIVE: {
        triggers: [
          'muito caro', 'caro demais', 'não tenho grana', 'sem dinheiro',
          'fora do orçamento', 'não cabe no bolso', 'alto investimento'
        ],
        type: 'PRICE',
        severity: 'HIGH',
        responses: [
          {
            framework: 'ROI_FOCUS',
            response: "Entendo! Muitos clientes acharam o mesmo inicialmente. Mas quando calculamos o ROI, eles perceberam que recuperaram o investimento em 2-3 meses. Quer ver os números da sua operação?"
          },
          {
            framework: 'COST_OF_INACTION',
            response: "Justo! Mas quanto vocês estão perdendo hoje com leads não atendidos? Geralmente, o custo de NÃO ter automação é 5-10x maior. Bora calcular juntos?"
          },
          {
            framework: 'VALUE_EQUATION',
            response: "Imagina recuperar só 10 leads/mês que vocês perdem hoje. Quanto isso representa em receita? Geralmente, o retorno paga a ferramenta em semanas."
          }
        ]
      },

      PRICE_CHEAPER_ELSEWHERE: {
        triggers: [
          'mais barato', 'outro mais em conta', 'concorrente mais barato',
          'achar mais barato', 'outro lugar mais barato'
        ],
        type: 'PRICE',
        severity: 'MEDIUM',
        responses: [
          {
            framework: 'VALUE_DIFFERENTIATION',
            response: "Sim, existem opções mais baratas. A diferença é que somos reconhecidos pelo Sebrae e nossos clientes têm ROI de 4-6x. Prefere investir em algo que comprova resultados?"
          },
          {
            framework: 'SPECIFICITY',
            response: "Entendo! A diferença está em 3 pontos: (1) IA treinada para PMEs de Natal, (2) Suporte local, (3) ROI comprovado. Qual desses é mais importante pra você?"
          }
        ]
      },

      // TIMING
      NOT_NOW: {
        triggers: [
          'não agora', 'mais tarde', 'no futuro', 'ano que vem',
          'outro momento', 'sem pressa', 'quando tiver tempo'
        ],
        type: 'TIMING',
        severity: 'MEDIUM',
        responses: [
          {
            framework: 'URGENCY_CREATION',
            response: "Entendo! Mas cada mês que passa, quantos leads vocês estimam que perdem? Se for 20-30 leads/mês, são centenas de oportunidades até 'mais tarde'. Faz sentido?"
          },
          {
            framework: 'LOW_COMMITMENT',
            response: "Sem problema! Que tal começarmos só com 15min para eu te mostrar o potencial? Sem compromisso, só para você ter os números em mãos quando decidir."
          }
        ]
      },

      NEED_TO_THINK: {
        triggers: [
          'preciso pensar', 'vou pensar', 'deixa eu ver', 'vou analisar',
          'preciso avaliar', 'preciso decidir'
        ],
        type: 'TIMING',
        severity: 'LOW',
        responses: [
          {
            framework: 'CLARIFICATION',
            response: "Claro! Para facilitar sua análise, qual ponto específico você quer avaliar melhor: ROI, implementação ou funcionalidades?"
          },
          {
            framework: 'NEXT_STEP',
            response: "Perfeito! Enquanto você pensa, posso te enviar um case detalhado do seu segmento e uma calculadora de ROI. Qual seu email?"
          }
        ]
      },

      // AUTORIDADE
      NOT_DECISION_MAKER: {
        triggers: [
          'não decido', 'preciso consultar', 'sócio decide', 'gerente decide',
          'não tenho autoridade', 'depende do chefe', 'preciso aprovar'
        ],
        type: 'AUTHORITY',
        severity: 'MEDIUM',
        responses: [
          {
            framework: 'CHAMPION_BUILDING',
            response: "Entendi! Quem mais participa da decisão? Posso preparar um material específico para vocês apresentarem internamente com ROI e cases."
          },
          {
            framework: 'MULTI_STAKEHOLDER',
            response: "Sem problema! Que tal agendarmos uma call rápida com quem decide também? Assim eu apresento direto e vocês tiram dúvidas juntos."
          }
        ]
      },

      // NECESSIDADE
      NO_NEED: {
        triggers: [
          'não preciso', 'funcionando bem', 'não tenho problema',
          'satisfeito', 'não vejo necessidade', 'não precisa'
        ],
        type: 'NEED',
        severity: 'HIGH',
        responses: [
          {
            framework: 'HIDDEN_PAIN',
            response: "Que ótimo que está funcionando! Mas vocês conseguem atender 100% dos leads em menos de 5 minutos? E follow-up de todos? Às vezes, não vemos o custo de oportunidade."
          },
          {
            framework: 'GROWTH_FOCUS',
            response: "Legal! Mas e se vocês quisessem crescer 30-40% sem contratar? É nisso que ajudamos: liberar o time para focar só no fechamento."
          }
        ]
      },

      ALREADY_HAVE_SOLUTION: {
        triggers: [
          'já tenho', 'já uso', 'já temos sistema', 'já contratamos',
          'já temos CRM', 'já temos automação'
        ],
        type: 'NEED',
        severity: 'MEDIUM',
        responses: [
          {
            framework: 'COMPLEMENTARY',
            response: "Ótimo! Nossa solução integra com CRMs existentes. A diferença é que nosso agente qualifica ANTES de entrar no CRM. Quer ver a diferença?"
          },
          {
            framework: 'COMPARISON',
            response: "Legal! O que você usa hoje? Geralmente complementamos bem, porque focamos em WhatsApp que é onde estão 90% dos seus leads."
          }
        ]
      },

      // CONFIANÇA
      DONT_KNOW_COMPANY: {
        triggers: [
          'não conheço', 'primeira vez', 'nunca ouvi falar',
          'quem são vocês', 'não sei quem é'
        ],
        type: 'TRUST',
        severity: 'MEDIUM',
        responses: [
          {
            framework: 'SOCIAL_PROOF',
            response: "Somos a Digital Boost de Natal, reconhecidos pelo Sebrae como top 15 startups tech do Brasil. Temos clínicas, escritórios e escolas usando. Quer ver cases?"
          },
          {
            framework: 'LOCAL_PRESENCE',
            response: "Somos de Natal mesmo! Estamos no ITNC (IFRN) e fomos acelerados pelo Sebrae. Posso te passar o LinkedIn do Taylor (fundador) e você vê nossos clientes."
          }
        ]
      },

      TOO_GOOD_TO_BE_TRUE: {
        triggers: [
          'bom demais', 'parece fake', 'desconfiado', 'será que funciona',
          'promessa', 'garantia'
        ],
        type: 'TRUST',
        severity: 'HIGH',
        responses: [
          {
            framework: 'PROOF',
            response: "Entendo a desconfiança! Por isso oferecemos demonstração com DADOS REAIS. Você vê o sistema funcionando antes de decidir qualquer coisa. Topa?"
          },
          {
            framework: 'TESTIMONIAL',
            response: "É bom mesmo! Mas não acredite em mim, acredite nos resultados dos nossos clientes. Posso te conectar com um escritório aqui de Natal que usa?"
          }
        ]
      },

      // COMPETIÇÃO
      USING_COMPETITOR: {
        triggers: [
          'uso outro', 'já tenho outro', 'uso X', 'contratei Y',
          'testando Z', 'avaliando outros'
        ],
        type: 'COMPETITION',
        severity: 'MEDIUM',
        responses: [
          {
            framework: 'DIFFERENTIATION',
            response: "Legal! Qual você usa? A diferença da Digital Boost é que somos focados em PMEs e temos IA treinada para negócios locais. Quer comparar?"
          },
          {
            framework: 'INTEGRATION',
            response: "Sem problema! Muitos clientes usam nossa solução junto com outras. Cada uma tem seu foco. A nossa é WhatsApp + qualificação inteligente."
          }
        ]
      },

      // TÉCNICAS
      TOO_COMPLEX: {
        triggers: [
          'muito complexo', 'complicado', 'difícil', 'não entendo',
          'confuso', 'técnico demais'
        ],
        type: 'TECHNICAL',
        severity: 'LOW',
        responses: [
          {
            framework: 'SIMPLIFICATION',
            response: "Deixa eu simplificar: Cliente manda WhatsApp → Agente responde → Qualifica → Agenda com você. Pronto! Simples assim."
          },
          {
            framework: 'DEMO_OFFER',
            response: "Por isso a demo é importante! Em 15min você vê que é super simples. Literalmente é só conectar o WhatsApp e pronto. Topa?"
          }
        ]
      },

      IMPLEMENTATION_CONCERN: {
        triggers: [
          'quanto tempo implementa', 'demora', 'dificuldade implementação',
          'complicado instalar', 'precisa técnico'
        ],
        type: 'TECHNICAL',
        severity: 'MEDIUM',
        responses: [
          {
            framework: 'SPEED',
            response: "Implementação é em 24-48h! Literalmente: conecta WhatsApp, ajustamos mensagens e pronto. Zero complicação técnica."
          },
          {
            framework: 'SUPPORT',
            response: "Nossa equipe faz tudo! Você não precisa ser técnico. A gente configura, testa e deixa funcionando. Você só conecta e usa."
          }
        ]
      }
    };

    console.log('🛡️ Objection Handler inicializado com biblioteca de respostas');
  }

  /**
   * Detecta objeção na mensagem do lead
   * @param {string} message - Mensagem do lead
   * @returns {object|null} - Objeção detectada ou null
   */
  detectObjection(message) {
    const messageLower = message.toLowerCase();

    for (const [key, objection] of Object.entries(this.objections)) {
      for (const trigger of objection.triggers) {
        if (messageLower.includes(trigger)) {
          console.log(`🛡️ [OBJECTION] Detectada: ${key} (${objection.type})`);

          // Selecionar melhor resposta (por enquanto, primeira)
          const selectedResponse = objection.responses[0];

          return {
            objectionKey: key,
            type: objection.type,
            severity: objection.severity,
            detected: true,
            trigger: trigger,
            framework: selectedResponse.framework,
            suggestedResponse: selectedResponse.response,
            alternativeResponses: objection.responses.slice(1)
          };
        }
      }
    }

    return null;
  }

  /**
   * Gera resposta personalizada para objeção
   * @param {object} objection - Objeção detectada
   * @param {object} context - Contexto adicional (ICP, histórico, etc)
   * @returns {string} - Resposta otimizada
   */
  generateObjectionResponse(objection, context = {}) {
    let response = objection.suggestedResponse;

    // Personalizar baseado no ICP se disponível
    if (context.icp) {
      // TODO: Implementar personalização por ICP
    }

    // Adicionar urgência se for high severity
    if (objection.severity === 'HIGH') {
      response += "\n\nSem compromisso, só para você ter clareza. Topa?";
    }

    return response;
  }

  /**
   * Retorna todas as objeções por tipo
   */
  getObjectionsByType(type) {
    return Object.entries(this.objections)
      .filter(([key, obj]) => obj.type === type)
      .map(([key, obj]) => ({ key, ...obj }));
  }

  /**
   * Estatísticas de objeções
   */
  getStats() {
    const types = {};

    for (const [key, obj] of Object.entries(this.objections)) {
      if (!types[obj.type]) {
        types[obj.type] = 0;
      }
      types[obj.type]++;
    }

    return {
      total: Object.keys(this.objections).length,
      byType: types,
      mostCommon: Object.entries(types).sort((a, b) => b[1] - a[1])[0]
    };
  }

  /**
   * Inicializa tabela de histórico de objeções
   */
  initDatabase() {
    db.exec(`
      CREATE TABLE IF NOT EXISTS objection_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contact_id TEXT NOT NULL,
        objection_type TEXT,
        objection_key TEXT,
        objection_text TEXT,
        framework_used TEXT,
        response_given TEXT,
        resolution_status TEXT DEFAULT 'UNRESOLVED',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Objection History table initialized');
  }

  /**
   * Salva objeção detectada no histórico
   * @param {string} contactId - ID do contato
   * @param {object} objection - Objeção detectada
   * @param {string} responseGiven - Resposta dada pelo agente
   */
  async saveObjectionHistory(contactId, objection, responseGiven = '') {
    try {
      db.prepare(`
        INSERT INTO objection_history (
          contact_id, objection_type, objection_key, objection_text,
          framework_used, response_given, resolution_status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'UNRESOLVED', datetime('now'))
      `).run(
        contactId,
        objection.type,
        objection.objectionKey,
        objection.trigger,
        objection.framework,
        responseGiven
      );

      console.log(`💾 [OBJECTION-HISTORY] Salva para ${contactId}: ${objection.type}`);

    } catch (error) {
      console.error('❌ [OBJECTION-HISTORY] Erro ao salvar:', error);
    }
  }

  /**
   * Atualiza status de resolução de objeção
   * @param {number} objectionId - ID da objeção
   * @param {string} status - RESOLVED, UNRESOLVED, ESCALATED
   */
  async updateResolutionStatus(objectionId, status) {
    try {
      db.prepare(`
        UPDATE objection_history
        SET resolution_status = ?
        WHERE id = ?
      `).run(status, objectionId);

      console.log(`✅ [OBJECTION-HISTORY] Status atualizado: ${status}`);
    } catch (error) {
      console.error('❌ [OBJECTION-HISTORY] Erro ao atualizar:', error);
    }
  }

  /**
   * Obtém histórico de objeções de um contato
   */
  async getContactObjectionHistory(contactId) {
    try {
      return db.prepare(`
        SELECT * FROM objection_history
        WHERE contact_id = ?
        ORDER BY created_at DESC
      `).all(contactId);
    } catch (error) {
      console.error('❌ [OBJECTION-HISTORY] Erro ao buscar:', error);
      return [];
    }
  }

  /**
   * Analytics: Objeções mais comuns
   */
  async getMostCommonObjections(limit = 10) {
    try {
      return db.prepare(`
        SELECT objection_type, COUNT(*) as count
        FROM objection_history
        GROUP BY objection_type
        ORDER BY count DESC
        LIMIT ?
      `).all(limit);
    } catch (error) {
      console.error('❌ [OBJECTION-HISTORY] Erro ao buscar analytics:', error);
      return [];
    }
  }
}

// Singleton
const objectionHandler = new ObjectionHandler();
export default objectionHandler;
