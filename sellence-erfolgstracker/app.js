const STORAGE_KEY = 'sellence-erfolgstracker-visits-v1';

const form = document.getElementById('visitForm');
const visitDate = document.getElementById('visitDate');
const sapNumber = document.getElementById('sapNumber');
const marketName = document.getElementById('marketName');
const craftedSkus = document.getElementById('craftedSkus');
const craftedBlock = document.getElementById('craftedBlock');
const veevDisplay = document.getElementById('veevDisplay');
const podSlots = document.getElementById('podSlots');
const deviceSlots = document.getElementById('deviceSlots');
const visitTableBody = document.getElementById('visitTableBody');
const emptyStateTemplate = document.getElementById('emptyStateTemplate');
const kpiGrid = document.getElementById('kpiGrid');
const marketInsight = document.getElementById('marketInsight');
const searchInput = document.getElementById('searchInput');
const skuTrendLabel = document.getElementById('skuTrendLabel');
const editBadge = document.getElementById('editBadge');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const saveBtn = document.getElementById('saveBtn');
const exportJsonBtn = document.getElementById('exportJsonBtn');
const importJsonInput = document.getElementById('importJsonInput');
const resetBtn = document.getElementById('resetBtn');

let visits = loadVisits();
let editId = null;

visitDate.value = formatDateInput(new Date());
toggleCraftedBlockField();
toggleVeevFields();
render();

craftedSkus.addEventListener('input', toggleCraftedBlockField);
veevDisplay.addEventListener('change', toggleVeevFields);
searchInput.addEventListener('input', renderTable);
sapNumber.addEventListener('input', handleSapInput);
cancelEditBtn.addEventListener('click', cancelEdit);
exportJsonBtn.addEventListener('click', exportBackup);
importJsonInput.addEventListener('change', importBackup);
resetBtn.addEventListener('click', resetAll);

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const craftedSkuCount = clampNumber(craftedSkus.value);
  const needsBlockQuestion = craftedSkuCount === 6;

  const entry = {
    id: editId || crypto.randomUUID(),
    visitDate: visitDate.value,
    sapNumber: normalizeSap(sapNumber.value),
    marketName: marketName.value.trim(),
    craftedSkus: craftedSkuCount,
    craftedBlock: needsBlockQuestion ? craftedBlock.value : 'nicht_relevant',
    veevDisplay: veevDisplay.value,
    podSlots: veevDisplay.value === 'ja' ? clampNumber(podSlots.value) : 0,
    deviceSlots: veevDisplay.value === 'ja' ? clampNumber(deviceSlots.value) : 0,
    createdAt: editId ? getExistingCreatedAt(editId) : new Date().toISOString()
  };

  if (!entry.sapNumber) {
    sapNumber.focus();
    return;
  }

  if (!entry.marketName) {
    marketName.focus();
    return;
  }

  if (needsBlockQuestion && !entry.craftedBlock) {
    craftedBlock.focus();
    return;
  }

  if (editId) {
    visits = visits.map((item) => item.id === editId ? entry : item);
  } else {
    visits.unshift(entry);
  }

  persist();
  cancelEdit();
  render();
});

function loadVisits() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(visits));
}

function render() {
  renderKpis();
  renderMarketInsight();
  renderTable();
  drawAllCharts();
}

function renderKpis() {
  const stats = calculateStats(visits);
  const monthStats = calculateMonthlyComparison(visits);

  const cards = [
    {
      label: 'Besuche gesamt',
      value: stats.totalVisits,
      sub: `Erfasste Märkte: ${stats.uniqueMarkets}`,
      delta: deltaBadge(monthStats.visitDelta, 'zum Vormonat')
    },
    {
      label: 'Ø MB CRAFTED SKU\'S',
      value: stats.avgCrafted.toFixed(1),
      sub: `Insgesamt ${stats.totalCrafted} SKU\'S erfasst`,
      delta: deltaBadge(monthStats.craftedDelta, 'zum Vormonat')
    },
    {
      label: 'SKUS im Block',
      value: `${stats.blockRate}%`,
      sub: `${stats.blockYes} von ${stats.blockRelevant || 0} relevanten Besuchen`,
      delta: deltaBadge(monthStats.blockDelta, 'zum Vormonat')
    },
    {
      label: 'Märkte mit VEEV Distribution',
      value: stats.veevYes,
      sub: `${stats.veevRate}% aller Besuche`,
      delta: deltaBadge(monthStats.veevDelta, 'zum Vormonat')
    },
    {
      label: 'Pods Stellplätze',
      value: stats.totalPods,
      sub: `Ø ${stats.avgPods.toFixed(1)} pro VEEV-Markt`,
      delta: deltaBadge(monthStats.podDelta, 'zum Vormonat')
    },
    {
      label: 'Geräte Stellplätze',
      value: stats.totalDevices,
      sub: `Ø ${stats.avgDevices.toFixed(1)} pro VEEV-Markt`,
      delta: deltaBadge(monthStats.deviceDelta, 'zum Vormonat')
    }
  ];

  kpiGrid.innerHTML = cards.map((card) => `
    <article class="kpi-card">
      <div class="kpi-label">${card.label}</div>
      <div class="kpi-value">${card.value}</div>
      <div class="kpi-sub">${card.sub}</div>
      ${card.delta}
    </article>
  `).join('');
}

function renderTable() {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = sortByDateDesc(visits).filter((item) => {
    if (!query) return true;
    return item.marketName.toLowerCase().includes(query) || item.sapNumber.toLowerCase().includes(query);
  });

  if (!filtered.length) {
    visitTableBody.innerHTML = '';
    visitTableBody.appendChild(emptyStateTemplate.content.cloneNode(true));
    return;
  }

  visitTableBody.innerHTML = filtered.map((item) => `
    <tr>
      <td>${formatDateGerman(item.visitDate)}</td>
      <td>${escapeHtml(item.sapNumber || '–')}</td>
      <td>${escapeHtml(item.marketName)}</td>
      <td>${escapeHtml(buildChangeSummary(item))}</td>
      <td>${item.craftedSkus}</td>
      <td>${renderCraftedBlockCell(item)}</td>
      <td>${statusPill(item.veevDisplay === 'ja')}</td>
      <td>${item.podSlots}</td>
      <td>${item.deviceSlots}</td>
      <td>
        <div class="action-buttons">
          <button class="action-btn" onclick="editVisit('${item.id}')">Bearbeiten</button>
          <button class="action-btn" onclick="deleteVisit('${item.id}')">Löschen</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function drawAllCharts() {
  const ordered = sortByDateAsc(visits);
  const labels = ordered.map((v) => shortDate(v.visitDate));
  const skuSeries = ordered.map((v) => v.craftedSkus);
  const blockCounts = [
    visits.filter((v) => v.craftedSkus === 6 && v.craftedBlock === 'ja').length,
    visits.filter((v) => v.craftedSkus === 6 && v.craftedBlock === 'nein').length,
  ];
  const veevTotals = [
    visits.reduce((sum, v) => sum + v.podSlots, 0),
    visits.reduce((sum, v) => sum + v.deviceSlots, 0),
  ];

  const trend = calculateLastTrend(ordered.map(v => v.craftedSkus));
  skuTrendLabel.textContent = trend.label;
  skuTrendLabel.style.color = trend.color;
  skuTrendLabel.style.background = trend.bg;

  drawLineChart(document.getElementById('trendChart'), labels, skuSeries, 'SKU\'S');
  drawBarChart(document.getElementById('blockChart'), ['Ja', 'Nein'], blockCounts, 'Anzahl');
  drawBarChart(document.getElementById('veevChart'), ['Pods', 'Geräte'], veevTotals, 'Stellplätze');
}

function calculateStats(data) {
  const totalVisits = data.length;
  const totalCrafted = data.reduce((sum, item) => sum + item.craftedSkus, 0);
  const blockRelevant = data.filter((item) => item.craftedSkus === 6).length;
  const blockYes = data.filter((item) => item.craftedSkus === 6 && item.craftedBlock === 'ja').length;
  const veevYesEntries = data.filter((item) => item.veevDisplay === 'ja');
  const veevYes = veevYesEntries.length;
  const totalPods = data.reduce((sum, item) => sum + item.podSlots, 0);
  const totalDevices = data.reduce((sum, item) => sum + item.deviceSlots, 0);

  return {
    totalVisits,
    totalCrafted,
    avgCrafted: totalVisits ? totalCrafted / totalVisits : 0,
    blockYes,
    blockRelevant,
    blockRate: blockRelevant ? Math.round((blockYes / blockRelevant) * 100) : 0,
    veevYes,
    veevRate: totalVisits ? Math.round((veevYes / totalVisits) * 100) : 0,
    totalPods,
    totalDevices,
    avgPods: veevYes ? totalPods / veevYes : 0,
    avgDevices: veevYes ? totalDevices / veevYes : 0,
    uniqueMarkets: new Set(data.map((item) => normalizeSap(item.sapNumber)).filter(Boolean)).size,
  };
}

function calculateMonthlyComparison(data) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const previousDate = new Date(currentYear, currentMonth - 1, 1);
  const previousMonth = previousDate.getMonth();
  const previousYear = previousDate.getFullYear();

  const current = data.filter((item) => {
    const date = new Date(item.visitDate);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });

  const previous = data.filter((item) => {
    const date = new Date(item.visitDate);
    return date.getMonth() === previousMonth && date.getFullYear() === previousYear;
  });

  const c = calculateStats(current);
  const p = calculateStats(previous);

  return {
    visitDelta: c.totalVisits - p.totalVisits,
    craftedDelta: round(c.avgCrafted - p.avgCrafted, 1),
    blockDelta: c.blockRate - p.blockRate,
    veevDelta: c.veevYes - p.veevYes,
    podDelta: c.totalPods - p.totalPods,
    deviceDelta: c.totalDevices - p.totalDevices,
  };
}

function deltaBadge(delta, suffix) {
  const dir = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  const sign = delta > 0 ? '+' : '';
  return `<div class="stat-delta ${dir}">${sign}${delta} ${suffix}</div>`;
}

function calculateLastTrend(series) {
  if (series.length < 2) return { label: 'Noch zu wenig Daten', color: 'var(--amber)', bg: 'rgba(245,201,120,0.12)' };
  const last = series[series.length - 1];
  const before = series[series.length - 2];
  const diff = last - before;
  if (diff > 0) return { label: `+${diff} zum letzten Besuch`, color: 'var(--green)', bg: 'rgba(102,227,171,0.12)' };
  if (diff < 0) return { label: `${diff} zum letzten Besuch`, color: 'var(--red)', bg: 'rgba(255,123,145,0.12)' };
  return { label: 'Keine Veränderung', color: 'var(--amber)', bg: 'rgba(245,201,120,0.12)' };
}


function toggleCraftedBlockField() {
  const field = document.getElementById('craftedBlockField');
  const enabled = clampNumber(craftedSkus.value) === 6;
  field.classList.toggle('hidden', !enabled);
  craftedBlock.disabled = !enabled;
  craftedBlock.required = enabled;
  if (!enabled) {
    craftedBlock.value = '';
  }
}

function toggleVeevFields() {
  const enabled = veevDisplay.value === 'ja';
  podSlots.disabled = !enabled;
  deviceSlots.disabled = !enabled;
  if (!enabled) {
    podSlots.value = 0;
    deviceSlots.value = 0;
  }
}

function editVisit(id) {
  const entry = visits.find((item) => item.id === id);
  if (!entry) return;

  editId = id;
  visitDate.value = entry.visitDate;
  sapNumber.value = entry.sapNumber;
  marketName.value = entry.marketName;
  craftedSkus.value = entry.craftedSkus;
  craftedBlock.value = entry.craftedBlock === 'nicht_relevant' ? '' : entry.craftedBlock;
  toggleCraftedBlockField();
  veevDisplay.value = entry.veevDisplay;
  toggleVeevFields();
  podSlots.value = entry.podSlots;
  deviceSlots.value = entry.deviceSlots;
  editBadge.classList.remove('hidden');
  cancelEditBtn.classList.remove('hidden');
  saveBtn.textContent = 'Besuch aktualisieren';
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
window.editVisit = editVisit;

function deleteVisit(id) {
  const entry = visits.find((item) => item.id === id);
  if (!entry) return;
  const ok = confirm(`Diesen Besuch wirklich löschen?\n\n${entry.marketName} · ${formatDateGerman(entry.visitDate)}`);
  if (!ok) return;
  visits = visits.filter((item) => item.id !== id);
  persist();
  if (editId === id) cancelEdit();
  render();
}
window.deleteVisit = deleteVisit;

function cancelEdit() {
  editId = null;
  form.reset();
  visitDate.value = formatDateInput(new Date());
  craftedSkus.value = 0;
  craftedBlock.value = '';
  toggleCraftedBlockField();
  veevDisplay.value = 'ja';
  podSlots.value = 0;
  deviceSlots.value = 0;
  toggleVeevFields();
  editBadge.classList.add('hidden');
  cancelEditBtn.classList.add('hidden');
  saveBtn.textContent = 'Besuch speichern';
}

function exportBackup() {
  const blob = new Blob([JSON.stringify(visits, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sellence-erfolgstracker-backup-${formatDateInput(new Date())}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importBackup(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      if (!Array.isArray(parsed)) throw new Error('Ungültiges Format');
      visits = parsed;
      persist();
      cancelEdit();
      render();
      alert('Backup erfolgreich importiert.');
    } catch {
      alert('Die Datei konnte nicht importiert werden.');
    }
    importJsonInput.value = '';
  };
  reader.readAsText(file);
}

function resetAll() {
  if (!visits.length) return;
  const ok = confirm('Wirklich alle gespeicherten Besuche löschen?');
  if (!ok) return;
  visits = [];
  persist();
  cancelEdit();
  render();
}

function drawLineChart(canvas, labels, values, unit) {
  const ctx = setupCanvas(canvas);
  if (!ctx) return;
  const { width, height } = canvas;
  clearCanvas(ctx, width, height);

  if (!values.length) {
    drawNoData(ctx, width, height);
    return;
  }

  const padding = { top: 24, right: 22, bottom: 34, left: 46 };
  const max = Math.max(...values, 4);
  const min = 0;
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    const value = Math.round(max - ((max - min) / 4) * i);
    ctx.fillStyle = 'rgba(153,171,197,0.9)';
    ctx.font = '12px Inter, sans-serif';
    ctx.fillText(String(value), 10, y + 4);
  }

  const points = values.map((value, index) => {
    const x = padding.left + (chartW / Math.max(values.length - 1, 1)) * index;
    const y = padding.top + chartH - ((value - min) / (max - min || 1)) * chartH;
    return { x, y, value };
  });

  const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
  gradient.addColorStop(0, 'rgba(83,215,255,0.35)');
  gradient.addColorStop(1, 'rgba(83,215,255,0.02)');

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cx = (prev.x + curr.x) / 2;
    ctx.quadraticCurveTo(prev.x, prev.y, cx, (prev.y + curr.y) / 2);
  }
  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
  ctx.strokeStyle = 'rgba(83,215,255,1)';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.lineTo(last.x, height - padding.bottom);
  ctx.lineTo(points[0].x, height - padding.bottom);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  points.forEach((point, index) => {
    ctx.beginPath();
    ctx.fillStyle = 'rgba(83,215,255,1)';
    ctx.arc(point.x, point.y, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(153,171,197,0.9)';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(labels[index], point.x, height - 12);
  });

  ctx.fillStyle = 'rgba(237,245,255,0.95)';
  ctx.font = 'bold 12px Inter, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(unit, width - 10, 16);
}

function drawBarChart(canvas, labels, values, unit) {
  const ctx = setupCanvas(canvas);
  if (!ctx) return;
  const { width, height } = canvas;
  clearCanvas(ctx, width, height);

  if (!values.length || values.every((v) => v === 0)) {
    drawNoData(ctx, width, height);
    return;
  }

  const padding = { top: 24, right: 24, bottom: 40, left: 34 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const max = Math.max(...values, 1);
  const barWidth = Math.min(90, chartW / labels.length * 0.55);
  const gap = chartW / labels.length;

  ctx.fillStyle = 'rgba(237,245,255,0.95)';
  ctx.font = 'bold 12px Inter, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(unit, width - 10, 16);

  values.forEach((value, index) => {
    const x = padding.left + index * gap + (gap - barWidth) / 2;
    const h = (value / max) * chartH;
    const y = padding.top + chartH - h;

    const gradient = ctx.createLinearGradient(0, y, 0, y + h);
    gradient.addColorStop(0, index % 2 === 0 ? 'rgba(130,100,255,0.95)' : 'rgba(83,215,255,0.95)');
    gradient.addColorStop(1, index % 2 === 0 ? 'rgba(130,100,255,0.35)' : 'rgba(83,215,255,0.35)');

    roundRect(ctx, x, y, barWidth, h, 18);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.fillStyle = 'rgba(237,245,255,0.95)';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(value, x + barWidth / 2, y - 8);

    ctx.fillStyle = 'rgba(153,171,197,0.9)';
    ctx.font = '12px Inter, sans-serif';
    ctx.fillText(labels[index], x + barWidth / 2, height - 14);
  });
}

function setupCanvas(canvas) {
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * ratio;
  canvas.height = rect.height * ratio;
  const ctx = canvas.getContext('2d');
  ctx.scale(ratio, ratio);
  canvas.width = rect.width;
  canvas.height = rect.height;
  return canvas.getContext('2d');
}

function clearCanvas(ctx, width, height) {
  ctx.clearRect(0, 0, width, height);
}

function drawNoData(ctx, width, height) {
  ctx.fillStyle = 'rgba(153,171,197,0.9)';
  ctx.font = '14px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Noch keine Daten vorhanden', width / 2, height / 2);
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function sortByDateDesc(data) {
  return [...data].sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate));
}
function sortByDateAsc(data) {
  return [...data].sort((a, b) => new Date(a.visitDate) - new Date(b.visitDate));
}
function clampNumber(value) {
  return Math.max(0, Number(value) || 0);
}
function shortDate(value) {
  const date = new Date(value);
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}`;
}
function formatDateGerman(value) {
  if (!value) return '–';
  const date = new Date(value);
  return date.toLocaleDateString('de-DE');
}
function formatDateInput(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function statusPill(yes) {
  return `<span class="status-pill ${yes ? 'yes' : 'no'}">${yes ? 'Ja' : 'Nein'}</span>`;
}
function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
function round(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
function getExistingCreatedAt(id) {
  return visits.find((item) => item.id === id)?.createdAt || new Date().toISOString();
}

window.addEventListener('resize', drawAllCharts);

function handleSapInput() {
  const sap = normalizeSap(sapNumber.value);
  sapNumber.value = sap;
  if (!sap) return;
  const latest = getLatestVisitBySap(sap);
  if (latest && !marketName.value.trim()) {
    marketName.value = latest.marketName;
  }
  renderMarketInsight();
}

function renderMarketInsight() {
  if (!marketInsight) return;
  const sap = normalizeSap(sapNumber.value);
  if (!sap) {
    marketInsight.innerHTML = `
      <div class="market-insight-card">
        <div class="market-insight-title">Markt-Verlauf per SAP</div>
      </div>`;
    return;
  }

  const related = sortByDateDesc(visits.filter((item) => normalizeSap(item.sapNumber) === sap));
  if (!related.length) {
    marketInsight.innerHTML = `
      <div class="market-insight-card">
        <div class="market-insight-title">Neuer Markt</div>
        <div class="market-insight-text">SAP ${escapeHtml(sap)}</div>
      </div>`;
    return;
  }

  const latest = related[0];
  const previous = related[1] || null;
  marketInsight.innerHTML = `
    <div class="market-insight-card">
      <div class="market-insight-head">
        <div>
          <div class="market-insight-title">Markt-Verlauf für SAP ${escapeHtml(sap)}</div>
          <div class="market-insight-text">${escapeHtml(latest.marketName)} · letzter Besuch am ${formatDateGerman(latest.visitDate)}</div>
        </div>
        <div class="market-insight-count">${related.length} Einträge</div>
      </div>
      <div class="market-insight-metrics">
        ${renderChangeChip("SKU'S", latest.craftedSkus, previous?.craftedSkus)}
        ${renderChangeChip('Pods', latest.podSlots, previous?.podSlots)}
        ${renderChangeChip('Geräte', latest.deviceSlots, previous?.deviceSlots)}
        ${renderCraftedBlockInsightChip(latest, previous)}
        ${renderStatusChangeChip('VEEV Distribution', latest.veevDisplay, previous?.veevDisplay)}
      </div>
    </div>`;
}


function renderCraftedBlockCell(item) {
  if (item.craftedSkus !== 6) return '–';
  return statusPill(item.craftedBlock === 'ja');
}

function renderCraftedBlockInsightChip(latest, previous) {
  if (latest.craftedSkus !== 6) {
    return `<div class="change-chip neutral"><span>SKUS im Block</span><strong>–</strong><small>Nicht relevant</small></div>`;
  }
  const previousValue = previous?.craftedSkus === 6 ? previous?.craftedBlock : undefined;
  return renderStatusChangeChip('SKUS im Block', latest.craftedBlock, previousValue);
}

function renderChangeChip(label, current, previous) {
  if (typeof previous !== 'number') {
    return `<div class="change-chip neutral"><span>${label}</span><strong>${current}</strong><small>Startwert</small></div>`;
  }
  const diff = current - previous;
  const diffLabel = diff > 0 ? `+${diff}` : String(diff);
  const cls = diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral';
  const note = diff === 0 ? 'Keine Änderung' : `${diffLabel} vs. vorher`;
  return `<div class="change-chip ${cls}"><span>${label}</span><strong>${current}</strong><small>${note}</small></div>`;
}

function renderStatusChangeChip(label, current, previous) {
  if (!previous) {
    return `<div class="change-chip neutral"><span>${label}</span><strong>${capitalize(current)}</strong><small>Startwert</small></div>`;
  }
  const changed = current !== previous;
  const cls = !changed ? 'neutral' : current === 'ja' ? 'up' : 'down';
  const note = changed ? `Vorher ${capitalize(previous)}` : 'Keine Änderung';
  return `<div class="change-chip ${cls}"><span>${label}</span><strong>${capitalize(current)}</strong><small>${note}</small></div>`;
}

function buildChangeSummary(item) {
  const previous = getPreviousVisitForEntry(item);
  if (!previous) return 'Startwert';
  const parts = [];
  const skuDiff = item.craftedSkus - previous.craftedSkus;
  if (skuDiff !== 0) parts.push(`SKU ${skuDiff > 0 ? '+' : ''}${skuDiff}`);
  const podDiff = item.podSlots - previous.podSlots;
  if (podDiff !== 0) parts.push(`Pods ${podDiff > 0 ? '+' : ''}${podDiff}`);
  const deviceDiff = item.deviceSlots - previous.deviceSlots;
  if (deviceDiff !== 0) parts.push(`Geräte ${deviceDiff > 0 ? '+' : ''}${deviceDiff}`);
  if (item.craftedSkus === 6 && previous.craftedSkus === 6 && item.craftedBlock !== previous.craftedBlock) parts.push(`Block ${capitalize(previous.craftedBlock)}→${capitalize(item.craftedBlock)}`);
  if (item.veevDisplay !== previous.veevDisplay) parts.push(`VEEV ${capitalize(previous.veevDisplay)}→${capitalize(item.veevDisplay)}`);
  return parts.length ? parts.join(' · ') : 'Keine Änderung';
}

function getLatestVisitBySap(sap) {
  return sortByDateDesc(visits.filter((item) => normalizeSap(item.sapNumber) === normalizeSap(sap)))[0] || null;
}

function getPreviousVisitForEntry(entry) {
  const related = sortByDateDesc(visits.filter((item) => normalizeSap(item.sapNumber) === normalizeSap(entry.sapNumber)));
  const index = related.findIndex((item) => item.id === entry.id);
  return index >= 0 ? related[index + 1] || null : null;
}

function normalizeSap(value) {
  return String(value || '').trim();
}

function capitalize(value) {
  const text = String(value || '');
  if (!text || text === 'nicht_relevant') return '–';
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '–';
}

