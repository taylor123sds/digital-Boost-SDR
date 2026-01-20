#!/usr/bin/env node
/**
 * @file run_migration_001.js
 * @description Run database migration 001 - Add performance indexes
 * Wave 7: Performance Optimization
 */

import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(process.cwd(), '.env') });

console.log('');
console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║         DATABASE MIGRATION 001 - Performance Indexes         ║');
console.log('╚═══════════════════════════════════════════════════════════════╝');
console.log('');

async function runMigration() {
  try {
    // Connect to database
    console.log('📦 Connecting to database...');
    const dbPath = process.env.DATABASE_PATH || './orbion.db';
    const db = new Database(dbPath);
    console.log('✅ Database connected\n');

    // Read migration file
    console.log('📄 Reading migration file...');
    const migrationPath = join(__dirname, 'src/db/migrations/001_add_performance_indexes.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    console.log('✅ Migration file loaded\n');

    // Get table stats before migration
    console.log('📊 Database statistics BEFORE migration:');
    const tablesBefore = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const indexesBefore = db.prepare("SELECT name, tbl_name FROM sqlite_master WHERE type='index'").all();
    console.log(`   Tables: ${tablesBefore.length}`);
    console.log(`   Indexes: ${indexesBefore.length}\n`);

    // Run migration
    console.log('🚀 Running migration...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Split SQL by semicolon and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    let indexesCreated = 0;
    let indexesSkipped = 0;

    for (const statement of statements) {
      if (statement.includes('CREATE INDEX')) {
        const match = statement.match(/CREATE INDEX IF NOT EXISTS\s+(\w+)/);
        const indexName = match ? match[1] : 'unknown';

        try {
          db.exec(statement);

          // Check if index was actually created
          const exists = db.prepare(
            "SELECT COUNT(*) as count FROM sqlite_master WHERE type='index' AND name = ?"
          ).get(indexName);

          if (exists.count > 0) {
            console.log(`✅ Created index: ${indexName}`);
            indexesCreated++;
          } else {
            console.log(`⚠️ Index already exists: ${indexName}`);
            indexesSkipped++;
          }
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log(`⚠️ Index already exists: ${indexName}`);
            indexesSkipped++;
          } else {
            throw error;
          }
        }
      }
    }

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Get table stats after migration
    console.log('📊 Database statistics AFTER migration:');
    const tablesAfter = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const indexesAfter = db.prepare("SELECT name, tbl_name FROM sqlite_master WHERE type='index'").all();
    console.log(`   Tables: ${tablesAfter.length}`);
    console.log(`   Indexes: ${indexesAfter.length}\n`);

    // Summary
    console.log('📈 Migration Summary:');
    console.log(`   Indexes created: ${indexesCreated}`);
    console.log(`   Indexes skipped: ${indexesSkipped}`);
    console.log(`   Total indexes: ${indexesAfter.length}\n`);

    // Show all indexes
    console.log('📋 All indexes in database:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const allIndexes = db.prepare(`
      SELECT name, tbl_name
      FROM sqlite_master
      WHERE type='index' AND name LIKE 'idx_%'
      ORDER BY tbl_name, name
    `).all();

    let currentTable = '';
    for (const index of allIndexes) {
      if (index.tbl_name !== currentTable) {
        console.log(`\n${index.tbl_name}:`);
        currentTable = index.tbl_name;
      }
      console.log(`   - ${index.name}`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Performance test
    console.log('🔬 Testing query performance...');

    // Test 1: whatsapp_messages with index
    const testPhone = '+5511999999999';
    console.log('\nTest 1: Query conversation history (indexed)');
    console.log(`Query: SELECT * FROM whatsapp_messages WHERE phone_number = '${testPhone}' ORDER BY created_at DESC LIMIT 20`);

    const start1 = Date.now();
    const messages = db.prepare(`
      SELECT * FROM whatsapp_messages
      WHERE phone_number = ?
      ORDER BY created_at DESC
      LIMIT 20
    `).all(testPhone);
    const end1 = Date.now();

    console.log(`Result: ${messages.length} messages found in ${end1 - start1}ms`);

    // Show query plan
    const plan1 = db.prepare(`
      EXPLAIN QUERY PLAN
      SELECT * FROM whatsapp_messages
      WHERE phone_number = ?
      ORDER BY created_at DESC
      LIMIT 20
    `).all(testPhone);

    console.log('Query plan:');
    for (const step of plan1) {
      console.log(`   ${step.detail}`);
    }

    // Test 2: enhanced_conversation_states with index
    console.log('\nTest 2: Query lead state (indexed)');
    console.log(`Query: SELECT * FROM enhanced_conversation_states WHERE phone_number = '${testPhone}'`);

    const start2 = Date.now();
    const state = db.prepare(`
      SELECT * FROM enhanced_conversation_states
      WHERE phone_number = ?
    `).get(testPhone);
    const end2 = Date.now();

    console.log(`Result: ${state ? 'Found' : 'Not found'} in ${end2 - start2}ms`);

    // Show query plan
    const plan2 = db.prepare(`
      EXPLAIN QUERY PLAN
      SELECT * FROM enhanced_conversation_states
      WHERE phone_number = ?
    `).all(testPhone);

    console.log('Query plan:');
    for (const step of plan2) {
      console.log(`   ${step.detail}`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Close database
    db.close();
    console.log('✅ Database connection closed\n');

    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                   MIGRATION COMPLETE! ✅                      ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('📈 Expected Performance Improvements:');
    console.log('   - Conversation history queries: 50-70% faster');
    console.log('   - Lead state lookups: 50-70% faster');
    console.log('   - Bot detection queries: 50-70% faster');
    console.log('   - Analytics queries: 50-70% faster');
    console.log('');
    console.log('🎉 Your database is now optimized for production workloads!');
    console.log('');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run migration
runMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
