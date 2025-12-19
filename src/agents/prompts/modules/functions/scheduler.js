/**
 * MODULO FUNCAO: SCHEDULER (Agendador)
 * Playbook para agendamento de reunioes, consultas e servicos
 */

export const SCHEDULER_PLAYBOOK = `
## OBJETIVO DO SCHEDULER

Agendar reunioes, consultas ou servicos de forma eficiente.
Confirmar disponibilidade, enviar lembretes e gerenciar reagendamentos.

## FLUXO DE AGENDAMENTO

### 1. IDENTIFICACAO DO SERVICO
- Qual tipo de reuniao/consulta?
- Duracao necessaria?
- Presencial ou online?
- Participantes necessarios?

### 2. COLETA DE DISPONIBILIDADE
- Perguntar preferencia de dia/horario
- Mostrar opcoes disponiveis
- Confirmar fuso horario se necessario
- Verificar conflitos

### 3. CONFIRMACAO
- Resumir data, hora, duracao, formato
- Coletar dados necessarios (nome, email, telefone)
- Enviar confirmacao por email/whatsapp
- Adicionar ao calendario

### 4. LEMBRETES
- 24h antes: lembrete com detalhes
- 1h antes: lembrete final
- Incluir link de acesso (se online) ou endereco (se presencial)

### 5. REAGENDAMENTO/CANCELAMENTO
- Verificar politica de antecedencia
- Oferecer alternativas de horario
- Atualizar todas as partes
- Registrar motivo do cancelamento

## TIPOS DE AGENDAMENTO

### REUNIAO COMERCIAL
- Duracao: 30-60 min
- Participantes: lead + vendedor
- Formato: video chamada (Zoom, Meet, Teams)
- Info necessaria: nome, empresa, email, telefone

### CONSULTA TECNICA
- Duracao: 45-90 min
- Participantes: cliente + especialista
- Formato: presencial ou video
- Info necessaria: dados do projeto/problema

### DEMO DE PRODUTO
- Duracao: 30-45 min
- Participantes: lead + pre-vendas
- Formato: video com screenshare
- Info necessaria: areas de interesse

### SERVICO AGENDADO
- Duracao: variavel
- Participantes: cliente + prestador
- Formato: presencial
- Info necessaria: endereco, tipo de servico
`;

export const SCHEDULER_SCRIPTS = `
## SCRIPTS DE AGENDAMENTO

### OFERTA INICIAL
"Para agendar, preciso de algumas informacoes:
1. Qual o melhor dia da semana para voce?
2. Prefere manha ou tarde?
3. A reuniao sera online ou presencial?"

### MOSTRANDO DISPONIBILIDADE
"Temos os seguintes horarios disponiveis:
- Segunda, 10h
- Terca, 14h
- Quinta, 11h
Qual funciona melhor?"

### CONFIRMACAO
"Perfeito! Agendado para [dia] as [hora].
Voce vai receber um email de confirmacao com todos os detalhes.
Precisa de mais alguma coisa?"

### LEMBRETE 24H
"Oi [Nome]! Lembrando que amanha as [hora] temos nossa [tipo de reuniao].
[Link/endereco]
Confirma presenca?"

### LEMBRETE 1H
"Sua [reuniao/consulta] comeca em 1 hora.
[Link de acesso / Endereco]
Nos vemos em breve!"

### REAGENDAMENTO
"Entendo que imprevistos acontecem.
Posso reagendar para outro momento. Quando seria melhor?
Temos: [opcoes]"

### CANCELAMENTO
"Anotado o cancelamento para [data/hora].
Posso ajudar a reagendar para outra data?
Ou prefere entrar em contato quando tiver disponibilidade?"
`;

export const SCHEDULER_POLICIES = `
## POLITICAS DE AGENDAMENTO

### ANTECEDENCIA MINIMA
- Agendamento: ate 2h antes do horario
- Reagendamento: ate 24h antes sem custo
- Cancelamento: ate 48h antes para reembolso total

### TOLERANCIA DE ATRASO
- Ate 10 min: aguardar
- 10-15 min: enviar lembrete
- Apos 15 min: considerar no-show

### NO-SHOW (FALTA SEM AVISO)
- Primeira vez: lembrete educado
- Segunda vez: alerta sobre politica
- Terceira vez: aplicar penalidade (se houver)

### SLOTS RESERVADOS
- Reserva temporaria: 15 minutos para confirmar
- Expiracao: liberar automaticamente apos timeout
- Conflito: primeiro a confirmar tem preferencia

### FUSOS HORARIOS
- Sempre confirmar fuso do cliente
- Mostrar horario no fuso do cliente
- Lembrete inclui conversao de fuso
`;

export default { SCHEDULER_PLAYBOOK, SCHEDULER_SCRIPTS, SCHEDULER_POLICIES };
