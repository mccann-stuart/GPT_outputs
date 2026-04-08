import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeSimulationParams, runSimulation } from '../server/simulate-engine.mjs';

function createSequenceRandom(sequence) {
  let index = 0;
  return () => {
    const value = sequence[index % sequence.length];
    index += 1;
    return value;
  };
}

const baseParams = {
  numAgents: 12,
  shiftStart: 8 * 60,
  shiftLength: 8 * 60,
  breakDur: 15,
  numBreaks: 2,
  expectedCalls: 120,
  aht: 4,
  serviceTarget: 20,
  abandonTime: 180,
};

test('normalizeSimulationParams rejects invalid payloads', () => {
  assert.throws(() => normalizeSimulationParams(null), /payload must be an object/i);
  assert.throws(() => normalizeSimulationParams({ ...baseParams, shiftLength: 0 }), /shiftLength/i);
  assert.throws(() => normalizeSimulationParams({ ...baseParams, abandonTime: 'x' }), /abandonTime/i);
});

test('runSimulation is deterministic with an injected RNG', () => {
  const sequence = [0.11, 0.62, 0.27, 0.84, 0.45, 0.19, 0.73, 0.31];
  const first = runSimulation(baseParams, { random: createSequenceRandom(sequence) });
  const second = runSimulation(baseParams, { random: createSequenceRandom(sequence) });

  assert.deepEqual(second, first);
  assert.equal(first.params.expectedCalls, 120);
  assert.equal(first.intervals.length, 16);
});

test('runSimulation handles zero expected calls', () => {
  const result = runSimulation({ ...baseParams, expectedCalls: 0 }, { random: createSequenceRandom([0.2]) });

  assert.equal(result.results.length, 0);
  assert.equal(result.abandonedCalls.length, 0);
  assert.equal(result.overall.totalOffered, 0);
});

test('runSimulation handles zero agents by abandoning all offered calls', () => {
  const result = runSimulation({ ...baseParams, numAgents: 0, expectedCalls: 20 }, {
    random: createSequenceRandom([0.15, 0.3, 0.45, 0.6, 0.75]),
  });

  assert.equal(result.results.length, 0);
  assert.equal(result.abandonedCalls.length, 20);
  assert.equal(result.overall.abandoned, 20);
});

test('runSimulation skips impossible breaks for short shifts', () => {
  const result = runSimulation({ ...baseParams, shiftLength: 90, numBreaks: 2, breakDur: 15 }, {
    random: createSequenceRandom([0.4, 0.2, 0.8, 0.6]),
  });

  assert.equal(result.allBrks.every((agentBreaks) => agentBreaks.length === 0), true);
  assert.equal(result.intervals.length, 3);
});

test('runSimulation tolerates extreme abandon times', () => {
  const result = runSimulation({ ...baseParams, abandonTime: 1, expectedCalls: 30 }, {
    random: createSequenceRandom([0.01, 0.99, 0.35, 0.65, 0.2, 0.8]),
  });

  assert.equal(result.overall.totalOffered, 30);
  assert.ok(result.overall.abandoned >= 0);
  assert.ok(result.overall.abandonRate >= 0);
});
