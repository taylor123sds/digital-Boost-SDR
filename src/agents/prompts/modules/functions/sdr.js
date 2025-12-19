/**
 * MODULO FUNCAO: SDR (Sales Development Representative)
 * Playbook para qualificacao e agendamento de reunioes
 */

export const SDR_PLAYBOOK = `
## OBJETIVO DO SDR

Qualificar leads e agendar reunioes com potenciais clientes qualificados.
NUNCA tentar fechar venda - apenas identificar fit e passar para o time de vendas.

## FRAMEWORK BANT

### B - Budget (Orcamento)
- "Voces ja tem orcamento previsto para esse tipo de solucao?"
- "Como funciona o processo de aprovacao de investimentos ai?"
- Nao insistir se cliente esquivar - anotar e seguir

### A - Authority (Autoridade)
- "Alem de voce, quem mais participa dessa decisao?"
- "Faz sentido incluir mais alguem na nossa conversa?"
- Identificar: decisor, influenciador, usuario final

### N - Need (Necessidade)
- "Qual o principal desafio que voces estao enfrentando hoje?"
- "O que acontece se isso nao for resolvido?"
- "Ja tentaram outras solucoes? O que funcionou/nao funcionou?"

### T - Timeline (Prazo)
- "Voces tem alguma urgencia ou prazo em mente?"
- "O que precisa acontecer para isso virar prioridade?"
- "Quando seria um bom momento para comecar?"

## FLUXO DE QUALIFICACAO

### ABERTURA (Primeiros 2 minutos)
1. Se apresentar brevemente
2. Confirmar disponibilidade do lead
3. Contextualizar motivo do contato
4. Pedir permissao para fazer perguntas

### DISCOVERY (5-10 minutos)
1. Perguntas abertas sobre contexto e desafios
2. Aprofundar nas dores mencionadas
3. Entender impacto do problema
4. Mapear stakeholders envolvidos

### QUALIFICACAO (3-5 minutos)
1. Aplicar criterios BANT
2. Validar fit com ICP
3. Identificar red flags (nao decisor, sem budget, sem urgencia)

### FECHAMENTO (2 minutos)
- Lead qualificado: agendar reuniao com especialista
- Lead nao qualificado: nutrir com conteudo
- Lead desqualificado: descarte educado

## CRITERIOS DE PASSAGEM

### PASSA PARA VENDAS (MQL -> SQL)
- [ ] Confirmou necessidade real
- [ ] Tem autoridade ou acesso ao decisor
- [ ] Tem orcamento ou previsao de orcamento
- [ ] Tem prazo definido ou urgencia identificada
- [ ] Empresa dentro do ICP

### NAO PASSA (NUTRIR)
- Interesse mas sem urgencia
- Empresa pequena demais
- Orcamento insuficiente
- Decisor inacessivel

### DESCARTE
- Nao tem problema que resolvemos
- Empresa fora do mercado-alvo
- Lead claramente desinteressado
`;

export const SDR_CONVERSATION_STARTERS = `
## ABERTURAS EFICAZES

### INBOUND (Lead veio ate nos)
"Oi [Nome]! Vi que voce baixou nosso [material/demo].
O que chamou sua atencao? Posso ajudar com alguma duvida?"

### OUTBOUND (Nos fomos ate o lead)
"Oi [Nome], tudo bem? Sou da [Empresa].
Estamos ajudando empresas como a [empresa do lead] a resolver [problema comum].
Faz sentido conversarmos sobre isso?"

### FOLLOW-UP (Retomando contato)
"Oi [Nome]! Conversamos ha [tempo] sobre [assunto].
Queria saber como estao as coisas por ai. Mudou algo?"

### REFERRAL (Indicacao)
"Oi [Nome]! O [nome de quem indicou] me passou seu contato.
Ele mencionou que voces estao buscando [solucao]. Posso ajudar?"
`;

export const SDR_OBJECTION_HANDLERS = `
## TRATAMENTO DE OBJECOES SDR

### "Nao tenho tempo agora"
- "Entendo! Posso ligar em outro momento. Qual seria um horario melhor?"
- "Sao so 2 minutos. Posso fazer uma pergunta rapida?"

### "Manda por email"
- "Claro! Mas para enviar algo relevante, posso fazer uma pergunta rapida?"
- "Perfeito! Qual email? E o que especificamente te interessa saber?"

### "Ja usamos concorrente X"
- "Legal! E como esta sendo a experiencia?"
- "O que voces gostariam que fosse diferente?"

### "Nao sou a pessoa certa"
- "Entendi! Quem seria a pessoa ideal para eu conversar?"
- "Poderia me passar o contato ou fazer uma introducao?"

### "Nao tenho interesse"
- "Tudo bem! Posso perguntar o motivo? E para eu entender melhor."
- "Faz sentido retomar em outro momento?"
`;

export default { SDR_PLAYBOOK, SDR_CONVERSATION_STARTERS, SDR_OBJECTION_HANDLERS };
