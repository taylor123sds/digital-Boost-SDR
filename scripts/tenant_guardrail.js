import fs from 'fs';
import path from 'path';
import { TENANT_REQUIRED_TABLES, GLOBAL_TABLE_ALLOWLIST } from '../src/utils/tenantGuard.js';

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'src');
const MIGRATIONS_DIR = path.join(SRC_DIR, 'db', 'migrations');
const IGNORE_MARKER = 'tenant-guard: ignore';

const CRITICAL_DIRS = [
  path.join(SRC_DIR, 'api', 'routes'),
  path.join(SRC_DIR, 'handlers'),
  path.join(SRC_DIR, 'services'),
  path.join(SRC_DIR, 'repositories')
];

const SQL_LITERAL_PATTERNS = [
  /db\.prepare\(\s*`([\s\S]*?)`\s*\)/g,
  /db\.prepare\(\s*'([\s\S]*?)'\s*\)/g,
  /db\.prepare\(\s*"([\s\S]*?)"\s*\)/g
];

const SQL_OPS = ['select', 'update', 'delete', 'insert'];

function listJsFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listJsFiles(fullPath));
      continue;
    }
    if (entry.isFile() && fullPath.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

function getLineNumber(content, index) {
  return content.slice(0, index).split('\n').length;
}

function hasTenantFilter(statement) {
  const lowered = statement.toLowerCase();
  return lowered.includes('tenant_id') ||
    lowered.includes('team_id') ||
    lowered.includes('tenantwhere') ||
    lowered.includes('tenantand');
}

function checkInsert(statement) {
  const lowered = statement.toLowerCase();
  const valuesIndex = lowered.indexOf('values');
  const columnsPart = valuesIndex > -1 ? lowered.slice(0, valuesIndex) : lowered;
  return columnsPart.includes('tenant_id') || columnsPart.includes('team_id');
}

function extractSqlLiterals(content) {
  const statements = [];
  for (const pattern of SQL_LITERAL_PATTERNS) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      statements.push({
        sql: match[1],
        index: match.index
      });
    }
  }
  return statements;
}

function extractTables(sql) {
  const lowered = sql.toLowerCase();
  const tables = new Set();

  const tablePatterns = [
    /\bfrom\s+([a-z0-9_]+)/g,
    /\bjoin\s+([a-z0-9_]+)/g,
    /\bupdate\s+([a-z0-9_]+)/g,
    /\binto\s+([a-z0-9_]+)/g,
    /\bdelete\s+from\s+([a-z0-9_]+)/g
  ];

  for (const pattern of tablePatterns) {
    let match;
    while ((match = pattern.exec(lowered)) !== null) {
      tables.add(match[1]);
    }
  }

  return Array.from(tables);
}

function scanFile(filePath) {
  if (filePath.startsWith(MIGRATIONS_DIR)) {
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const violations = [];

  const statements = extractSqlLiterals(content);
  for (const { sql, index } of statements) {
    const snippet = sql.slice(0, 600);
    if (snippet.includes(IGNORE_MARKER)) {
      continue;
    }

    const tables = extractTables(sql);
    const relevantTables = tables.filter((table) => TENANT_REQUIRED_TABLES.has(table));
    if (relevantTables.length === 0) {
      continue;
    }

    const isInsert = /insert\s+into/i.test(sql);
    const hasTenant = isInsert ? checkInsert(sql) : hasTenantFilter(sql);
    if (hasTenant) {
      continue;
    }

    for (const table of relevantTables) {
      if (GLOBAL_TABLE_ALLOWLIST.has(table)) {
        continue;
      }
      const op = SQL_OPS.find(o => sql.toLowerCase().includes(o)) || 'unknown';
      violations.push({
        file: filePath,
        line: getLineNumber(content, index),
        table,
        op
      });
    }
  }

  return violations;
}

function main() {
  const files = CRITICAL_DIRS.flatMap(listJsFiles);
  let all = [];

  for (const file of files) {
    all = all.concat(scanFile(file));
  }

  if (all.length === 0) {
    console.log('tenant-guard: OK (no violations)');
    process.exit(0);
  }

  console.error('tenant-guard: violations found');
  for (const v of all) {
    console.error(`- ${v.file}:${v.line} (${v.op} ${v.table})`);
  }
  console.error(`Total: ${all.length}`);
  process.exit(1);
}

main();
