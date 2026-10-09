import { getSummary } from '../api/reports.js';
import { mountShell, requireAuth } from '../components/app-shell.js';
import { handlePageError } from '../components/guards.js';
import { showToast } from '../components/toast.js';
import { PRIORITIES, STATUS_LABELS, PRIORITY_LABELS, STATUSES } from '../config.js';
import { priorityLabel, statusLabel } from '../utils/format.js';

export function initDashboardPage() {
  const session = requireAuth();
  if (!session) return;
  mountShell({ active: 'dashboard', session });

  const statusFilter = document.getElementById('report-status');
  const priorityFilter = document.getElementById('report-priority');
  const totalEl = document.getElementById('report-total');
  const byStatusEl = document.getElementById('report-by-status');
  const byPriorityEl = document.getElementById('report-by-priority');

  for (const [select, values, labels, all] of [
    [statusFilter, STATUSES, STATUS_LABELS, 'Todos os estados'],
    [priorityFilter, PRIORITIES, PRIORITY_LABELS, 'Todas as prioridades']
  ]) {
    const allOption = document.createElement('option');
    allOption.value = '';
    allOption.textContent = all;
    select.appendChild(allOption);
    for (const v of values) {
      const o = document.createElement('option');
      o.value = v;
      o.textContent = labels[v];
      select.appendChild(o);
    }
  }

  async function load() {
    totalEl.textContent = '…';
    byStatusEl.innerHTML = '<li class="muted">Carregando…</li>';
    byPriorityEl.innerHTML = '<li class="muted">Carregando…</li>';
    try {
      const summary = await getSummary(
        { status: statusFilter.value || undefined, priority: priorityFilter.value || undefined },
        { onUnauthorized: () => handlePageError({ code: 'UNAUTHORIZED' }) }
      );
      render(summary);
    } catch (error) {
      if (error?.code === 'UNAUTHORIZED') return;
      totalEl.textContent = '—';
      byStatusEl.innerHTML = '<li role="alert">Falha ao carregar o resumo.</li>';
      byPriorityEl.innerHTML = '';
      showToast(error?.message || 'Falha ao carregar resumo.', 'error');
    }
  }

  function barRow(label, count, max) {
    const li = document.createElement('li');
    li.className = 'meter-row';
    const name = document.createElement('span');
    name.textContent = label;
    const track = document.createElement('span');
    track.className = 'meter';
    track.setAttribute('role', 'img');
    track.setAttribute('aria-label', `${label}: ${count}`);
    const fill = document.createElement('span');
    fill.className = 'meter__fill';
    fill.style.width = max > 0 ? `${Math.round((count / max) * 100)}%` : '0%';
    track.appendChild(fill);
    const value = document.createElement('span');
    value.className = 'meter__value';
    value.textContent = String(count);
    li.append(name, track, value);
    return li;
  }

  function render(summary) {
    totalEl.textContent = String(summary.total);
    const statusEntries = STATUSES.map((s) => [statusLabel(s), summary.byStatus[s] || 0]);
    const priorityEntries = PRIORITIES.map((p) => [priorityLabel(p), summary.byPriority[p] || 0]);
    const max = Math.max(1, ...statusEntries.map(([, c]) => c), ...priorityEntries.map(([, c]) => c));
    byStatusEl.innerHTML = '';
    byPriorityEl.innerHTML = '';
    for (const [label, count] of statusEntries) byStatusEl.appendChild(barRow(label, count, max));
    for (const [label, count] of priorityEntries) byPriorityEl.appendChild(barRow(label, count, max));
  }

  statusFilter.addEventListener('change', load);
  priorityFilter.addEventListener('change', load);
  load();
}
