-- Migration 046: Cadence Solar 15 Days Templates
-- Imported from VPS migration 022_insert_cadence_steps.sql
-- Templates de mensagens WhatsApp e Email para Outbound Energia Solar

-- =====================================================
-- DIA 1 - Quebra-gelo sobre invisibilidade digital
-- =====================================================

-- D1 - WhatsApp Mensagem Principal (Invisibilidade Digital)
INSERT OR IGNORE INTO cadence_steps (id, cadence_id, day, step_order, name, description, channel, action_type, send_time, template_variant, content, condition_type, skip_if_responded) VALUES
('step_d1_wa_principal', 'cadence_outbound_solar_15d', 1, 1,
'D1 - WhatsApp Quebra-gelo',
'Mensagem inicial questionando a invisibilidade digital da empresa',
'whatsapp', 'send_message', '09:00', 'A',
'Oi {{nome}}, tudo bem? Aqui é o {{vendedor_nome}}.

Eu tava pesquisando integradoras de energia solar em {{cidade}} e não encontrei um canal oficial de orçamento da {{empresa}}, tipo um site ou página própria.

Hoje vocês mantêm tudo mais no boca a boca e Instagram mesmo ou eu que não achei o canal certo?',
'always', 1);

-- D1 - WhatsApp Script Alternativo (Concorrência no Google)
INSERT OR IGNORE INTO cadence_steps (id, cadence_id, day, step_order, name, description, channel, action_type, send_time, template_variant, content, condition_type, skip_if_responded) VALUES
('step_d1_wa_alternativo', 'cadence_outbound_solar_15d', 1, 1,
'D1 - WhatsApp Alternativo (Concorrência)',
'Versão alternativa focando na concorrência no Google',
'whatsapp', 'send_message', '09:00', 'B',
'Fala {{nome}}, tudo bem?

Tô fazendo um mapeamento das principais integradoras solares em {{cidade}} e, quando busco "energia solar {{cidade}}" no Google, aparecem alguns concorrentes, mas a {{empresa}} não fica em destaque.

Isso é uma estratégia de focar só no offline e indicação ou ainda não deu tempo de estruturar essa parte digital?',
'always', 1);

-- D1 - Email de Apoio
INSERT OR IGNORE INTO cadence_steps (id, cadence_id, day, step_order, name, description, channel, action_type, send_time, delay_hours, subject, content, condition_type, skip_if_responded) VALUES
('step_d1_email', 'cadence_outbound_solar_15d', 1, 2,
'D1 - Email de Apoio',
'Email complementar ao WhatsApp do mesmo dia',
'email', 'send_email', '14:00', 0,
'{{nome}}, dúvida rápida sobre como a {{empresa}} capta clientes online',
'Oi {{nome}}, tudo bem?

Tentei falar contigo no WhatsApp e imagino que a correria de obras aí na {{empresa}} deve estar grande.

Vou ser bem direto: analisando integradoras solares em {{cidade}}, notei que a maioria já tem um canal digital claro de orçamento, como um site ou página de captura, e no caso da {{empresa}} eu não encontrei algo assim funcionando de forma objetiva. Vi mais movimento no Instagram.

Hoje, quando um cliente que não te conhece procura "energia solar {{cidade}}" no Google, qual é o caminho dele até chegar em vocês?

Isso está desenhado de propósito para ficar mais no boca a boca ou é algo que vocês sabem que precisa estruturar melhor?

Abraço,
{{vendedor_nome}}',
'always', 1);

-- =====================================================
-- DIA 2 - Bump de WhatsApp
-- =====================================================

INSERT OR IGNORE INTO cadence_steps (id, cadence_id, day, step_order, name, description, channel, action_type, send_time, content, condition_type, skip_if_responded) VALUES
('step_d2_wa_bump', 'cadence_outbound_solar_15d', 2, 1,
'D2 - Bump WhatsApp',
'Reativar notificação para quem não respondeu no D1',
'whatsapp', 'send_message', '10:00',
'Oi {{nome}}, tudo bem?

Passei aqui só para confirmar se você chegou a ver minha mensagem de ontem sobre o canal digital de orçamento da {{empresa}}.

Fiquei realmente em dúvida sobre como um cliente novo encontra vocês quando busca "energia solar {{cidade}}".',
'if_no_response', 1);

-- =====================================================
-- DIA 3 - Sem disparo (apenas responder engajados)
-- =====================================================

INSERT OR IGNORE INTO cadence_steps (id, cadence_id, day, step_order, name, description, channel, action_type, content, condition_type, skip_if_responded) VALUES
('step_d3_task', 'cadence_outbound_solar_15d', 3, 1,
'D3 - Responder Engajados',
'Não disparar novo contato. Apenas responder quem engajar e triagem.',
'task', 'create_task',
'Verificar respostas de D1 e D2. Aplicar scripts de triagem: Curioso, Cético ou Hand-raiser. Tentar converter em ligação.',
'always', 0);

-- =====================================================
-- DIA 4 - Ligar para engajados + Email de valor
-- =====================================================

INSERT OR IGNORE INTO cadence_steps (id, cadence_id, day, step_order, name, description, channel, action_type, send_time, content, condition_type, skip_if_responded) VALUES
('step_d4_call_task', 'cadence_outbound_solar_15d', 4, 1,
'D4 - Ligar para Engajados',
'Transformar conversas em ligações curtas de 5-10 min com SPIN leve',
'task', 'create_task', '09:00',
'LIGAR para leads que responderam (sinais: "Como assim não apareço?", "Hoje é mais indicação mesmo", "Do que se trata?", "Estamos pensando em site").

ROTEIRO:
1. Abertura: "Oi {{nome}}, aqui é o {{vendedor_nome}}, a gente trocou uma ideia pelo WhatsApp sobre a parte digital da {{empresa}}. Consegue falar rapidinho agora?"
2. Situação: "Hoje a maior parte dos clientes chega por indicação e redes sociais?"
3. Problema: "Quando as indicações diminuem, vocês sentem a queda na quantidade de orçamentos?"
4. Implicação: "Se considerar orçamentos extras por mês vindo do digital, faria diferença na meta?"
5. CTA: "Posso te mostrar em 20 min um pré-projeto de como ficaria esse canal. Podemos marcar para {{data_sugerida}}?"',
'always', 0);

-- D4 - Email de Valor Visual (para quem não atendeu)
INSERT OR IGNORE INTO cadence_steps (id, cadence_id, day, step_order, name, description, channel, action_type, send_time, delay_hours, subject, content, condition_type, skip_if_responded) VALUES
('step_d4_email', 'cadence_outbound_solar_15d', 4, 2,
'D4 - Email de Valor Visual',
'Email para quem não atendeu a ligação',
'email', 'send_email', '15:00', 0,
'{{nome}}, olha o que aparece quando busco "energia solar {{cidade}}"',
'Oi {{nome}},

Tentei falar contigo por telefone hoje, mas provavelmente você estava em atendimento ou em obra.

Fiz uma busca rápida aqui por "energia solar {{cidade}}" e vi que alguns concorrentes já aparecem em destaque no Google, enquanto a {{empresa}} fica menos visível para quem ainda não conhece vocês.

Não é nenhum julgamento, mas sim um ponto de alerta. Hoje, muita gente decide com quem vai pedir orçamento a partir dessa primeira busca.

Se fizer sentido, posso te mostrar em 10 minutos o cenário exato da sua região e o que daria para ajustar para colocar a {{empresa}} em uma posição melhor.

Prefere receber isso em uma ligação rápida ou por uma apresentação em horário marcado?

Abraço,
{{vendedor_nome}}',
'if_no_response', 1);

-- =====================================================
-- DIA 5 - Follow-up de agendamento
-- =====================================================

INSERT OR IGNORE INTO cadence_steps (id, cadence_id, day, step_order, name, description, channel, action_type, send_time, content, condition_type, skip_if_responded) VALUES
('step_d5_wa_agendamento', 'cadence_outbound_solar_15d', 5, 1,
'D5 - WhatsApp Agendamento',
'Agendar horário específico de ligação com quem respondeu mas não converteu',
'whatsapp', 'send_message', '10:00',
'{{nome}}, para te mostrar esse cenário com calma e te dar algo prático, o ideal é a gente falar uns 5 a 10 min.

Fica mais fácil eu compartilhar a tela e te mostrar o caminho que o cliente faz quando busca "energia solar {{cidade}}".

Você prefere hoje às {{horario_1}} ou amanhã às {{horario_2}}?',
'if_no_response', 1);

-- =====================================================
-- DIA 6 - Ruptura leve com imagem
-- =====================================================

INSERT OR IGNORE INTO cadence_steps (id, cadence_id, day, step_order, name, description, channel, action_type, send_time, content, condition_type, skip_if_responded) VALUES
('step_d6_wa_ruptura', 'cadence_outbound_solar_15d', 6, 1,
'D6 - WhatsApp Ruptura Leve',
'Última tentativa inteligente para quem nunca respondeu',
'whatsapp', 'send_message', '09:30',
'Oi {{nome}}, tudo bem?

Fiz de novo aqui o teste de como um cliente te encontra quando busca "energia solar {{cidade}}" no Google e a {{empresa}} continua pouco visível em comparação a outras integradoras.

Não quero ser chato, então prometo que é a última vez que toco nesse assunto.

Hoje quem não tem um canal digital claro acaba ficando de fora de muitos orçamentos de gente que nem chega a te conhecer.

Se em algum momento essa parte entrar no teu radar, posso te mostrar em 10 min o cenário da tua região e o que dá para fazer.

Caso não seja prioridade agora, tudo certo também.',
'if_no_response', 1);

-- =====================================================
-- DIA 7 - Sem disparo (organização interna)
-- =====================================================

INSERT OR IGNORE INTO cadence_steps (id, cadence_id, day, step_order, name, description, channel, action_type, content, condition_type, skip_if_responded) VALUES
('step_d7_task', 'cadence_outbound_solar_15d', 7, 1,
'D7 - Organização CRM',
'Não saturar o lead. Organizar CRM e classificar tags.',
'task', 'create_task',
'ORGANIZAR CRM:
- Registrar quem respondeu e virou ligação
- Registrar quem respondeu mas não virou ligação
- Registrar quem não respondeu
- Classificar tags: Interessado, Morno, Frio',
'always', 0);

-- =====================================================
-- DIA 8 - Foco em diagnósticos
-- =====================================================

INSERT OR IGNORE INTO cadence_steps (id, cadence_id, day, step_order, name, description, channel, action_type, content, condition_type, skip_if_responded) VALUES
('step_d8_task', 'cadence_outbound_solar_15d', 8, 1,
'D8 - Executar Diagnósticos',
'Realizar ligações e reuniões de diagnóstico agendadas',
'task', 'create_task',
'EXECUTAR DIAGNÓSTICOS:
- Fazer chamadas agendadas
- Aplicar SPIN com calma
- Anotar dores principais
- Entender estágio digital atual
- Apontar próximos passos',
'always', 0);

-- =====================================================
-- DIA 9 - Email com estudo de caso
-- =====================================================

INSERT OR IGNORE INTO cadence_steps (id, cadence_id, day, step_order, name, description, channel, action_type, send_time, subject, content, condition_type, skip_if_responded) VALUES
('step_d9_email_case', 'cadence_outbound_solar_15d', 9, 1,
'D9 - Email Case de Sucesso',
'Educar e reacender interesse em quem não avançou',
'email', 'send_email', '10:00',
'Como uma integradora sem site estruturado começou a receber orçamentos todos os meses',
'Oi {{nome}},

Queria compartilhar rapidinho um caso que tem tudo a ver com a realidade de muitas integradoras.

Atendemos uma empresa de energia solar que, assim como a {{empresa}}, dependia quase 100% de indicação e redes sociais. Eles não tinham um canal digital claro de orçamento.

O resultado era aquele cenário clássico: meses muito bons quando as indicações estavam fortes e meses mais fracos, sem previsibilidade.

Depois que estruturamos um canal digital próprio, com página profissional e processo de captação organizado, eles passaram a receber orçamentos novos todos os meses vindos de clientes que nem conheciam a marca antes.

Posso te mostrar em 10 min como ficaria algo nessa linha para a {{empresa}} e qual seria o potencial de impacto na tua realidade.

Se fizer sentido, me responde com um "podemos ver" que eu te mando horários.

Abraço,
{{vendedor_nome}}',
'if_no_response', 1);

-- =====================================================
-- DIA 10 - WhatsApp puxando gancho do case
-- =====================================================

INSERT OR IGNORE INTO cadence_steps (id, cadence_id, day, step_order, name, description, channel, action_type, send_time, content, condition_type, skip_if_responded) VALUES
('step_d10_wa_case', 'cadence_outbound_solar_15d', 10, 1,
'D10 - WhatsApp Gancho do Case',
'Gerar resposta usando o case como ponto de partida',
'whatsapp', 'send_message', '10:00',
'Oi {{nome}}, mandei ontem um case rápido de uma integradora que dependia só de indicação e redes sociais e passou a receber orçamentos constantes depois de estruturar um canal digital.

Hoje vocês têm alguma meta de aumentar a quantidade de orçamentos fora da indicação ou isso ainda não entrou no plano de vocês?',
'if_no_response', 1);

-- =====================================================
-- DIA 11 - Sem disparo (ajuste de scripts)
-- =====================================================

INSERT OR IGNORE INTO cadence_steps (id, cadence_id, day, step_order, name, description, channel, action_type, content, condition_type, skip_if_responded) VALUES
('step_d11_task', 'cadence_outbound_solar_15d', 11, 1,
'D11 - Ajuste de Scripts',
'Aprender com as respostas, revisar scripts, organizar pipeline',
'task', 'create_task',
'AJUSTES INTERNOS:
- Rever quais hooks funcionaram melhor
- Ajustar argumentos para objeções mais comuns
- Atualizar fases do funil no CRM
- Gravar áudios melhores se necessário',
'always', 0);

-- =====================================================
-- DIA 12 - Break-up amigável
-- =====================================================

INSERT OR IGNORE INTO cadence_steps (id, cadence_id, day, step_order, name, description, channel, action_type, send_time, content, condition_type, skip_if_responded) VALUES
('step_d12_wa_breakup', 'cadence_outbound_solar_15d', 12, 1,
'D12 - WhatsApp Break-up',
'Encerrar cadência sem queimar ponte',
'whatsapp', 'send_message', '09:30',
'{{nome}}, para não ficar te incomodando, vou encerrar meus contatos por aqui.

Só deixo um alerta como alguém que está no dia a dia com integradoras: quem não tem um canal digital claro para captar orçamentos acaba ficando de fora do jogo quando o cliente busca "energia solar {{cidade}}" no Google e escolhe quem aparece primeiro.

Quando essa parte entrar no radar de vocês, posso te mostrar em 10 min o que dá para fazer na prática com a realidade da {{empresa}}.

Fica à vontade para me chamar quando fizer sentido.',
'if_no_response', 1);

-- =====================================================
-- DIA 13 - Observar reações ao break-up
-- =====================================================

INSERT OR IGNORE INTO cadence_steps (id, cadence_id, day, step_order, name, description, channel, action_type, content, condition_type, skip_if_responded) VALUES
('step_d13_task', 'cadence_outbound_solar_15d', 13, 1,
'D13 - Observar Reações',
'Aguardar respostas pós break-up (costumam ser leads quentes)',
'task', 'create_task',
'OBSERVAR RESPOSTAS:
- Quem responder ao D12 quase sempre é lead quente
- Responder rápido
- Tentar puxar direto para ligação',
'always', 0);

-- =====================================================
-- DIA 14 - Fechamento do ciclo no CRM
-- =====================================================

INSERT OR IGNORE INTO cadence_steps (id, cadence_id, day, step_order, name, description, channel, action_type, content, condition_type, skip_if_responded) VALUES
('step_d14_task', 'cadence_outbound_solar_15d', 14, 1,
'D14 - Fechamento CRM',
'Marcar histórico de cada lead para futuras rodadas',
'task', 'create_task',
'FECHAMENTO DO CICLO:
- Marcar status final da cadência
- Registrar motivo de perda quando houver
- Separar lista de reengajamento futuro
- Atualizar tags e campos customizados',
'always', 0);

-- =====================================================
-- DIA 15 - Reciclagem para nutrição
-- =====================================================

INSERT OR IGNORE INTO cadence_steps (id, cadence_id, day, step_order, name, description, channel, action_type, content, condition_type, skip_if_responded) VALUES
('step_d15_task', 'cadence_outbound_solar_15d', 15, 1,
'D15 - Reciclagem para Nutrição',
'Não abandonar a base. Jogar leads frios em fluxo de conteúdo.',
'task', 'create_task',
'RECICLAGEM:
- Enviar base para lista de conteúdo educativo
- Configurar remarketing
- Criar sequência de emails sobre previsibilidade, canal digital, etc
- Tag: "Nutrir - Energia Solar"
- Agendar reativação para 90 dias',
'always', 0);

-- =====================================================
-- TEMPLATES DE TRIAGEM DE RESPOSTAS
-- =====================================================

-- Tabela de templates de resposta para triagem
CREATE TABLE IF NOT EXISTS response_templates (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    response_type TEXT NOT NULL, -- curioso, cetico, hand_raiser, objecao
    trigger_keywords TEXT, -- JSON array de palavras-chave que identificam esse tipo
    template_content TEXT NOT NULL,
    next_action TEXT, -- JSON: próxima ação recomendada
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Templates de triagem
INSERT OR IGNORE INTO response_templates (id, name, response_type, trigger_keywords, template_content, next_action) VALUES

('resp_curioso', 'Lead Curioso', 'curioso',
'["como assim", "do que se trata", "que empresa", "o que voces fazem", "nao entendi"]',
'Legal que você perguntou! Em resumo: a gente ajuda integradoras de energia solar a aparecerem no Google quando alguém busca "energia solar {{cidade}}".

Hoje, se uma pessoa pesquisa isso, ela provavelmente não encontra a {{empresa}} de cara, e acaba pedindo orçamento para quem aparece primeiro.

A gente estrutura um canal digital próprio pra vocês captarem esses orçamentos.

Posso te explicar melhor em 5 min de ligação? Qual melhor horário?',
'{"action": "schedule_call", "priority": "medium"}'),

('resp_cetico', 'Lead Cético', 'cetico',
'["ja tentei", "nao funciona", "muito caro", "nao acredito", "ja tenho instagram"]',
'Entendo a desconfiança, {{nome}}. Muita gente já tentou algo e não viu resultado.

O ponto é que Instagram e indicação funcionam, mas dependem de você estar sempre postando e das pessoas lembrarem de indicar. Não dá previsibilidade.

Quando você tem um canal digital próprio, o cliente te encontra sozinho, sem você precisar ficar correndo atrás.

Posso te mostrar em 10 min como funciona e você decide se faz sentido. Sem compromisso. Topa?',
'{"action": "schedule_call", "priority": "medium"}'),

('resp_hand_raiser', 'Hand-raiser (Interessado)', 'hand_raiser',
'["me liga", "pode ligar", "vamos conversar", "tenho interesse", "quero saber mais", "manda proposta", "quanto custa"]',
'Perfeito, {{nome}}! Vou te ligar rapidinho então.

Qual melhor horário pra você hoje? Ou prefere amanhã de manhã?

A conversa é rápida, uns 10 min, só pra eu entender melhor a realidade de vocês e te mostrar se faz sentido avançar.',
'{"action": "schedule_call", "priority": "high"}'),

('resp_objecao_preco', 'Objeção de Preço', 'objecao',
'["caro", "sem dinheiro", "sem orcamento", "investimento alto", "momento dificil"]',
'Entendo, {{nome}}. Investimento é uma decisão importante mesmo.

Só uma pergunta: quando você perde um orçamento porque o cliente foi pra outra integradora que ele encontrou no Google, quanto isso representa em faturamento perdido?

Às vezes o custo de não estar visível acaba sendo maior do que o investimento pra resolver isso.

Posso te mostrar os números em 10 min e você avalia se faz sentido no momento de vocês. Topa?',
'{"action": "schedule_call", "priority": "medium"}');

-- Índices adicionais
CREATE INDEX IF NOT EXISTS idx_response_templates_type ON response_templates(response_type);
