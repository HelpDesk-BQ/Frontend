import { reports, tickets, ApiError } from '../api.js';
import { requireSession, applyRoleVisibility, logout } from '../auth.js';
import { setText, statusPill, priorityPill, renderEmpty, announce, h, confirmModal } from '../ui.js';

const user = await requireSession();
if (!user) throw new Error('unreachable');
applyRoleVisibility(user);

const form = document.getElementById('filters');
const reset = document.getElementById('reset-filters');
const errorBox = document.getElementById('state-error');
const summary = document.getElementById('summary');
const emptyBox = document.getElementById('summary-empty');
const statusStats = document.getElementById('status-stats');
const priorityStats = document.getElementById('priority-stats');

for (const element of document.querySelectorAll('[data-action="logout"]')) {
  element.addEventListener('click', (event) => {
    event.preventDefault();
    confirmModal({
      title: 'Sair do sistema?',
      body: 'Você precisará entrar de novo para continuar.',
      confirmLabel: 'Sair',
      onConfirm: logout,
    });
  });
}

const STATUS_ORDER = ['open', 'analysis', 'in_progress', 'resolved', 'closed'];
const STATUS_LABELS = { open: 'Abertos', analysis: 'Em análise', in_progress: 'Em atendimento', resolved: 'Resolvidos', closed: 'Fechados' };
const PRIORITY_ORDER = ['low', 'medium', 'high', 'critical'];
const PRIORITY_LABELS = { low: 'Baixa', medium: 'Média', high: 'Alta', critical: 'Crítica' };

function statCard(number, label) {
  const card = document.createElement('div');
  card.className = 'card stat';
  const value = h('p', String(number));
  value.className = 'stat__number';
  const caption = h('p', label);
  caption.className = 'stat__label';
  card.append(value, caption);
  return card;
}

async function load() {
  errorBox.hidden = true;
  try {
    const result = await reports.summary({ status: form.status.value, priority: form.priority.value });
    statusStats.replaceChildren();
    priorityStats.replaceChildren();
    if (result.total === 0) {
      summary.hidden = true;
      emptyBox.hidden = false;
      renderEmpty(emptyBox, { title: 'Sem dados para os filtros.', actionText: 'Abrir chamado', actionHref: '/screens/novo.html' });
      announce('Resumo sem dados para os filtros.');
      return;
    }
    emptyBox.hidden = true;
    summary.hidden = false;
    for (const status of STATUS_ORDER) {
      statusStats.append(statCard(result.byStatus[status] || 0, STATUS_LABELS[status]));
    }
    for (const priority of PRIORITY_ORDER) {
      priorityStats.append(statCard(result.byPriority[priority] || 0, PRIORITY_LABELS[priority]));
    }
    setText(document.querySelector('h1'), `Dashboard (${result.total} no total)`);
    await loadRecent();
  } catch (error) {
    setText(errorBox, error instanceof ApiError ? error.message : 'Não foi possível concluir.');
    errorBox.hidden = false;
  }
}

async function loadRecent() {
  const rows = document.getElementById('recent-rows');
  rows.replaceChildren();
  const result = await tickets.list({ page: 1, limit: 8 });
  for (const item of result.items) {
    const tr = document.createElement('tr');
    const titleCell = document.createElement('td');
    titleCell.setAttribute('data-label', 'Título');
    const link = document.createElement('a');
    link.setAttribute('href', `/screens/detalhe.html?id=${encodeURIComponent(item.id)}`);
    setText(link, item.title);
    titleCell.append(link);
    const statusCell = document.createElement('td');
    statusCell.setAttribute('data-label', 'Estado');
    statusCell.append(statusPill(item.status));
    const priorityCell = document.createElement('td');
    priorityCell.setAttribute('data-label', 'Prioridade');
    priorityCell.append(priorityPill(item.priority));
    tr.append(titleCell, statusCell, priorityCell);
    rows.append(tr);
  }
}

function syncReset() {
  reset.hidden = form.status.value === '' && form.priority.value === '';
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  syncReset();
  load();
});

// Filtros aplicam sozinhos ao mudar; o botão vira "Remover filtros".
for (const select of [form.status, form.priority]) {
  select.addEventListener('change', () => {
    syncReset();
    load();
  });
}
reset.addEventListener('click', () => {
  form.status.value = '';
  form.priority.value = '';
  syncReset();
  load();
  form.status.focus();
});
syncReset();

await load();
