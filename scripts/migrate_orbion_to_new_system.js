/**
 * @file migrate_orbion_to_new_system.js
 * @description Migration script to set up Digital Boost/Orbion in the new multi-tenant agent system
 *
 * This script:
 * 1. Creates/updates a user account for Digital Boost
 * 2. Creates a tenant for the company
 * 3. Creates the SDR agent entry
 * 4. Creates the full agent configuration (SPIN, BANT, objections, etc.)
 *
 * Run with: node scripts/migrate_orbion_to_new_system.js
 */

import { getDatabase } from '../src/db/connection.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════════════════
// DIGITAL BOOST CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const DIGITAL_BOOST_CONFIG = {
  // User/Tenant Info
  user: {
    email: 'taylorlapenda@gmail.com',
    name: 'Taylor Lapenda',
    company: 'Digital Boost',
    sector: 'marketing',
    role: 'admin'
  },

  // Agent Identity
  identity: {
    agentName: 'Leadly',
    companyName: 'Digital Boost',
    sector: 'marketing',
    role: 'SDR',
    personality: 'consultivo',
    language: 'pt-BR',
    location: 'Natal/RN'
  },

  // Business Context
  business: {
    description: 'Criamos sites profissionais focados em gerar clientes para empresas de qualquer setor.',
    valueProposition: 'Sites profissionais que captam clientes, com SEO local e integracao WhatsApp.',
    offerings: [
      'Site/Landing page profissional (design focado em conversao)',
      'Paginas SEO por regiao/cidade',
      'Integracao WhatsApp + Formulario',
      'Prova social (fotos, avaliacoes)',
      'Tracking basico (Pixel + GA4)'
    ],
    offeringSummary: 'Sites profissionais focados em captacao de clientes com SEO local e integracao WhatsApp.',
    targetAudience: 'Empresas que dependem de indicacao, tem Instagram mas nao converte, nao tem site ou tem site institucional.',
    differentials: [
      'Foco em conversao, nao em design institucional',
      'SEO local para aparecer no Google da regiao',
      'Integracao direta com WhatsApp para nao perder leads',
      'Somos de Natal e entendemos o mercado local'
    ],
    socialProof: 'Atendemos empresas de todo o Brasil com foco em resultados mensuraveis.',
    honesty: {
      doNotPromise: [
        'Posicao especifica no Google (SEO leva tempo)',
        'Quantidade de leads por mes (depende do mercado)',
        'Milagres sem investimento'
      ],
      beHonestAbout: [
        'SEO e um trabalho de medio/longo prazo',
        'Resultados dependem do investimento e do mercado',
        'Site sozinho nao faz milagre - precisa de estrategia'
      ]
    }
  },

  // CTA Configuration
  cta: {
    type: 'reuniao',
    description: 'Diagnostico gratuito',
    valueForLead: 'Analise da sua presenca digital atual e recomendacoes personalizadas',
    duration: '20-30 min'
  },

  // SPIN Configuration
  spinConfig: {
    phases: {
      situation: {
        objective: 'Entender a presenca digital atual do lead',
        tone: 'curioso e consultivo',
        dataToCollect: ['setor', 'tem_site', 'usa_instagram', 'como_capta_clientes', 'regiao_atuacao']
      },
      problem: {
        objective: 'Identificar gaps na captacao de clientes',
        tone: 'empatico',
        technique: {
          name: 'espelho',
          description: 'Repetir o problema do lead para validar entendimento'
        }
      },
      implication: {
        objective: 'Mostrar o custo de nao ter presenca digital otimizada',
        tone: 'educativo'
      },
      needPayoff: {
        objective: 'Conectar a solucao ao desejo do lead',
        tone: 'entusiasmado mas realista'
      },
      closing: {
        objective: 'Agendar diagnostico gratuito',
        closingTechniques: ['alternativa', 'assumptivo']
      }
    }
  },

  // BANT Configuration
  bantConfig: {
    fields: {
      setor: { label: 'Setor', weight: 10, fromPhase: 'situation' },
      tem_site: { label: 'Tem site?', weight: 10, fromPhase: 'situation' },
      regiao_atuacao: { label: 'Regiao de atuacao', weight: 10, fromPhase: 'situation' },
      problema_principal: { label: 'Problema principal', weight: 15, fromPhase: 'problem' },
      urgencia: { label: 'Urgencia', weight: 15, fromPhase: 'implication' },
      decisor: { label: 'E o decisor?', weight: 20, fromPhase: 'closing' },
      orcamento: { label: 'Tem orcamento?', weight: 20, fromPhase: 'closing' }
    },
    questions: {
      setor: 'Qual o setor da sua empresa?',
      tem_site: 'Voce ja tem um site hoje?',
      regiao_atuacao: 'Quais regioes/cidades voce atende?',
      problema_principal: 'Qual seu maior desafio na captacao de clientes hoje?',
      urgencia: 'Quando voce pretende resolver isso?',
      decisor: 'Voce e quem decide sobre investimentos em marketing?',
      orcamento: 'Ja tem uma ideia de investimento pra isso?'
    },
    qualificationThreshold: 60
  },

  // Objection Handlers
  objectionHandlers: {
    price: {
      detection: ['caro', 'muito caro', 'preco alto', 'nao tenho dinheiro', 'sem verba'],
      reframe: 'Entendo a preocupacao com investimento. O diagnostico e gratuito e la podemos alinhar algo que caiba no seu momento.',
      followUp: 'Faz sentido a gente conversar primeiro pra voce entender o que ta incluso?'
    },
    time: {
      detection: ['sem tempo', 'muito ocupado', 'depois', 'nao agora', 'outra hora'],
      reframe: 'Perfeito, sei como e correria. O diagnostico leva so 20-30 min e podemos fazer no horario que voce preferir.',
      followUp: 'Qual periodo da semana que funciona melhor pra voce?'
    },
    think: {
      detection: ['vou pensar', 'preciso pensar', 'deixa eu ver', 'vou analisar'],
      reframe: 'Claro! Enquanto voce analisa, posso te mandar um material rapido sobre como funciona?',
      followUp: 'O que especificamente voce gostaria de entender melhor?'
    },
    alreadyHave: {
      detection: ['ja tenho site', 'ja tenho fornecedor', 'ja trabalho com alguem'],
      reframe: 'Otimo que ja tem site! No diagnostico a gente pode analisar juntos o que poderia ser otimizado. Sem compromisso.',
      followUp: 'Voce sente que o site atual ta trazendo os resultados esperados?'
    },
    noNeed: {
      detection: ['nao preciso', 'estou bem', 'nao tenho interesse'],
      reframe: 'Entendi! So pra eu entender melhor, como voce capta clientes novos hoje?',
      followUp: 'E voce ta satisfeito com o volume de clientes que chega por esse canal?'
    }
  },

  // Style Rules
  styleRules: {
    forbiddenStarters: ['Ah', 'Olha', 'Entao', 'Bom', 'Tipo', 'Assim', 'Ta'],
    maxLines: 4,
    forbiddenCorporate: [
      'agregar valor',
      'sinergia',
      'alavancagem',
      'proatividade',
      'escalabilidade',
      'disruptivo'
    ]
  },

  // Knowledge Base
  knowledgeBase: {
    faqs: {
      servicos: {
        'o_que_fazemos': 'Criamos sites profissionais focados em gerar clientes, com SEO local e integracao WhatsApp.',
        'quanto_custa': 'O investimento depende do escopo. No diagnostico gratuito a gente define juntos o que faz sentido.',
        'quanto_tempo': 'Um site leva em media 15-30 dias dependendo da complexidade.'
      },
      seo: {
        'demora_seo': 'SEO e um trabalho de medio/longo prazo. Primeiros resultados em 3-6 meses.',
        'garantia_google': 'Nao garantimos posicao especifica no Google - ninguem serio faz isso.'
      }
    },
    commonQuestions: {
      'voces_fazem': 'Criamos sites profissionais focados em captacao de clientes com SEO local e integracao WhatsApp.',
      'de_onde_sao': 'Somos de Natal/RN e atendemos empresas de todo o Brasil.',
      'funciona_como': 'Primeiro fazemos um diagnostico gratuito de 20-30min, depois apresentamos uma proposta personalizada.'
    },
    canShare: [
      'Portfolio de trabalhos',
      'Depoimentos de clientes',
      'Materiais educativos sobre SEO e sites'
    ],
    requiresHuman: [
      'Negociacao de preco final',
      'Questoes tecnicas muito especificas',
      'Reclamacoes de clientes existentes'
    ]
  },

  // AI Configuration
  aiConfig: {
    model: 'gpt-4o-mini',
    plannerTemperature: 0.3,
    writerTemperature: 0.9
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// MIGRATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

async function ensureTables(db) {
  console.log('Ensuring tables exist...');

  // Ensure users table has company and sector columns
  try {
    db.exec(`ALTER TABLE users ADD COLUMN company TEXT`);
    console.log('  - Added company column to users');
  } catch (e) {
    // Column likely exists
  }

  try {
    db.exec(`ALTER TABLE users ADD COLUMN sector TEXT`);
    console.log('  - Added sector column to users');
  } catch (e) {
    // Column likely exists
  }

  // Ensure agents table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      type TEXT DEFAULT 'sdr',
      description TEXT,
      tenant_id TEXT,
      is_active INTEGER DEFAULT 1,
      config_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_agents_tenant ON agents(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_agents_slug ON agents(slug);
  `);
  console.log('  - Agents table ready');

  // Ensure agent_configs table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_configs (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      tenant_id TEXT,
      version INTEGER DEFAULT 1,
      config TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );
    CREATE INDEX IF NOT EXISTS idx_agent_configs_agent ON agent_configs(agent_id);
    CREATE INDEX IF NOT EXISTS idx_agent_configs_active ON agent_configs(is_active);
  `);
  console.log('  - Agent configs table ready');
}

async function createOrUpdateUser(db) {
  console.log('\nCreating/updating user...');

  const { email, name, company, sector, role } = DIGITAL_BOOST_CONFIG.user;

  // Check if user exists
  const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  if (existingUser) {
    // Update existing user with company and sector
    db.prepare(`
      UPDATE users
      SET company = ?, sector = ?, updated_at = datetime('now')
      WHERE email = ?
    `).run(company, sector, email);

    console.log(`  - Updated existing user: ${email}`);
    return existingUser.id;
  } else {
    // Create new user
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Holdint1.', salt);
    const userId = `usr_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

    db.prepare(`
      INSERT INTO users (id, email, name, password_hash, role, company, sector, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `).run(userId, email, name, passwordHash, role, company, sector);

    console.log(`  - Created new user: ${email} (ID: ${userId})`);
    return userId;
  }
}

function createAgent(db, userId) {
  console.log('\nCreating agent...');

  const agentId = `agent_digitalboost_${Date.now()}`;
  const slug = 'digitalboost';

  // Check if agent already exists
  const existingAgent = db.prepare('SELECT * FROM agents WHERE slug = ?').get(slug);

  if (existingAgent) {
    console.log(`  - Agent already exists: ${slug} (ID: ${existingAgent.id})`);
    return existingAgent.id;
  }

  db.prepare(`
    INSERT INTO agents (id, name, slug, type, description, tenant_id, is_active)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `).run(
    agentId,
    DIGITAL_BOOST_CONFIG.identity.agentName,
    slug,
    'sdr',
    'SDR Agent para Digital Boost - Sites profissionais que geram clientes',
    userId
  );

  console.log(`  - Created agent: ${slug} (ID: ${agentId})`);
  return agentId;
}

function createAgentConfig(db, agentId, userId) {
  console.log('\nCreating agent configuration...');

  // Deactivate any existing configs
  db.prepare('UPDATE agent_configs SET is_active = 0 WHERE agent_id = ?').run(agentId);

  const configId = `config_${agentId}_v1`;
  const fullConfig = {
    identity: DIGITAL_BOOST_CONFIG.identity,
    business: DIGITAL_BOOST_CONFIG.business,
    cta: DIGITAL_BOOST_CONFIG.cta,
    spinConfig: DIGITAL_BOOST_CONFIG.spinConfig,
    bantConfig: DIGITAL_BOOST_CONFIG.bantConfig,
    objectionHandlers: DIGITAL_BOOST_CONFIG.objectionHandlers,
    styleRules: DIGITAL_BOOST_CONFIG.styleRules,
    knowledgeBase: DIGITAL_BOOST_CONFIG.knowledgeBase,
    aiConfig: DIGITAL_BOOST_CONFIG.aiConfig
  };

  db.prepare(`
    INSERT INTO agent_configs (id, agent_id, tenant_id, version, config, is_active, created_by)
    VALUES (?, ?, ?, 1, ?, 1, ?)
  `).run(
    configId,
    agentId,
    userId,
    JSON.stringify(fullConfig),
    userId
  );

  // Update agent with config_id
  db.prepare('UPDATE agents SET config_id = ? WHERE id = ?').run(configId, agentId);

  console.log(`  - Created config: ${configId}`);
  return configId;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║     ORBION/DIGITAL BOOST MIGRATION TO NEW AGENT SYSTEM        ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    const db = getDatabase();

    // Step 1: Ensure tables exist
    await ensureTables(db);

    // Step 2: Create/update user
    const userId = await createOrUpdateUser(db);

    // Step 3: Create agent
    const agentId = createAgent(db, userId);

    // Step 4: Create agent configuration
    const configId = createAgentConfig(db, agentId, userId);

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                    MIGRATION COMPLETE!                         ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log('\nSummary:');
    console.log(`  User ID:   ${userId}`);
    console.log(`  Agent ID:  ${agentId}`);
    console.log(`  Config ID: ${configId}`);
    console.log('\nYou can now access the dashboard at /dashboard-pro.html');
    console.log('Login with: taylorlapenda@gmail.com / Holdint1.');
    console.log('\nThe Digital Boost agent is configured with:');
    console.log('  - SPIN Selling methodology');
    console.log('  - BANT qualification fields');
    console.log('  - Objection handlers');
    console.log('  - Knowledge base/FAQs');
    console.log('  - Style rules');

  } catch (error) {
    console.error('\n[ERROR] Migration failed:', error);
    process.exit(1);
  }
}

main();
