#!/usr/bin/env node
// scripts/migrate-state-schema.js
//  State Schema Migration Script

import { migrateLegacyStates, getStateStatistics } from '../src/utils/stateManager.js';

console.log(' ORBION State Schema Migration');
console.log('================================\n');

async function main() {
  try {
    console.log(' Current state before migration:');
    const statsBefore = await getStateStatistics();
    console.table(statsBefore);

    console.log('\n Starting migration...\n');

    const result = await migrateLegacyStates();

    console.log('\n Migration complete!');
    console.log(`   - Migrated: ${result.migrated} leads`);
    console.log(`   - Errors: ${result.errors} leads`);

    console.log('\n State after migration:');
    const statsAfter = await getStateStatistics();
    console.table(statsAfter);

    if (result.errors === 0) {
      console.log('\n Migration successful! All leads migrated cleanly.');
    } else {
      console.log(`\n  Migration completed with ${result.errors} errors. Check logs above.`);
    }

    process.exit(result.errors === 0 ? 0 : 1);
  } catch (error) {
    console.error('\n Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
