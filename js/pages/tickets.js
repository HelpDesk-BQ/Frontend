import { listTickets } from '../api/tickets.js';
import { mountShell, requireAuth, setApiStatus } from '../components/app-shell.js';
import { handlePageError } from '../components/guards.js';
import { showToast } from '../components/toast.js';
import { PRIORITIES, STATUS_LABELS, PRIORITY_LABELS, STATUSES } from '../config.js';
import { statusLabel, priorityLabel, formatDate, totalPages } from '../utils/format.js';

const PAGE_SIZE = 20;

function option(select, value, label) {
  const el = document.createElement('option');
  el.value = value;
  el.textContent = label;
  select.appendChild(el);
}

export function initTicketsPage() {
  const session = requireAuth();
  if (!session) return;
  mountShell({ active: 'tickets', session });
  setApiStatus('online');

  const params = new URLSearchParams(window.location.search);
  const statusFilter = document.getElementById('filter-status');
  const priorityFilter = document.getElementById('filter-priority');
  const list = document.getElementById('ticket-list');
  const meta = document.getElementById('ticket-meta');
  const prevBtn = document.getElementById('page-prev');
  const nextBtn = document.getElementById('page-next');
  const pageInfo = document.getElementById('page-info');

  option(statusFilter, '', 'Todos os estados');
  for (const s of STATUSES) option(statusFilter, s, STATUS_LABELS[s]);
  option(priorityFilter, '', 'Todas as prioridades');
  for (const p of PRIORITIES) option(priorityFilter, p, PRIORITY_LABELS[p]);

  statusFilter.value = params.get('status') || '';
  priorityFilter.value = params.get('priority') || '';
  let page = Math.max(1, Number(params.get('page')) || 1);

  async function load() {
    list.innerHTML = '<li class="muted" aria-live="polite">Carregando chamados…</li>';
    meta.textContent = '';
    try {
      const result = await listTickets(
        { status: statusFilter.value || undefined, priority: priorityFilter.value || undefined, page, limit: PAGE_SIZE },
        { onUnauthorized: () => handlePageError({ code: 'UNAUTHORIZED' }) }
      );
      render(result);
    } catch (error) {
      if (error?.code === 'UNAUTHORIZED') return;
      list.innerHTML = '';
      const li = document.createElement('li');
      li.className = 'empty';
      li.setAttribute('role', 'alert');
      li.textContent = `${error?.message || 'Falha ao carregar.'} `;
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'btn btn-secondary';
      retry.textContent = 'Tentar de novo';
      retry.addEventListener('click', load);
      li.appendChild(retry);
      list.appendChild(li);
      showToast(error?.message || 'Falha ao carregar chamados.', 'error');
    }
  }

  function render(result) {
    const items = result.items || [];
    list.innerHTML = '';
    meta.textContent =
      result.total === 0
        ? 'Nenhum chamado encontrado.'
        : `${result.total} chamado${result.total === 1 ? '' : 's'} · página ${result.page} de ${totalPages(result.total, result.limit)}`;

    if (items.length === 0) {
      const li = document.createElement('li');
      li.className = 'empty';
      li.setAttribute('role', 'status');
      const h = document.createElement('h2');
      h.textContent = 'Nada por aqui.';
      const p = document.createElement('p');
      p.textContent = 'Ajuste os filtros ou abra um novo chamado.';
      li.append(h, p);
      list.appendChild(li);
    }

    for (const ticket of items) {
      const li = document.createElement('li');
      li.className = 'ticket-row';
      const link = document.createElement('a');
      link.href = `ticket-detail.html?id=${encodeURIComponent(ticket.id)}`;
      link.className = 'ticket-row__title';
      link.textContent = ticket.title;
      const facts = document.createElement('p');
      facts.className = 'ticket-row__meta';
      const status = document.createElement('span');
      status.className = `badge badge--status-${ticket.status}`;
      status.textContent = statusLabel(ticket.status);
      const priority = document.createElement('span');
      priority.className = `badge badge--priority-${ticket.priority}`;
      priority.textContent = priorityLabel(ticket.priority);
      const date = document.createElement('time');
      date.dateTime = ticket.created_at;
      date.textContent = formatDate(ticket.created_at);
      facts.append(status, ' ', priority, ' · ', date);
      li.append(link, facts);
      list.appendChild(li);
    }

    const pages = totalPages(result.total, result.limit);
    page = result.page;
    pageInfo.textContent = `Página ${page} de ${pages}`;
    prevBtn.disabled = page <= 1;
    nextBtn.disabled = page >= pages;
  }

  function syncUrl() {
    const next = new URLSearchParams();
    if (statusFilter.value) next.set('status', statusFilter.value);
    if (priorityFilter.value) next.set('priority', priorityFilter.value);
    if (page > 1) next.set('page', String(page));
    const suffix = next.toString() ? `?${next.toString()}` : '';
    window.history.replaceState(null, '', `tickets.html${suffix}`);
  }

  statusFilter.addEventListener('change', () => { page = 1; syncUrl(); load(); });
  priorityFilter.addEventListener('change', () => { page = 1; syncUrl(); load(); });
  prevBtn.addEventListener('click', () => { if (page > 1) { page -= 1; syncUrl(); load(); } });
  nextBtn.addEventListener('click', () => { page += 1; syncUrl(); load(); });

  load();
}
