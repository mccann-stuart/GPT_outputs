#!/usr/bin/env node
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const publicDir = join(root, 'public');
const rootFiles = readdirSync(root).filter((entry) => statSync(join(root, entry)).isFile());

const jsxFiles = rootFiles
  .filter((file) => file.endsWith('.jsx'))
  .sort();

const manifestJson = `${JSON.stringify(jsxFiles, null, 2)}\n`;
writeFileSync(join(root, 'jsx-manifest.json'), manifestJson);

rmSync(publicDir, { recursive: true, force: true });
mkdirSync(publicDir, { recursive: true });

for (const file of ['index.html', 'iphone.html']) {
  copyFileSync(join(root, file), join(publicDir, file));
}
writeFileSync(join(publicDir, 'jsx-manifest.json'), manifestJson);

const seen = new Set();
const queue = [...jsxFiles];

function enqueueLocalImports(relativeFile) {
  const absFile = join(root, relativeFile);
  if (seen.has(absFile)) {
    return;
  }
  seen.add(absFile);

  const source = readFileSync(absFile, 'utf8');
  const destination = join(publicDir, relativeFile);
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(absFile, destination);

  const patterns = [
    /\bimport\s+[^'"]*?from\s+['"](\.[^'"]+)['"]/g,
    /\bexport\s+[^'"]*?from\s+['"](\.[^'"]+)['"]/g,
    /\bimport\s*\(\s*['"](\.[^'"]+)['"]\s*\)/g,
  ];

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const specifier = match[1];
      const resolved = resolve(dirname(absFile), specifier);
      if (!resolved.startsWith(root)) {
        continue;
      }
      const relativeResolved = resolved.slice(root.length + 1);
      const ext = extname(relativeResolved);
      if (ext === '.mjs' || ext === '.jsx') {
        queue.push(relativeResolved);
      }
    }
  }
}

while (queue.length > 0) {
  const relativeFile = queue.shift();
  enqueueLocalImports(relativeFile);
}

console.log(`public/ ready with ${seen.size + 3} assets`);
