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

test('worker returns simulation data for POST /api/simulate', async () => {
  const request = new Request('https://example.com/api/simulate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(validPayload),
  });

  const response = await worker.fetch(request, makeEnv(), {});
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(body.events));
  assert.ok(Array.isArray(body.intervals));
  assert.equal(body.params.expectedCalls, 100);
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

test('worker returns 405 for non-POST simulate requests', async () => {
  const request = new Request('https://example.com/api/simulate', { method: 'GET' });
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
