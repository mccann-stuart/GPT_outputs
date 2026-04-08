'use strict';

let simResults = null;
let simParams = null;
let actLog = [];
let _previewData = null;
let _previewTimer = null;
let animState = {
  running: false,
  raf: null,
  startTime: null,
  speed: 120,
  eventIdx: 0,
  simTime: 0,
  agentStatus: [],
  queue: 0,
  arrived: 0,
  answered: 0,
  abandoned: 0,
  totalWaitMin: 0,
  withinTarget: 0,
};

function fmt12(min) {
  const h = Math.floor(min / 60) % 24;
  const m = Math.floor(min % 60);
  const ap = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h - 1 + 12) % 12) + 1;
  return `${h12}:${String(m).padStart(2, '0')} ${ap}`;
}

function fmt24(min) {
  const h = Math.floor(min / 60) % 24;
  const m = Math.floor(min % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function fmtSec(s) {
  const rounded = Math.round(s);
  if (rounded < 60) {
    return `${rounded}s`;
  }
  return `${Math.floor(rounded / 60)}m ${rounded % 60}s`;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}



function getParams() {
  return {
    numAgents: +document.getElementById('inp-agents').value,
    shiftStart: +document.getElementById('inp-start').value * 60,
    shiftLength: +document.getElementById('inp-shift').value * 60,
    breakDur: +document.getElementById('inp-break-dur').value,
    numBreaks: +document.getElementById('inp-num-breaks').value,
    expectedCalls: +document.getElementById('inp-calls').value,
    aht: +document.getElementById('inp-aht').value,
    serviceTarget: +document.getElementById('inp-target').value,
    abandonTime: +document.getElementById('inp-abandon').value,
  };
}

function setButtonLoading(isLoading) {
  const buttons = [
    document.getElementById('run-btn'),
    document.querySelector('.rerun-btn'),
  ].filter(Boolean);

  for (const button of buttons) {
    if (!button.dataset.label) {
      button.dataset.label = button.textContent;
    }
    button.disabled = isLoading;
    button.style.opacity = isLoading ? '0.7' : '';
    button.style.cursor = isLoading ? 'progress' : '';
    button.textContent = isLoading ? 'Loading…' : button.dataset.label;
  }
}

function cancelAnimation() {
  animState.running = false;
  if (animState.raf !== null) {
    cancelAnimationFrame(animState.raf);
    animState.raf = null;
  }
}

function buildGrid(n) {
  const g = document.getElementById('agent-grid');
  g.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const d = document.createElement('div');
    d.className = 'agent-card idle';
    d.id = `ag-${i}`;
    d.innerHTML = `<div class="a-icon">👤</div><div class="a-num">${i + 1}</div>`;
    g.appendChild(d);
  }
}

function setAgentStatus(i, status) {
  const el = document.getElementById(`ag-${i}`);
  if (!el) {
    return;
  }
  const icons = { idle: '👤', busy: '📞', 'on-break': '☕' };
  el.className = `agent-card ${status}`;
  el.querySelector('.a-icon').textContent = icons[status] || '👤';
}

export function setSpeed(s) {
  if (animState.running && animState.startTime !== null) {
    const elapsed = (performance.now() - animState.startTime) / 1000;
    const curSim = simParams.shiftStart + elapsed * animState.speed;
    animState.startTime = performance.now() - ((curSim - simParams.shiftStart) / s) * 1000;
  }
  animState.speed = s;
  document.querySelectorAll('.speed-btn').forEach((btn, idx) => {
    btn.classList.toggle('active', [60, 120, 300, 600, 9999][idx] === s);
  });
}

function pushActivity(text, cls) {
  actLog.unshift({ text, cls });
  if (actLog.length > 10) {
    actLog.length = 10;
  }
}

function processEvent(evt) {
  const st = animState;
  switch (evt.type) {
    case 'arrive':
      st.arrived++;
      st.queue++;
      pushActivity(`📞 Call ${evt.id + 1} arrived`, 'arrive');
      break;
    case 'answer':
      st.answered++;
      st.queue = Math.max(0, st.queue - 1);
      st.totalWaitMin += evt.wait;
      if (evt.wait * 60 <= simParams.serviceTarget) {
        st.withinTarget++;
      }
      st.agentStatus[evt.a] = 'busy';
      setAgentStatus(evt.a, 'busy');
      pushActivity(`✅ Agent ${evt.a + 1} — wait ${Math.round(evt.wait * 60)}s`, 'answer');
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
      pushActivity(`❌ Call ${evt.id + 1} abandoned queue`, 'abandon');
      break;
    case 'brk_s':
      st.agentStatus[evt.a] = 'on-break';
      setAgentStatus(evt.a, 'on-break');
      pushActivity(`☕ Agent ${evt.a + 1} on break`, 'brk');
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
  const st = animState;
  const prm = simParams;
  const prog = clamp((st.simTime - prm.shiftStart) / prm.shiftLength, 0, 1);

  document.getElementById('sim-clock').textContent = fmt24(st.simTime);
  document.getElementById('sim-bar').style.width = `${prog * 100}%`;

  document.getElementById('stat-queue').textContent = st.queue;
  document.getElementById('stat-arrived').textContent = st.arrived;
  document.getElementById('stat-answered').textContent = st.answered;
  document.getElementById('stat-abandoned').textContent = st.abandoned;

  if (st.answered > 0) {
    const asa = (st.totalWaitMin / st.answered) * 60;
    document.getElementById('stat-asa').textContent = fmtSec(asa);
    const slp = ((st.withinTarget / st.answered) * 100).toFixed(1);
    const slEl = document.getElementById('stat-sl');
    slEl.textContent = `${slp}%`;
    slEl.style.color = +slp >= 80 ? 'var(--green)' : +slp >= 60 ? 'var(--amber)' : 'var(--red)';
  } else {
    document.getElementById('stat-asa').textContent = '—';
    document.getElementById('stat-sl').textContent = '—';
  }

  const busy = st.agentStatus.filter((s) => s === 'busy').length;
  const avail = st.agentStatus.filter((s) => s !== 'on-break').length;
  document.getElementById('stat-util').textContent = avail > 0 ? `${busy} / ${avail}` : '—';

  const dotsEl = document.getElementById('queue-dots');
  const show = Math.min(st.queue, 24);
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

  const list = document.getElementById('activity-list');
  list.innerHTML = actLog.map((a) => `<li class="act-item ${a.cls}">${a.text}</li>`).join('');
}

function animTick(ts) {
  if (!animState.running) {
    return;
  }
  if (animState.startTime === null) {
    animState.startTime = ts;
  }

  const elapsedSec = (ts - animState.startTime) / 1000;
  const simT = simParams.shiftStart + elapsedSec * animState.speed;
  const shiftEnd = simParams.shiftStart + simParams.shiftLength;
  animState.simTime = Math.min(simT, shiftEnd);

  while (
    animState.eventIdx < simResults.events.length
    && simResults.events[animState.eventIdx].t <= animState.simTime
  ) {
    processEvent(simResults.events[animState.eventIdx]);
    animState.eventIdx++;
  }

  updateSimUI();

  if (animState.simTime < shiftEnd) {
    animState.raf = requestAnimationFrame(animTick);
  } else {
    animState.running = false;
    animState.raf = null;
    document.getElementById('progress-label').textContent = 'Shift complete';
    document.getElementById('view-btn').classList.add('ready');
    updateSimUI();
  }
}

function getErrorMessage(response, fallback) {
  return response
    .json()
    .then((body) => body?.error || fallback)
    .catch(() => fallback);
}

export async function startSimulation() {
  cancelAnimation();
  setButtonLoading(true);

  try {
    const params = getParams();
    const response = await fetch('/api/simulate', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(await getErrorMessage(response, `Simulation failed with ${response.status}`));
    }

    simParams = params;
    simResults = await response.json();

    buildGrid(params.numAgents);
    actLog = [];

    document.getElementById('footer-calls').textContent = simResults.overall.total;
    document.getElementById('footer-agents').textContent = params.numAgents;
    document.getElementById('footer-target').textContent = `${params.serviceTarget}s`;
    document.getElementById('progress-label').textContent = 'Shift in progress…';
    document.getElementById('view-btn').classList.remove('ready');

    Object.assign(animState, {
      running: true,
      raf: null,
      startTime: null,
      speed: 120,
      eventIdx: 0,
      simTime: params.shiftStart,
      agentStatus: new Array(params.numAgents).fill('idle'),
      queue: 0,
      arrived: 0,
      answered: 0,
      abandoned: 0,
      totalWaitMin: 0,
      withinTarget: 0,
    });

    document.querySelectorAll('.speed-btn').forEach((btn, idx) => {
      btn.classList.toggle('active', idx === 1);
    });

    showScreen('screen-simulation');
    updateSimUI();
    animState.raf = requestAnimationFrame(animTick);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Simulation failed';
    window.alert(message);
  } finally {
    setButtonLoading(false);
  }
}

export function showAnalysis() {
  if (!simResults || !simParams) {
    return;
  }

  showScreen('screen-analysis');

  const { overall, intervals } = simResults;
  const { serviceTarget } = simParams;

  document.getElementById('sum-calls').textContent = overall.total;
  document.getElementById('sum-calls-sub').textContent =
    `of ${simParams.expectedCalls} expected · ${overall.abandoned} abandoned`;

  const asaEl = document.getElementById('sum-asa');
  asaEl.textContent = fmtSec(overall.asa);
  asaEl.style.color = overall.asa <= serviceTarget
    ? 'var(--green)'
    : overall.asa <= serviceTarget * 2
      ? 'var(--amber)'
      : 'var(--red)';
  document.getElementById('sum-asa-sub').textContent = `Target: ${serviceTarget}s`;

  const slEl = document.getElementById('sum-sl');
  slEl.textContent = `${overall.sl.toFixed(1)}%`;
  slEl.style.color = overall.sl >= 80 ? 'var(--green)' : overall.sl >= 60 ? 'var(--amber)' : 'var(--red)';
  document.getElementById('sum-sl-sub').textContent = `Calls answered within ${serviceTarget}s`;

  const utEl = document.getElementById('sum-util');
  utEl.textContent = `${overall.util.toFixed(1)}%`;
  utEl.style.color = overall.util > 90 ? 'var(--red)' : overall.util >= 50 ? 'var(--green)' : 'var(--blue)';

  const abEl = document.getElementById('sum-abandon');
  abEl.textContent = `${overall.abandonRate.toFixed(1)}%`;
  abEl.style.color = overall.abandonRate < 5 ? 'var(--green)' : overall.abandonRate < 15 ? 'var(--amber)' : 'var(--red)';
  document.getElementById('sum-abandon-sub').textContent = `${overall.abandoned} of ${overall.totalOffered} offered calls`;

  const tbl = document.getElementById('hotspot-table');
  while (tbl.children.length > 1) {
    tbl.lastChild.remove();
  }

  for (const iv of intervals) {
    const stressed = iv.avgWaitS > serviceTarget * 2 || iv.sl < 60 || iv.abandonRate > 15;
    const elevated = !stressed && (iv.avgWaitS > serviceTarget || iv.sl < 80 || iv.abandonRate > 5);
    const quiet = !stressed && !elevated && iv.util < 50;

    let badge;
    if (stressed) {
      badge = '<span class="status-badge badge-stressed">⚠ Stressed</span>';
    } else if (elevated) {
      badge = '<span class="status-badge badge-elevated">↑ Elevated</span>';
    } else if (quiet) {
      badge = '<span class="status-badge badge-quiet">↓ Under-utilised</span>';
    } else {
      badge = '<span class="status-badge badge-optimal">✓ Optimal</span>';
    }

    const row = document.createElement('div');
    row.className = 'ht-row';
    row.innerHTML = `
      <div class="ht-cell">${iv.label}</div>
      <div class="ht-cell">${iv.numCalls}</div>
      <div class="ht-cell" style="color:${iv.avgWaitS > serviceTarget * 2 ? 'var(--red)' : iv.avgWaitS > serviceTarget ? 'var(--amber)' : 'var(--green)'}">${fmtSec(iv.avgWaitS)}</div>
      <div class="ht-cell" style="color:${iv.sl >= 80 ? 'var(--green)' : iv.sl >= 60 ? 'var(--amber)' : 'var(--red)'}">${iv.sl.toFixed(0)}%</div>
      <div class="ht-cell" style="color:${iv.abandonRate > 15 ? 'var(--red)' : iv.abandonRate > 5 ? 'var(--amber)' : 'var(--green)'}">${iv.abandonRate.toFixed(0)}%</div>
      <div class="ht-cell" style="color:${iv.util > 90 ? 'var(--red)' : iv.util >= 50 ? 'var(--green)' : 'var(--blue)'}">${iv.util.toFixed(0)}%</div>
      <div class="ht-cell">${badge}</div>`;
    tbl.appendChild(row);
  }

  setTimeout(() => {
    drawVolChart(intervals);
    drawAsaChart(intervals, serviceTarget);
    drawUtilChart(intervals);
    drawAbandonChart(intervals);
  }, 30);
}

function getCtx(id, hAttr) {
  const cv = document.getElementById(id);
  const dpr = window.devicePixelRatio || 1;
  const W = cv.parentElement.clientWidth - 40;
  const H = hAttr;
  cv.width = W * dpr;
  cv.height = H * dpr;
  const ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);
  return { ctx, W, H };
}

function filledRoundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
}

function drawBarChart({ canvasId, values, labels, colorFn, yMax, refVal, refColor, hAttr }) {
  const { ctx, W, H } = getCtx(canvasId, hAttr);
  const pad = { l: 40, r: 12, t: 12, b: 52 };
  const iW = W - pad.l - pad.r;
  const iH = H - pad.t - pad.b;
  const mx = yMax || (Math.max(...values, 1) * 1.15);

  ctx.clearRect(0, 0, W, H);

  for (let i = 0; i <= 4; i++) {
    const y = pad.t + iH - (i / 4) * iH;
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

  const bW = iW / values.length;
  const gap = Math.max(2, bW * 0.18);
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    const bh = (v / mx) * iH;
    const x = pad.l + i * bW + gap / 2;
    const y = pad.t + iH - bh;
    ctx.fillStyle = colorFn(v, i);
    filledRoundRect(ctx, x, y, bW - gap, Math.max(2, bh), 3);
  }

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
    values: intervals.map((i) => i.numCalls),
    labels: intervals.map((i) => i.label),
    colorFn: () => '#3b82f6',
    hAttr: 160,
  });
}

function drawAsaChart(intervals, target) {
  drawBarChart({
    canvasId: 'chart-asa',
    values: intervals.map((i) => i.avgWaitS),
    labels: intervals.map((i) => i.label),
    colorFn: (v) => v > target * 2 ? '#ef4444' : v > target ? '#f59e0b' : '#10b981',
    yMax: Math.max(...intervals.map((i) => i.avgWaitS), target * 2.5, 30),
    refVal: target,
    refColor: '#f59e0b',
    hAttr: 160,
  });
}

function drawUtilChart(intervals) {
  drawBarChart({
    canvasId: 'chart-util',
    values: intervals.map((i) => i.util),
    labels: intervals.map((i) => i.label),
    colorFn: (v) => v > 100 ? '#dc2626' : v > 90 ? '#f97316' : v >= 50 ? '#10b981' : '#3b82f6',
    yMax: Math.max(...intervals.map((i) => i.util), 100),
    hAttr: 140,
  });
}

function drawAbandonChart(intervals) {
  drawBarChart({
    canvasId: 'chart-abandon',
    values: intervals.map((i) => i.abandonRate),
    labels: intervals.map((i) => i.label),
    colorFn: (v) => v > 15 ? '#ef4444' : v > 5 ? '#f59e0b' : '#10b981',
    yMax: Math.max(...intervals.map((i) => i.abandonRate), 20),
    hAttr: 140,
  });
}

export function initInputs() {
  const cfg = [
    ['agents', (v) => v],
    ['start', (v) => fmt12(v * 60)],
    ['shift', (v) => `${v} hrs`],
    ['num-breaks', (v) => v],
    ['break-dur', (v) => `${v} min`],
    ['calls', (v) => v],
    ['aht', (v) => `${v} min`],
    ['target', (v) => `${v} sec`],
    ['abandon', (v) => (v >= 60 ? `${Math.round(v / 60)} min` : `${v} sec`)],
  ];

  for (const [id, fmt] of cfg) {
    const inp = document.getElementById(`inp-${id}`);
    const val = document.getElementById(`val-${id.replace('num-', 'num-')}`);
    const update = () => {
      val.textContent = fmt(inp.value);
      drawPreview();
    };
    inp.addEventListener('input', update);
    update();
  }
}

function renderPreviewCanvas(p, data) {
  const canvas = document.getElementById('call-preview');
  const W = canvas.parentElement.clientWidth - 40 || 600;
  const H = 90;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const pad = { l: 36, r: 10, t: 8, b: 24 };
  const iW = W - pad.l - pad.r;
  const iH = H - pad.t - pad.b;

  ctx.clearRect(0, 0, W, H);

  const vals = data.curvePoints;
  const N = vals.length - 1;
  const maxV = Math.max(...vals);

  const path = new Path2D();
  for (let i = 0; i <= N; i++) {
    const x = pad.l + (i / N) * iW;
    const y = pad.t + iH - (vals[i] / maxV) * iH;
    if (i === 0) {
      path.moveTo(x, y);
    } else {
      path.lineTo(x, y);
    }
  }
  path.lineTo(pad.l + iW, pad.t + iH);
  path.lineTo(pad.l, pad.t + iH);
  path.closePath();
  const gr = ctx.createLinearGradient(0, pad.t, 0, pad.t + iH);
  gr.addColorStop(0, '#3b82f635');
  gr.addColorStop(1, '#3b82f605');
  ctx.fillStyle = gr;
  ctx.fill(path);

  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    const x = pad.l + (i / N) * iW;
    const y = pad.t + iH - (vals[i] / maxV) * iH;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.strokeStyle = '#60a5fa';
  ctx.lineWidth = 2;
  ctx.stroke();

  for (const bw of data.breakWindows) {
    const x1 = pad.l + ((bw.s - p.shiftStart) / p.shiftLength) * iW;
    const x2 = pad.l + ((bw.e - p.shiftStart) / p.shiftLength) * iW;
    ctx.fillStyle = '#f59e0b18';
    ctx.fillRect(x1, pad.t, x2 - x1, iH);
    ctx.strokeStyle = '#f59e0b50';
    ctx.lineWidth = 1;
    ctx.strokeRect(x1, pad.t, x2 - x1, iH);
    ctx.fillStyle = '#f59e0bcc';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(bw.label, (x1 + x2) / 2, pad.t + 10);
  }

  ctx.fillStyle = '#64748b';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  const totalHrs = p.shiftLength / 60;
  for (let h = 0; h <= totalHrs; h++) {
    const x = pad.l + (h / totalHrs) * iW;
    ctx.fillText(
      fmt12(p.shiftStart + h * 60).replace(':00', '').replace(' AM', ' ').replace(' PM', ' ').trim(),
      x,
      H - 5,
    );
  }

  ctx.fillStyle = '#475569';
  ctx.font = '9px sans-serif';
  ctx.textAlign = 'center';
  ctx.save();
  ctx.translate(10, pad.t + iH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('Call Rate', 0, 0);
  ctx.restore();
}

export function drawPreview() {
  const p = getParams();

  // Render immediately with cached data for snappy slider interaction
  if (_previewData) {
    renderPreviewCanvas(p, _previewData);
  }

  // Debounce the API fetch to avoid flooding the server on rapid slider drags
  if (_previewTimer) clearTimeout(_previewTimer);
  _previewTimer = setTimeout(async () => {
    try {
      const res = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          shiftStart: p.shiftStart,
          shiftLength: p.shiftLength,
          numAgents: p.numAgents,
          breakDur: p.breakDur,
          numBreaks: p.numBreaks,
        }),
      });
      if (res.ok) {
        _previewData = await res.json();
        renderPreviewCanvas(getParams(), _previewData);
      }
    } catch {
      // Silently fail — user still sees cached preview
    }
  }, 80);
}

export function showScreen(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
