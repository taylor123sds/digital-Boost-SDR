#!/usr/bin/env node

/**
 * @file manage-followups.js
 * @description CLI tool for managing follow-up automations
 *
 * Usage:
 *   node scripts/manage-followups.js install     - Install all follow-ups
 *   node scripts/manage-followups.js uninstall   - Remove all follow-ups
 *   node scripts/manage-followups.js reinstall   - Reinstall (remove + install)
 *   node scripts/manage-followups.js status      - Show current status
 *   node scripts/manage-followups.js info        - Show stage information
 */

import {
  installAllFollowups,
  uninstallAllFollowups,
  getFollowupStatus,
  reinstallFollowups
} from '../src/automation/followup/installer.js';

import { ALL_STAGES } from '../src/automation/followup/stages.js';

import {
  TIME_WINDOWS,
  FOLLOWUP_STAGES
} from '../src/automation/followup/constants.js';

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function printHeader() {
  console.log('\n' + '═'.repeat(60));
  log('  FOLLOW-UP AUTOMATION MANAGER', 'cyan');
  console.log('═'.repeat(60) + '\n');
}

function printStageInfo() {
  log(' STAGE INFORMATION\n', 'bright');

  console.log('Stages:');
  ALL_STAGES.forEach((stage, index) => {
    const stageKey = ['D0', 'D1', 'D3', 'DISCARD'][index];
    const window = TIME_WINDOWS[stageKey];

    console.log(`\n  ${colors.cyan}${index + 1}. ${stage.name}${colors.reset}`);
    console.log(`     ${stage.description}`);
    console.log(`     Schedule: ${window.CRON} (${window.DESCRIPTION})`);
  });

  console.log('\n\nFollowup Stage Values:');
  Object.entries(FOLLOWUP_STAGES).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });
}

async function handleInstall() {
  log('Installing follow-up automations...\n', 'yellow');

  const result = installAllFollowups();

  if (result.installed.length > 0) {
    log('\n Installed:', 'green');
    result.installed.forEach(item => {
      console.log(`   • ${item.name}`);
    });
  }

  if (result.skipped.length > 0) {
    log('\n  Skipped (already exist):', 'yellow');
    result.skipped.forEach(item => {
      console.log(`   • ${item.name}`);
    });
  }

  if (result.failed.length > 0) {
    log('\n Failed:', 'red');
    result.failed.forEach(item => {
      console.log(`   • ${item.name}: ${item.error}`);
    });
  }

  console.log('\n' + '─'.repeat(40));
  log(`Total: ${result.total} | Installed: ${result.installedCount} | Skipped: ${result.skippedCount} | Failed: ${result.failedCount}`, 'bright');

  if (result.success) {
    log('\n Installation complete! Restart the server to activate.', 'green');
  }
}

async function handleUninstall() {
  log('Uninstalling follow-up automations...\n', 'yellow');

  const result = uninstallAllFollowups();

  if (result.success) {
    log(` Removed ${result.removed} automation(s)`, 'green');
  } else {
    log(` Failed: ${result.error}`, 'red');
  }
}

async function handleReinstall() {
  log('Reinstalling follow-up automations...\n', 'yellow');

  const result = reinstallFollowups();

  if (result.success) {
    log(` Reinstalled ${result.installedCount} automation(s)`, 'green');
  } else {
    log(` Failed: ${result.error || 'Unknown error'}`, 'red');
  }
}

async function handleStatus() {
  log('Follow-up Automations Status\n', 'bright');

  const result = getFollowupStatus();

  if (!result.success) {
    log(` Error: ${result.error}`, 'red');
    return;
  }

  // Stats summary
  console.log('Summary:');
  console.log(`  Total: ${result.stats.total}`);
  console.log(`  Enabled: ${colors.green}${result.stats.enabled}${colors.reset}`);
  console.log(`  Disabled: ${colors.yellow}${result.stats.disabled}${colors.reset}`);
  console.log(`  Total Executions: ${result.stats.totalExecutions}`);

  // Individual automations
  if (result.automations.length > 0) {
    console.log('\nAutomations:');
    result.automations.forEach(auto => {
      const status = auto.enabled ? `${colors.green}${colors.reset}` : `${colors.red}${colors.reset}`;
      console.log(`  ${status} ${auto.name}`);
      console.log(`     ID: ${auto.id}`);
      console.log(`     Executions: ${auto.executions}`);
      console.log(`     Created: ${auto.created_at}`);
    });
  } else {
    log('\nNo follow-up automations installed.', 'yellow');
    log('Run: node scripts/manage-followups.js install', 'cyan');
  }
}

function printUsage() {
  log('Usage:', 'bright');
  console.log('  node scripts/manage-followups.js <command>\n');
  log('Commands:', 'bright');
  console.log('  install     Install all follow-up automations');
  console.log('  uninstall   Remove all follow-up automations');
  console.log('  reinstall   Remove and reinstall all');
  console.log('  status      Show current status');
  console.log('  info        Show stage information');
}

// Main execution
async function main() {
  printHeader();

  const command = process.argv[2]?.toLowerCase();

  switch (command) {
    case 'install':
      await handleInstall();
      break;
    case 'uninstall':
      await handleUninstall();
      break;
    case 'reinstall':
      await handleReinstall();
      break;
    case 'status':
      await handleStatus();
      break;
    case 'info':
      printStageInfo();
      break;
    default:
      printUsage();
  }

  console.log('\n');
}

main().catch(error => {
  log(`\n Error: ${error.message}`, 'red');
  process.exit(1);
});
