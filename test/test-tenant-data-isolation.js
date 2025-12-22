import { getDatabase } from '../src/db/connection.js';
import { LeadRepository } from '../src/repositories/lead.repository.js';
import { ConversationRepository } from '../src/repositories/conversation.repository.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function buildTenantId(suffix) {
  return `tenant_${Date.now()}_${suffix}`;
}

async function main() {
  const tenantA = buildTenantId('a');
  const tenantB = buildTenantId('b');
  const uniquePhone = `5511999${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
  const uniqueEmail = `lead_${Date.now()}@example.com`;
  const uniquePipeline = `pipeline_test_${Date.now()}`;

  const leadRepo = new LeadRepository();
  const db = getDatabase();
  const conversationRepo = new ConversationRepository(db, console);

  const leadA = leadRepo.create({
    nome: 'Lead Tenant A',
    email: uniqueEmail,
    telefone: uniquePhone,
    pipeline_id: uniquePipeline,
    stage_id: 'stage_lead_novo'
  }, tenantA);

  assert(leadA?.id, 'Lead A should be created');

  const leadByPhoneB = leadRepo.findByPhone(uniquePhone, tenantB);
  assert(!leadByPhoneB, 'Tenant B should not find lead by phone');

  const leadBySearchB = leadRepo.search(uniqueEmail, { tenantId: tenantB });
  assert(!leadBySearchB.some(lead => lead.id === leadA.id), 'Tenant B should not find lead by email');

  const statsB = leadRepo.getFunnelStats(uniquePipeline, tenantB);
  assert(statsB.total === 0, 'Tenant B should not see stats for tenant A pipeline');

  const message = conversationRepo.createMessage({
    phone_number: uniquePhone,
    message_text: 'Mensagem de teste tenant A',
    from_me: 0,
    message_type: 'text'
  }, tenantA);

  assert(message?.id, 'Message should be created');

  const messagesForB = conversationRepo.findByPhone(uniquePhone, tenantB, { limit: 10 });
  assert(messagesForB.length === 0, 'Tenant B should not list tenant A messages');

  const messageForB = conversationRepo.findByIdForTenant(message.id, tenantB);
  assert(!messageForB, 'Tenant B should not read tenant A message by id');

  console.log('Tenant data isolation tests passed.');
}

main().catch((error) => {
  console.error('Tenant data isolation test failed:', error.message);
  process.exit(1);
});
