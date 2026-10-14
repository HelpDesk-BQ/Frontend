// Casca do app: barra lateral (logo, rotas, usuário) + barra do topo.
// O HTML da casca é estático em cada tela; aqui só preenchemos o usuário,
// trocamos os rótulos para o solicitante, mostramos a contagem de ativos e
// ligamos o menu do mobile. Nenhuma chamada nova à API além do resumo.

import { reports } from './api.js';
import { setText, consumeFlash } from './ui.js';

const ROLE_PT = { admin: 'Administrador', technician: 'Técnico', requester: 'Solicitante' };

function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts.at(-1)[0] : '')).toUpperCase();
}

function fillUser(user) {
  const name = user.name || user.email || 'Usuário';
  document.querySelectorAll('[data-shell-name]').forEach((el) => setText(el, name));
  document.querySelectorAll('[data-shell-email]').forEach((el) => setText(el, user.email || ''));
  document.querySelectorAll('[data-shell-role]').forEach((el) => setText(el, ROLE_PT[user.role] || user.role));
  document.querySelectorAll('[data-shell-initials]').forEach((el) => setText(el, initials(name)));
}

// Solicitante vê "Início" e "Meus chamados" (data-label-requester).
function applyRoleLabels(user) {
  if (user.role !== 'requester') return;
  document.querySelectorAll('[data-label-requester]').forEach((el) => setText(el, el.dataset.labelRequester));
}

// Contagem de chamados ativos (não fechados) ao lado de "Chamados".
async function fillActiveCount() {
  const badge = document.querySelector('[data-shell-count]');
  if (!badge) return;
  try {
    const summary = await reports.summary();
    const active = summary.total - (summary.byStatus?.closed || 0);
    if (active > 0) {
      setText(badge, String(active));
      badge.setAttribute('aria-label', `${active} ativos`);
      badge.hidden = false;
    }
  } catch {
    /* a contagem é só um extra; sem ela a navegação segue igual */
  }
}

function initDrawer() {
  const shell = document.querySelector('.app-shell');
  const toggle = document.querySelector('.app-top__menu');
  const sidebar = document.getElementById('sidebar');
  if (!shell || !toggle || !sidebar) return;
  shell.setAttribute('data-js', '');
  toggle.hidden = false;
  requestAnimationFrame(() => requestAnimationFrame(() => shell.setAttribute('data-drawer-ready', '')));

  const backdrop = document.createElement('div');
  backdrop.className = 'sidebar-backdrop';
  shell.append(backdrop);

  const setOpen = (open) => {
    shell.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  };

  toggle.addEventListener('click', () => setOpen(!shell.classList.contains('is-open')));
  backdrop.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && shell.classList.contains('is-open')) {
      setOpen(false);
      toggle.focus();
    }
  });
}

// Barra fina no topo enquanto houver requisição em curso (eventos do api.js).
// Só aparece se a espera passar de 150ms, para não piscar em respostas rápidas.
function initProgress() {
  const bar = document.createElement('div');
  bar.className = 'app-progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.append(bar);
  let pending = 0;
  let timer = 0;
  window.addEventListener('elo:request', (event) => {
    pending = Math.max(0, pending + event.detail);
    clearTimeout(timer);
    if (pending > 0) {
      timer = setTimeout(() => bar.classList.add('is-active'), 150);
    } else {
      bar.classList.remove('is-active');
    }
  });
}

export function initShell(user) {
  fillUser(user);
  applyRoleLabels(user);
  initDrawer();
  initProgress();
  fillActiveCount();
  consumeFlash();
}
