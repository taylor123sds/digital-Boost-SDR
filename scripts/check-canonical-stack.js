import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();
const canonicalRoutesRoot = path.join(projectRoot, 'src', 'api', 'routes');

const allowlistedLegacyRouteFiles = new Set([
  path.join(projectRoot, 'src', 'scalable', 'index.js'),
  path.join(projectRoot, 'src', 'scalable', 'agents', 'AgentApiRoutes.js'),
  path.join(projectRoot, 'src', 'scalable', 'agents', 'AgentConfigRoutes.js'),
  path.join(projectRoot, 'src', 'scalable', 'admin', 'AdminApiRoutes.js'),
  path.join(projectRoot, 'src', 'platform', 'api', 'index.js'),
  path.join(projectRoot, 'src', 'platform', 'api', 'routes', 'runtime.routes.js'),
  path.join(projectRoot, 'src', 'platform', 'api', 'routes', 'agents.routes.js')
]);

const routePatterns = [
  /express\.Router\s*\(/,
  /\brouter\.(get|post|put|patch|delete)\s*\(/
];

const violations = [];

function isJavaScriptFile(filePath) {
  return filePath.endsWith('.js');
}

function containsRouteDefinition(contents) {
  return routePatterns.some((pattern) => pattern.test(contents));
}

function walk(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (!isJavaScriptFile(fullPath)) {
      continue;
    }
    const contents = fs.readFileSync(fullPath, 'utf8');
    if (!containsRouteDefinition(contents)) {
      continue;
    }
    if (fullPath.startsWith(canonicalRoutesRoot)) {
      continue;
    }
    if (allowlistedLegacyRouteFiles.has(fullPath)) {
      continue;
    }
    violations.push(fullPath);
  }
}

walk(path.join(projectRoot, 'src'));

if (violations.length > 0) {
  console.error('Canonical stack violation: new route definitions outside src/api/routes.');
  console.error('Allowlisted legacy route files:');
  for (const filePath of allowlistedLegacyRouteFiles) {
    console.error(`  - ${path.relative(projectRoot, filePath)}`);
  }
  console.error('Violations:');
  for (const filePath of violations) {
    console.error(`  - ${path.relative(projectRoot, filePath)}`);
  }
  process.exit(1);
}

console.log('Canonical stack check passed.');
