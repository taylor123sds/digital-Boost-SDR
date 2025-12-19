/**
 * PROMPT COMPILER
 * Compila o prompt final combinando templates modulares
 *
 * Responsabilidades:
 * - Carregar templates baseado na configuracao
 * - Substituir variaveis
 * - Montar prompt final organizado
 * - Gerar build report (quais modulos foram usados)
 */

import { compileSystemTemplate } from '../templates/core/system.template.js';
import { compileSafetyTemplate } from '../templates/core/safety.template.js';
import { compileSDRTemplate } from '../templates/roles/sdr.template.js';
import { compileSupportTemplate } from '../templates/roles/support.template.js';
import { compileSPINPlaybook } from '../templates/playbooks/spin-selling.playbook.js';
import { compileBANTPlaybook } from '../templates/playbooks/bant.playbook.js';
import { compileServicosTemplate } from '../templates/verticals/servicos.template.js';
import { compileVarejoTemplate } from '../templates/verticals/varejo.template.js';

export class PromptCompiler {
  constructor(agentConfig) {
    this.config = agentConfig;
    this.buildReport = {
      agentId: agentConfig.id,
      version: agentConfig.version || '1.0.0',
      compiledAt: new Date().toISOString(),
      modules: [],
      warnings: [],
    };
  }

  /**
   * Compila o prompt completo
   * @returns {object} { prompt, buildReport }
   */
  compile() {
    const sections = [];

    // 1. CORE - Identidade do Agente
    const systemPrompt = compileSystemTemplate(this.config);
    sections.push({
      name: 'IDENTIDADE',
      content: systemPrompt,
      module: 'core/system',
    });
    this.buildReport.modules.push({ name: 'core/system', loaded: true });

    // 2. CORE - Regras de Seguranca (sempre incluidas)
    const safetyPrompt = compileSafetyTemplate(this.config);
    sections.push({
      name: 'SEGURANCA',
      content: safetyPrompt,
      module: 'core/safety',
    });
    this.buildReport.modules.push({ name: 'core/safety', loaded: true });

    // 3. VERTICAL - Politicas do segmento
    const verticalPrompt = this.compileVertical();
    if (verticalPrompt) {
      sections.push({
        name: 'POLITICAS',
        content: verticalPrompt,
        module: `verticals/${this.config.agente?.vertical || 'servicos'}`,
      });
      this.buildReport.modules.push({
        name: `verticals/${this.config.agente?.vertical || 'servicos'}`,
        loaded: true,
      });
    }

    // 4. ROLE - Playbook da funcao
    const rolePrompt = this.compileRole();
    if (rolePrompt) {
      sections.push({
        name: 'PLAYBOOK',
        content: rolePrompt,
        module: `roles/${this.config.agente?.role || 'sdr'}`,
      });
      this.buildReport.modules.push({
        name: `roles/${this.config.agente?.role || 'sdr'}`,
        loaded: true,
      });
    }

    // 5. QUALIFICATION FRAMEWORK - SPIN e/ou BANT
    const qualificationPrompt = this.compileQualification();
    if (qualificationPrompt) {
      sections.push({
        name: 'QUALIFICACAO',
        content: qualificationPrompt,
        module: `playbooks/${this.config.qualificacao?.framework || 'spin_bant'}`,
      });
      this.buildReport.modules.push({
        name: `playbooks/${this.config.qualificacao?.framework || 'spin_bant'}`,
        loaded: true,
      });
    }

    // 6. CONHECIMENTO - FAQs e Base de conhecimento
    const knowledgePrompt = this.compileKnowledge();
    if (knowledgePrompt) {
      sections.push({
        name: 'CONHECIMENTO',
        content: knowledgePrompt,
        module: 'knowledge/faqs',
      });
      this.buildReport.modules.push({ name: 'knowledge/faqs', loaded: true });
    }

    // 7. CATALOGO - Produtos/Servicos
    const catalogPrompt = this.compileCatalog();
    if (catalogPrompt) {
      sections.push({
        name: 'CATALOGO',
        content: catalogPrompt,
        module: 'catalog/products',
      });
      this.buildReport.modules.push({ name: 'catalog/products', loaded: true });
    }

    // 8. BRAND VOICE - Estilo de comunicacao
    const brandVoicePrompt = this.compileBrandVoice();
    if (brandVoicePrompt) {
      sections.push({
        name: 'ESTILO',
        content: brandVoicePrompt,
        module: 'config/brandVoice',
      });
      this.buildReport.modules.push({ name: 'config/brandVoice', loaded: true });
    }

    // 9. DISPONIBILIDADE - Horarios
    const availabilityPrompt = this.compileAvailability();
    if (availabilityPrompt) {
      sections.push({
        name: 'DISPONIBILIDADE',
        content: availabilityPrompt,
        module: 'config/availability',
      });
      this.buildReport.modules.push({ name: 'config/availability', loaded: true });
    }

    // Monta prompt final
    const finalPrompt = this.assemblePrompt(sections);

    // Estatisticas
    this.buildReport.stats = {
      totalSections: sections.length,
      totalCharacters: finalPrompt.length,
      estimatedTokens: Math.ceil(finalPrompt.length / 4),
    };

    return {
      prompt: finalPrompt,
      buildReport: this.buildReport,
    };
  }

  /**
   * Compila template da vertical
   */
  compileVertical() {
    const vertical = this.config.agente?.vertical || 'servicos';

    switch (vertical) {
      case 'varejo':
        return compileVarejoTemplate(this.config);
      case 'servicos':
      case 'saas':
      case 'consultoria':
      default:
        return compileServicosTemplate(this.config);
    }
  }

  /**
   * Compila template da role
   */
  compileRole() {
    const role = this.config.agente?.role || 'sdr';

    switch (role) {
      case 'sdr':
        return compileSDRTemplate(this.config);
      case 'support':
        return compileSupportTemplate(this.config);
      case 'specialist':
        // TODO: Implementar specialist template
        this.buildReport.warnings.push('Specialist template not implemented, using SDR');
        return compileSDRTemplate(this.config);
      case 'scheduler':
        // TODO: Implementar scheduler template
        this.buildReport.warnings.push('Scheduler template not implemented, using SDR');
        return compileSDRTemplate(this.config);
      default:
        return compileSDRTemplate(this.config);
    }
  }

  /**
   * Compila framework de qualificacao
   */
  compileQualification() {
    const framework = this.config.qualificacao?.framework || 'spin_bant';

    switch (framework) {
      case 'spin':
        return compileSPINPlaybook(this.config);
      case 'bant':
        return compileBANTPlaybook(this.config);
      case 'spin_bant':
      default:
        // Combinacao de ambos (recomendado)
        return `${compileSPINPlaybook(this.config)}\n\n---\n\n${compileBANTPlaybook(this.config)}`;
    }
  }

  /**
   * Compila base de conhecimento
   */
  compileKnowledge() {
    const faqs = this.config.conhecimento?.faqs;
    if (!faqs?.length) return null;

    let content = '## BASE DE CONHECIMENTO\n\n### Perguntas Frequentes\n\n';

    faqs.forEach((faq, idx) => {
      content += `**${idx + 1}. ${faq.pergunta}**\n`;
      content += `${faq.resposta}\n`;
      if (faq.keywords?.length) {
        content += `_Keywords: ${faq.keywords.join(', ')}_\n`;
      }
      content += '\n';
    });

    return content.trim();
  }

  /**
   * Compila catalogo de produtos/servicos
   */
  compileCatalog() {
    const catalogo = this.config.catalogo;
    if (!catalogo?.length) return null;

    let content = '## CATALOGO\n\n';

    catalogo.forEach(item => {
      content += `### ${item.nome}\n`;
      if (item.descricao) content += `${item.descricao}\n`;
      if (item.preco) content += `**Preco:** ${item.preco}\n`;
      if (item.beneficios?.length) {
        content += `**Beneficios:** ${item.beneficios.join(', ')}\n`;
      }
      if (item.diferenciais?.length) {
        content += `**Diferenciais:** ${item.diferenciais.join(', ')}\n`;
      }
      content += '\n';
    });

    return content.trim();
  }

  /**
   * Compila brand voice
   */
  compileBrandVoice() {
    const brandVoice = this.config.brandVoice;
    if (!brandVoice) return null;

    let content = '## ESTILO DE COMUNICACAO\n\n';

    content += `- **Tom:** ${brandVoice.tom || 'profissional'}\n`;
    content += `- **Tratamento:** usar "${brandVoice.tratamento || 'voce'}"\n`;
    content += `- **Emojis:** ${brandVoice.emojis ? 'permitido com moderacao' : 'nao usar'}\n`;
    content += `- **Max paragrafos:** ${brandVoice.max_paragrafos || 3}\n`;

    if (brandVoice.palavras_proibidas?.length) {
      content += `- **NAO usar:** ${brandVoice.palavras_proibidas.join(', ')}\n`;
    }

    if (brandVoice.palavras_preferidas?.length) {
      content += `- **Preferir:** ${brandVoice.palavras_preferidas.join(', ')}\n`;
    }

    if (brandVoice.assinatura) {
      content += `- **Assinatura:** ${brandVoice.assinatura}\n`;
    }

    return content.trim();
  }

  /**
   * Compila disponibilidade
   */
  compileAvailability() {
    const disponibilidade = this.config.disponibilidade;
    if (!disponibilidade) return null;

    let content = '## DISPONIBILIDADE\n\n';

    const dias = disponibilidade.dias || ['seg', 'ter', 'qua', 'qui', 'sex'];
    const horario = disponibilidade.horario || { inicio: '08:00', fim: '18:00' };

    content += `- **Dias:** ${dias.join(', ')}\n`;
    content += `- **Horario:** ${horario.inicio} as ${horario.fim}\n`;
    content += `- **Timezone:** ${disponibilidade.timezone || 'America/Sao_Paulo'}\n`;

    if (disponibilidade.mensagem_fora_horario) {
      content += `\n**Fora do horario, responder:**\n"${disponibilidade.mensagem_fora_horario}"\n`;
    }

    return content.trim();
  }

  /**
   * Monta prompt final com separadores
   */
  assemblePrompt(sections) {
    return sections
      .map(section => {
        const header = `# ${section.name}`;
        return `${header}\n\n${section.content}`;
      })
      .join('\n\n---\n\n');
  }

  /**
   * Gera versao compacta do prompt (para contexto limitado)
   */
  compileCompact() {
    const { agente, empresa, brandVoice } = this.config;

    return `
Voce e ${agente?.nome || 'Agente'}, ${this.getRoleDescription(agente?.role)} da ${empresa?.nome || 'empresa'}.

**Objetivo:** ${agente?.objetivo || 'Ajudar clientes'}
**Tom:** ${brandVoice?.tom || 'profissional'}
**Tratamento:** ${brandVoice?.tratamento || 'voce'}

**Regras:**
1. Respostas curtas (max 3 paragrafos)
2. Sempre termine com proxima acao
3. Nunca invente informacoes
4. Nunca solicite dados sensiveis
5. Escale para humano se necessario
`.trim();
  }

  /**
   * Retorna descricao da role
   */
  getRoleDescription(role) {
    const descriptions = {
      sdr: 'um SDR responsavel por qualificar leads e agendar reunioes',
      specialist: 'um Especialista de Vendas',
      scheduler: 'um Agendador',
      support: 'um Atendente de Suporte',
    };
    return descriptions[role] || 'um assistente virtual';
  }
}

/**
 * Factory function
 */
export function createPromptCompiler(agentConfig) {
  return new PromptCompiler(agentConfig);
}

/**
 * Compila e retorna apenas o prompt
 */
export function compileAgentPrompt(agentConfig) {
  const compiler = new PromptCompiler(agentConfig);
  const { prompt } = compiler.compile();
  return prompt;
}

/**
 * Preview do prompt com build report
 */
export function previewPrompt(agentConfig) {
  const compiler = new PromptCompiler(agentConfig);
  return compiler.compile();
}

export default {
  PromptCompiler,
  createPromptCompiler,
  compileAgentPrompt,
  previewPrompt,
};
