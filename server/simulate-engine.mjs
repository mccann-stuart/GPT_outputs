'use strict';

function fmt12(min) {
  const h = Math.floor(min / 60) % 24;
  const m = Math.floor(min % 60);
  const ap = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h - 1 + 12) % 12) + 1;
  return `${h12}:${String(m).padStart(2, '0')} ${ap}`;
}

function toFiniteNumber(raw, name) {
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`);
  }
  return value;
}

function assertInRange(value, name, min, max) {
  if (value < min || value > max) {
    throw new RangeError(`${name} must be between ${min} and ${max}`);
  }
}

export function normalizeSimulationParams(raw = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new TypeError('Simulation payload must be an object');
  }

  const params = {
    numAgents: toFiniteNumber(raw.numAgents, 'numAgents'),
    shiftStart: toFiniteNumber(raw.shiftStart, 'shiftStart'),
    shiftLength: toFiniteNumber(raw.shiftLength, 'shiftLength'),
    breakDur: toFiniteNumber(raw.breakDur, 'breakDur'),
    numBreaks: toFiniteNumber(raw.numBreaks, 'numBreaks'),
    expectedCalls: toFiniteNumber(raw.expectedCalls, 'expectedCalls'),
    aht: toFiniteNumber(raw.aht, 'aht'),
    serviceTarget: toFiniteNumber(raw.serviceTarget, 'serviceTarget'),
    abandonTime: toFiniteNumber(raw.abandonTime, 'abandonTime'),
  };

  assertInRange(params.numAgents, 'numAgents', 0, 500);
  assertInRange(params.shiftStart, 'shiftStart', 0, 24 * 60);
  assertInRange(params.shiftLength, 'shiftLength', 1, 24 * 60);
  assertInRange(params.breakDur, 'breakDur', 0, 240);
  assertInRange(params.numBreaks, 'numBreaks', 0, 10);
  assertInRange(params.expectedCalls, 'expectedCalls', 0, 100000);
  assertInRange(params.aht, 'aht', 0.1, 24 * 60);
  assertInRange(params.serviceTarget, 'serviceTarget', 0, 3600);
  assertInRange(params.abandonTime, 'abandonTime', 1, 24 * 60 * 60);

  return params;
}

function callRate(t) {
  const G = (x, mu, s) => Math.exp(-((x - mu) ** 2) / (2 * s * s));
  return Math.max(
    0,
    0.18
      + 0.82 * G(t, 0.27, 0.115)
      + 0.55 * G(t, 0.72, 0.10)
      - 0.16 * G(t, 0.50, 0.055),
  );
}

function buildCDF(shiftLength) {
  const bins = Math.ceil(shiftLength);
  const rates = Array.from({ length: bins }, (_, i) => callRate((i + 0.5) / bins));
  const total = rates.reduce((a, b) => a + b, 0);
  let cum = 0;
  return rates.map((r) => (cum += r / total));
}

function generateCalls(n, shiftStart, shiftLength, ahtMin, cdf, abandonTimeSec, random) {
  const calls = [];
  for (let i = 0; i < n; i++) {
    const u = random();
    let lo = 0;
    let hi = cdf.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cdf[mid] < u) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    const arrival = shiftStart + lo + random();
    const handle = Math.max(0.5, -ahtMin * Math.log(random() + 1e-12));
    const patience = Math.max(1, -abandonTimeSec * Math.log(random() + 1e-12));
    calls.push({ arrival, handle, patience });
  }
  calls.sort((a, b) => a.arrival - b.arrival);
  return calls;
}

function makeBreaks(numAgents, shiftStart, shiftLength, breakDur, numBreaks) {
  const result = Array.from({ length: numAgents }, () => []);
  if (numBreaks === 0 || numAgents === 0 || breakDur <= 0) {
    return result;
  }

  const shiftEnd = shiftStart + shiftLength;
  const windowStart = shiftStart + 60;
  const windowEnd = shiftEnd - 60;
  const usable = windowEnd - windowStart;

  if (usable <= 0) {
    return result;
  }

  for (let b = 0; b < numBreaks; b++) {
    const subW = usable / numBreaks;
    const subStart = windowStart + b * subW;
    const earliestStart = subStart;
    const latestStart = subStart + subW - breakDur;
    const spread = Math.max(0, latestStart - earliestStart);

    for (let a = 0; a < numAgents; a++) {
      const frac = numAgents > 1 ? a / (numAgents - 1) : 0;
      const t = earliestStart + frac * spread;
      result[a].push({ s: t, e: Math.min(t + breakDur, shiftEnd) });
    }
  }

  for (const brks of result) {
    brks.sort((a, b) => a.s - b.s);
  }
  return result;
}

function nextAvail(at, busyUntil, brks) {
  let t = Math.max(at, busyUntil);
  let changed = true;
  while (changed) {
    changed = false;
    for (const b of brks) {
      if (t >= b.s && t < b.e) {
        t = b.e;
        changed = true;
      }
    }
  }
  return t;
}

export function runSimulation(rawParams, { random = Math.random } = {}) {
  const params = normalizeSimulationParams(rawParams);
  const {
    numAgents,
    shiftStart,
    shiftLength,
    breakDur,
    numBreaks,
    expectedCalls,
    aht,
    serviceTarget,
    abandonTime,
  } = params;

  const shiftEnd = shiftStart + shiftLength;
  const cdf = buildCDF(shiftLength);
  const calls = generateCalls(expectedCalls, shiftStart, shiftLength, aht, cdf, abandonTime, random);
  const allBrks = makeBreaks(numAgents, shiftStart, shiftLength, breakDur, numBreaks);
  const busyUntil = new Array(numAgents).fill(shiftStart);

  const events = [];
  const results = [];
  const abandonedCalls = [];
  let callId = 0;

  for (let a = 0; a < numAgents; a++) {
    for (const b of allBrks[a]) {
      if (b.s < shiftEnd) {
        events.push({ t: b.s, type: 'brk_s', a });
        events.push({ t: Math.min(b.e, shiftEnd), type: 'brk_e', a });
      }
    }
  }

  for (const call of calls) {
    if (call.arrival >= shiftEnd) {
      break;
    }

    const id = callId++;
    events.push({ t: call.arrival, type: 'arrive', id });

    if (numAgents === 0) {
      const abandonAt = call.arrival + call.patience / 60;
      events.push({ t: abandonAt, type: 'abandon', id });
      abandonedCalls.push({ arrival: call.arrival, abandonAt });
      continue;
    }

    let bestA = 0;
    let bestAt = nextAvail(call.arrival, busyUntil[0], allBrks[0]);
    for (let a = 1; a < numAgents; a++) {
      const at = nextAvail(call.arrival, busyUntil[a], allBrks[a]);
      if (at < bestAt) {
        bestAt = at;
        bestA = a;
      }
    }
    if (bestAt >= shiftEnd) {
      continue;
    }

    const waitMin = bestAt - call.arrival;
    if (waitMin * 60 > call.patience) {
      const abandonAt = call.arrival + call.patience / 60;
      events.push({ t: abandonAt, type: 'abandon', id });
      abandonedCalls.push({ arrival: call.arrival, abandonAt });
      continue;
    }

    const endAt = Math.min(bestAt + call.handle, shiftEnd);
    busyUntil[bestA] = endAt;

    results.push({
      id,
      arrival: call.arrival,
      answer: bestAt,
      end: endAt,
      wait: waitMin,
      handle: call.handle,
      agent: bestA,
      ok: waitMin * 60 <= serviceTarget,
    });
    events.push({ t: bestAt, type: 'answer', id, a: bestA, wait: waitMin });
    events.push({ t: endAt, type: 'end', id, a: bestA });
  }

  const order = { arrive: 0, brk_e: 1, answer: 2, brk_s: 3, end: 4, abandon: 5 };
  events.sort((a, b) => (a.t - b.t) || (order[a.type] - order[b.type]));

  const intLen = 30;
  const numInts = Math.ceil(shiftLength / intLen);
  const intervals = [];

  for (let i = 0; i < numInts; i++) {
    const is = shiftStart + i * intLen;
    const ie = is + intLen;

    const arriving = results.filter((r) => r.arrival >= is && r.arrival < ie);
    const abandonedInInt = abandonedCalls.filter((a) => a.arrival >= is && a.arrival < ie);
    const totalOffered = arriving.length + abandonedInInt.length;
    const numAbandoned = abandonedInInt.length;
    const abandonRate = totalOffered > 0 ? (numAbandoned / totalOffered) * 100 : 0;

    const avgWaitS = arriving.length
      ? (arriving.reduce((s, r) => s + r.wait, 0) / arriving.length) * 60
      : 0;
    const sl = arriving.length
      ? (arriving.filter((r) => r.ok).length / arriving.length) * 100
      : 100;

    let avail = 0;
    let busy = 0;

    for (let a = 0; a < numAgents; a++) {
      let brkInInt = 0;
      for (const b of allBrks[a]) {
        const os = Math.max(b.s, is);
        const oe = Math.min(b.e, ie);
        if (oe > os) {
          brkInInt += oe - os;
        }
      }

      avail += Math.min(intLen, shiftEnd - is) - brkInInt;

      for (const r of results) {
        if (r.agent !== a) {
          continue;
        }
        const os = Math.max(r.answer, is);
        const oe = Math.min(r.end, ie);
        if (oe <= os) {
          continue;
        }
        let callTime = oe - os;
        for (const b of allBrks[a]) {
          const bos = Math.max(b.s, os);
          const boe = Math.min(b.e, oe);
          if (boe > bos) {
            callTime -= boe - bos;
          }
        }
        busy += Math.max(0, callTime);
      }
    }

    const util = avail > 0 ? (busy / avail) * 100 : 0;

    intervals.push({
      label: fmt12(is),
      numCalls: totalOffered,
      numAnswered: arriving.length,
      numAbandoned,
      abandonRate,
      avgWaitS,
      sl,
      util,
    });
  }

  const totalWait = results.reduce((s, r) => s + r.wait, 0);
  const asa = results.length ? (totalWait / results.length) * 60 : 0;
  const slOv = results.length ? (results.filter((r) => r.ok).length / results.length) * 100 : 0;
  const totalOffered = results.length + abandonedCalls.length;
  const abandonRateOv = totalOffered > 0 ? (abandonedCalls.length / totalOffered) * 100 : 0;

  let tAvail = 0;
  let tBusy = 0;
  for (let a = 0; a < numAgents; a++) {
    const brkT = allBrks[a].reduce((s, b) => s + (Math.min(b.e, shiftEnd) - b.s), 0);
    tAvail += shiftLength - Math.max(0, brkT);
    for (const r of results.filter((result) => result.agent === a)) {
      let callTime = r.end - r.answer;
      for (const b of allBrks[a]) {
        const bos = Math.max(b.s, r.answer);
        const boe = Math.min(b.e, r.end);
        if (boe > bos) {
          callTime -= boe - bos;
        }
      }
      tBusy += Math.max(0, callTime);
    }
  }

  const utilOv = tAvail > 0 ? (tBusy / tAvail) * 100 : 0;

  return {
    params,
    events,
    results,
    intervals,
    allBrks,
    abandonedCalls,
    overall: {
      asa,
      sl: slOv,
      util: utilOv,
      total: results.length,
      abandoned: abandonedCalls.length,
      totalOffered,
      abandonRate: abandonRateOv,
    },
  };
}
