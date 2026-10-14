import { reports, tickets, ApiError } from '../api.js';
import { requireSession, applyRoleVisibility, logout } from '../auth.js';
import { initShell } from '../shell.js';
import { setText, renderEmpty, announce, h, confirmModal } from '../ui.js';
import { ticketRow } from '../ticket-rows.js';

// Dashboard por papel, só com endpoints que já existem:
// - técnico/admin: "precisa de atenção", fluxo por estado, fila dos mais
//   urgentes e ativos por prioridade (resumo + listagem);
// - solicitante: chamada para abrir chamado + os seus em andamento.

const user = await requireSession();
if (!user) throw new Error('unreachable');
applyRoleVisibility(user);
initShell(user);

const errorBox = document.getElementById('state-error');
const emptyBox = document.getElementById('dash-empty');
const lead = document.getElementById('dash-lead');

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
const PRIORITY_ORDER = ['critical', 'high', 'medium', 'low'];
const PRIORITY_LABELS = { low: 'Baixa', medium: 'Média', high: 'Alta', critical: 'Crítica' };
const ACTIVE = new Set(['open', 'analysis', 'in_progress', 'resolved']);
const LIST_LIMIT = 100;

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function setAttention(id, value, alert) {
  const card = document.getElementById(id);
  setText(card.querySelector('[data-value]'), String(value));
  card.classList.toggle('is-alert', alert && Number(value) > 0);
}

/* ---------- Técnico e admin ---------- */

function renderPipeline(byStatus) {
  const list = document.getElementById('pipeline');
  list.replaceChildren();
  for (const status of STATUS_ORDER) {
    const count = byStatus[status] || 0;
    const li = document.createElement('li');
    li.className = `pipeline__step${status === 'closed' ? ' pipeline__step--done' : ''}`;
    // Largura proporcional à quantidade, com um mínimo para caber o rótulo.
    li.style.flexGrow = String(Math.max(count, 1));
    const link = document.createElement('a');
    link.setAttribute('href', `/screens/tickets.html?status=${status}`);
    link.setAttribute('aria-label', `${STATUS_LABELS[status]}: ${count}`);
    const number = h('span', String(count));
    number.className = 'pipeline__count';
    const label = h('span', STATUS_LABELS[status]);
    label.className = 'pipeline__label';
    link.append(number, label);
    li.append(link);
    list.append(li);
  }
}

function renderPriorityBars(activeByPriority) {
  const box = document.getElementById('prio-bars');
  box.replaceChildren();
  const max = Math.max(1, ...PRIORITY_ORDER.map((p) => activeByPriority[p] || 0));
  for (const priority of PRIORITY_ORDER) {
    const count = activeByPriority[priority] || 0;
    const row = document.createElement('div');
    row.className = `prio-bar prio-bar--${priority}`;
    const term = h('dt', PRIORITY_LABELS[priority]);
    const track = document.createElement('dd');
    track.className = 'prio-bar__track';
    const fill = document.createElement('span');
    fill.className = 'prio-bar__fill';
    // Começa em 0 e cresce no próximo quadro (transição do CSS).
    requestAnimationFrame(() => requestAnimationFrame(() => (fill.style.width = `${(count / max) * 100}%`)));
    track.append(fill);
    const value = h('dd', String(count));
    value.className = 'prio-bar__count';
    row.append(term, track, value);
    box.append(row);
  }
}

async function renderQueue() {
  const [critical, high] = await Promise.all([
    tickets.list({ priority: 'critical', limit: 20 }),
    tickets.list({ priority: 'high', limit: 20 }),
  ]);
  const urgent = [...critical.items, ...high.items]
    .filter((t) => t.status !== 'closed' && t.status !== 'resolved')
    .slice(0, 5);
  const rows = document.getElementById('queue-rows');
  rows.replaceChildren();
  document.getElementById('queue-wrap').hidden = urgent.length === 0;
  document.getElementById('queue-empty').hidden = urgent.length > 0;
  for (const item of urgent) rows.append(ticketRow(item, { user }));
}

// "Sem responsável" depende de a listagem trazer assignee_id; se não trouxer,
// o card some em vez de mostrar um número errado.
async function renderUnassigned() {
  const card = document.getElementById('att-unassigned');
  try {
    const result = await tickets.list({ status: 'open', limit: LIST_LIMIT });
    if (result.items.length > 0 && !result.items.some((t) => 'assignee_id' in t)) {
      card.hidden = true;
      return;
    }
    const count = result.items.filter((t) => !t.assignee_id).length;
    setAttention('att-unassigned', result.total > result.items.length ? `${count}+` : count, true);
  } catch {
    card.hidden = true;
  }
}

async function loadStaff() {
  const [all, closed] = await Promise.all([reports.summary(), reports.summary({ status: 'closed' })]);
  if (all.total === 0) {
    showEmpty('Ainda não há chamados.', 'Quando alguém abrir um chamado, ele aparece aqui.');
    return;
  }
  const activeByPriority = {};
  for (const p of PRIORITY_ORDER) {
    activeByPriority[p] = (all.byPriority[p] || 0) - (closed.byPriority?.[p] || 0);
  }
  const active = all.total - (all.byStatus.closed || 0);
  setText(lead, `${plural(active, 'chamado ativo', 'chamados ativos')} · ${all.total} no total`);

  setAttention('att-critical', activeByPriority.critical, true);
  setAttention('att-resolved', all.byStatus.resolved || 0, false);
  renderPipeline(all.byStatus);
  renderPriorityBars(activeByPriority);
  document.getElementById('staff-view').hidden = false;
  await Promise.all([renderUnassigned(), renderQueue()]);
}

/* ---------- Solicitante ---------- */

async function loadRequester() {
  setText(document.getElementById('dash-title'), `Olá, ${(user.name || '').split(' ')[0] || 'bem-vindo'}`);
  const result = await tickets.list({ page: 1, limit: 20 });
  const mine = result.items.filter((t) => ACTIVE.has(t.status));
  setText(
    lead,
    result.total === 0 ? 'Você ainda não abriu nenhum chamado.' : `${plural(mine.length, 'chamado em andamento', 'chamados em andamento')} · ${result.total} no total`
  );
  const rows = document.getElementById('mine-rows');
  rows.replaceChildren();
  document.getElementById('mine-wrap').hidden = mine.length === 0;
  document.getElementById('mine-empty').hidden = mine.length > 0;
  for (const item of mine.slice(0, 6)) rows.append(ticketRow(item, { user, columns: ['status', 'updated'] }));
  document.getElementById('requester-view').hidden = false;
}

function showEmpty(title, note) {
  emptyBox.hidden = false;
  renderEmpty(emptyBox, { title, actionText: 'Ver chamados', actionHref: '/screens/tickets.html' });
  const p = h('p', note);
  p.className = 'form-note';
  emptyBox.querySelector('.empty')?.insertBefore(p, emptyBox.querySelector('.empty a'));
  announce(title);
}

try {
  if (user.role === 'requester') await loadRequester();
  else await loadStaff();
} catch (error) {
  setText(errorBox, error instanceof ApiError ? error.message : 'Não foi possível concluir.');
  errorBox.hidden = false;
} finally {
  document.getElementById('dash-skeleton').hidden = true;
  document.getElementById('dash-loading').hidden = true;
}
