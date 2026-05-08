import test from 'node:test';
import assert from 'node:assert/strict';

import worker from '../src/worker.mjs';

const originalFetch = globalThis.fetch;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
});

function makeEnv() {
  return {
    ASSETS: {
      fetch: async () => new Response('asset fallback', { status: 200 }),
    },
  };
}

function makeUploadEnv() {
  return {
    ...makeEnv(),
    GITHUB_UPLOAD_TOKEN: 'test-token',
    GITHUB_REPO: 'mccann-stuart/GPT_outputs',
    GITHUB_BRANCH: 'main',
    GITHUB_AUTHOR_NAME: 'Upload Bot',
    GITHUB_AUTHOR_EMAIL: 'upload@example.com',
  };
}

function makeUploadRequest(files) {
  const form = new FormData();
  for (const file of files) {
    form.append('files', new File([file.text], file.name, { type: 'text/plain' }), file.name);
  }
  return new Request('https://example.com/api/upload-deliverable', {
    method: 'POST',
    body: form,
  });
}

function manifestContent(files) {
  return btoa(JSON.stringify(files, null, 2));
}

function installGithubMock({ failRef = false } = {}) {
  const calls = [];
  const blobs = new Map();
  globalThis.fetch = async (url, init = {}) => {
    const parsed = new URL(url);
    const bodyText = init.body ? String(init.body) : '';
    const body = bodyText ? JSON.parse(bodyText) : null;
    calls.push({ method: init.method || 'GET', pathname: parsed.pathname, body });

    if (parsed.hostname !== 'api.github.com') {
      return new Response('not found', { status: 404 });
    }
    if (failRef && parsed.pathname.includes('/git/ref/')) {
      return Response.json({ message: 'Bad credentials' }, { status: 401 });
    }
    if (parsed.pathname.includes('/git/ref/')) {
      return Response.json({ object: { sha: 'base-commit-sha' } });
    }
    if (parsed.pathname.endsWith('/git/commits/base-commit-sha')) {
      return Response.json({ tree: { sha: 'base-tree-sha' } });
    }
    if (parsed.pathname.endsWith('/contents/jsx-manifest.json')) {
      return Response.json({ content: manifestContent(['simulate.jsx']) });
    }
    if (parsed.pathname.endsWith('/git/blobs')) {
      const sha = `blob-${blobs.size + 1}`;
      blobs.set(sha, body.content);
      return Response.json({ sha });
    }
    if (parsed.pathname.endsWith('/git/trees')) {
      return Response.json({ sha: 'new-tree-sha' });
    }
    if (parsed.pathname.endsWith('/git/commits')) {
      return Response.json({ sha: 'abcdef1234567890abcdef1234567890abcdef12' });
    }
    if (parsed.pathname.includes('/git/refs/')) {
      return Response.json({ object: { sha: body.sha } });
    }
    return Response.json({ message: `Unhandled ${parsed.pathname}` }, { status: 500 });
  };
  return { calls, blobs };
}

const validPayload = {
  numAgents: 10,
  shiftStart: 8 * 60,
  shiftLength: 8 * 60,
  breakDur: 15,
  numBreaks: 2,
  expectedCalls: 100,
  aht: 4,
  serviceTarget: 20,
  abandonTime: 180,
};

test('worker returns simulation view-model data for POST /api/simulate', async () => {
  const request = new Request('https://example.com/api/simulate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(validPayload),
  });

  const response = await worker.fetch(request, makeEnv(), {});
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.params.expectedCalls, 100);
  assert.ok(Array.isArray(body.playback.events));
  assert.deepEqual(body.playback.initialState.agentStatus, new Array(validPayload.numAgents).fill('idle'));
  assert.equal(body.playback.footer.targetDisplay, '20s');
  assert.equal(typeof body.analysis.summary.asa.display, 'string');
  assert.ok(Array.isArray(body.analysis.hotspots));
  assert.ok(Array.isArray(body.analysis.charts.asa.values));
});

test('worker returns preview view-model data for POST /api/preview', async () => {
  const request = new Request('https://example.com/api/preview', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      shiftStart: validPayload.shiftStart,
      shiftLength: validPayload.shiftLength,
      numAgents: validPayload.numAgents,
      breakDur: validPayload.breakDur,
      numBreaks: validPayload.numBreaks,
    }),
  });

  const response = await worker.fetch(request, makeEnv(), {});
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.curvePoints.length, 201);
  assert.ok(Array.isArray(body.breakWindows));
  assert.ok(Array.isArray(body.axisLabels));
});

test('worker returns 400 for invalid payload', async () => {
  const request = new Request('https://example.com/api/simulate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...validPayload, shiftLength: 0 }),
  });

  const response = await worker.fetch(request, makeEnv(), {});
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.match(body.error, /shiftLength/i);
});

test('worker rejects non-json api payloads', async () => {
  const request = new Request('https://example.com/api/simulate', {
    method: 'POST',
    headers: { 'content-type': 'text/plain' },
    body: JSON.stringify(validPayload),
  });

  const response = await worker.fetch(request, makeEnv(), {});
  const body = await response.json();

  assert.equal(response.status, 415);
  assert.match(body.error, /application\/json/i);
});

test('worker rejects oversized api payloads', async () => {
  const request = new Request('https://example.com/api/simulate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...validPayload, padding: 'x'.repeat(5000) }),
  });

  const response = await worker.fetch(request, makeEnv(), {});
  const body = await response.json();

  assert.equal(response.status, 413);
  assert.match(body.error, /bytes or less/i);
});

test('worker returns 405 for non-POST simulate requests', async () => {
  const request = new Request('https://example.com/api/simulate', { method: 'GET' });
  const response = await worker.fetch(request, makeEnv(), {});
  const body = await response.json();

  assert.equal(response.status, 405);
  assert.match(body.error, /method not allowed/i);
});

test('worker returns 405 for non-POST preview requests', async () => {
  const request = new Request('https://example.com/api/preview', { method: 'GET' });
  const response = await worker.fetch(request, makeEnv(), {});
  const body = await response.json();

  assert.equal(response.status, 405);
  assert.match(body.error, /method not allowed/i);
});

test('worker falls back to static assets for non-api routes', async () => {
  const request = new Request('https://example.com/');
  const response = await worker.fetch(request, makeEnv(), {});

  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'asset fallback');
});

test('worker uploads one JSX deliverable plus MJS logic through one GitHub commit', async () => {
  const github = installGithubMock();
  const request = makeUploadRequest([
    {
      name: 'example.jsx',
      text: 'import { value } from "./example-logic.mjs";\nexport default function Example() { return value; }\n',
    },
    {
      name: 'example-logic.mjs',
      text: 'export const value = "ok";\n',
    },
  ]);

  const response = await worker.fetch(request, makeUploadEnv(), {});
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.jsxFile, 'example.jsx');
  assert.equal(body.commitSha, 'abcdef1234567890abcdef1234567890abcdef12');
  assert.equal(body.statusUrl, '/api/upload-status?file=example.jsx&sha=abcdef1234567890abcdef1234567890abcdef12');
  assert.equal(body.openUrl, '/?file=example.jsx&deploy=abcdef1234567890abcdef1234567890abcdef12');

  const treeCall = github.calls.find((call) => call.pathname.endsWith('/git/trees'));
  assert.deepEqual(treeCall.body.tree.map((entry) => entry.path).sort(), [
    'example-logic.mjs',
    'example.jsx',
    'jsx-manifest.json',
  ]);
  const manifestBlob = Array.from(github.blobs.values()).find((content) => content.includes('jsx-manifest.json') === false && content.includes('example.jsx') && content.includes('simulate.jsx'));
  assert.ok(manifestBlob);
});

test('worker rejects upload file names that are unsafe or unsupported', async () => {
  const request = makeUploadRequest([
    { name: '../bad.jsx', text: 'export default function Bad() { return null; }' },
  ]);

  const response = await worker.fetch(request, makeUploadEnv(), {});
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.match(body.error, /unsafe|unsupported/i);
});

test('worker rejects uploads with more than one JSX file', async () => {
  const request = makeUploadRequest([
    { name: 'one.jsx', text: 'export default function One() { return null; }' },
    { name: 'two.jsx', text: 'export default function Two() { return null; }' },
  ]);

  const response = await worker.fetch(request, makeUploadEnv(), {});
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.match(body.error, /exactly one/i);
});

test('worker rejects uploaded JSX that imports a missing MJS file', async () => {
  const request = makeUploadRequest([
    { name: 'missing.jsx', text: 'import { value } from "./missing-logic.mjs";\nexport default function Missing() { return value; }' },
  ]);

  const response = await worker.fetch(request, makeUploadEnv(), {});
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.match(body.error, /missing file/i);
});

test('worker rejects oversized uploaded files', async () => {
  const request = makeUploadRequest([
    { name: 'large.jsx', text: `export default ${JSON.stringify('x'.repeat(512 * 1024))};` },
  ]);

  const response = await worker.fetch(request, makeUploadEnv(), {});
  const body = await response.json();

  assert.equal(response.status, 413);
  assert.match(body.error, /bytes or less/i);
});

test('worker reports GitHub API failures without exposing credentials', async () => {
  installGithubMock({ failRef: true });
  const request = makeUploadRequest([
    { name: 'example.jsx', text: 'export default function Example() { return null; }' },
  ]);

  const response = await worker.fetch(request, makeUploadEnv(), {});
  const body = await response.json();

  assert.equal(response.status, 502);
  assert.match(body.error, /GitHub API request failed \(401\): Bad credentials/);
  assert.doesNotMatch(body.error, /test-token/);
});

test('worker upload status waits until hosted JSX and MJS imports are reachable', async () => {
  globalThis.fetch = async (url) => {
    const parsed = new URL(url);
    if (parsed.pathname === '/example.jsx') {
      return new Response('import { value } from "./example-logic.mjs";\nexport default function Example() { return value; }');
    }
    if (parsed.pathname === '/example-logic.mjs') {
      return new Response('export const value = "ok";');
    }
    return new Response('not found', { status: 404 });
  };

  const request = new Request('https://example.com/api/upload-status?file=example.jsx&sha=abcdef1234567890abcdef1234567890abcdef12');
  const response = await worker.fetch(request, makeEnv(), {});
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ready, true);
  assert.equal(body.openUrl, '/?file=example.jsx&deploy=abcdef1234567890abcdef1234567890abcdef12');
});
