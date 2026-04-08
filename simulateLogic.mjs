'use strict';
// ═══════════════════════════════════════════════════════════
// Globals
// ═══════════════════════════════════════════════════════════
let simResults = null;
let simParams  = null;
let actLog     = [];
let animState  = {
  running: false, raf: null, startTime: null,
  speed: 120, eventIdx: 0, simTime: 0,
  agentStatus: [], queue: 0,
  arrived: 0, answered: 0, abandoned: 0, totalWaitMin: 0, withinTarget: 0,
};

// ═══════════════════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════════════════
function fmt12(min) {
  const h = Math.floor(min / 60) % 24;
  const m = Math.floor(min % 60);
  const ap = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h - 1 + 12) % 12) + 1;
  return `${h12}:${String(m).padStart(2,'0')} ${ap}`;
}
function fmt24(min) {
  const h = Math.floor(min / 60) % 24;
  const m = Math.floor(min % 60);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}
function fmtSec(s) {
  s = Math.round(s);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s/60)}m ${s%60}s`;
}
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// ═══════════════════════════════════════════════════════════
// Call Arrival Curve
// ═══════════════════════════════════════════════════════════
function callRate(t) {
  // t: 0–1 through the shift. Two-peak pattern.
  const G = (x, mu, s) => Math.exp(-((x - mu) ** 2) / (2 * s * s));
  return Math.max(0, 0.18
    + 0.82 * G(t, 0.27, 0.115)   // morning peak ~10am
    + 0.55 * G(t, 0.72, 0.10)    // afternoon peak ~2pm
    - 0.16 * G(t, 0.50, 0.055)); // lunch dip ~12pm
}

function buildCDF(shiftLength) {
  const bins = Math.ceil(shiftLength);
  const rates = Array.from({length: bins}, (_, i) => callRate((i + 0.5) / bins));
  const total = rates.reduce((a,b) => a + b, 0);
  let cum = 0;
  return rates.map(r => (cum += r / total));
}

// ═══════════════════════════════════════════════════════════
// Simulation
// ═══════════════════════════════════════════════════════════
function generateCalls(n, shiftStart, shiftLength, ahtMin, cdf, abandonTimeSec) {
  const calls = [];
  for (let i = 0; i < n; i++) {
    const u = Math.random();
    let lo = 0, hi = cdf.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cdf[mid] < u) lo = mid + 1; else hi = mid;
    }
    const arrival  = shiftStart + lo + Math.random();
    const handle   = Math.max(0.5, -ahtMin * Math.log(Math.random() + 1e-12));
    // Exponential patience distribution: mean = abandonTimeSec
    const patience = Math.max(1, -abandonTimeSec * Math.log(Math.random() + 1e-12));
    calls.push({ arrival, handle, patience });
  }
  calls.sort((a, b) => a.arrival - b.arrival);
  return calls;
}

function makeBreaks(numAgents, shiftStart, shiftLength, breakDur, numBreaks) {
  const result = Array.from({ length: numAgents }, () => []);
  if (numBreaks === 0 || numAgents === 0) return result;

  const shiftEnd    = shiftStart + shiftLength;
  const windowStart = shiftStart + 60;   // no breaks in first hour
  const windowEnd   = shiftEnd   - 60;   // no breaks in last hour
  const usable      = windowEnd - windowStart;

  for (let b = 0; b < numBreaks; b++) {
    // Divide the usable window into equal sub-windows, one per break slot
    const subW          = usable / numBreaks;
    const subStart      = windowStart + b * subW;
    const earliestStart = subStart;
    const latestStart   = subStart + subW - breakDur;
    // Spread each agent evenly across [earliestStart, latestStart]
    const spread = Math.max(0, latestStart - earliestStart);

    for (let a = 0; a < numAgents; a++) {
      const frac = numAgents > 1 ? a / (numAgents - 1) : 0;
      const t = earliestStart + frac * spread;
      result[a].push({ s: t, e: t + breakDur });
    }
  }

  // Breaks are added in slot order so sort is a no-op, but kept for safety
  for (const brks of result) brks.sort((a, b) => a.s - b.s);
  return result;
}

function nextAvail(at, busyUntil, brks) {
  let t = Math.max(at, busyUntil);
  let changed = true;
  while (changed) {
    changed = false;
    for (const b of brks) {
      if (t >= b.s && t < b.e) { t = b.e; changed = true; }
    }
  }
  return t;
}

function runSim(params) {
  const { numAgents, shiftStart, shiftLength, breakDur, numBreaks,
          expectedCalls, aht, serviceTarget, abandonTime } = params;
  const shiftEnd = shiftStart + shiftLength;

  const cdf     = buildCDF(shiftLength);
  const calls   = generateCalls(expectedCalls, shiftStart, shiftLength, aht, cdf, abandonTime);
  const allBrks = makeBreaks(numAgents, shiftStart, shiftLength, breakDur, numBreaks);
  const busyUntil = new Array(numAgents).fill(shiftStart);

  const events         = [];
  const results        = [];
  const abandonedCalls = [];
  let   callId         = 0;

  // Break events
  for (let a = 0; a < numAgents; a++) {
    for (const b of allBrks[a]) {
      if (b.s < shiftEnd) {
        events.push({ t: b.s, type: 'brk_s', a });
        events.push({ t: Math.min(b.e, shiftEnd), type: 'brk_e', a });
      }
    }
  }

  // Assign each call
  for (const call of calls) {
    if (call.arrival >= shiftEnd) break;
    const id = callId++;

    events.push({ t: call.arrival, type: 'arrive', id });

    let bestA = 0;
    let bestAt = nextAvail(call.arrival, busyUntil[0], allBrks[0]);
    for (let a = 1; a < numAgents; a++) {
      const at = nextAvail(call.arrival, busyUntil[a], allBrks[a]);
      if (at < bestAt) { bestAt = at; bestA = a; }
    }
    if (bestAt >= shiftEnd) continue;

    const waitMin = bestAt - call.arrival;

    // Patience check — customer abandons if projected wait exceeds their tolerance
    if (waitMin * 60 > call.patience) {
      const abandonAt = call.arrival + call.patience / 60;
      events.push({ t: abandonAt, type: 'abandon', id });
      abandonedCalls.push({ arrival: call.arrival, abandonAt });
      continue; // Agent slot stays free — busyUntil not updated
    }

    const endAt = Math.min(bestAt + call.handle, shiftEnd);
    busyUntil[bestA] = endAt;

    results.push({
      id, arrival: call.arrival, answer: bestAt, end: endAt,
      wait: waitMin, handle: call.handle, agent: bestA,
      ok: waitMin * 60 <= serviceTarget,
    });
    events.push({ t: bestAt, type: 'answer', id, a: bestA, wait: waitMin });
    events.push({ t: endAt,  type: 'end',    id, a: bestA });
  }

  // Sort: at equal t, arrivals first, then break_end, then answers, then break_start, then ends, then abandons
  const order = { arrive:0, brk_e:1, answer:2, brk_s:3, end:4, abandon:5 };
  events.sort((a, b) => (a.t - b.t) || (order[a.type] - order[b.type]));

  // 30-min interval stats
  const intLen  = 30;
  const numInts = Math.ceil(shiftLength / intLen);
  const intervals = [];
  for (let i = 0; i < numInts; i++) {
    const is = shiftStart + i * intLen;
    const ie = is + intLen;

    const arriving       = results.filter(r => r.arrival >= is && r.arrival < ie);
    const abandonedInInt = abandonedCalls.filter(a => a.arrival >= is && a.arrival < ie);
    const totalOffered   = arriving.length + abandonedInInt.length;
    const numAbandoned   = abandonedInInt.length;
    const abandonRate    = totalOffered > 0 ? numAbandoned / totalOffered * 100 : 0;

    const avgWaitS  = arriving.length
      ? arriving.reduce((s,r) => s + r.wait, 0) / arriving.length * 60 : 0;
    const sl = arriving.length
      ? arriving.filter(r => r.ok).length / arriving.length * 100 : 100;

    // Utilisation
    let avail = 0, busy = 0;
    for (let a = 0; a < numAgents; a++) {
      let brkInInt = 0;
      for (const b of allBrks[a]) {
        const os = Math.max(b.s, is), oe = Math.min(b.e, ie);
        if (oe > os) brkInInt += oe - os;
      }
      avail += Math.min(intLen, shiftEnd - is) - brkInInt;
      for (const r of results) {
        if (r.agent !== a) continue;
        const os = Math.max(r.answer, is), oe = Math.min(r.end, ie);
        if (oe <= os) continue;
        let callTime = oe - os;
        // Subtract any break time that overlaps this call's window in this interval
        for (const b of allBrks[a]) {
          const bos = Math.max(b.s, os), boe = Math.min(b.e, oe);
          if (boe > bos) callTime -= (boe - bos);
        }
        busy += Math.max(0, callTime);
      }
    }
    const util = avail > 0 ? busy / avail * 100 : 0;

    intervals.push({
      label: fmt12(is),
      numCalls: totalOffered,
      numAnswered: arriving.length,
      numAbandoned,
      abandonRate,
      avgWaitS, sl, util,
    });
  }

  // Overall
  const totalWait     = results.reduce((s,r) => s + r.wait, 0);
  const asa           = results.length ? totalWait / results.length * 60 : 0;
  const slOv          = results.length ? results.filter(r=>r.ok).length / results.length * 100 : 0;
  const totalOffered  = results.length + abandonedCalls.length;
  const abandonRateOv = totalOffered > 0 ? abandonedCalls.length / totalOffered * 100 : 0;
  let tAvail = 0, tBusy = 0;
  for (let a = 0; a < numAgents; a++) {
    const brkT = allBrks[a].reduce((s,b)=>s+(Math.min(b.e,shiftEnd)-b.s),0);
    tAvail += shiftLength - Math.max(0, brkT);
    for (const r of results.filter(r => r.agent === a)) {
      let callTime = r.end - r.answer;
      for (const b of allBrks[a]) {
        const bos = Math.max(b.s, r.answer), boe = Math.min(b.e, r.end);
        if (boe > bos) callTime -= (boe - bos);
      }
      tBusy += Math.max(0, callTime);
    }
  }
  const utilOv = tAvail > 0 ? tBusy / tAvail * 100 : 0;

  return { events, results, intervals, allBrks, abandonedCalls,
    overall: { asa, sl: slOv, util: utilOv, total: results.length,
               abandoned: abandonedCalls.length, totalOffered, abandonRate: abandonRateOv } };
}

// ═══════════════════════════════════════════════════════════
// Input Screen
// ═══════════════════════════════════════════════════════════
function getParams() {
  return {
    numAgents:     +document.getElementById('inp-agents').value,
    shiftStart:    +document.getElementById('inp-start').value * 60,
    shiftLength:   +document.getElementById('inp-shift').value * 60,
    breakDur:      +document.getElementById('inp-break-dur').value,
    numBreaks:     +document.getElementById('inp-num-breaks').value,
    expectedCalls: +document.getElementById('inp-calls').value,
    aht:           +document.getElementById('inp-aht').value,
    serviceTarget: +document.getElementById('inp-target').value,
    abandonTime:   +document.getElementById('inp-abandon').value,
  };
}

export function initInputs() {
  const cfg = [
    ['agents',     v => v],
    ['start',      v => fmt12(v * 60)],
    ['shift',      v => `${v} hrs`],
    ['num-breaks', v => v],
    ['break-dur',  v => `${v} min`],
    ['calls',      v => v],
    ['aht',        v => `${v} min`],
    ['target',     v => `${v} sec`],
    ['abandon',    v => v >= 60 ? `${Math.round(v/60)} min` : `${v} sec`],
  ];
  for (const [id, fmt] of cfg) {
    const inp = document.getElementById(`inp-${id}`);
    const val = document.getElementById(`val-${id.replace('num-','num-')}`);
    const update = () => { val.textContent = fmt(inp.value); drawPreview(); };
    inp.addEventListener('input', update);
    update();
  }
}

export function drawPreview() {
  const canvas = document.getElementById('call-preview');
  const W = canvas.parentElement.clientWidth - 40 || 600;
  const H = 90;
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const p = getParams();
  const pad = { l:36, r:10, t:8, b:24 };
  const iW = W - pad.l - pad.r;
  const iH = H - pad.t - pad.b;

  ctx.clearRect(0, 0, W, H);

  // Rate values
  const N = 200;
  const vals = Array.from({length: N+1}, (_, i) => Math.max(0, callRate(i/N)));
  const maxV = Math.max(...vals);

  // Fill
  const path = new Path2D();
  for (let i = 0; i <= N; i++) {
    const x = pad.l + (i/N) * iW;
    const y = pad.t + iH - (vals[i]/maxV) * iH;
    if (i===0) path.moveTo(x,y); else path.lineTo(x,y);
  }
  path.lineTo(pad.l + iW, pad.t + iH);
  path.lineTo(pad.l, pad.t + iH);
  path.closePath();
  const gr = ctx.createLinearGradient(0, pad.t, 0, pad.t+iH);
  gr.addColorStop(0, '#3b82f635');
  gr.addColorStop(1, '#3b82f605');
  ctx.fillStyle = gr;
  ctx.fill(path);

  // Stroke
  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    const x = pad.l + (i/N) * iW;
    const y = pad.t + iH - (vals[i]/maxV) * iH;
    if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  }
  ctx.strokeStyle = '#60a5fa';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Break window spans — show full spread from first to last agent's break
  if (p.numBreaks > 0) {
    const allBrks = makeBreaks(p.numAgents, p.shiftStart, p.shiftLength, p.breakDur, p.numBreaks);
    const last = allBrks[allBrks.length - 1];
    for (let b = 0; b < p.numBreaks; b++) {
      const spanS = allBrks[0][b].s;
      const spanE = last[b].e;
      const x1 = pad.l + ((spanS - p.shiftStart) / p.shiftLength) * iW;
      const x2 = pad.l + ((spanE - p.shiftStart) / p.shiftLength) * iW;
      ctx.fillStyle = '#f59e0b18';
      ctx.fillRect(x1, pad.t, x2 - x1, iH);
      ctx.strokeStyle = '#f59e0b50';
      ctx.lineWidth = 1;
      ctx.strokeRect(x1, pad.t, x2 - x1, iH);
      ctx.fillStyle = '#f59e0bcc';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Break ${b + 1}`, (x1 + x2) / 2, pad.t + 10);
    }
  }

  // X-axis hours
  ctx.fillStyle = '#64748b';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  const totalHrs = p.shiftLength / 60;
  for (let h = 0; h <= totalHrs; h++) {
    const x = pad.l + (h/totalHrs) * iW;
    ctx.fillText(fmt12(p.shiftStart + h*60).replace(':00','').replace(' AM',' ').replace(' PM',' ').trim(), x, H - 5);
  }

  // Y axis label
  ctx.fillStyle = '#475569';
  ctx.font = '9px sans-serif';
  ctx.textAlign = 'center';
  ctx.save();
  ctx.translate(10, pad.t + iH/2);
  ctx.rotate(-Math.PI/2);
  ctx.fillText('Call Rate', 0, 0);
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════
// Simulation Screen
// ═══════════════════════════════════════════════════════════
function buildGrid(n) {
  const g = document.getElementById('agent-grid');
  g.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const d = document.createElement('div');
    d.className = 'agent-card idle';
    d.id = `ag-${i}`;
    d.innerHTML = `<div class="a-icon">👤</div><div class="a-num">${i+1}</div>`;
    g.appendChild(d);
  }
}

function setAgentStatus(i, status) {
  const el = document.getElementById(`ag-${i}`);
  if (!el) return;
  const icons = { idle:'👤', busy:'📞', 'on-break':'☕' };
  el.className = `agent-card ${status}`;
  el.querySelector('.a-icon').textContent = icons[status] || '👤';
}

export function setSpeed(s) {
  if (animState.running && animState.startTime !== null) {
    const elapsed = (performance.now() - animState.startTime) / 1000;
    const curSim = simParams.shiftStart + elapsed * animState.speed;
    animState.startTime = performance.now() - (curSim - simParams.shiftStart) / s * 1000;
  }
  animState.speed = s;
  document.querySelectorAll('.speed-btn').forEach((btn, idx) => {
    btn.classList.toggle('active', [60,120,300,600,9999][idx] === s);
  });
}

function pushActivity(text, cls) {
  actLog.unshift({ text, cls });
  if (actLog.length > 10) actLog.length = 10;
}

function processEvent(evt) {
  const st = animState;
  switch (evt.type) {
    case 'arrive':
      st.arrived++;
      st.queue++;
      pushActivity(`📞 Call ${evt.id+1} arrived`, 'arrive');
      break;
    case 'answer':
      st.answered++;
      st.queue = Math.max(0, st.queue - 1);
      st.totalWaitMin += evt.wait;
      if (evt.wait * 60 <= simParams.serviceTarget) st.withinTarget++;
      st.agentStatus[evt.a] = 'busy';
      setAgentStatus(evt.a, 'busy');
      pushActivity(`✅ Agent ${evt.a+1} — wait ${Math.round(evt.wait*60)}s`, 'answer');
      break;
    case 'end':
      if (st.agentStatus[evt.a] === 'busy') {
        st.agentStatus[evt.a] = 'idle';
        setAgentStatus(evt.a, 'idle');
      }
      break;
    case 'abandon':
      st.queue = Math.max(0, st.queue - 1);
      st.abandoned++;
      pushActivity(`❌ Call ${evt.id+1} abandoned queue`, 'abandon');
      break;
    case 'brk_s':
      st.agentStatus[evt.a] = 'on-break';
      setAgentStatus(evt.a, 'on-break');
      pushActivity(`☕ Agent ${evt.a+1} on break`, 'brk');
      break;
    case 'brk_e':
      if (st.agentStatus[evt.a] === 'on-break') {
        st.agentStatus[evt.a] = 'idle';
        setAgentStatus(evt.a, 'idle');
      }
      break;
  }
}

function updateSimUI() {
  const st  = animState;
  const prm = simParams;
  const prog = clamp((st.simTime - prm.shiftStart) / prm.shiftLength, 0, 1);

  document.getElementById('sim-clock').textContent = fmt24(st.simTime);
  document.getElementById('sim-bar').style.width   = `${prog * 100}%`;

  document.getElementById('stat-queue').textContent    = st.queue;
  document.getElementById('stat-arrived').textContent  = st.arrived;
  document.getElementById('stat-answered').textContent = st.answered;
  document.getElementById('stat-abandoned').textContent = st.abandoned;

  if (st.answered > 0) {
    const asa = st.totalWaitMin / st.answered * 60;
    document.getElementById('stat-asa').textContent = fmtSec(asa);
    const slp = (st.withinTarget / st.answered * 100).toFixed(1);
    const slEl = document.getElementById('stat-sl');
    slEl.textContent = `${slp}%`;
    slEl.style.color = +slp >= 80 ? 'var(--green)' : +slp >= 60 ? 'var(--amber)' : 'var(--red)';
  } else {
    document.getElementById('stat-asa').textContent = '—';
    document.getElementById('stat-sl').textContent  = '—';
  }

  const busy  = st.agentStatus.filter(s => s === 'busy').length;
  const avail = st.agentStatus.filter(s => s !== 'on-break').length;
  document.getElementById('stat-util').textContent = avail > 0
    ? `${busy} / ${avail}` : '—';

  // Queue dots
  const dotsEl = document.getElementById('queue-dots');
  const show   = Math.min(st.queue, 24);
  if (dotsEl.children.length !== show) {
    dotsEl.innerHTML = '';
    for (let i = 0; i < show; i++) {
      const d = document.createElement('div');
      d.className = 'q-dot';
      dotsEl.appendChild(d);
    }
    if (st.queue > 24) {
      const sp = document.createElement('span');
      sp.style.cssText = 'font-size:0.65rem;color:var(--amber);align-self:center;margin-left:2px';
      sp.textContent = `+${st.queue - 24}`;
      dotsEl.appendChild(sp);
    }
  }

  // Activity log
  const list = document.getElementById('activity-list');
  list.innerHTML = actLog.map(a =>
    `<li class="act-item ${a.cls}">${a.text}</li>`).join('');
}

function animTick(ts) {
  if (!animState.running) return;
  if (animState.startTime === null) animState.startTime = ts;

  const elapsedSec = (ts - animState.startTime) / 1000;
  const simT = simParams.shiftStart + elapsedSec * animState.speed;
  const shiftEnd = simParams.shiftStart + simParams.shiftLength;
  animState.simTime = Math.min(simT, shiftEnd);

  while (animState.eventIdx < simResults.events.length &&
         simResults.events[animState.eventIdx].t <= animState.simTime) {
    processEvent(simResults.events[animState.eventIdx]);
    animState.eventIdx++;
  }

  updateSimUI();

  if (animState.simTime < shiftEnd) {
    animState.raf = requestAnimationFrame(animTick);
  } else {
    animState.running = false;
    document.getElementById('progress-label').textContent = 'Shift complete';
    document.getElementById('view-btn').classList.add('ready');
    updateSimUI();
  }
}

export function startSimulation() {
  const params = getParams();
  simParams = params;
  simResults = runSim(params);

  buildGrid(params.numAgents);
  actLog = [];

  document.getElementById('footer-calls').textContent  = simResults.overall.total;
  document.getElementById('footer-agents').textContent = params.numAgents;
  document.getElementById('footer-target').textContent = `${params.serviceTarget}s`;
  document.getElementById('progress-label').textContent = 'Shift in progress…';
  document.getElementById('view-btn').classList.remove('ready');

  Object.assign(animState, {
    running: true, raf: null, startTime: null, speed: 120,
    eventIdx: 0, simTime: params.shiftStart,
    agentStatus: new Array(params.numAgents).fill('idle'),
    queue: 0, arrived: 0, answered: 0, abandoned: 0,
    totalWaitMin: 0, withinTarget: 0,
  });
  // Reset speed buttons to 2×
  document.querySelectorAll('.speed-btn').forEach((btn, idx) => {
    btn.classList.toggle('active', idx === 1);
  });

  showScreen('screen-simulation');
  requestAnimationFrame(animTick);
}

// ═══════════════════════════════════════════════════════════
// Analysis Screen
// ═══════════════════════════════════════════════════════════
export function showAnalysis() {
  showScreen('screen-analysis');

  const { overall, intervals } = simResults;
  const { serviceTarget } = simParams;

  // Summary cards
  document.getElementById('sum-calls').textContent = overall.total;
  document.getElementById('sum-calls-sub').textContent =
    `of ${simParams.expectedCalls} expected · ${overall.abandoned} abandoned`;

  const asaEl = document.getElementById('sum-asa');
  asaEl.textContent = fmtSec(overall.asa);
  asaEl.style.color = overall.asa <= serviceTarget ? 'var(--green)'
    : overall.asa <= serviceTarget * 2 ? 'var(--amber)' : 'var(--red)';
  document.getElementById('sum-asa-sub').textContent = `Target: ${serviceTarget}s`;

  const slEl = document.getElementById('sum-sl');
  slEl.textContent = `${overall.sl.toFixed(1)}%`;
  slEl.style.color = overall.sl >= 80 ? 'var(--green)'
    : overall.sl >= 60 ? 'var(--amber)' : 'var(--red)';
  document.getElementById('sum-sl-sub').textContent =
    `Calls answered within ${serviceTarget}s`;

  const utEl = document.getElementById('sum-util');
  utEl.textContent = `${overall.util.toFixed(1)}%`;
  utEl.style.color = overall.util > 90 ? 'var(--red)'
    : overall.util >= 50 ? 'var(--green)' : 'var(--blue)';

  const abEl = document.getElementById('sum-abandon');
  abEl.textContent = `${overall.abandonRate.toFixed(1)}%`;
  abEl.style.color = overall.abandonRate < 5 ? 'var(--green)'
    : overall.abandonRate < 15 ? 'var(--amber)' : 'var(--red)';
  document.getElementById('sum-abandon-sub').textContent =
    `${overall.abandoned} of ${overall.totalOffered} offered calls`;

  // Build hotspot table
  const tbl = document.getElementById('hotspot-table');
  // Remove old rows (keep header)
  while (tbl.children.length > 1) tbl.lastChild.remove();

  for (const iv of intervals) {
    const stressed = iv.avgWaitS > serviceTarget * 2 || iv.sl < 60 || iv.abandonRate > 15;
    const elevated = !stressed && (iv.avgWaitS > serviceTarget || iv.sl < 80 || iv.abandonRate > 5);
    const quiet    = !stressed && !elevated && iv.util < 50;
    let badge, assessment;
    if (stressed) {
      badge = '<span class="status-badge badge-stressed">⚠ Stressed</span>';
      assessment = 'High queue pressure — consider extra resource';
    } else if (elevated) {
      badge = '<span class="status-badge badge-elevated">↑ Elevated</span>';
      assessment = 'Service levels slightly above target';
    } else if (quiet) {
      badge = '<span class="status-badge badge-quiet">↓ Under-utilised</span>';
      assessment = 'Agents have significant idle time';
    } else {
      badge = '<span class="status-badge badge-optimal">✓ Optimal</span>';
      assessment = 'Service and utilisation within bounds';
    }

    const row = document.createElement('div');
    row.className = 'ht-row';
    row.innerHTML = `
      <div class="ht-cell">${iv.label}</div>
      <div class="ht-cell">${iv.numCalls}</div>
      <div class="ht-cell" style="color:${iv.avgWaitS > serviceTarget*2?'var(--red)':iv.avgWaitS>serviceTarget?'var(--amber)':'var(--green)'}">${fmtSec(iv.avgWaitS)}</div>
      <div class="ht-cell" style="color:${iv.sl>=80?'var(--green)':iv.sl>=60?'var(--amber)':'var(--red)'}">${iv.sl.toFixed(0)}%</div>
      <div class="ht-cell" style="color:${iv.abandonRate>15?'var(--red)':iv.abandonRate>5?'var(--amber)':'var(--green)'}">${iv.abandonRate.toFixed(0)}%</div>
      <div class="ht-cell" style="color:${iv.util>90?'var(--red)':iv.util>=50?'var(--green)':'var(--blue)'}">${iv.util.toFixed(0)}%</div>
      <div class="ht-cell">${badge}</div>`;
    tbl.appendChild(row);
  }

  // Draw charts after layout settles
  setTimeout(() => {
    drawVolChart(intervals);
    drawAsaChart(intervals, serviceTarget);
    drawUtilChart(intervals);
    drawAbandonChart(intervals);
  }, 30);
}

// ═══════════════════════════════════════════════════════════
// Chart Drawing (Vanilla Canvas)
// ═══════════════════════════════════════════════════════════
function getCtx(id, hAttr) {
  const cv  = document.getElementById(id);
  const dpr = window.devicePixelRatio || 1;
  const W   = cv.parentElement.clientWidth - 40;
  const H   = hAttr;
  cv.width  = W * dpr;
  cv.height = H * dpr;
  const ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);
  return { ctx, W, H };
}

function filledRoundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, h/2, w/2);
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.lineTo(x+w-r, y);
  ctx.quadraticCurveTo(x+w, y, x+w, y+r);
  ctx.lineTo(x+w, y+h);
  ctx.lineTo(x, y+h);
  ctx.lineTo(x, y+r);
  ctx.quadraticCurveTo(x, y, x+r, y);
  ctx.closePath();
  ctx.fill();
}

function drawBarChart({ canvasId, values, labels, colorFn, yMax, refVal, refColor, hAttr }) {
  const { ctx, W, H } = getCtx(canvasId, hAttr);
  const pad = { l:40, r:12, t:12, b:52 };
  const iW = W - pad.l - pad.r;
  const iH = H - pad.t - pad.b;
  const mx  = yMax || (Math.max(...values, 1) * 1.15);

  ctx.clearRect(0, 0, W, H);

  // Grid
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + iH - (i/4) * iH;
    ctx.beginPath();
    ctx.strokeStyle = '#263248';
    ctx.lineWidth = 1;
    ctx.moveTo(pad.l, y);
    ctx.lineTo(pad.l + iW, y);
    ctx.stroke();
    ctx.fillStyle = '#64748b';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(+(mx * i / 4).toFixed(1), pad.l - 5, y + 3);
  }

  // Reference line
  if (refVal !== undefined && refVal > 0 && refVal <= mx) {
    const y = pad.t + iH - (refVal / mx) * iH;
    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = refColor || '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(pad.l + iW, y);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = refColor || '#f59e0b';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Target', pad.l + 3, y - 3);
  }

  // Bars
  const bW  = iW / values.length;
  const gap = Math.max(2, bW * 0.18);
  for (let i = 0; i < values.length; i++) {
    const v  = values[i];
    const bh = (v / mx) * iH;
    const x  = pad.l + i * bW + gap / 2;
    const y  = pad.t + iH - bh;
    ctx.fillStyle = colorFn(v, i);
    filledRoundRect(ctx, x, y, bW - gap, Math.max(2, bh), 3);
  }

  // X labels (rotated)
  const step = Math.ceil(labels.length / 14);
  ctx.fillStyle = '#64748b';
  ctx.font = '9px sans-serif';
  for (let i = 0; i < labels.length; i += step) {
    const x = pad.l + (i + 0.5) * bW;
    ctx.save();
    ctx.translate(x, H - 6);
    ctx.rotate(-Math.PI / 3.5);
    ctx.textAlign = 'right';
    ctx.fillText(labels[i], 0, 0);
    ctx.restore();
  }
}

function drawVolChart(intervals) {
  drawBarChart({
    canvasId: 'chart-volume',
    values:   intervals.map(i => i.numCalls),
    labels:   intervals.map(i => i.label),
    colorFn:  () => '#3b82f6',
    hAttr:    160,
  });
}

function drawAsaChart(intervals, target) {
  drawBarChart({
    canvasId: 'chart-asa',
    values:   intervals.map(i => i.avgWaitS),
    labels:   intervals.map(i => i.label),
    colorFn:  v => v > target*2 ? '#ef4444' : v > target ? '#f59e0b' : '#10b981',
    yMax:     Math.max(...intervals.map(i=>i.avgWaitS), target*2.5, 30),
    refVal:   target,
    refColor: '#f59e0b',
    hAttr:    160,
  });
}

function drawUtilChart(intervals) {
  drawBarChart({
    canvasId: 'chart-util',
    values:   intervals.map(i => i.util),
    labels:   intervals.map(i => i.label),
    colorFn:  v => v > 100 ? '#dc2626' : v > 90 ? '#f97316' : v >= 50 ? '#10b981' : '#3b82f6',
    yMax:     Math.max(...intervals.map(i=>i.util), 100),
    hAttr:    140,
  });
}

function drawAbandonChart(intervals) {
  drawBarChart({
    canvasId: 'chart-abandon',
    values:   intervals.map(i => i.abandonRate),
    labels:   intervals.map(i => i.label),
    colorFn:  v => v > 15 ? '#ef4444' : v > 5 ? '#f59e0b' : '#10b981',
    yMax:     Math.max(...intervals.map(i => i.abandonRate), 20),
    hAttr:    140,
  });
}

// ═══════════════════════════════════════════════════════════
// Navigation
// ═══════════════════════════════════════════════════════════
export function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
