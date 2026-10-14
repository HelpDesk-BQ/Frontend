// Linhas de tabela de chamados, compartilhadas por dashboard e lista.
// A linha inteira é clicável (o link do título continua sendo o alvo de
// teclado/leitor de tela) e ganha selos: "novo" (< 24h) e "com você"
// (técnico/admin responsável — só se a API trouxer o responsável).

import { setText, statusPill, priorityPill, timeAgo, icon, h } from './ui.js';

const DAY_MS = 24 * 3600 * 1000;

export function ticketHref(item) {
  return `/screens/detalhe.html?id=${encodeURIComponent(item.id)}`;
}

function badge(text, variant) {
  const el = h('span', text);
  el.className = `badge badge--${variant}`;
  return el;
}

function titleCell(item, user) {
  const cell = document.createElement('td');
  cell.className = 'ticket-cell';
  cell.setAttribute('data-label', 'Chamado');
  const top = document.createElement('span');
  top.className = 'ticket-cell__top';
  const link = document.createElement('a');
  link.setAttribute('href', ticketHref(item));
  setText(link, item.title);
  top.append(link);
  if (Date.now() - new Date(item.created_at).getTime() < DAY_MS) top.append(badge('novo', 'new'));
  if (user && user.role !== 'requester' && item.assignee_id && item.assignee_id === user.id) {
    top.append(badge('com você', 'mine'));
  }
  const id = h('span', `#${String(item.id).slice(0, 8)}`);
  id.className = 'ticket-cell__id';
  cell.append(top, id);
  return cell;
}

function pillCell(label, pill) {
  const td = document.createElement('td');
  td.setAttribute('data-label', label);
  td.append(pill);
  return td;
}

// "há 3 h" com a data completa no hover + seta que aparece no hover da linha.
function timeCell(item) {
  const td = document.createElement('td');
  td.className = 'cell-muted cell-time';
  td.setAttribute('data-label', 'Atualizado');
  const iso = item.updated_at || item.created_at;
  const time = document.createElement('time');
  time.setAttribute('datetime', iso);
  time.setAttribute('title', new Date(iso).toLocaleString('pt-BR'));
  setText(time, timeAgo(iso));
  td.append(time, icon('chevron-right', 'icon row-arrow'));
  return td;
}

// Clique na linha abre o chamado; Ctrl/⌘ abre em nova aba; seleção de texto
// e cliques em links/botões não são sequestrados.
function makeRowLink(tr, href) {
  tr.classList.add('is-link');
  tr.addEventListener('click', (event) => {
    if (event.target.closest('a, button, input, select, textarea')) return;
    if (window.getSelection?.().toString()) return;
    if (event.ctrlKey || event.metaKey) window.open(href, '_blank', 'noopener');
    else window.location.assign(href);
  });
}

export function ticketRow(item, { user, columns = ['status', 'priority', 'updated'] } = {}) {
  const tr = document.createElement('tr');
  tr.append(titleCell(item, user));
  for (const column of columns) {
    if (column === 'status') tr.append(pillCell('Estado', statusPill(item.status)));
    if (column === 'priority') tr.append(pillCell('Prioridade', priorityPill(item.priority)));
    if (column === 'updated') tr.append(timeCell(item));
  }
  makeRowLink(tr, ticketHref(item));
  return tr;
}
