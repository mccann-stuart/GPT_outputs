import React, { useEffect } from 'react';

let simParams = null;
let simPlayback = null;
let simAnalysis = null;
let actLog = [];
let previewData = null;
let previewTimer = null;
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

const TONE_TO_VAR = {
  text: 'var(--text)',
  green: 'var(--green)',
  amber: 'var(--amber)',
  red: 'var(--red)',
  blue: 'var(--blue)',
};

const TONE_TO_COLOR = {
  green: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
  blue: '#3b82f6',
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

function fmtSec(seconds) {
  const rounded = Math.round(seconds);
  if (rounded < 60) {
    return `${rounded}s`;
  }
  return `${Math.floor(rounded / 60)}m ${rounded % 60}s`;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function getToneVar(tone) {
  return TONE_TO_VAR[tone] || 'var(--text)';
}

function getToneColor(tone) {
  return TONE_TO_COLOR[tone] || '#64748b';
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
  const grid = document.getElementById('agent-grid');
  grid.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const card = document.createElement('div');
    card.className = 'agent-card idle';
    card.id = `ag-${i}`;
    card.innerHTML = `<div class="a-icon">👤</div><div class="a-num">${i + 1}</div>`;
    grid.appendChild(card);
  }
}

function setAgentStatus(i, status) {
  const el = document.getElementById(`ag-${i}`);
  if (!el) {
    return;
  }
  const icons = { idle: '👤', busy: '📞', 'on-break': '☕' };
  el.className = `agent-card ${status}`;
  const icon = el.querySelector('.a-icon');
  if (icon) {
    icon.textContent = icons[status] || '👤';
  }
}

export function setSpeed(speed) {
  if (animState.running && animState.startTime !== null) {
    const elapsed = (performance.now() - animState.startTime) / 1000;
    const curSim = simParams.shiftStart + elapsed * animState.speed;
    animState.startTime = performance.now() - ((curSim - simParams.shiftStart) / speed) * 1000;
  }
  animState.speed = speed;
  document.querySelectorAll('.speed-btn').forEach((btn, idx) => {
    btn.classList.toggle('active', [60, 120, 300, 600, 9999][idx] === speed);
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
  const progress = clamp((st.simTime - simParams.shiftStart) / simParams.shiftLength, 0, 1);

  document.getElementById('sim-clock').textContent = fmt24(st.simTime);
  document.getElementById('sim-bar').style.width = `${progress * 100}%`;

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
    slEl.style.color = getToneVar(+slp >= 80 ? 'green' : +slp >= 60 ? 'amber' : 'red');
  } else {
    document.getElementById('stat-asa').textContent = '—';
    document.getElementById('stat-sl').textContent = '—';
  }

  const busy = st.agentStatus.filter((status) => status === 'busy').length;
  const avail = st.agentStatus.filter((status) => status !== 'on-break').length;
  document.getElementById('stat-util').textContent = avail > 0 ? `${busy} / ${avail}` : '—';

  const dotsEl = document.getElementById('queue-dots');
  const show = Math.min(st.queue, 24);
  if (dotsEl.children.length !== show) {
    dotsEl.innerHTML = '';
    for (let i = 0; i < show; i++) {
      const dot = document.createElement('div');
      dot.className = 'q-dot';
      dotsEl.appendChild(dot);
    }
    if (st.queue > 24) {
      const extra = document.createElement('span');
      extra.style.cssText = 'font-size:0.65rem;color:var(--amber);align-self:center;margin-left:2px';
      extra.textContent = `+${st.queue - 24}`;
      dotsEl.appendChild(extra);
    }
  }

  const list = document.getElementById('activity-list');
  list.innerHTML = actLog.map((activity) => (
    `<li class="act-item ${activity.cls}">${activity.text}</li>`
  )).join('');
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
    animState.eventIdx < simPlayback.events.length
    && simPlayback.events[animState.eventIdx].t <= animState.simTime
  ) {
    processEvent(simPlayback.events[animState.eventIdx]);
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
    const response = await fetch('/api/simulate', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(getParams()),
    });

    if (!response.ok) {
      throw new Error(await getErrorMessage(response, `Simulation failed with ${response.status}`));
    }

    const data = await response.json();
    simParams = data.params;
    simPlayback = data.playback;
    simAnalysis = data.analysis;

    buildGrid(simParams.numAgents);
    actLog = [];

    document.getElementById('footer-calls').textContent = simPlayback.footer.callsDisplay;
    document.getElementById('footer-agents').textContent = simPlayback.footer.agentsDisplay;
    document.getElementById('footer-target').textContent = simPlayback.footer.targetDisplay;
    document.getElementById('progress-label').textContent = 'Shift in progress…';
    document.getElementById('view-btn').classList.remove('ready');

    Object.assign(animState, {
      running: true,
      raf: null,
      startTime: null,
      speed: 120,
      eventIdx: 0,
      simTime: simPlayback.initialState.simTime,
      agentStatus: [...simPlayback.initialState.agentStatus],
      queue: simPlayback.initialState.queue,
      arrived: simPlayback.initialState.arrived,
      answered: simPlayback.initialState.answered,
      abandoned: simPlayback.initialState.abandoned,
      totalWaitMin: simPlayback.initialState.totalWaitMin,
      withinTarget: simPlayback.initialState.withinTarget,
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

function setSummaryCard(valueId, subId, model) {
  const valueEl = document.getElementById(valueId);
  valueEl.textContent = model.display;
  valueEl.style.color = getToneVar(model.tone);
  if (subId) {
    document.getElementById(subId).textContent = model.subtext;
  }
}

export function showAnalysis() {
  if (!simAnalysis || !simParams) {
    return;
  }

  showScreen('screen-analysis');

  setSummaryCard('sum-calls', 'sum-calls-sub', simAnalysis.summary.calls);
  setSummaryCard('sum-asa', 'sum-asa-sub', simAnalysis.summary.asa);
  setSummaryCard('sum-sl', 'sum-sl-sub', simAnalysis.summary.sl);
  setSummaryCard('sum-util', null, simAnalysis.summary.util);
  setSummaryCard('sum-abandon', 'sum-abandon-sub', simAnalysis.summary.abandon);

  const table = document.getElementById('hotspot-table');
  while (table.children.length > 1) {
    table.lastChild.remove();
  }

  for (const rowModel of simAnalysis.hotspots) {
    const row = document.createElement('div');
    row.className = 'ht-row';
    row.innerHTML = `
      <div class="ht-cell">${rowModel.label}</div>
      <div class="ht-cell">${rowModel.numCallsDisplay}</div>
      <div class="ht-cell" style="color:${getToneVar(rowModel.avgWaitTone)}">${rowModel.avgWaitDisplay}</div>
      <div class="ht-cell" style="color:${getToneVar(rowModel.slTone)}">${rowModel.slDisplay}</div>
      <div class="ht-cell" style="color:${getToneVar(rowModel.abandonTone)}">${rowModel.abandonDisplay}</div>
      <div class="ht-cell" style="color:${getToneVar(rowModel.utilTone)}">${rowModel.utilDisplay}</div>
      <div class="ht-cell"><span class="status-badge ${rowModel.status.badgeClass}">${rowModel.status.label}</span></div>`;
    table.appendChild(row);
  }

  setTimeout(() => {
    drawBarChart('chart-volume', simAnalysis.charts.volume, 160);
    drawBarChart('chart-asa', simAnalysis.charts.asa, 160);
    drawBarChart('chart-util', simAnalysis.charts.util, 140);
    drawBarChart('chart-abandon', simAnalysis.charts.abandon, 140);
  }, 30);
}

function getCtx(id, hAttr) {
  const canvas = document.getElementById(id);
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.parentElement.clientWidth - 40;
  const H = hAttr;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
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

function drawBarChart(canvasId, chart, hAttr) {
  const { ctx, W, H } = getCtx(canvasId, hAttr);
  const pad = { l: 40, r: 12, t: 12, b: 52 };
  const iW = W - pad.l - pad.r;
  const iH = H - pad.t - pad.b;
  const mx = chart.yMax || Math.max(...chart.values, 1) * 1.15;

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

  if (chart.refValue !== undefined && chart.refValue > 0 && chart.refValue <= mx) {
    const y = pad.t + iH - (chart.refValue / mx) * iH;
    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = getToneColor(chart.refTone);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(pad.l + iW, y);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = getToneColor(chart.refTone);
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Target', pad.l + 3, y - 3);
  }

  const barWidth = iW / chart.values.length;
  const gap = Math.max(2, barWidth * 0.18);
  for (let i = 0; i < chart.values.length; i++) {
    const value = chart.values[i];
    const barHeight = (value / mx) * iH;
    const x = pad.l + i * barWidth + gap / 2;
    const y = pad.t + iH - barHeight;
    ctx.fillStyle = getToneColor(chart.tones[i]);
    filledRoundRect(ctx, x, y, barWidth - gap, Math.max(2, barHeight), 3);
  }

  const step = Math.ceil(chart.labels.length / 14);
  ctx.fillStyle = '#64748b';
  ctx.font = '9px sans-serif';
  for (let i = 0; i < chart.labels.length; i += step) {
    const x = pad.l + (i + 0.5) * barWidth;
    ctx.save();
    ctx.translate(x, H - 6);
    ctx.rotate(-Math.PI / 3.5);
    ctx.textAlign = 'right';
    ctx.fillText(chart.labels[i], 0, 0);
    ctx.restore();
  }
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
  for (const axis of data.axisLabels || []) {
    const x = pad.l + (axis.offsetMin / p.shiftLength) * iW;
    ctx.fillText(axis.label, x, H - 5);
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
  const params = getParams();

  if (previewData) {
    renderPreviewCanvas(params, previewData);
  }

  if (previewTimer) {
    clearTimeout(previewTimer);
  }
  previewTimer = setTimeout(async () => {
    try {
      const res = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          shiftStart: params.shiftStart,
          shiftLength: params.shiftLength,
          numAgents: params.numAgents,
          breakDur: params.breakDur,
          numBreaks: params.numBreaks,
        }),
      });
      if (res.ok) {
        previewData = await res.json();
        renderPreviewCanvas(getParams(), previewData);
      }
    } catch {
      // Silently fail — user still sees cached preview.
    }
  }, 80);
}

export function showScreen(id) {
  document.querySelectorAll('.screen').forEach((screen) => screen.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

export default function ContactCentreSimulator() {
  useEffect(() => {
    initInputs();
    drawPreview();

    const handleResize = () => {
      const active = document.querySelector('.screen.active');
      if (active && active.id === 'screen-input') drawPreview();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `:root {
  --bg: #0f172a;
  --surface: #1e293b;
  --surface2: #263248;
  --border: #334155;
  --text: #f1f5f9;
  --muted: #94a3b8;
  --blue: #3b82f6;
  --green: #10b981;
  --amber: #f59e0b;
  --red: #ef4444;
  --purple: #8b5cf6;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  overflow-x: hidden;
}
.screen { display: none; }
.screen.active { display: flex; flex-direction: column; min-height: 100vh; }

/* ─── Screen 1: Input ─── */
.input-header {
  padding: 2.5rem 2rem 1.5rem;
  text-align: center;
  border-bottom: 1px solid var(--border);
}
.input-header h1 {
  font-size: 2rem;
  font-weight: 800;
  background: linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.5px;
}
.input-header p { color: var(--muted); margin-top: 0.5rem; font-size: 0.95rem; }

.input-body {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 1rem;
  padding: 1.5rem 2rem;
  max-width: 1100px;
  margin: 0 auto;
  width: 100%;
}
.input-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.1rem 1.25rem;
  transition: border-color 0.2s;
}
.input-card:hover { border-color: #475569; }
.input-card-icon { font-size: 1.25rem; margin-bottom: 0.4rem; }
.input-card-label {
  font-size: 0.72rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  margin-bottom: 0.5rem;
}
.input-value-display {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--blue);
  margin-bottom: 0.6rem;
  font-variant-numeric: tabular-nums;
}
input[type="range"] {
  width: 100%;
  height: 4px;
  accent-color: var(--blue);
  cursor: pointer;
  border-radius: 2px;
}
.input-footer {
  padding: 0 2rem 2rem;
  max-width: 1100px;
  margin: 0 auto;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.preview-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1rem 1.25rem;
}
.preview-card h3 {
  font-size: 0.72rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  margin-bottom: 0.75rem;
}
#call-preview { width: 100%; display: block; }
.run-btn {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 1rem 2rem;
  font-size: 1.05rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.15s, opacity 0.15s;
  letter-spacing: 0.02em;
}
.run-btn:hover { transform: translateY(-2px); opacity: 0.92; }
.run-btn:active { transform: translateY(0); }

/* ─── Screen 2: Simulation ─── */
.sim-header {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  padding: 0.75rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 1.25rem;
  flex-shrink: 0;
}
.sim-title { font-size: 0.75rem; color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
.sim-clock {
  font-size: 1.6rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: var(--blue);
  min-width: 5.5rem;
}
.progress-wrap { flex: 1; }
.progress-label { font-size: 0.68rem; color: var(--muted); margin-bottom: 4px; }
.sim-progress {
  height: 6px;
  background: var(--border);
  border-radius: 3px;
  overflow: hidden;
}
.sim-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--blue), var(--purple));
  border-radius: 3px;
  width: 0%;
  transition: width 0.1s linear;
}
.speed-group { display: flex; gap: 0.35rem; align-items: center; }
.speed-label { font-size: 0.7rem; color: var(--muted); margin-right: 2px; }
.speed-btn {
  background: var(--surface2);
  border: 1px solid var(--border);
  color: var(--muted);
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 600;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.speed-btn:hover { background: var(--border); color: var(--text); }
.speed-btn.active { background: var(--blue); border-color: var(--blue); color: #fff; }

.sim-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}
.agent-panel {
  flex: 1;
  padding: 1.25rem 1.5rem;
  overflow-y: auto;
}
.agent-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.agent-panel-header h2 { font-size: 0.9rem; font-weight: 600; color: var(--text); }
.legend {
  display: flex;
  gap: 1rem;
  font-size: 0.72rem;
  color: var(--muted);
}
.legend-item { display: flex; align-items: center; gap: 0.4rem; }
.legend-dot { width: 10px; height: 10px; border-radius: 50%; }
#agent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
  gap: 8px;
}
.agent-card {
  aspect-ratio: 1;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  font-size: 0.62rem;
  font-weight: 700;
  transition: background-color 0.4s, box-shadow 0.4s, color 0.4s;
  cursor: default;
  user-select: none;
}
.agent-card .a-icon { font-size: 1.3rem; line-height: 1; }
.agent-card .a-num { opacity: 0.7; }
.agent-card.idle {
  background: #052e16;
  color: #4ade80;
  box-shadow: inset 0 0 0 1px #166534;
}
.agent-card.busy {
  background: #1e3a5f;
  color: #93c5fd;
  box-shadow: 0 0 12px #3b82f640, inset 0 0 0 1px #1d4ed8;
  animation: pulse-busy 2s ease-in-out infinite;
}
.agent-card.on-break {
  background: #1c1917;
  color: #78716c;
  box-shadow: inset 0 0 0 1px #44403c;
}
@keyframes pulse-busy {
  0%, 100% { box-shadow: 0 0 8px #3b82f640, inset 0 0 0 1px #1d4ed8; }
  50% { box-shadow: 0 0 18px #3b82f660, inset 0 0 0 1px #2563eb; }
}

.stats-panel {
  width: 270px;
  flex-shrink: 0;
  background: var(--surface);
  border-left: 1px solid var(--border);
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  overflow-y: auto;
}
.stat-box {
  background: var(--bg);
  border-radius: 8px;
  padding: 0.8rem;
}
.stat-box-label { font-size: 0.68rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.3rem; }
.stat-box-value { font-size: 1.4rem; font-weight: 700; font-variant-numeric: tabular-nums; }

.queue-box {
  background: var(--bg);
  border-radius: 8px;
  padding: 0.8rem;
}
.queue-header { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 0.5rem; }
.queue-label { font-size: 0.68rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; }
.queue-count { font-size: 1.4rem; font-weight: 700; color: var(--amber); }
.queue-dots { display: flex; flex-wrap: wrap; gap: 4px; min-height: 10px; }
.q-dot { width: 9px; height: 9px; background: var(--amber); border-radius: 50%; animation: blink 1.2s ease-in-out infinite; }
.q-dot:nth-child(2n) { animation-delay: 0.3s; }
.q-dot:nth-child(3n) { animation-delay: 0.6s; }
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.4} }

.activity-box { flex: 1; min-height: 0; overflow: hidden; }
.activity-box h3 { font-size: 0.68rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.5rem; }
#activity-list { list-style: none; display: flex; flex-direction: column; gap: 3px; }
.act-item {
  font-size: 0.7rem;
  padding: 4px 7px;
  border-radius: 5px;
  background: var(--surface2);
  color: var(--muted);
  border-left: 2px solid var(--border);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.act-item.arrive { border-left-color: var(--amber); color: #fcd34d; }
.act-item.answer { border-left-color: var(--green); color: #6ee7b7; }
.act-item.brk { border-left-color: #78716c; }
.act-item.abandon { border-left-color: var(--red); color: #fca5a5; }

.sim-footer {
  background: var(--surface);
  border-top: 1px solid var(--border);
  padding: 0.75rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 2.5rem;
  flex-shrink: 0;
}
.footer-stat .fs-label { font-size: 0.65rem; color: var(--muted); text-transform: uppercase; }
.footer-stat .fs-value { font-size: 1rem; font-weight: 700; font-variant-numeric: tabular-nums; }
.view-btn {
  margin-left: auto;
  background: var(--green);
  border: none;
  color: #fff;
  padding: 0.5rem 1.25rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  opacity: 0.35;
  pointer-events: none;
  transition: opacity 0.4s;
}
.view-btn.ready { opacity: 1; pointer-events: auto; }
.view-btn.ready:hover { background: #059669; }

/* ─── Screen 3: Analysis ─── */
.analysis-screen { background: var(--bg); overflow-y: auto; }
.analysis-header {
  padding: 1.25rem 2rem;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 1rem;
  background: var(--surface);
  position: sticky;
  top: 0;
  z-index: 10;
}
.analysis-header h1 { font-size: 1.35rem; font-weight: 700; }
.back-btn {
  background: var(--surface2);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 0.4rem 0.9rem;
  border-radius: 7px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: background 0.15s;
}
.back-btn:hover { background: var(--border); }
.rerun-btn {
  margin-left: auto;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border: none;
  color: #fff;
  padding: 0.4rem 1rem;
  border-radius: 7px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 1rem;
  padding: 1.5rem 2rem;
}
.sum-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.25rem;
}
.sum-card-label { font-size: 0.7rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.5rem; }
.sum-card-value { font-size: 2rem; font-weight: 800; font-variant-numeric: tabular-nums; }
.sum-card-sub { font-size: 0.72rem; color: var(--muted); margin-top: 0.3rem; }

.charts-area {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
  padding: 0 2rem 2rem;
}
.chart-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.25rem;
}
.chart-card.wide { grid-column: 1 / -1; }
.chart-card h3 { font-size: 0.72rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 1rem; }
.chart-card canvas { display: block; width: 100%; }
.chart-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 0.75rem;
  font-size: 0.7rem;
  color: var(--muted);
}
.cl-item { display: flex; align-items: center; gap: 0.35rem; }
.cl-swatch { width: 11px; height: 11px; border-radius: 3px; }

.hotspot-section {
  padding: 0 2rem 2rem;
}
.hotspot-section h2 { font-size: 0.8rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 0.75rem; }
.hotspot-table {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
}
.ht-row {
  display: grid;
  grid-template-columns: 110px 80px 90px 90px 80px 90px 1fr;
  gap: 0;
  border-bottom: 1px solid var(--border);
  font-size: 0.78rem;
}
.ht-row:last-child { border-bottom: none; }
.ht-row.header { background: var(--surface2); font-size: 0.68rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
.ht-cell { padding: 0.6rem 0.9rem; display: flex; align-items: center; }
.ht-row:not(.header):hover { background: var(--surface2); }
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
}
.badge-optimal { background: #052e16; color: var(--green); }
.badge-stressed { background: #450a0a; color: var(--red); }
.badge-elevated { background: #451a03; color: var(--amber); }
.badge-quiet { background: #0c1a4a; color: #60a5fa; }` }} />
      {/* ═══════════════════════════════════════════════════════════
     SCREEN 1 — INPUTS
═══════════════════════════════════════════════════════════ */}
<div className="screen active" id="screen-input">
  <div className="input-header">
    <h1>Contact Centre Day Simulator</h1>
    <p>Configure shift parameters to simulate a full day and forecast service levels</p>
  </div>

  <div className="input-body">
    <div className="input-card">
      <div className="input-card-icon">👥</div>
      <div className="input-card-label">Number of Agents</div>
      <div className="input-value-display" id="val-agents">15</div>
      <input type="range" id="inp-agents" min="1" max="50" defaultValue="15" />
    </div>
    <div className="input-card">
      <div className="input-card-icon">🌅</div>
      <div className="input-card-label">Shift Start</div>
      <div className="input-value-display" id="val-start">8:00 AM</div>
      <input type="range" id="inp-start" min="6" max="12" defaultValue="8" step="1" />
    </div>
    <div className="input-card">
      <div className="input-card-icon">⏰</div>
      <div className="input-card-label">Shift Length</div>
      <div className="input-value-display" id="val-shift">8 hrs</div>
      <input type="range" id="inp-shift" min="4" max="12" defaultValue="8" step="1" />
    </div>
    <div className="input-card">
      <div className="input-card-icon">☕</div>
      <div className="input-card-label">Number of Breaks</div>
      <div className="input-value-display" id="val-num-breaks">2</div>
      <input type="range" id="inp-num-breaks" min="0" max="3" defaultValue="2" step="1" />
    </div>
    <div className="input-card">
      <div className="input-card-icon">⏱</div>
      <div className="input-card-label">Break Duration (mins each)</div>
      <div className="input-value-display" id="val-break-dur">15 min</div>
      <input type="range" id="inp-break-dur" min="5" max="30" defaultValue="15" step="5" />
    </div>
    <div className="input-card">
      <div className="input-card-icon">📞</div>
      <div className="input-card-label">Expected Calls (total)</div>
      <div className="input-value-display" id="val-calls">480</div>
      <input type="range" id="inp-calls" min="50" max="2000" defaultValue="480" step="10" />
    </div>
    <div className="input-card">
      <div className="input-card-icon">🕐</div>
      <div className="input-card-label">Avg Handling Time</div>
      <div className="input-value-display" id="val-aht">4 min</div>
      <input type="range" id="inp-aht" min="1" max="20" defaultValue="4" step="1" />
    </div>
    <div className="input-card">
      <div className="input-card-icon">🎯</div>
      <div className="input-card-label">Service Target (secs to answer)</div>
      <div className="input-value-display" id="val-target">20 sec</div>
      <input type="range" id="inp-target" min="5" max="120" defaultValue="20" step="5" />
    </div>
    <div className="input-card">
      <div className="input-card-icon">🚶</div>
      <div className="input-card-label">Customer Patience (avg wait before abandoning)</div>
      <div className="input-value-display" id="val-abandon">3 min</div>
      <input type="range" id="inp-abandon" min="30" max="600" defaultValue="180" step="30" />
    </div>
  </div>

  <div className="input-footer">
    <div className="preview-card">
      <h3>Expected Call Arrival Pattern — amber bands show break windows</h3>
      <canvas id="call-preview" height="90"></canvas>
    </div>
    <button className="run-btn" id="run-btn" onClick={startSimulation}>▶ &nbsp;Run Simulation</button>
  </div>
</div>

{/* ═══════════════════════════════════════════════════════════
     SCREEN 2 — SIMULATION
═══════════════════════════════════════════════════════════ */}
<div className="screen" id="screen-simulation" style={{height: '100vh'}}>
  <div className="sim-header">
    <div>
      <div className="sim-title">Contact Centre Simulator</div>
      <div className="sim-clock" id="sim-clock">08:00</div>
    </div>
    <div className="progress-wrap">
      <div className="progress-label" id="progress-label">Shift in progress…</div>
      <div className="sim-progress"><div className="sim-progress-bar" id="sim-bar"></div></div>
    </div>
    <div className="speed-group">
      <span className="speed-label">Speed:</span>
      <button className="speed-btn" onClick={() => setSpeed(60)}>1×</button>
      <button className="speed-btn active" onClick={() => setSpeed(120)}>2×</button>
      <button className="speed-btn" onClick={() => setSpeed(300)}>5×</button>
      <button className="speed-btn" onClick={() => setSpeed(600)}>10×</button>
      <button className="speed-btn" onClick={() => setSpeed(9999)}>⚡</button>
    </div>
  </div>

  <div className="sim-body">
    <div className="agent-panel">
      <div className="agent-panel-header">
        <h2>Agent Workstations</h2>
        <div className="legend">
          <div className="legend-item"><span className="legend-dot" style={{background: '#4ade80'}}></span>Idle</div>
          <div className="legend-item"><span className="legend-dot" style={{background: '#93c5fd'}}></span>On Call</div>
          <div className="legend-item"><span className="legend-dot" style={{background: '#78716c'}}></span>On Break</div>
        </div>
      </div>
      <div id="agent-grid"></div>
    </div>

    <div className="stats-panel">
      <div className="queue-box">
        <div className="queue-header">
          <span className="queue-label">Calls Waiting</span>
          <span className="queue-count" id="stat-queue">0</span>
        </div>
        <div className="queue-dots" id="queue-dots"></div>
      </div>
      <div className="stat-box">
        <div className="stat-box-label">Calls Arrived</div>
        <div className="stat-box-value" id="stat-arrived" style={{color: 'var(--text)'}}>0</div>
      </div>
      <div className="stat-box">
        <div className="stat-box-label">Calls Answered</div>
        <div className="stat-box-value" id="stat-answered" style={{color: 'var(--green)'}}>0</div>
      </div>
      <div className="stat-box">
        <div className="stat-box-label">Calls Abandoned</div>
        <div className="stat-box-value" id="stat-abandoned" style={{color: 'var(--red)'}}>0</div>
      </div>
      <div className="stat-box">
        <div className="stat-box-label">Avg Wait (secs)</div>
        <div className="stat-box-value" id="stat-asa" style={{color: 'var(--blue)'}}>—</div>
      </div>
      <div className="stat-box">
        <div className="stat-box-label">Service Level %</div>
        <div className="stat-box-value" id="stat-sl" style={{color: 'var(--green)'}}>—</div>
      </div>
      <div className="stat-box">
        <div className="stat-box-label">Agents Busy / Available</div>
        <div className="stat-box-value" id="stat-util" style={{color: 'var(--purple)'}}>—</div>
      </div>
      <div className="activity-box">
        <h3>Recent Activity</h3>
        <ul id="activity-list"></ul>
      </div>
    </div>
  </div>

  <div className="sim-footer">
    <div className="footer-stat">
      <div className="fs-label">Total Calls</div>
      <div className="fs-value" id="footer-calls">—</div>
    </div>
    <div className="footer-stat">
      <div className="fs-label">Agents</div>
      <div className="fs-value" id="footer-agents">—</div>
    </div>
    <div className="footer-stat">
      <div className="fs-label">Service Target</div>
      <div className="fs-value" id="footer-target">—</div>
    </div>
    <button className="view-btn" id="view-btn" onClick={showAnalysis}>View Analysis →</button>
  </div>
</div>

{/* ═══════════════════════════════════════════════════════════
     SCREEN 3 — ANALYSIS
═══════════════════════════════════════════════════════════ */}
<div className="screen analysis-screen" id="screen-analysis">
  <div className="analysis-header">
    <button className="back-btn" onClick={() => { showScreen('screen-input'); drawPreview(); }}>← New Simulation</button>
    <h1>Simulation Analysis</h1>
    <button className="rerun-btn" onClick={startSimulation}>↻ Re-run</button>
  </div>

  <div className="summary-cards">
    <div className="sum-card">
      <div className="sum-card-label">Total Calls Handled</div>
      <div className="sum-card-value" id="sum-calls" style={{color: 'var(--text)'}}>—</div>
      <div className="sum-card-sub" id="sum-calls-sub"></div>
    </div>
    <div className="sum-card">
      <div className="sum-card-label">Avg Speed to Answer</div>
      <div className="sum-card-value" id="sum-asa">—</div>
      <div className="sum-card-sub" id="sum-asa-sub"></div>
    </div>
    <div className="sum-card">
      <div className="sum-card-label">Service Level</div>
      <div className="sum-card-value" id="sum-sl">—</div>
      <div className="sum-card-sub" id="sum-sl-sub"></div>
    </div>
    <div className="sum-card">
      <div className="sum-card-label">Agent Utilisation</div>
      <div className="sum-card-value" id="sum-util">—</div>
      <div className="sum-card-sub">Time on calls vs available</div>
    </div>
    <div className="sum-card">
      <div className="sum-card-label">Abandonment Rate</div>
      <div className="sum-card-value" id="sum-abandon">—</div>
      <div className="sum-card-sub" id="sum-abandon-sub"></div>
    </div>
  </div>

  <div className="charts-area">
    <div className="chart-card">
      <h3>📞 Call Volume — Calls Arriving per 30-min Interval</h3>
      <canvas id="chart-volume" height="160"></canvas>
    </div>
    <div className="chart-card">
      <h3>⏱ Average Speed to Answer — by 30-min Interval</h3>
      <canvas id="chart-asa" height="160"></canvas>
      <div className="chart-legend">
        <div className="cl-item"><span className="cl-swatch" style={{background: 'var(--green)'}}></span>Within target</div>
        <div className="cl-item"><span className="cl-swatch" style={{background: 'var(--amber)'}}></span>Elevated (&gt;target)</div>
        <div className="cl-item"><span className="cl-swatch" style={{background: 'var(--red)'}}></span>Stressed (&gt;2× target)</div>
      </div>
    </div>
    <div className="chart-card wide">
      <h3>👥 Agent Utilisation — Percentage of Available Time on Calls per 30-min Interval</h3>
      <canvas id="chart-util" height="140"></canvas>
      <div className="chart-legend">
        <div className="cl-item"><span className="cl-swatch" style={{background: 'var(--blue)'}}></span>Under-utilised (&lt;50%)</div>
        <div className="cl-item"><span className="cl-swatch" style={{background: 'var(--green)'}}></span>Optimal (50–90%)</div>
        <div className="cl-item"><span className="cl-swatch" style={{background: 'var(--amber)'}}></span>High (90–100%)</div>
        <div className="cl-item"><span className="cl-swatch" style={{background: 'var(--red)'}}></span>Over-loaded (&gt;100% demand)</div>
      </div>
    </div>
    <div className="chart-card wide">
      <h3>🚶 Abandonment Rate — % of Offered Calls Abandoned per 30-min Interval</h3>
      <canvas id="chart-abandon" height="140"></canvas>
      <div className="chart-legend">
        <div className="cl-item"><span className="cl-swatch" style={{background: 'var(--green)'}}></span>Low (&lt;5%)</div>
        <div className="cl-item"><span className="cl-swatch" style={{background: 'var(--amber)'}}></span>Elevated (5–15%)</div>
        <div className="cl-item"><span className="cl-swatch" style={{background: 'var(--red)'}}></span>High (&gt;15%)</div>
      </div>
    </div>
  </div>

  <div className="hotspot-section">
    <h2>Interval Breakdown &amp; Hotspots</h2>
    <div className="hotspot-table" id="hotspot-table">
      <div className="ht-row header">
        <div className="ht-cell">Interval</div>
        <div className="ht-cell">Calls</div>
        <div className="ht-cell">Avg Wait</div>
        <div className="ht-cell">Svc Level</div>
        <div className="ht-cell">Abandon %</div>
        <div className="ht-cell">Utilisation</div>
        <div className="ht-cell">Assessment</div>
      </div>
    </div>
  </div>
</div>
    </>
  );
}
