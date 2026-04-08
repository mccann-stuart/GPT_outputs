'use strict';

let simParams = null;
let simPlayback = null;
let simAnalysis = null;
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

  if (_previewData) {
    renderPreviewCanvas(params, _previewData);
  }

  if (_previewTimer) {
    clearTimeout(_previewTimer);
  }
  _previewTimer = setTimeout(async () => {
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
        _previewData = await res.json();
        renderPreviewCanvas(getParams(), _previewData);
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
