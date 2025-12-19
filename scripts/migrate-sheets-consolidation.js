#!/usr/bin/env node
// scripts/migrate-sheets-consolidation.js
//  Phase 2: Consolidate Google Sheets from FUNIL-BANT to unified funil sheet

import dotenv from 'dotenv';
dotenv.config(); // Load .env before imports

import { getAllLeadsFromSheets, syncLeadToSheets, getSheetsStatistics } from '../src/utils/sheetsManager.js';
import { getLeadState } from '../src/utils/stateManager.js';
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'orbion.db');

console.log(' ORBION Sheets Consolidation Migration');
console.log('==========================================\n');

async function main() {
  try {
    console.log(' Phase 2: Migrating from dual-sheet to single-sheet architecture\n');

    // 1. Get all leads from database
    console.log('1⃣  Loading leads from SQLite database...');
    const db = new Database(DB_PATH);
    const leads = db.prepare('SELECT phone_number FROM lead_states').all();

    console.log(`   Found ${leads.length} leads in database\n`);

    // 2. Sync each lead to new unified sheet
    console.log('2⃣  Syncing leads to unified "funil" sheet...\n');

    let synced = 0;
    let errors = 0;

    for (const lead of leads) {
      try {
        const state = await getLeadState(lead.phone_number);

        console.log(`    Syncing ${lead.phone_number}...`);
        const result = await syncLeadToSheets(state);

        if (result.success) {
          console.log(`       ${result.action} (row ${result.row})`);
          synced++;
        } else {
          console.log(`        Failed: ${result.error}`);
          errors++;
        }
      } catch (error) {
        console.error(`       Error: ${error.message}`);
        errors++;
      }
    }

    console.log(`\n3⃣  Migration Summary:`);
    console.log(`    Synced: ${synced} leads`);
    console.log(`    Errors: ${errors} leads`);

    // 3. Show statistics
    console.log(`\n4⃣  Sheet Statistics:`);
    const stats = await getSheetsStatistics();

    if (stats.error) {
      console.log(`     Could not load statistics: ${stats.error}`);
    } else {
      console.table({
        'Total Leads': stats.total_leads,
        'SDR Agent': stats.by_agent?.sdr || 0,
        'Specialist Agent': stats.by_agent?.specialist || 0,
        'Scheduler Agent': stats.by_agent?.scheduler || 0,
        'BANT Complete': stats.bant_complete || 0,
        'With Email': stats.with_email || 0,
        'Average Score': stats.avg_score || 0
      });
    }

    console.log('\n Migration complete!');
    console.log('\n Next Steps:');
    console.log('   1. Verify data in "funil" sheet: https://docs.google.com/spreadsheets/d/' + process.env.GOOGLE_FUNIL_SHEET_ID);
    console.log('   2. Review old "FUNIL-BANT" sheet (if exists) for any missing data');
    console.log('   3. Once verified, old "FUNIL-BANT" sheet can be archived or deleted');

    process.exit(errors === 0 ? 0 : 1);
  } catch (error) {
    console.error('\n Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
