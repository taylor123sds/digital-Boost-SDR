/**
 * MODULO VERTICAL: SERVICOS
 * Politicas especificas para negocios de servicos (consultoria, agencias, SaaS)
 */

export const SERVICOS_POLICIES = `
## POLITICAS DE SERVICOS

### SLA (ACORDO DE NIVEL DE SERVICO)
- Tempo de primeira resposta: definir expectativa clara
- Tempo de resolucao: por tipo de chamado (urgente/normal)
- Disponibilidade: horario de atendimento e canais disponiveis
- Escalacao: quando e como acionar nivel superior

### AGENDAMENTO
- Disponibilidade: mostrar slots disponiveis em tempo real
- Confirmacao: enviar lembrete 24h e 1h antes
- Reagendamento: permitir ate X horas antes sem custo
- No-show: politica de cobranca ou penalidade

### CANCELAMENTO E REEMBOLSO
- Aviso previo necessario (ex: 48h para servicos)
- Politica de multa por cancelamento tardio
- Reembolso: prazo e forma de devolucao
- Excecoes: casos de forca maior

### CONTRATOS E RENOVACAO
- Periodo de fidelidade: informar se aplicavel
- Reajuste: indice e periodicidade
- Renovacao automatica: explicar como funciona
- Distrato: processo e documentacao necessaria

### GARANTIA DO SERVICO
- O que esta coberto pela garantia
- Prazo de vigencia
- Como acionar (prazos e canais)
- O que nao esta coberto (exclusoes)
`;

export const SERVICOS_CONVERSATION_STATES = `
## ESTADOS DA CONVERSA - SERVICOS

### DISCOVERY (LEVANTAMENTO)
- Entender necessidade/dor do cliente
- Mapear contexto atual (fornecedor, processos)
- Identificar decisores e influenciadores
- Entender urgencia e orcamento
- CTA: "Podemos agendar uma reuniao para aprofundar?"

### APRESENTACAO/PROPOSTA
- Explicar solucao de forma personalizada
- Destacar diferenciais relevantes para o caso
- Apresentar cases similares
- Mostrar ROI ou beneficios tangíveis
- CTA: "Posso enviar uma proposta detalhada?"

### NEGOCIACAO
- Entender objecoes e preocupacoes
- Ajustar proposta se necessario
- Esclarecer termos e condicoes
- Definir proximos passos
- CTA: "O que falta para fecharmos?"

### ONBOARDING
- Confirmar escopo e expectativas
- Apresentar equipe responsavel
- Definir cronograma e entregas
- Estabelecer canais de comunicacao
- CTA: "Podemos comecar na proxima semana?"

### ACOMPANHAMENTO
- Verificar satisfacao periodicamente
- Identificar novas necessidades
- Oferecer upsell/cross-sell quando relevante
- Renovar contrato proativamente
`;

export const SERVICOS_OBJECTIONS = `
## OBJECOES COMUNS - SERVICOS

### "Ja tenho fornecedor"
- Entender satisfacao com atual fornecedor
- Perguntar o que poderia ser melhor
- Posicionar como complemento ou segunda opcao
- Oferecer piloto sem compromisso

### "Esta caro / Nao tenho orcamento"
- Entender o valor percebido vs investimento
- Mostrar ROI e payback
- Oferecer opcoes de entrada ou escopo reduzido
- Parcelar ou flexibilizar pagamento

### "Preciso pensar / Falar com socio"
- Validar se ha objecao nao dita
- Oferecer material para compartilhar
- Agendar follow-up especifico
- Perguntar: "O que voce precisa saber para decidir?"

### "Nao e prioridade agora"
- Entender o que e prioridade
- Mostrar custo de nao agir (perda de oportunidade)
- Propor timeline futuro com compromisso
- Manter contato periodico

### "Ja tentei e nao funcionou"
- Entender o que deu errado antes
- Explicar diferenciais da abordagem
- Oferecer garantias ou piloto
- Mostrar cases de clientes em situacao similar
`;

export default { SERVICOS_POLICIES, SERVICOS_CONVERSATION_STATES, SERVICOS_OBJECTIONS };
