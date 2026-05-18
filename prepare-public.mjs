#!/usr/bin/env node
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

import { assertSupportedJsxImports } from './jsx-import-validator.mjs';
import { listRootJsxFiles, toManifestJson } from './manifest-files.mjs';
import { SUPPORTED_BROWSER_MODULES } from './supported-modules.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const publicDir = join(root, 'public');
const vendorDir = join(publicDir, 'vendor');
const vendorEntryDir = join(root, '.vendor-entrypoints-tmp');
const rootFiles = listRootJsxFiles(root);
const manifestJson = toManifestJson(rootFiles);
writeFileSync(join(root, 'jsx-manifest.json'), manifestJson);

rmSync(publicDir, { recursive: true, force: true });
mkdirSync(publicDir, { recursive: true });
mkdirSync(vendorDir, { recursive: true });
mkdirSync(vendorEntryDir, { recursive: true });

const vendorEntrySources = new Map([
  ['react', `
import React from 'react';
export default React;
export const {
  Children,
  Component,
  Fragment,
  Profiler,
  PureComponent,
  StrictMode,
  Suspense,
  cloneElement,
  createContext,
  createElement,
  createRef,
  forwardRef,
  isValidElement,
  lazy,
  memo,
  startTransition,
  useCallback,
  useContext,
  useDebugValue,
  useDeferredValue,
  useEffect,
  useId,
  useImperativeHandle,
  useInsertionEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  version,
} = React;
`],
  ['react/jsx-runtime', `
import jsxRuntime from 'react/jsx-runtime';
export default jsxRuntime;
export const { Fragment, jsx, jsxs } = jsxRuntime;
`],
  ['react-dom/client', `
import client from 'react-dom/client';
export default client;
export const { createRoot, hydrateRoot } = client;
`],
]);

function vendorEntryPointFor(module) {
  const source = vendorEntrySources.get(module.specifier);
  if (!source) return module.specifier;

  const entryFile = join(vendorEntryDir, `${module.vendorFile}.entry.mjs`);
  writeFileSync(entryFile, source.trimStart());
  return entryFile;
}

function vendorBannerFor(module) {
  if (!module.bundleExternal.includes('react')) return undefined;

  return {
    js: [
      'import __gptOutputsReact from "react";',
      'var require = (name) => {',
      '  if (name === "react") return __gptOutputsReact;',
      '  throw new Error(`Dynamic require of "${name}" is not supported`);',
      '};',
    ].join('\n'),
  };
}

async function vendorBrowserModules() {
  try {
    for (const module of SUPPORTED_BROWSER_MODULES) {
      await build({
        entryPoints: [vendorEntryPointFor(module)],
        outfile: join(vendorDir, module.vendorFile),
        bundle: true,
        format: 'esm',
        platform: 'browser',
        target: 'es2020',
        absWorkingDir: root,
        external: module.bundleExternal,
        banner: vendorBannerFor(module),
        logLevel: 'silent',
      });
    }
  } finally {
    rmSync(vendorEntryDir, { recursive: true, force: true });
  }

  copyFileSync(require.resolve('@babel/standalone/babel.min.js'), join(vendorDir, 'babel.min.js'));
}

for (const file of ['index.html', 'iphone.html']) {
  copyFileSync(join(root, file), join(publicDir, file));
}
writeFileSync(join(publicDir, 'jsx-manifest.json'), manifestJson);

const seen = new Set();
const queue = [...rootFiles];

function enqueueLocalImports(relativeFile) {
  const absFile = join(root, relativeFile);
  if (seen.has(absFile)) {
    return;
  }
  seen.add(absFile);

  const source = readFileSync(absFile, 'utf8');
  if (relativeFile.endsWith('.jsx')) {
    assertSupportedJsxImports(source, { file: relativeFile });
  }

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

await vendorBrowserModules();

console.log(`public/ ready with ${seen.size + 3 + SUPPORTED_BROWSER_MODULES.length + 1} assets`);
