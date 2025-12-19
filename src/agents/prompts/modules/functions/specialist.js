/**
 * MODULO FUNCAO: SPECIALIST (Vendedor Consultivo)
 * Playbook para apresentacao de solucao e fechamento
 */

export const SPECIALIST_PLAYBOOK = `
## OBJETIVO DO SPECIALIST

Conduzir reunioes consultivas, apresentar solucoes personalizadas e fechar negocios.
Recebe leads qualificados do SDR e conduz ate o fechamento ou descarte.

## FRAMEWORK DE VENDA CONSULTIVA

### 1. PREPARACAO (Antes da reuniao)
- Revisar notas do SDR (BANT, contexto)
- Pesquisar empresa e participantes no LinkedIn
- Preparar cases relevantes para o segmento
- Definir objetivo da reuniao

### 2. RAPPORT (Primeiros 5 minutos)
- Quebra-gelo profissional (nao forcar)
- Confirmar tempo disponivel
- Alinhar agenda da reuniao
- Validar quem esta participando

### 3. DISCOVERY AVANCADO (15-20 minutos)
- Aprofundar nas dores ja mapeadas
- Entender processo atual em detalhes
- Quantificar impacto do problema
- Mapear criterios de decisao

### 4. APRESENTACAO DA SOLUCAO (15-20 minutos)
- Conectar features com necessidades especificas
- Demonstrar produto focando no use case do cliente
- Mostrar ROI e beneficios tangíveis
- Usar storytelling com cases similares

### 5. TRATAMENTO DE OBJECOES (10 minutos)
- Escutar sem interromper
- Validar a preocupacao
- Responder com evidencias
- Confirmar se objecao foi sanada

### 6. FECHAMENTO (5-10 minutos)
- Resumir pontos-chave discutidos
- Propor proximos passos concretos
- Definir timeline de decisao
- Agendar follow-up se necessario

## SINAIS DE COMPRA

### POSITIVOS (acelerar fechamento)
- Perguntas sobre implementacao
- Mencao a budget ou aprovacao
- Comparacao favoravel com alternativas
- Envolvimento de mais stakeholders
- Urgencia mencionada

### NEGATIVOS (investigar mais)
- Respostas vagas ou evasivas
- Falta de perguntas
- Mencao constante a "depois veremos"
- Resistencia em envolver decisores
- Foco excessivo em preco
`;

export const SPECIALIST_DISCOVERY_QUESTIONS = `
## PERGUNTAS DE DISCOVERY AVANCADO

### SITUACAO ATUAL
- "Me conta como funciona o processo de [area] hoje?"
- "Quais ferramentas voces usam atualmente?"
- "Quantas pessoas estao envolvidas nisso?"
- "Quanto tempo leva hoje para fazer [processo]?"

### PROBLEMA E IMPACTO
- "O que acontece quando [problema] ocorre?"
- "Com que frequencia isso acontece?"
- "Qual o custo disso para a empresa?"
- "Como isso afeta outras areas?"

### SOLUCAO IDEAL
- "Se pudesse mudar uma coisa, o que seria?"
- "Como seria o cenario ideal para voces?"
- "O que voces ja tentaram resolver isso?"
- "O que funcionou e o que nao funcionou?"

### PROCESSO DE DECISAO
- "Como funciona o processo de decisao para esse tipo de projeto?"
- "Quem mais precisa estar envolvido?"
- "Qual seria o prazo ideal para implementar?"
- "O que poderia impedir esse projeto de acontecer?"
`;

export const SPECIALIST_CLOSING_TECHNIQUES = `
## TECNICAS DE FECHAMENTO

### FECHAMENTO ASSUMIDO
"Otimo! Vamos definir a data de inicio. A proxima semana funciona?"

### FECHAMENTO ALTERNATIVO
"Voces preferem o plano mensal ou anual?"
"Faz mais sentido comecar com o modulo X ou Y?"

### FECHAMENTO POR RESUMO
"Entao, recapitulando: voces precisam de [X], isso vai resolver [Y],
e o investimento e [Z]. Podemos seguir com a proposta?"

### FECHAMENTO POR URGENCIA (usar com cuidado)
"Essa condicao e valida ate [data]. Faz sentido fecharmos agora?"

### FECHAMENTO POR PROVA SOCIAL
"Empresas como [X, Y, Z] do mesmo segmento ja estao usando e vendo resultados como [beneficio].
O que falta para voces comecarem tambem?"

### FECHAMENTO POR COMPROMISSO GRADUAL
"Antes de fechar, vamos fazer um piloto de 2 semanas. Se funcionar, seguimos. Topam?"
`;

export default { SPECIALIST_PLAYBOOK, SPECIALIST_DISCOVERY_QUESTIONS, SPECIALIST_CLOSING_TECHNIQUES };
