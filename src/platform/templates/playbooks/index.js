/**
 * PLAYBOOKS INDEX
 * Exporta todas as metodologias de vendas e qualificacao
 */

// SPIN Selling
export {
  SPIN_PLAYBOOK,
  SPIN_QUESTIONS,
  compileSPINPlaybook,
  getSPINQuestions,
  detectSPINStage,
} from './spin-selling.playbook.js';

// BANT
export {
  BANT_PLAYBOOK,
  BANT_QUESTIONS,
  calculateBANTScore,
  classifyLead,
  compileBANTPlaybook,
  getBANTQuestions,
} from './bant.playbook.js';

/**
 * Framework seletor baseado na configuracao
 */
export function getQualificationFramework(frameworkType) {
  switch (frameworkType) {
    case 'spin':
      return {
        name: 'SPIN Selling',
        type: 'discovery',
        description: 'Metodologia consultiva baseada em perguntas estrategicas',
        stages: ['situation', 'problem', 'implication', 'needPayoff'],
      };

    case 'bant':
      return {
        name: 'BANT',
        type: 'qualification',
        description: 'Metodologia de qualificacao de leads',
        criteria: ['budget', 'authority', 'need', 'timeline'],
      };

    case 'spin_bant':
      return {
        name: 'SPIN + BANT',
        type: 'hybrid',
        description: 'SPIN para discovery, BANT para qualificacao',
        stages: ['situation', 'problem', 'implication', 'needPayoff'],
        criteria: ['budget', 'authority', 'need', 'timeline'],
      };

    default:
      return {
        name: 'SPIN + BANT',
        type: 'hybrid',
        description: 'Abordagem combinada (recomendado)',
        stages: ['situation', 'problem', 'implication', 'needPayoff'],
        criteria: ['budget', 'authority', 'need', 'timeline'],
      };
  }
}

/**
 * Compila playbook baseado no framework escolhido
 */
export async function compilePlaybook(frameworkType, config) {
  const spin = await import('./spin-selling.playbook.js');
  const bant = await import('./bant.playbook.js');

  switch (frameworkType) {
    case 'spin':
      return spin.compileSPINPlaybook(config);

    case 'bant':
      return bant.compileBANTPlaybook(config);

    case 'spin_bant':
    default:
      return `${spin.compileSPINPlaybook(config)}\n\n---\n\n${bant.compileBANTPlaybook(config)}`;
  }
}
