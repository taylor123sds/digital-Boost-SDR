// run_state_migration.js
// Script para migrar dados de enhanced_conversation_states para lead_states

import { migrateLegacyStates } from './src/utils/stateManager.js';

console.log('🔄 Starting state migration from enhanced_conversation_states to lead_states...\n');

try {
  const result = await migrateLegacyStates();

  console.log('\n✅ Migration completed successfully!');
  console.log(`   Migrated: ${result.migrated} records`);
  console.log(`   Errors: ${result.errors} records`);

  if (result.migrated === 0 && result.errors === 0) {
    console.log('\nℹ️  No legacy data found - system is already using canonical schema');
  } else if (result.errors > 0) {
    console.log('\n⚠️  Some records failed to migrate. Check logs above for details.');
    process.exit(1);
  } else {
    console.log('\n✨ All records migrated successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Test the system thoroughly');
    console.log('   2. Monitor for 24-48 hours');
    console.log('   3. Run: node deprecate_legacy_table.js to remove old table');
  }

  process.exit(0);
} catch (error) {
  console.error('\n❌ Migration failed:', error);
  process.exit(1);
}
