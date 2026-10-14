import { tickets, reports, ApiError } from '../api.js';
import { requireSession, applyRoleVisibility, logout } from '../auth.js';
import { initShell } from '../shell.js';
import { setText, renderEmpty, announce, confirmModal } from '../ui.js';
import { ticketRow } from '../ticket-rows.js';

const user = await requireSession();
if (!user) throw new Error('unreachable');
applyRoleVisibility(user);
initShell(user);

const form = document.getElementById('filters');
const tabs = [...document.querySelectorAll('#status-tabs .tab')];
const prioritySelect = document.getElementById('priority');
const reset = document.getElementById('reset-filters');
const lead = document.getElementById('list-lead');
const loading = document.getElementById('state-loading');
const errorBox = document.getElementById('state-error');
const emptyBox = document.getElementById('list-empty');
const wrap = document.getElementById('list-wrap');
const rows = document.getElementById('rows');
const pager = document.getElementById('pager');
const pageInfo = document.getElementById('page-info');
const prev = document.getElementById('prev');
const next = document.getElementById('next');

const LIMIT = 20;
const STATUSES = ['open', 'analysis', 'in_progress', 'resolved', 'closed'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];

// Filtros vêm da URL (?status=&priority=) — assim os cards do dashboard
// abrem a lista já filtrada — e voltam para ela a cada mudança.
const params = new URLSearchParams(window.location.search);
let status = STATUSES.includes(params.get('status')) ? params.get('status') : '';
prioritySelect.value = PRIORITIES.includes(params.get('priority')) ? params.get('priority') : '';
let page = 1;

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

function syncControls() {
  for (const tab of tabs) tab.setAttribute('aria-pressed', String(tab.dataset.status === status));
  reset.hidden = status === '' && prioritySelect.value === '';
  const query = new URLSearchParams();
  if (status) query.set('status', status);
  if (prioritySelect.value) query.set('priority', prioritySelect.value);
  const suffix = query.toString();
  window.history.replaceState(null, '', `${window.location.pathname}${suffix ? `?${suffix}` : ''}`);
}

function showOnly(name) {
  for (const [key, element] of Object.entries({ loading, error: errorBox, empty: emptyBox, list: wrap })) {
    element.hidden = key !== name;
  }
  pager.hidden = name !== 'list';
}

// Contagens das abas: um resumo com o filtro de prioridade atual.
async function loadCounts() {
  try {
    const summary = await reports.summary({ priority: prioritySelect.value });
    for (const span of document.querySelectorAll('[data-count-for]')) {
      const key = span.dataset.countFor;
      setText(span, String(key === 'all' ? summary.total : summary.byStatus[key] || 0));
    }
  } catch {
    document.querySelectorAll('[data-count-for]').forEach((span) => setText(span, ''));
  }
}

async function load() {
  showOnly('loading');
  try {
    const result = await tickets.list({ status, priority: prioritySelect.value, page, limit: LIMIT });
    rows.replaceChildren();
    setText(lead, `${result.total} ${result.total === 1 ? 'chamado' : 'chamados'}${status || prioritySelect.value ? ' com os filtros atuais' : ''}`);
    if (result.items.length === 0) {
      showOnly('empty');
      const filtered = status !== '' || prioritySelect.value !== '';
      renderEmpty(
        emptyBox,
        user.role === 'requester' && !filtered
          ? { title: 'Você ainda não abriu chamados.', actionText: 'Abrir chamado', actionHref: '/screens/novo.html' }
          : { title: 'Nenhum chamado por aqui.', actionText: 'Ver todos', actionHref: '/screens/tickets.html' }
      );
      announce('Nenhum chamado encontrado para os filtros.');
      return;
    }
    for (const item of result.items) rows.append(ticketRow(item, { user }));
    const totalPages = Math.max(1, Math.ceil(result.total / result.limit));
    setText(pageInfo, `Página ${result.page} de ${totalPages}`);
    prev.disabled = result.page <= 1;
    next.disabled = result.page >= totalPages;
    showOnly('list');
  } catch (error) {
    setText(errorBox, error instanceof ApiError ? error.message : 'Não foi possível concluir.');
    showOnly('error');
  }
}

function refresh({ counts = false } = {}) {
  page = 1;
  syncControls();
  if (counts) loadCounts();
  load();
}

for (const tab of tabs) {
  tab.addEventListener('click', () => {
    status = tab.dataset.status;
    refresh();
  });
}
prioritySelect.addEventListener('change', () => refresh({ counts: true }));
form.addEventListener('submit', (event) => {
  event.preventDefault();
  refresh();
});
reset.addEventListener('click', () => {
  status = '';
  prioritySelect.value = '';
  refresh({ counts: true });
  tabs[0].focus();
});
prev.addEventListener('click', () => {
  if (page > 1) {
    page -= 1;
    load();
  }
});
next.addEventListener('click', () => {
  page += 1;
  load();
});

syncControls();
loadCounts();
await load();
