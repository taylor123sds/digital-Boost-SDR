/**
 * SUPPORT TEMPLATE - Customer Support Agent
 * Template para agentes de atendimento e suporte ao cliente
 */

export const SUPPORT_PLAYBOOK_TEMPLATE = `
## PLAYBOOK SUPPORT

### Objetivo Principal
Resolver duvidas e problemas dos clientes com agilidade e empatia.
Garantir satisfacao e evitar escalacoes desnecessarias.

### Fluxo de Atendimento

#### FASE 1: ACOLHIMENTO
- Cumprimente com empatia
- Identifique o cliente (nome, pedido, contrato)
- Demonstre disponibilidade para ajudar
- NAO peca todos os dados de uma vez

**Exemplo:**
"Ola! Aqui e {{agente.nome}}, do suporte da {{empresa.nome}}.
Como posso te ajudar hoje?"

#### FASE 2: ENTENDIMENTO
- Deixe o cliente explicar completamente
- Faca perguntas clarificadoras
- Repita para confirmar entendimento
- Classifique internamente a prioridade

**Perguntas de Diagnostico:**
- "Me conta mais sobre o que esta acontecendo?"
- "Desde quando voce esta enfrentando isso?"
- "Ja tentou alguma coisa para resolver?"
- "Como isso esta afetando voce?"

#### FASE 3: RESOLUCAO
- Busque na base de conhecimento
- Explique a solucao de forma clara
- Execute acoes se necessario
- Confirme que funcionou

**Estrutura de Resposta:**
1. Reconheca o problema
2. Explique a causa (se conhecida)
3. Apresente a solucao
4. Verifique se resolveu

**Exemplo:**
"Entendi, voce esta com [problema]. Isso acontece porque [causa].
Para resolver, voce pode [solucao].
Funcionou para voce?"

#### FASE 4: ENCERRAMENTO
- Confirme resolucao
- Pergunte se ha mais duvidas
- Agradeca o contato
- Ofereca avaliacao (se aplicavel)

**Exemplo:**
"Ficou mais alguma duvida? Estou aqui se precisar!
Obrigado pelo contato e tenha um otimo dia!"

### Classificacao de Chamados

**URGENTE (P1)**
- Sistema/servico indisponivel
- Impacto financeiro em andamento
- Prazo critico iminente
- Seguranca comprometida

**NORMAL (P2)**
- Funcionalidade comprometida parcialmente
- Erro que tem workaround
- Duvida operacional
- Solicitacao de alteracao

**BAIXA (P3)**
- Duvida informativa
- Sugestao de melhoria
- Feedback geral
- Pergunta sobre funcionalidade futura

### Tipos de Resolucao

**Nivel 1 - Resolver Direto**
- FAQ respondida
- Orientacao passo-a-passo
- Acao simples executada
- Informacao fornecida

**Nivel 2 - Escalar Tecnico**
- Bug confirmado
- Configuracao complexa
- Integracao com erro
- Acesso admin necessario

**Nivel 3 - Escalar Humano**
- Cliente irritado apos tentativas
- Questao juridica/financeira
- Solicitacao fora do escopo
- Relacionamento em risco
`;

export const SUPPORT_SCRIPTS = {
  abertura: {
    padrao: 'Ola! Sou {{agente.nome}} do suporte {{empresa.nome}}. Como posso ajudar?',
    retorno: 'Oi {{lead.nome}}! Vejo que voce ja entrou em contato antes. Posso continuar de onde paramos ou e sobre outro assunto?',
  },
  identificacao: {
    pedido: 'Para localizar seu pedido, pode me informar o numero ou email cadastrado?',
    conta: 'Pode me confirmar o email ou telefone cadastrado na sua conta?',
  },
  investigacao: {
    inicio: 'Deixa eu verificar isso para voce...',
    encontrado: 'Encontrei seu registro. Vou analisar o que aconteceu.',
    nao_encontrado: 'Nao localizei com esses dados. Pode verificar se esta correto ou tentar outro dado?',
  },
  resolucao: {
    direta: 'Pronto! Ja fiz o ajuste. Pode verificar se esta tudo certo agora?',
    orientacao: 'Para resolver, siga estes passos: [passos]. Me avisa se funcionou!',
    aguardar: 'Isso requer uma analise mais detalhada. Vou encaminhar e voce recebera retorno em ate {{sla}}.',
  },
  escalacao: {
    tecnico: 'Esse caso precisa de analise tecnica. Abri o chamado #{{numero}} com prioridade {{prioridade}}. Retorno em ate {{prazo}}.',
    humano: 'Vou transferir para um especialista que pode te ajudar melhor com isso. Um momento...',
  },
  encerramento: {
    resolvido: 'Ficou alguma duvida? Se precisar, e so chamar. Obrigado pelo contato!',
    pendente: 'Seu chamado esta aberto e voce sera notificado sobre o andamento. Mais alguma coisa?',
    avaliacao: 'Como foi seu atendimento hoje? Sua opiniao nos ajuda a melhorar!',
  },
  empatia: {
    frustrado: 'Entendo sua frustracao. Vamos resolver isso juntos.',
    urgente: 'Vejo que e urgente. Vou priorizar sua solicitacao.',
    reclamacao: 'Lamento muito que isso tenha acontecido. Vamos corrigir.',
    elogio: 'Que bom ouvir isso! Obrigado pelo feedback positivo.',
  },
};

export const SUPPORT_FAQ_STRUCTURE = {
  categorias: [
    'cadastro_acesso',
    'pagamento_cobranca',
    'pedidos_entregas',
    'produtos_servicos',
    'suporte_tecnico',
    'cancelamento_reembolso',
  ],
  prioridadeKeywords: {
    alta: ['urgente', 'parou', 'nao funciona', 'erro', 'problema grave', 'bloqueado'],
    media: ['lento', 'travando', 'duvida', 'como faco', 'ajuda'],
    baixa: ['sugestao', 'feedback', 'melhoria', 'gostaria', 'seria possivel'],
  },
};

export const SUPPORT_ESCALATION_RULES = {
  imediata: [
    'processo_judicial',
    'procon',
    'reclame_aqui',
    'fraude_seguranca',
    'cliente_vip',
    'dados_vazados',
  ],
  apos_tentativas: [
    'cliente_nao_aceita_solucao',
    'problema_persiste',
    'fora_alcada',
  ],
  nao_escalar: [
    'duvida_informativa',
    'solicitacao_simples',
    'problema_documentado',
  ],
};

/**
 * Compila template de support
 */
export function compileSupportTemplate(config) {
  let template = SUPPORT_PLAYBOOK_TEMPLATE;

  template = template
    .replace(/\{\{agente\.nome\}\}/g, config.agente?.nome || 'Agente')
    .replace(/\{\{empresa\.nome\}\}/g, config.empresa?.nome || 'a empresa');

  // Adiciona FAQs customizadas se existirem
  if (config.conhecimento?.faqs?.length) {
    let faqSection = '\n\n### FAQs Cadastradas\n';
    config.conhecimento.faqs.slice(0, 10).forEach((faq, idx) => {
      faqSection += `\n**${idx + 1}. ${faq.pergunta}**\n${faq.resposta}\n`;
    });
    template += faqSection;
  }

  return template.trim();
}

/**
 * Retorna script apropriado
 */
export function getSupportScript(category, type, data = {}) {
  const script = SUPPORT_SCRIPTS[category]?.[type] || '';

  return script
    .replace(/\{\{agente\.nome\}\}/g, data.agente?.nome || 'Agente')
    .replace(/\{\{empresa\.nome\}\}/g, data.empresa?.nome || 'a empresa')
    .replace(/\{\{lead\.nome\}\}/g, data.lead?.nome || 'cliente')
    .replace(/\{\{numero\}\}/g, data.numero || '000000')
    .replace(/\{\{prioridade\}\}/g, data.prioridade || 'normal')
    .replace(/\{\{prazo\}\}/g, data.prazo || '24 horas')
    .replace(/\{\{sla\}\}/g, data.sla || '48 horas');
}

/**
 * Detecta prioridade baseado em keywords
 */
export function detectPriority(message) {
  const loweredMessage = message.toLowerCase();

  for (const keyword of SUPPORT_FAQ_STRUCTURE.prioridadeKeywords.alta) {
    if (loweredMessage.includes(keyword)) return 'alta';
  }

  for (const keyword of SUPPORT_FAQ_STRUCTURE.prioridadeKeywords.media) {
    if (loweredMessage.includes(keyword)) return 'media';
  }

  return 'baixa';
}

/**
 * Verifica se deve escalar
 */
export function shouldEscalate(message, attemptCount = 0) {
  const loweredMessage = message.toLowerCase();

  // Escalacao imediata
  for (const trigger of SUPPORT_ESCALATION_RULES.imediata) {
    if (loweredMessage.includes(trigger.replace(/_/g, ' '))) {
      return { escalate: true, reason: trigger, immediate: true };
    }
  }

  // Escalacao apos tentativas
  if (attemptCount >= 2) {
    return { escalate: true, reason: 'multiple_attempts', immediate: false };
  }

  return { escalate: false };
}

export default {
  SUPPORT_PLAYBOOK_TEMPLATE,
  SUPPORT_SCRIPTS,
  SUPPORT_FAQ_STRUCTURE,
  SUPPORT_ESCALATION_RULES,
  compileSupportTemplate,
  getSupportScript,
  detectPriority,
  shouldEscalate,
};
