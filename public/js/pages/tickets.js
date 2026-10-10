import { tickets, ApiError } from '../api.js';
import { requireSession, applyRoleVisibility, logout } from '../auth.js';
import { setText, statusPill, priorityPill, renderEmpty, announce, confirmModal } from '../ui.js';

const user = await requireSession();
if (!user) throw new Error('unreachable');
applyRoleVisibility(user);

const form = document.getElementById('filters');
const loading = document.getElementById('state-loading');
const errorBox = document.getElementById('state-error');
const emptyBox = document.getElementById('list-empty');
const wrap = document.getElementById('list-wrap');
const rows = document.getElementById('rows');
const pager = document.getElementById('pager');
const pageInfo = document.getElementById('page-info');
const prev = document.getElementById('prev');
const next = document.getElementById('next');

let page = 1;
const LIMIT = 20;

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

function showOnly(name) {
  for (const [key, element] of Object.entries({ loading, error: errorBox, empty: emptyBox, list: wrap })) {
    element.hidden = key !== name;
  }
  pager.hidden = name !== 'list';
  if (name !== 'error') errorBox.hidden = true;
}

async function load() {
  showOnly('loading');
  try {
    const result = await tickets.list({ status: form.status.value, priority: form.priority.value, page, limit: LIMIT });
    rows.replaceChildren();
    if (result.items.length === 0) {
      showOnly('empty');
      renderEmpty(emptyBox, { title: 'Nenhum chamado por aqui.', actionText: 'Abrir chamado', actionHref: '/screens/novo.html' });
      announce('Nenhum chamado encontrado para os filtros.');
      return;
    }
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
    const totalPages = Math.max(1, Math.ceil(result.total / result.limit));
    setText(pageInfo, `Página ${result.page} de ${totalPages} (${result.total} no total)`);
    prev.disabled = result.page <= 1;
    next.disabled = result.page >= totalPages;
    showOnly('list');
  } catch (error) {
    setText(errorBox, error instanceof ApiError ? error.message : 'Não foi possível concluir.');
    showOnly('error');
  }
}

const reset = document.getElementById('reset-filters');

function filtersActive() {
  return form.status.value !== '' || form.priority.value !== '';
}

function syncReset() {
  reset.hidden = !filtersActive();
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  page = 1;
  syncReset();
  load();
});

// Filtros aplicam sozinhos ao mudar; o botão vira "Remover filtros".
for (const select of [form.status, form.priority]) {
  select.addEventListener('change', () => {
    page = 1;
    syncReset();
    load();
  });
}
reset.addEventListener('click', () => {
  form.status.value = '';
  form.priority.value = '';
  page = 1;
  syncReset();
  load();
  form.status.focus();
});
syncReset();
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

await load();
