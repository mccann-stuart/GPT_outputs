#!/usr/bin/env node
/**
 * Scans the project root for *.jsx files and writes jsx-manifest.json.
 * Run:  node generate-manifest.mjs
 */
import { readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

const jsxFiles = readdirSync(root)
  .filter(f => f.endsWith('.jsx'))
  .sort();

const out = join(root, 'jsx-manifest.json');
writeFileSync(out, JSON.stringify(jsxFiles, null, 2) + '\n');

console.log(`jsx-manifest.json → ${jsxFiles.length} file(s): ${jsxFiles.join(', ')}`);
