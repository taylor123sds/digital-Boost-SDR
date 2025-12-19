/**
 * PROMPT ASSEMBLER
 * Monta o prompt final combinando nucleo + config + modulos
 */

import { CORE_NUCLEUS, SAFETY_RULES } from './core-nucleus.js';
import { VAREJO_POLICIES, VAREJO_CONVERSATION_STATES, VAREJO_OBJECTIONS } from './modules/verticals/varejo.js';
import { SERVICOS_POLICIES, SERVICOS_CONVERSATION_STATES, SERVICOS_OBJECTIONS } from './modules/verticals/servicos.js';
import { SDR_PLAYBOOK, SDR_CONVERSATION_STARTERS, SDR_OBJECTION_HANDLERS } from './modules/functions/sdr.js';
import { SPECIALIST_PLAYBOOK, SPECIALIST_DISCOVERY_QUESTIONS, SPECIALIST_CLOSING_TECHNIQUES } from './modules/functions/specialist.js';
import { SCHEDULER_PLAYBOOK, SCHEDULER_SCRIPTS, SCHEDULER_POLICIES } from './modules/functions/scheduler.js';
import { SUPPORT_PLAYBOOK, SUPPORT_SCRIPTS, SUPPORT_FAQ_STRUCTURE, SUPPORT_ESCALATION_RULES } from './modules/functions/support.js';

/**
 * Classe principal para montagem de prompts modulares
 */
export class PromptAssembler {
  constructor(clientConfig) {
    this.config = clientConfig;
  }

  /**
   * Monta o prompt completo baseado na configuracao
   */
  assemble() {
    const sections = [];

    // 1. Identidade do Agente
    sections.push(this.buildIdentitySection());

    // 2. Nucleo fixo (principios e seguranca)
    sections.push(CORE_NUCLEUS);
    sections.push(SAFETY_RULES);

    // 3. Modulo da Vertical (varejo ou servicos)
    sections.push(this.buildVerticalSection());

    // 4. Modulo da Funcao (sdr, specialist, scheduler, support)
    sections.push(this.buildFunctionSection());

    // 5. Configuracoes especificas do cliente
    sections.push(this.buildClientSection());

    // 6. Base de conhecimento (FAQ, produtos)
    sections.push(this.buildKnowledgeSection());

    // 7. Regras de estilo e voz
    sections.push(this.buildBrandVoiceSection());

    // 8. Disponibilidade e horarios
    sections.push(this.buildAvailabilitySection());

    return sections.filter(s => s).join('\n\n---\n\n');
  }

  /**
   * Secao de identidade do agente
   */
  buildIdentitySection() {
    const { agente, empresa } = this.config;
    return `
## IDENTIDADE DO AGENTE

Voce e ${agente.nome || 'um assistente'}, ${this.getFunctionDescription(agente.tipo)} da ${empresa.nome || 'empresa'}.

**Empresa:** ${empresa.nome}
**Segmento:** ${empresa.segmento}
**Descricao:** ${empresa.descricao}

**Seu objetivo principal:** ${agente.objetivo}

**Metricas de sucesso:**
${(agente.kpis || []).map(kpi => `- ${kpi}`).join('\n') || '- Satisfacao do cliente'}
`.trim();
  }

  /**
   * Descricao da funcao do agente
   */
  getFunctionDescription(tipo) {
    const descriptions = {
      sdr: 'um SDR (Sales Development Representative) responsavel por qualificar leads e agendar reunioes',
      specialist: 'um Especialista de Vendas responsavel por conduzir reunioes consultivas e fechar negocios',
      scheduler: 'um Agendador responsavel por marcar e gerenciar reunioes e compromissos',
      support: 'um Atendente de Suporte responsavel por resolver duvidas e problemas dos clientes',
    };
    return descriptions[tipo] || 'um assistente virtual';
  }

  /**
   * Modulo baseado na vertical
   */
  buildVerticalSection() {
    const vertical = this.config.agente?.vertical || 'servicos';

    if (vertical === 'varejo') {
      return `
${VAREJO_POLICIES}

${VAREJO_CONVERSATION_STATES}

${VAREJO_OBJECTIONS}
`.trim();
    }

    // Default: servicos
    return `
${SERVICOS_POLICIES}

${SERVICOS_CONVERSATION_STATES}

${SERVICOS_OBJECTIONS}
`.trim();
  }

  /**
   * Modulo baseado na funcao
   */
  buildFunctionSection() {
    const tipo = this.config.agente?.tipo || 'sdr';

    switch (tipo) {
      case 'sdr':
        return `
${SDR_PLAYBOOK}

${SDR_CONVERSATION_STARTERS}

${SDR_OBJECTION_HANDLERS}
`.trim();

      case 'specialist':
        return `
${SPECIALIST_PLAYBOOK}

${SPECIALIST_DISCOVERY_QUESTIONS}

${SPECIALIST_CLOSING_TECHNIQUES}
`.trim();

      case 'scheduler':
        return `
${SCHEDULER_PLAYBOOK}

${SCHEDULER_SCRIPTS}

${SCHEDULER_POLICIES}
`.trim();

      case 'support':
        return `
${SUPPORT_PLAYBOOK}

${SUPPORT_SCRIPTS}

${SUPPORT_FAQ_STRUCTURE}

${SUPPORT_ESCALATION_RULES}
`.trim();

      default:
        return SDR_PLAYBOOK;
    }
  }

  /**
   * Configuracoes especificas do cliente
   */
  buildClientSection() {
    const { icp, qualificacao, handoff } = this.config;

    let section = `## CONFIGURACOES DO CLIENTE\n\n`;

    // ICP
    if (icp) {
      section += `### ICP (Perfil de Cliente Ideal)\n`;
      if (icp.segmentos?.length) {
        section += `- Segmentos-alvo: ${icp.segmentos.join(', ')}\n`;
      }
      if (icp.cargos_alvo?.length) {
        section += `- Cargos-alvo: ${icp.cargos_alvo.join(', ')}\n`;
      }
      if (icp.faturamento_min || icp.faturamento_max) {
        section += `- Faturamento: ${icp.faturamento_min || 'N/A'} a ${icp.faturamento_max || 'N/A'}\n`;
      }
      if (icp.desqualificadores?.length) {
        section += `- Desqualificadores: ${icp.desqualificadores.join(', ')}\n`;
      }
      section += '\n';
    }

    // Qualificacao
    if (qualificacao) {
      section += `### Criterios de Qualificacao\n`;
      if (qualificacao.criterios_obrigatorios?.length) {
        section += `- Obrigatorios: ${qualificacao.criterios_obrigatorios.join(', ')}\n`;
      }
      if (qualificacao.pontuacao_minima) {
        section += `- Pontuacao minima para SQL: ${qualificacao.pontuacao_minima}/100\n`;
      }
      section += '\n';
    }

    // Handoff
    if (handoff) {
      section += `### Regras de Handoff\n`;
      if (handoff.vendedor_responsavel) {
        section += `- Responsavel: ${handoff.vendedor_responsavel}\n`;
      }
      if (handoff.criterios_escalacao?.length) {
        section += `- Escalar quando: ${handoff.criterios_escalacao.join(', ')}\n`;
      }
      section += '\n';
    }

    return section.trim();
  }

  /**
   * Base de conhecimento
   */
  buildKnowledgeSection() {
    const { catalogo, conhecimento } = this.config;
    let section = `## BASE DE CONHECIMENTO\n\n`;

    // Catalogo de produtos/servicos
    if (catalogo?.length) {
      section += `### Produtos/Servicos\n\n`;
      catalogo.forEach(produto => {
        section += `**${produto.nome}**\n`;
        if (produto.descricao) section += `${produto.descricao}\n`;
        if (produto.preco) section += `Preco: ${produto.preco}\n`;
        if (produto.beneficios?.length) {
          section += `Beneficios: ${produto.beneficios.join(', ')}\n`;
        }
        if (produto.diferenciais?.length) {
          section += `Diferenciais: ${produto.diferenciais.join(', ')}\n`;
        }
        section += '\n';
      });
    }

    // FAQs
    if (conhecimento?.faqs?.length) {
      section += `### Perguntas Frequentes\n\n`;
      conhecimento.faqs.forEach(faq => {
        section += `**P:** ${faq.pergunta}\n`;
        section += `**R:** ${faq.resposta}\n\n`;
      });
    }

    return section.trim();
  }

  /**
   * Estilo e voz da marca
   */
  buildBrandVoiceSection() {
    const { brandVoice } = this.config;
    if (!brandVoice) return '';

    let section = `## ESTILO DE COMUNICACAO\n\n`;

    section += `- Tom: ${brandVoice.tom || 'profissional'}\n`;
    section += `- Tratamento: usar "${brandVoice.tratamento || 'voce'}"\n`;
    section += `- Emojis: ${brandVoice.emojis ? 'permitido (com moderacao)' : 'nao usar'}\n`;

    if (brandVoice.palavras_proibidas?.length) {
      section += `- Palavras proibidas: ${brandVoice.palavras_proibidas.join(', ')}\n`;
    }

    if (brandVoice.palavras_preferidas?.length) {
      section += `- Palavras preferidas: ${brandVoice.palavras_preferidas.join(', ')}\n`;
    }

    if (brandVoice.assinatura) {
      section += `- Assinatura: ${brandVoice.assinatura}\n`;
    }

    return section.trim();
  }

  /**
   * Disponibilidade e horarios
   */
  buildAvailabilitySection() {
    const { disponibilidade, agendamento } = this.config;
    let section = `## DISPONIBILIDADE\n\n`;

    if (disponibilidade) {
      section += `### Horario de Atendimento\n`;
      section += `- ${disponibilidade.dias_atendimento?.join(', ') || 'Segunda a Sexta'}\n`;
      section += `- ${disponibilidade.horario_atendimento?.inicio || '08:00'} as ${disponibilidade.horario_atendimento?.fim || '18:00'}\n`;
      section += `- Fuso: ${disponibilidade.timezone || 'America/Sao_Paulo'}\n\n`;

      if (disponibilidade.mensagem_fora_horario) {
        section += `**Fora do horario, responder:** "${disponibilidade.mensagem_fora_horario}"\n\n`;
      }
    }

    if (agendamento?.habilitado) {
      section += `### Agendamento\n`;
      section += `- Duracao padrao: ${agendamento.duracao_padrao || 30} minutos\n`;
      section += `- Antecedencia minima: ${agendamento.antecedencia_minima || 2} horas\n`;
      if (agendamento.link_calendario) {
        section += `- Link: ${agendamento.link_calendario}\n`;
      }
    }

    return section.trim();
  }

  /**
   * Gera prompt resumido para contexto limitado
   */
  assembleCompact() {
    const { agente, empresa, brandVoice } = this.config;

    return `
Voce e ${agente.nome}, ${this.getFunctionDescription(agente.tipo)} da ${empresa.nome}.
Objetivo: ${agente.objetivo}
Tom: ${brandVoice?.tom || 'profissional'}
Tratamento: ${brandVoice?.tratamento || 'voce'}

Regras:
1. Respostas curtas (max 3 paragrafos)
2. Sempre termine com proxima acao
3. Nunca invente informacoes
4. Nunca solicite dados sensiveis
5. Escale para humano se necessario
`.trim();
  }
}

/**
 * Factory function para criar assembler
 */
export function createPromptAssembler(clientConfig) {
  return new PromptAssembler(clientConfig);
}

export default { PromptAssembler, createPromptAssembler };
