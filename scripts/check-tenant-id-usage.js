import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'src');
const MIGRATIONS_DIR = path.join(SRC_DIR, 'db', 'migrations');

const ALLOWLIST = new Set([]);

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

function scanFile(filePath) {
  if (ALLOWLIST.has(filePath)) return [];
  if (filePath.startsWith(MIGRATIONS_DIR)) return [];
  const content = fs.readFileSync(filePath, 'utf8');
  const lowered = content.toLowerCase();
  if (!lowered.includes('team_id')) {
    return [];
  }

  const violations = [];
  const patterns = [/team_id/g];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      violations.push({
        file: filePath,
        line: getLineNumber(content, match.index),
        match: match[0]
      });
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
    console.log('tenant-id-usage: OK (no legacy team_id usage outside allowlist)');
    process.exit(0);
  }

  console.error('tenant-id-usage: legacy team_id usage found');
  for (const v of all) {
    console.error(`- ${v.file}:${v.line} (${v.match})`);
  }
  console.error(`Total: ${all.length}`);
  process.exit(1);
}

main();
