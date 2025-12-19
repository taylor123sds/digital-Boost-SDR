// tools/progressive_disclosure.js
// 🎁 MELHORIA #9: Revelação Progressiva de Informações

/**
 * 🎁 PROGRESSIVE DISCLOSURE - MELHORIA #9
 *
 * Revela informações aos poucos para manter engajamento:
 * 🎯 Não conta tudo de uma vez
 * 💡 Cria curiosidade e desejo de saber mais
 * 🔄 Mantém conversa fluindo
 * ⚡ Aumenta taxa de resposta
 */

class ProgressiveDisclosure {
  constructor() {
    this.disclosureLevels = {
      // Nível 1: Gancho inicial (primeira menção)
      level1: {
        information: 'teaser',
        detail: 'minimal',
        cta: 'curiosity',
        example: 'Automatizamos WhatsApp 24/7 qualificando leads. Quer ver como funciona?'
      },

      // Nível 2: Benefício principal (se interessado)
      level2: {
        information: 'main_benefit',
        detail: 'medium',
        cta: 'social_proof',
        example: 'Nossos agentes respondem em segundos, qualificam e agendam reuniões automaticamente. Cliente X aumentou vendas em 40%.'
      },

      // Nível 3: Detalhes técnicos (se perguntou especificamente)
      level3: {
        information: 'technical',
        detail: 'high',
        cta: 'next_steps',
        example: 'Integramos com seu CRM, treinamos a IA com seu funil e configuramos em 48h. Quer agendar uma demo?'
      },

      // Nível 4: Pricing e fechamento (se qualificado)
      level4: {
        information: 'pricing',
        detail: 'complete',
        cta: 'close',
        example: 'Investimento de R$2k-8k/mês conforme volume. ROI médio em 60 dias. Quando podemos começar?'
      }
    };

    console.log('🎁 [PROGRESSIVE-DISCLOSURE] Sistema de revelação progressiva inicializado');
  }

  /**
   * Determina nível de informação a revelar
   */
  getDisclosureLevel(context = {}) {
    const {
      messageCount = 0,
      askedAboutFeatures = false,
      askedAboutPricing = false,
      showedInterest = false
    } = context;

    // Nível 4: Já pediu preço ou está muito engajado
    if (askedAboutPricing || messageCount > 5) {
      return 'level4';
    }

    // Nível 3: Perguntou sobre detalhes técnicos
    if (askedAboutFeatures || messageCount > 3) {
      return 'level3';
    }

    // Nível 2: Mostrou interesse
    if (showedInterest || messageCount > 1) {
      return 'level2';
    }

    // Nível 1: Primeiro contato
    return 'level1';
  }

  /**
   * Gera instruções de revelação progressiva
   */
  getDisclosureInstructions(level, topic) {
    const config = this.disclosureLevels[level];

    if (!config) {
      return 'Revele informações gradualmente, criando curiosidade.';
    }

    const instructions = {
      level1: `
🎯 REVELAÇÃO NÍVEL 1 - GANCHO:
- Mencione APENAS o benefício principal
- NÃO entre em detalhes técnicos
- NÃO mencione preço
- Termine com pergunta que crie curiosidade
- Exemplo: "Automatizamos atendimento no WhatsApp. Imagina nunca mais perder um lead? Quer ver como?"
      `,
      level2: `
💡 REVELAÇÃO NÍVEL 2 - BENEFÍCIO:
- Explique O QUE faz, não COMO
- Mencione 1-2 benefícios principais
- Adicione prova social leve (case/número)
- NÃO entre em pricing ainda
- Exemplo: "Respondemos leads em segundos e agendamos reuniões automaticamente. Cliente X fechou 40% mais vendas."
      `,
      level3: `
🔧 REVELAÇÃO NÍVEL 3 - DETALHES:
- Explique COMO funciona
- Detalhe processo/integração
- Mencione diferenciais técnicos
- Pricing pode ser mencionado se perguntarem
- Exemplo: "Integramos com seu CRM, treinamos IA pro seu funil, setup em 48h. Investimento R$2k-8k/mês."
      `,
      level4: `
💰 REVELAÇÃO NÍVEL 4 - FECHAMENTO:
- Detalhe pricing completo
- Explique ROI/retorno
- Apresente próximos passos concretos
- Exemplo: "R$4k/mês pro seu volume. ROI em 60 dias. Começo na segunda-feira. Pode ser?"
      `
    };

    return instructions[level] || instructions.level1;
  }

  /**
   * Verifica se deve revelar determinada informação
   */
  shouldReveal(information, currentLevel) {
    const levels = ['level1', 'level2', 'level3', 'level4'];
    const infoLevels = {
      'basic_benefit': 'level1',
      'how_it_works': 'level2',
      'technical_details': 'level3',
      'pricing': 'level4',
      'integration': 'level3',
      'timeline': 'level3',
      'roi': 'level4'
    };

    const requiredLevel = infoLevels[information];
    const currentLevelIndex = levels.indexOf(currentLevel);
    const requiredLevelIndex = levels.indexOf(requiredLevel);

    return currentLevelIndex >= requiredLevelIndex;
  }
}

const progressiveDisclosure = new ProgressiveDisclosure();
export default progressiveDisclosure;

export function getDisclosureLevel(context = {}) {
  return progressiveDisclosure.getDisclosureLevel(context);
}

export function getDisclosureInstructions(level, topic) {
  return progressiveDisclosure.getDisclosureInstructions(level, topic);
}

export function shouldReveal(information, currentLevel) {
  return progressiveDisclosure.shouldReveal(information, currentLevel);
}
