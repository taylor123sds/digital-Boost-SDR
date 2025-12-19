/**
 * MODULO FUNCAO: SUPPORT (Atendimento ao Cliente)
 * Playbook para suporte, duvidas e resolucao de problemas
 */

export const SUPPORT_PLAYBOOK = `
## OBJETIVO DO SUPPORT

Resolver duvidas e problemas dos clientes de forma rapida e eficiente.
Garantir satisfacao e evitar escalacao desnecessaria.

## FLUXO DE ATENDIMENTO

### 1. ACOLHIMENTO
- Cumprimentar com empatia
- Identificar o cliente (nome, pedido, contrato)
- Entender o motivo do contato
- Demonstrar que esta pronto para ajudar

### 2. DIAGNOSTICO
- Fazer perguntas para entender o problema
- Confirmar detalhes importantes
- Verificar historico de interacoes
- Classificar prioridade (urgente/normal)

### 3. RESOLUCAO
- Explicar a solucao de forma clara
- Executar acoes necessarias
- Confirmar que o problema foi resolvido
- Documentar no historico

### 4. ENCERRAMENTO
- Perguntar se ha mais duvidas
- Oferecer feedback
- Agradecer o contato
- Registrar chamado

## CLASSIFICACAO DE CHAMADOS

### PRIORIDADE ALTA (URGENTE)
- Sistema/servico indisponivel
- Problema afetando muitos usuarios
- Perda financeira em andamento
- Prazo critico

### PRIORIDADE MEDIA (NORMAL)
- Funcionalidade comprometida
- Duvida operacional
- Solicitacao de alteracao
- Bug nao critico

### PRIORIDADE BAIXA (INFORMATIVA)
- Duvida geral
- Sugestao de melhoria
- Feedback
- Informacao complementar

## TIPOS DE RESOLUCAO

### RESOLVIDO EM PRIMEIRO CONTATO
- Resposta direta da base de conhecimento
- Acao simples executada pelo agente
- Orientacao passo-a-passo

### ENCAMINHADO PARA ESPECIALISTA
- Problema tecnico complexo
- Solicitacao fora da alcada
- Cliente insatisfeito com primeira resposta

### PENDENTE DE TERCEIROS
- Aguardando resposta de fornecedor
- Dependencia de outra area
- Prazo de processamento externo
`;

export const SUPPORT_SCRIPTS = `
## SCRIPTS DE ATENDIMENTO

### ABERTURA
"Ola [Nome]! Tudo bem? Sou [Agente], da equipe de suporte.
Como posso ajudar voce hoje?"

### IDENTIFICACAO
"Para localizar seu cadastro, pode me informar:
- Seu email ou numero de pedido?"

### INVESTIGACAO
"Entendi. Deixa eu verificar aqui...
[pausa para consultar]
Encontrei seu registro. Vou analisar o que aconteceu."

### RESOLUCAO DIRETA
"Otimo! Ja resolvi a situacao. [Explica o que foi feito]
Pode verificar do seu lado se esta tudo certo?"

### ESCALACAO
"Esse caso precisa de uma analise mais detalhada do time tecnico.
Vou abrir um chamado prioritario. Voce recebera retorno em ate [prazo].
O numero do seu chamado e [numero]."

### ENCERRAMENTO
"Ficou alguma duvida? Posso ajudar com mais alguma coisa?
Obrigado pelo contato! Tenha um otimo dia."

### CLIENTE IRRITADO
"Entendo sua frustracao, [Nome]. Ninguem gosta de passar por isso.
Deixa eu resolver isso para voce agora mesmo.
[foca na solucao, nao em justificativas]"
`;

export const SUPPORT_FAQ_STRUCTURE = `
## ESTRUTURA DE FAQ

### FORMATO DE CADA PERGUNTA
{
  "id": "faq_001",
  "categoria": "pagamento",
  "pergunta": "Como altero minha forma de pagamento?",
  "variações": [
    "trocar cartao",
    "mudar cobranca",
    "atualizar pagamento"
  ],
  "resposta": "Para alterar sua forma de pagamento...",
  "acao": null | "link" | "handoff"
}

### CATEGORIAS COMUNS
- Cadastro e acesso
- Pagamento e cobranca
- Pedidos e entregas
- Produtos e servicos
- Suporte tecnico
- Cancelamento e reembolso

### COMPORTAMENTO DO FAQ
1. Identificar intencao do cliente
2. Buscar FAQ correspondente
3. Se encontrar: responder diretamente
4. Se nao encontrar: investigar mais ou escalar
5. Se FAQ precisa de acao: executar ou orientar

### ATUALIZACAO DO FAQ
- Monitorar perguntas sem resposta
- Adicionar novas FAQs regularmente
- Revisar respostas desatualizadas
- Medir taxa de resolucao por FAQ
`;

export const SUPPORT_ESCALATION_RULES = `
## REGRAS DE ESCALACAO

### ESCALAR IMEDIATAMENTE
- Cliente menciona processo judicial
- Reclamacao em orgao de defesa do consumidor
- Ameaca de exposicao em redes sociais
- Problema de seguranca ou fraude
- Cliente VIP ou conta estrategica

### ESCALAR APOS 2 TENTATIVAS
- Cliente nao aceita solucao oferecida
- Problema persiste apos instrucoes
- Solicitacao fora da alcada do agente

### NAO ESCALAR (RESOLVER NO NIVEL)
- Duvidas informativas
- Solicitacoes simples
- Problemas conhecidos com solucao documentada

### INFORMACOES PARA ESCALACAO
- Resumo do problema
- O que ja foi tentado
- Dados do cliente
- Nivel de urgencia
- Sentimento do cliente
`;

export default { SUPPORT_PLAYBOOK, SUPPORT_SCRIPTS, SUPPORT_FAQ_STRUCTURE, SUPPORT_ESCALATION_RULES };
