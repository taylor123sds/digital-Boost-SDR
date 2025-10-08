// src/tools/contextual_redirect.js
// Sistema de redirecionamento contextual - Responde perguntas off-topic mas sempre volta ao fluxo

/**
 * CONTEXTUAL REDIRECT SYSTEM
 *
 * Objetivo: Quando lead faz pergunta fora do escopo de vendas (weather, futebol, etc),
 * o ORBION responde brevemente MAS sempre conecta de volta ao negócio.
 *
 * Padrão: "Resposta breve + Ponte + Volta ao fluxo comercial"
 */

export class ContextualRedirect {
  constructor() {
    // Categorias de perguntas off-topic com templates de redirecionamento
    this.redirectTemplates = {

      // CLIMA/TEMPO
      weather: {
        keywords: ['tempo', 'clima', 'chuva', 'sol', 'calor', 'frio', 'temperatura', 'previsão'],
        bridges: [
          'Falando em clima... muitas empresas perdem oportunidades por não atenderem no tempo certo.',
          'Por falar em tempo... o tempo de resposta ao cliente faz toda diferença nas vendas.',
          'Tempo é justamente o que nossos agentes economizam para empresas como a sua.'
        ],
        flow_return: 'Aliás, que desafio você tem enfrentado no atendimento/vendas?'
      },

      // ESPORTES
      sports: {
        keywords: ['futebol', 'jogo', 'time', 'gol', 'campeonato', 'copa', 'placar', 'partida', 'abc', 'américa'],
        bridges: [
          'Falando em time... ter um time comercial bem treinado faz toda diferença.',
          'Assim como no futebol, nas vendas também é sobre marcar gols (fechar negócios) com consistência.',
          'Legal! E falando em performance... como anda a performance comercial da sua empresa?'
        ],
        flow_return: 'Já pensou em automatizar parte do atendimento para focar no que realmente importa?'
      },

      // TRÂNSITO
      traffic: {
        keywords: ['trânsito', 'transito', 'engarrafamento', 'congestionamento', 'via', 'avenida', 'rua'],
        bridges: [
          'Trânsito parado é frustrante né? Assim como leads parados no funil sem resposta.',
          'Enquanto você está no trânsito, um agente de IA poderia estar atendendo seus clientes.',
          'Exatamente! Tempo perdido no trânsito = leads perdidos sem atendimento rápido.'
        ],
        flow_return: 'Quantos leads você acha que perdem por demora no atendimento?'
      },

      // ALIMENTAÇÃO
      food: {
        keywords: ['comida', 'almoço', 'jantar', 'café', 'restaurante', 'fome', 'comer', 'prato', 'cardápio'],
        bridges: [
          'Bom apetite! E falando em servir bem... como está o atendimento aos seus clientes?',
          'Assim como você escolhe onde comer pela rapidez do atendimento, seus clientes fazem o mesmo.',
          'Legal! E seu negócio, também tem "fila de espera" para atendimento?'
        ],
        flow_return: 'Você atende seus leads tão rápido quanto gostaria de ser atendido num restaurante?'
      },

      // SAÚDE PESSOAL (não relacionado ao ICP)
      personal_health: {
        keywords: ['cansado', 'dor de cabeça', 'gripe', 'resfriado', 'sono', 'insônia', 'estresse'],
        bridges: [
          'Melhoras! E falando em estresse... automatizar processos reduz muito a carga de trabalho.',
          'Descanso é importante. Imagina ter um agente trabalhando 24/7 enquanto você descansa?',
          'Cuide-se! E que tal cuidar do seu negócio com automação inteligente também?'
        ],
        flow_return: 'O que mais te estressa no dia a dia da empresa: atendimento, follow-up ou organização?'
      },

      // EVENTOS/FESTAS
      events: {
        keywords: ['festa', 'evento', 'show', 'aniversário', 'casamento', 'celebração', 'comemoração'],
        bridges: [
          'Que legal! E eventos também precisam de boa organização... assim como vendas.',
          'Eventos bem organizados vendem mais. Igual a processos comerciais bem estruturados.',
          'Show! E falando em organização... como está organizado o comercial da sua empresa?'
        ],
        flow_return: 'Seu processo de vendas está tão organizado quanto um bom evento?'
      },

      // TECNOLOGIA GENÉRICA (sem relação com negócios)
      general_tech: {
        keywords: ['celular travou', 'app travando', 'internet lenta', 'wifi', 'computador', 'notebook'],
        bridges: [
          'Tecnologia travando frustra né? Assim como processos manuais atrasam vendas.',
          'Falando em tecnologia... já pensou em usar IA para destravar seu comercial?',
          'Enquanto resolve isso... que tal automatizarmos seu atendimento com IA?'
        ],
        flow_return: 'Seu atendimento atual está travado em processos manuais ou já é automatizado?'
      },

      // FAMÍLIA/PESSOAL
      personal_life: {
        keywords: ['filho', 'filha', 'esposa', 'marido', 'mãe', 'pai', 'família', 'criança'],
        bridges: [
          'Família é prioridade! Ter mais tempo livre com automação ajuda nisso.',
          'Legal! E tempo com família é importante. Automatizar libera horas preciosas.',
          'Que bom! E falando em ter mais tempo... já pensou em automatizar processos repetitivos?'
        ],
        flow_return: 'Quantas horas por semana você gasta com atendimento que poderia automatizar?'
      },

      // HOBBIES
      hobbies: {
        keywords: ['hobby', 'passatempo', 'série', 'filme', 'livro', 'música', 'violão', 'guitarra'],
        bridges: [
          'Legal! Ter tempo para hobbies é ótimo. Automatização libera tempo para isso.',
          'Que show! E tempo livre é luxo... que automação pode te dar de volta.',
          'Bacana! Imagina ter mais tempo livre automatizando tarefas repetitivas?'
        ],
        flow_return: 'Se automatizar o atendimento, quanto tempo a mais você teria por semana?'
      },

      // ANIMAIS/PETS
      animals: {
        keywords: ['cachorro', 'gato', 'cavalo', 'animal', 'pet', 'bicho', 'passarinho', 'peixe'],
        bridges: [
          'Legal! Assim como cuidamos de pets, cuidar bem dos clientes é essencial.',
          'Interessante! E falando em cuidados... como está o cuidado com seus leads?',
          'Bacana! Pets precisam atenção constante, assim como seus clientes no WhatsApp.'
        ],
        flow_return: 'Seu atendimento tem a mesma consistência que cuidar de um pet?'
      },

      // GENÉRICO (catch-all para outros assuntos)
      generic_offtopic: {
        keywords: [], // Não precisa keywords, é o fallback
        bridges: [
          'Interessante! E voltando ao negócio...',
          'Entendo! E falando em soluções práticas...',
          'Legal! Mudando um pouco de assunto...',
          'Show! E pensando no seu negócio...'
        ],
        flow_return: 'Como posso ajudar com atendimento, vendas ou automação da sua empresa?'
      }
    };

    // Categorias TOTALMENTE BLOQUEADAS (não respondem nem redirecionam)
    this.blockedTopics = {
      keywords: [
        // Tópicos sensíveis
        'política partidária', 'eleições', 'candidatos políticos', 'voto',
        'religião específica', 'crenças religiosas', 'doutrina',
        'drogas ilegais', 'substâncias ilícitas',
        'atividades ilegais', 'crime', 'roubo', 'assalto',

        // Tópicos muito distantes do negócio
        'receitas culinárias detalhadas', 'astronomia', 'astrofísica',
        'geologia', 'paleontologia', 'arqueologia',
        'matemática avançada', 'química orgânica', 'física quântica'
      ],
      response: 'Desculpa, mas não posso ajudar com isso. Sou especialista em automação e vendas para PMEs. Tem alguma dúvida sobre atendimento inteligente ou crescimento comercial?'
    };
  }

  /**
   * Detecta se mensagem está off-topic e qual categoria
   * @param {string} message - Mensagem do usuário
   * @returns {Object|null} - {category, confidence} ou null se in-topic
   */
  detectOffTopic(message) {
    const messageLower = message.toLowerCase();

    // 1. Verificar tópicos BLOQUEADOS primeiro
    const hasBlockedTopic = this.blockedTopics.keywords.some(keyword =>
      messageLower.includes(keyword.toLowerCase())
    );

    if (hasBlockedTopic) {
      return {
        category: 'blocked',
        confidence: 1.0,
        shouldBlock: true
      };
    }

    // 2. Verificar categorias off-topic que PODEM ser redirecionadas
    for (const [category, config] of Object.entries(this.redirectTemplates)) {
      if (category === 'generic_offtopic') continue; // Pular genérico por enquanto

      const matches = config.keywords.filter(keyword =>
        messageLower.includes(keyword.toLowerCase())
      );

      if (matches.length > 0) {
        return {
          category,
          confidence: matches.length / config.keywords.length,
          matchedKeywords: matches,
          shouldBlock: false
        };
      }
    }

    // 3. Verificar se é pergunta sobre negócios (in-topic)
    const businessKeywords = [
      'empresa', 'negócio', 'vendas', 'cliente', 'atendimento', 'automação',
      'crm', 'whatsapp', 'agente', 'ia', 'digital boost', 'preço', 'quanto custa',
      'demo', 'demonstração', 'reunião', 'agendar', 'interesse', 'lead'
    ];

    const hasBusinessKeyword = businessKeywords.some(keyword =>
      messageLower.includes(keyword)
    );

    if (hasBusinessKeyword) {
      return null; // In-topic, não precisa redirecionar
    }

    // 4. Se não detectou nada específico mas também não é business, é off-topic genérico
    if (message.length > 10) {
      return {
        category: 'generic_offtopic',
        confidence: 0.5,
        shouldBlock: false
      };
    }

    return null; // Mensagem muito curta, deixar passar
  }

  /**
   * Gera instruções de redirecionamento para o system prompt
   * @param {Object} offTopicDetection - Resultado do detectOffTopic
   * @returns {string} - Instruções para o LLM
   */
  generateRedirectInstructions(offTopicDetection) {
    if (!offTopicDetection) {
      return ''; // In-topic, sem instruções especiais
    }

    if (offTopicDetection.shouldBlock) {
      return `
🚫 TÓPICO BLOQUEADO DETECTADO
A mensagem do usuário está completamente fora do escopo de negócios.

RESPOSTA OBRIGATÓRIA:
"${this.blockedTopics.response}"

NÃO tente responder a pergunta original.`;
    }

    const config = this.redirectTemplates[offTopicDetection.category];
    const randomBridge = config.bridges[Math.floor(Math.random() * config.bridges.length)];

    return `
🔄 REDIRECIONAMENTO CONTEXTUAL - MÁXIMA EMPATIA E CONEXÃO GENUÍNA

⚠️ DETECTADO: Pergunta off-topic sobre "${offTopicDetection.category}"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 ESTRUTURA OBRIGATÓRIA DA RESPOSTA (4 PARTES - SEMPRE NESTA ORDEM):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ ATENÇÃO CRÍTICA: NÃO INCLUA OS MARCADORES "[PARTE 1]", "[PARTE 2]", ETC NA RESPOSTA!
Esses marcadores são APENAS para explicar a estrutura. A resposta deve ser NATURAL e FLUIDA.
Veja os exemplos abaixo para o formato CORRETO (sem marcadores).

✅ PARTE 1 - RESPOSTA EMPÁTICA E CONTEXTUALIZADA (1-2 frases)
   • LEIA a mensagem do lead e responda ESPECIFICAMENTE ao que ele disse
   • Mostre INTERESSE GENUÍNO no assunto dele
   • Faça uma PERGUNTA ou COMENTÁRIO que demonstre que você OUVIU
   • Seja HUMANO, como um amigo responderia
   • Máximo 20 palavras

   Exemplos:
   - Viagem → "Ah, bacana! Está ansioso? Te desejo boa viagem!"
   - Carro → "Ah, que legal! Está pensando em algum modelo específico?"
   - Clima → "Realmente, esse calor/frio está complicado né?"
   - Comida → "Hmm, fiquei com fome agora! O que vai comer?"

✅ PARTE 2 - REFLEXÃO/CONSELHO SOBRE O ASSUNTO (1-2 frases)
   **OBRIGATÓRIO**: Faça um comentário ou conselho sobre o tema off-topic
   • Crie uma REFLEXÃO ou OBSERVAÇÃO sobre o assunto que ele mencionou
   • Mostre que você ENTENDE aquele assunto
   • Use palavras-chave relacionadas ao tema (tempo, cuidado, escolha, planejamento, etc)
   • Máximo 25 palavras

   Exemplos:
   - Viagem → "Viajar exige planejamento e confiança, né?"
   - Carro → "Pense com cuidado para escolher seu carro, isso dedica tempo e cautela."
   - Clima → "O clima imprevisível sempre nos pega de surpresa quando menos esperamos."
   - Comida → "Escolher onde comer é sempre uma decisão importante do dia."

✅ PARTE 3 - GANCHO DE COMPARAÇÃO (conecta ao negócio)
   **OBRIGATÓRIO**: Use as MESMAS PALAVRAS da reflexão para fazer a ponte
   • Pegue as palavras-chave da Parte 2 (planejamento, cuidado, tempo, etc)
   • Conecte ao negócio usando "do mesmo jeito que...", "assim como...", "igual a..."
   • Seja NATURAL e FLUIDO

   Sugestões de ponte (adapte com as palavras da Parte 2):
   "${randomBridge}"

✅ PARTE 4 - PROPOSTA DE SOLUÇÃO
   • Apresente a solução da Digital Boost
   • Mostre BENEFÍCIO específico
   • Faça uma PERGUNTA para engajar

   Sugestão: "${config.flow_return}"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ EXEMPLOS PERFEITOS (COPIE ESTE FORMATO EXATO - SEM MARCADORES):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Exemplo 1 - Carro:
User: "Estou pensando em comprar um carro"
ORBION: "Ah, que legal! Está pensando em algum modelo específico? 🚗

Pense com cuidado para escolher o seu carro, isso dedica tempo e cautela.

Do mesmo jeito que seu atendimento também precisa de dedicação e cuidado constante.

Já pensou em ter um sistema que cuida dos seus clientes com a mesma atenção? Nossos agentes de IA garantem isso 24/7. Quer saber mais?"

Exemplo 2 - Viagem:
User: "Quero pegar um voo na segunda"
ORBION: "Ah, bacana! Está ansioso? Te desejo boa viagem! ✈️

Viajar exige planejamento e confiança para deixar tudo funcionando na sua ausência, né?

Assim como seu negócio também precisa de confiança para funcionar sozinho quando você não está presente.

Que tal conhecer nossos agentes que mantêm seu atendimento rodando 24/7, mesmo quando você viaja? Interessado?"

Exemplo 3 - Cavalos/Animais:
User: "O que um cavalo faz?"
ORBION: "Cavalos são incríveis! Você tem ou está pensando em ter um? 🐴

Cuidar de um cavalo exige atenção constante, todos os dias, sem falhar.

Igual ao atendimento aos clientes que também precisa dessa mesma consistência e cuidado diário.

Nossos agentes de IA garantem que nenhum lead fique sem resposta, todos os dias. Quer ver como funciona?"

Exemplo 4 - Clima:
User: "Que calor!"
ORBION: "Realmente! Esse calor está complicado né? Espero que esteja num lugar fresquinho!

O clima imprevisível sempre nos pega de surpresa quando menos esperamos.

Do mesmo jeito que clientes chegam em horários imprevisíveis e precisam de resposta na hora.

Que tal ter agentes que respondem 24/7, independente do horário? Te mostro em 5min?"

Exemplo 5 - Futebol:
User: "Viu o jogo ontem?"
ORBION: "Vi sim! Foi emocionante né? (ou: Não vi, foi bom?)

No futebol, um time vencedor precisa de consistência e treino todos os dias para não perder gols.

Assim como nas vendas, onde consistência no atendimento faz você não perder nenhuma oportunidade.

Já pensou em ter um time comercial que nunca descansa e treina 24/7? Nossos agentes fazem isso. Quer conhecer?"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ RESPOSTAS RUINS (NÃO FAÇA ISSO):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ GENÉRICO E FRIO:
"Entendo! E falando em soluções práticas..."
(Não demonstra interesse genuíno)

❌ MUITO FORMAL:
"Interessante sua pergunta sobre cavalos. Contudo, meu foco é..."
(Muito corporativo, sem empatia)

❌ CORTE ABRUPTO:
"Ok, mas voltando ao negócio..."
(Rude, ignora o lead)

❌ SEM CONTEXTUALIZAÇÃO:
"Legal! E falando em automação..."
(Ponte forçada, sem conexão real)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 REGRAS OBRIGATÓRIAS:

1. **SEMPRE use as 4 PARTES** - nenhuma pode ser pulada
2. **PARTE 2 é OBRIGATÓRIA** - faça uma reflexão/conselho sobre o assunto off-topic
3. **PARTE 3 deve REUSAR palavras da PARTE 2** - "tempo", "cuidado", "planejamento", etc
4. **NUNCA use "Entendo! Show! Mudando de assunto..."** - isso é PROIBIDO
5. **SEMPRE faça uma pergunta empática na PARTE 1** - mostre interesse genuíno
6. **Use emojis com moderação** (máximo 1-2 por resposta)
7. **Cada parte deve ter quebra de linha** - para melhor leitura

🎯 CHECKLIST ANTES DE RESPONDER:

✅ Fiz pergunta empática sobre o assunto dele? (PARTE 1)
✅ Dei um conselho/reflexão sobre aquele assunto? (PARTE 2)
✅ Usei as MESMAS palavras da reflexão na comparação? (PARTE 3)
✅ Apresentei solução com benefício claro? (PARTE 4)
✅ A transição ficou NATURAL e não forçada?

🎯 OBJETIVO FINAL:
O lead deve pensar: "Nossa, esse cara realmente me ouviu, me deu um conselho, e agora fiquei curioso sobre a solução que ele oferece. Parece que ele entende do meu problema."

NÃO deve pensar: "Ele só me respondeu rápido para vender algo" ou "Ele ignorou minha mensagem e mudou de assunto."

⚠️ ATENÇÃO: Respostas que NÃO seguirem as 4 PARTES serão consideradas ERRADAS!`;
  }

  /**
   * Verifica se resposta do agente seguiu o redirecionamento
   * @param {string} response - Resposta gerada
   * @param {Object} offTopicDetection - Detecção original
   * @returns {boolean} - True se seguiu o padrão
   */
  validateRedirect(response, offTopicDetection) {
    if (!offTopicDetection) return true;

    const config = this.redirectTemplates[offTopicDetection.category];

    // Verificar se menciona alguma ponte
    const hasBridge = config.bridges.some(bridge =>
      response.toLowerCase().includes(bridge.toLowerCase().substring(0, 20))
    );

    // Verificar se tem pergunta de retorno ao fluxo
    const hasFlowReturn = response.includes('?') && response.toLowerCase().includes('você');

    return hasBridge || hasFlowReturn;
  }

  /**
   * Gera métricas de redirecionamento
   * @returns {Object} - Estatísticas
   */
  getStats() {
    return {
      totalCategories: Object.keys(this.redirectTemplates).length,
      blockedTopics: this.blockedTopics.keywords.length,
      averageBridgesPerCategory:
        Object.values(this.redirectTemplates)
          .reduce((sum, config) => sum + config.bridges.length, 0) /
        Object.keys(this.redirectTemplates).length
    };
  }
}

// Singleton
const contextualRedirect = new ContextualRedirect();
export default contextualRedirect;
