import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'src');

const MULTI_TENANT_TABLES = [
  'agents',
  'agent_versions',
  'integrations',
  'integration_bindings',
  'conversations',
  'messages',
  'whatsapp_messages',
  'leads',
  'activities',
  'opportunities',
  'contacts',
  'accounts',
  'cadences',
  'cadence_enrollments',
  'cadence_steps',
  'pipeline_stages',
  'notifications',
  'inbound_events',
  'async_jobs'
];

const IGNORE_MARKER = 'tenant-guard: ignore';
const SQL_OPS = ['select', 'update', 'delete', 'insert'];

function listJsFiles(dir) {
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
  return lowered.includes('tenant_id') || lowered.includes('team_id');
}

function checkInsert(statement) {
  const lowered = statement.toLowerCase();
  const valuesIndex = lowered.indexOf('values');
  const columnsPart = valuesIndex > -1 ? lowered.slice(0, valuesIndex) : lowered;
  return columnsPart.includes('tenant_id') || columnsPart.includes('team_id');
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const violations = [];

  if (!content.toLowerCase().includes('select') &&
      !content.toLowerCase().includes('update') &&
      !content.toLowerCase().includes('delete') &&
      !content.toLowerCase().includes('insert')) {
    return violations;
  }

  const lowered = content.toLowerCase();

  for (const table of MULTI_TENANT_TABLES) {
    const patterns = [
      new RegExp(`\\bfrom\\s+${table}\\b`, 'gi'),
      new RegExp(`\\bupdate\\s+${table}\\b`, 'gi'),
      new RegExp(`\\bdelete\\s+from\\s+${table}\\b`, 'gi'),
      new RegExp(`\\binsert\\s+into\\s+${table}\\b`, 'gi')
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(lowered)) !== null) {
        const start = match.index;
        const slice = content.slice(start, start + 600);
        if (slice.includes(IGNORE_MARKER)) {
          continue;
        }

        const op = SQL_OPS.find(o => slice.toLowerCase().includes(o)) || 'unknown';
        let ok = hasTenantFilter(slice);
        if (op === 'insert') {
          ok = checkInsert(slice);
        }

        if (!ok) {
          violations.push({
            file: filePath,
            line: getLineNumber(content, start),
            table,
            op
          });
        }
      }
    }
  }

  return violations;
}

function main() {
  const files = listJsFiles(SRC_DIR);
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
