import test from 'node:test';
import assert from 'node:assert/strict';

import worker from '../src/worker.mjs';

function makeEnv() {
  return {
    ASSETS: {
      fetch: async () => new Response('asset fallback', { status: 200 }),
    },
  };
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
