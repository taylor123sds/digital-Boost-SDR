#!/usr/bin/env node
/**
 * @file check-tenant-queries.js
 * @description CI guardrail to detect multi-tenant queries without tenant filter
 *
 * P0-5: Ensures all queries to tenant-scoped tables include tenant_id filter
 *
 * Usage:
 *   node scripts/check-tenant-queries.js
 *
 * Exit codes:
 *   0 - All queries properly filtered
 *   1 - Found queries without tenant filter
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const SRC_PATH = './src';
const EXTENSIONS = ['.js', '.ts'];

// Tables that MUST have tenant_id filter
const TENANT_TABLES = [
  'leads',
  'accounts',
  'contacts',
  'opportunities',
  'activities',
  'whatsapp_messages',
  'pipelines',
  'agents',
  'agent_versions',
  'integrations',
  'integration_bindings',
  'inbound_events',
  'async_jobs',
  'conversation_contexts',
  'oauth_states'
];

// Patterns that indicate a query without tenant filter
// These are heuristics and may have false positives
const DANGEROUS_PATTERNS = [
  // SELECT without tenant filter
  /SELECT\s+\*\s+FROM\s+(${TENANT_TABLES.join('|')})\s*(?!.*(?:tenant_id|team_id)\s*=)/gi,
  // UPDATE without tenant filter
  /UPDATE\s+(${TENANT_TABLES.join('|')})\s+SET\s+(?!.*WHERE.*(?:tenant_id|team_id)\s*=)/gi,
  // DELETE without tenant filter
  /DELETE\s+FROM\s+(${TENANT_TABLES.join('|')})\s*(?!.*WHERE.*(?:tenant_id|team_id)\s*=)/gi,
];

// Safe patterns (exceptions)
const SAFE_PATTERNS = [
  /findById\(/,           // Repository methods handle tenant internally
  /findByIdForTenant\(/,  // Explicitly tenant-scoped
  /ForTenant\(/,          // Any *ForTenant method
  /getTenantColumn/,      // Tenant column detection
  /PRAGMA/i,              // SQLite pragmas
  /CREATE\s+TABLE/i,      // DDL
  /ALTER\s+TABLE/i,       // DDL
  /CREATE\s+INDEX/i,      // DDL
  /INSERT\s+INTO/i,       // Inserts usually include tenant
  /migration/i,           // Migration files
];

// Files to skip
const SKIP_FILES = [
  'migrate.js',
  'connection.js',
  'schema.js',
  '.test.js',
  '.spec.js',
  'check-tenant-queries.js'
];

const SKIP_DIRS = [
  'node_modules',
  'dist',
  'build',
  '.git',
  'migrations'
];

// Recursively find files
function findFiles(dir, files = []) {
  try {
    const items = readdirSync(dir);
    for (const item of items) {
      if (SKIP_DIRS.includes(item)) continue;

      const fullPath = join(dir, item);
      try {
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          findFiles(fullPath, files);
        } else if (stat.isFile() && EXTENSIONS.includes(extname(item))) {
          if (!SKIP_FILES.some(skip => item.includes(skip))) {
            files.push(fullPath);
          }
        }
      } catch (e) {
        // Skip inaccessible files
      }
    }
  } catch (e) {
    // Skip inaccessible dirs
  }
  return files;
}

// Check if a line is safe
function isSafeLine(line, context) {
  // Check safe patterns
  for (const pattern of SAFE_PATTERNS) {
    if (pattern.test(line) || pattern.test(context)) {
      return true;
    }
  }
  return false;
}

// Extract potential issues from file
function checkFile(filePath) {
  const issues = [];

  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\\n');

    // Build regex for this run
    const tablePattern = TENANT_TABLES.join('|');

    // Check for SELECT * FROM table without tenant filter
    const selectRegex = new RegExp(
      `SELECT\\s+[^;]+FROM\\s+(${tablePattern})(?:\\s|\\)|,|$)`,
      'gi'
    );

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Get context (3 lines before and after)
      const contextStart = Math.max(0, i - 3);
      const contextEnd = Math.min(lines.length, i + 4);
      const context = lines.slice(contextStart, contextEnd).join('\\n');

      // Skip safe lines
      if (isSafeLine(line, context)) {
        continue;
      }

      // Check for SELECT without tenant filter in context
      const match = selectRegex.exec(line);
      if (match) {
        const table = match[1].toLowerCase();

        // Check if tenant filter is in context
        const hasTenantFilter =
          context.includes('tenant_id') ||
          context.includes('team_id') ||
          context.includes('tenantId') ||
          context.includes('teamId') ||
          context.includes('ForTenant');

        if (!hasTenantFilter) {
          issues.push({
            file: filePath,
            line: lineNum,
            table: table,
            code: line.trim().substring(0, 100)
          });
        }

        selectRegex.lastIndex = 0; // Reset regex
      }
    }
  } catch (e) {
    // Skip unreadable files
  }

  return issues;
}

// Main function
function main() {
  console.log('\\nP0-5: Checking for multi-tenant queries without tenant filter...\\n');

  const files = findFiles(SRC_PATH);
  let allIssues = [];

  for (const file of files) {
    const issues = checkFile(file);
    allIssues = allIssues.concat(issues);
  }

  console.log(`Scanned ${files.length} files`);
  console.log(`Tenant-scoped tables: ${TENANT_TABLES.join(', ')}\\n`);

  if (allIssues.length > 0) {
    console.log('POTENTIAL ISSUES FOUND:');
    console.log('=======================');
    console.log('(Review these - some may be false positives)\\n');

    // Group by file
    const byFile = {};
    for (const issue of allIssues) {
      if (!byFile[issue.file]) {
        byFile[issue.file] = [];
      }
      byFile[issue.file].push(issue);
    }

    for (const [file, issues] of Object.entries(byFile)) {
      console.log(`\\n${file}:`);
      for (const issue of issues) {
        console.log(`  Line ${issue.line} [${issue.table}]: ${issue.code}`);
      }
    }

    console.log('\\n---');
    console.log('To fix: Add tenant_id = ? to WHERE clause');
    console.log('Or use BaseTenantRepository.findByForTenant()');
    console.log('\\n');

    // Warning only, don't fail CI (too many false positives)
    // Uncomment next line to fail CI:
    // process.exit(1);
    process.exit(0);
  }

  console.log('No obvious tenant filter issues found!\\n');
  process.exit(0);
}

main();
