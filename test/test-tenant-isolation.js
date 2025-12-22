import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';

function createTempDbPath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbion-tenant-'));
  return path.join(dir, 'orbion-test.db');
}

async function main() {
  const dbPath = createTempDbPath();
  process.env.DATABASE_PATH = dbPath;
  process.env.NODE_ENV = 'test';

  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      nome TEXT,
      empresa TEXT,
      cargo TEXT,
      email TEXT,
      telefone TEXT,
      whatsapp TEXT,
      origem TEXT,
      campanha TEXT,
      midia TEXT,
      status TEXT,
      score INTEGER,
      segmento TEXT,
      interesse TEXT,
      bant_budget REAL,
      bant_authority TEXT,
      bant_need TEXT,
      bant_timing TEXT,
      bant_score INTEGER,
      owner_id TEXT,
      pipeline_id TEXT,
      stage_id TEXT,
      stage_entered_at TEXT,
      cadence_status TEXT,
      cadence_day INTEGER,
      custom_fields TEXT,
      tags TEXT,
      notas TEXT,
      tenant_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      lead_id TEXT,
      status TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      tenant_id TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_leads_tenant_id ON leads(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_activities_tenant_id ON activities(tenant_id);
  `);
  db.close();

  const { Lead } = await import('../src/models/Lead.js');
  const { leadRepository } = await import('../src/repositories/lead.repository.js');

  const leadModel = new Lead();
  const tenantA = `tenant_${Date.now()}_a`;
  const tenantB = `tenant_${Date.now()}_b`;

  const leadA = leadRepository.create({
    nome: 'Lead A',
    telefone: '5511999999999',
    tenant_id: tenantA
  });
  const leadB = leadRepository.create({
    nome: 'Lead B',
    telefone: '5511888888888',
    tenant_id: tenantB
  });

  const searchA = leadModel.search('Lead', { tenantId: tenantA });
  assert(searchA.some(item => item.id === leadA.id), 'Tenant A should see its lead');
  assert(!searchA.some(item => item.id === leadB.id), 'Tenant A should not see tenant B lead');

  const searchB = leadModel.search('Lead', { tenantId: tenantB });
  assert(searchB.some(item => item.id === leadB.id), 'Tenant B should see its lead');
  assert(!searchB.some(item => item.id === leadA.id), 'Tenant B should not see tenant A lead');

  const leadAForA = leadModel.findByIdWithDetails(leadA.id, tenantA);
  const leadAForB = leadModel.findByIdWithDetails(leadA.id, tenantB);
  assert(leadAForA && leadAForA.id === leadA.id, 'Tenant A should fetch lead A by id');
  assert(!leadAForB, 'Tenant B should not fetch lead A by id');

  const byPhoneA = leadRepository.findByPhone('5511999999999', tenantA);
  const byPhoneB = leadRepository.findByPhone('5511999999999', tenantB);
  assert(byPhoneA && byPhoneA.id === leadA.id, 'Tenant A should fetch lead A by phone');
  assert(!byPhoneB, 'Tenant B should not fetch lead A by phone');

  console.log('Tenant isolation test passed.');
}

main().catch((error) => {
  console.error('Tenant isolation test failed:', error.message);
  process.exit(1);
});
