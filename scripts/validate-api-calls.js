#!/usr/bin/env node
/**
 * @file validate-api-calls.js
 * @description CI script to validate FE API calls against OpenAPI manifest
 *
 * Usage:
 *   node scripts/validate-api-calls.js
 *
 * Exit codes:
 *   0 - All API calls valid
 *   1 - Invalid API calls found
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const OPENAPI_PATH = './openapi.json';
const FE_PATHS = ['./apps/web-vite/src'];
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

// Patterns to extract API calls
const API_PATTERNS = [
  /fetch\s*\(\s*['"`]\/api\/([^'"`]+)['"`]/g,
  /fetch\s*\(\s*['"`]([^'"`]*\/api\/[^'"`]+)['"`]/g,
  /api\.(?:get|post|put|delete|patch)\s*\(\s*['"`]\/([^'"`]+)['"`]/g,
  /apiClient\.(?:get|post|put|delete|patch)\s*\(\s*['"`]\/([^'"`]+)['"`]/g,
  /['"`]\/api\/([^'"`\$]+)['"`]/g
];

// Load OpenAPI spec
let openapi;
try {
  openapi = JSON.parse(readFileSync(OPENAPI_PATH, 'utf-8'));
} catch (e) {
  console.error(`Failed to load OpenAPI spec: ${e.message}`);
  process.exit(1);
}

// Extract all valid paths
const validPaths = new Set(Object.keys(openapi.paths));

// Normalize path (remove param values, keep param names)
function normalizePath(path) {
  // Remove /api prefix
  let normalized = path.replace(/^\/api/, '').replace(/^api\//, '/');

  // Replace UUID-like segments with {id}
  normalized = normalized.replace(/\/[a-f0-9-]{36}/gi, '/{id}');

  // Replace numeric IDs with {id}
  normalized = normalized.replace(/\/\d+/g, '/{id}');

  // Replace dynamic segments (anything that looks like an ID)
  normalized = normalized.replace(/\/[a-zA-Z0-9_-]{20,}/g, '/{id}');

  // Remove query strings
  normalized = normalized.split('?')[0];

  // Remove trailing slash
  normalized = normalized.replace(/\/$/, '');

  // Ensure leading slash
  if (!normalized.startsWith('/')) {
    normalized = '/' + normalized;
  }

  return normalized;
}

// Check if path is valid (exists in OpenAPI or matches pattern)
function isValidPath(path) {
  const normalized = normalizePath(path);

  // Direct match
  if (validPaths.has(normalized)) {
    return true;
  }

  // Try with common param patterns
  const patterns = [
    normalized.replace(/\/[^/]+$/, '/{id}'),
    normalized.replace(/\/[^/]+\/[^/]+$/, '/{id}/{param}'),
  ];

  for (const pattern of patterns) {
    if (validPaths.has(pattern)) {
      return true;
    }
  }

  // Partial match (for nested resources)
  for (const validPath of validPaths) {
    if (normalized.startsWith(validPath.replace(/\/\{[^}]+\}/g, ''))) {
      return true;
    }
  }

  return false;
}

// Recursively find files
function findFiles(dir, files = []) {
  try {
    const items = readdirSync(dir);
    for (const item of items) {
      const fullPath = join(dir, item);
      try {
        const stat = statSync(fullPath);
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          findFiles(fullPath, files);
        } else if (stat.isFile() && EXTENSIONS.includes(extname(item))) {
          files.push(fullPath);
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

// Extract API calls from file
function extractApiCalls(content, filePath) {
  const calls = [];

  for (const pattern of API_PATTERNS) {
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0;

    let match;
    while ((match = pattern.exec(content)) !== null) {
      const path = match[1] || match[0];

      // Skip if it's a template literal variable
      if (path.includes('${') || path.includes('`')) {
        continue;
      }

      // Clean up path
      let cleanPath = path
        .replace(/^['"`]/, '')
        .replace(/['"`]$/, '')
        .replace(/^\/api/, '')
        .replace(/^api\//, '/');

      if (cleanPath && !cleanPath.includes('$') && !cleanPath.includes('{')) {
        calls.push({ path: cleanPath, file: filePath });
      }
    }
  }

  return calls;
}

// Main validation
function validate() {
  console.log('\\nValidating FE API calls against OpenAPI manifest...\\n');

  const invalidCalls = [];
  const validCalls = [];

  for (const fePath of FE_PATHS) {
    const files = findFiles(fePath);

    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf-8');
        const calls = extractApiCalls(content, file);

        for (const call of calls) {
          if (isValidPath(call.path)) {
            validCalls.push(call);
          } else {
            invalidCalls.push(call);
          }
        }
      } catch (e) {
        // Skip unreadable files
      }
    }
  }

  // Report results
  console.log(`Total API calls found: ${validCalls.length + invalidCalls.length}`);
  console.log(`Valid: ${validCalls.length}`);
  console.log(`Invalid: ${invalidCalls.length}\\n`);

  if (invalidCalls.length > 0) {
    console.log('INVALID API CALLS:');
    console.log('==================');

    // Group by file
    const byFile = {};
    for (const call of invalidCalls) {
      if (!byFile[call.file]) {
        byFile[call.file] = [];
      }
      byFile[call.file].push(call.path);
    }

    for (const [file, paths] of Object.entries(byFile)) {
      console.log(`\\n${file}:`);
      for (const path of [...new Set(paths)]) {
        console.log(`  - ${path}`);
      }
    }

    console.log('\\nTo fix: Add missing endpoints to openapi.json or fix FE calls.\\n');
    process.exit(1);
  }

  console.log('All API calls are valid!\\n');
  process.exit(0);
}

validate();
