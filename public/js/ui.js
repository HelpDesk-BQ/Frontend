// Utilidades de interface: só textContent (nunca innerHTML com dados),
// erros junto ao campo, foco coerente e região aria-live.

export function setText(element, text) {
  element.textContent = String(text ?? '');
}

export function h(tag, text, attrs = {}) {
  const element = document.createElement(tag);
  setText(element, text);
  for (const [key, value] of Object.entries(attrs)) {
    element.setAttribute(key, value);
  }
  return element;
}

function errorId(input) {
  return `${input.id}-error`;
}

export function fieldError(input, message) {
  clearFieldError(input);
  input.setAttribute('aria-invalid', 'true');
  const hint = document.createElement('p');
  hint.id = errorId(input);
  hint.className = 'field-error';
  setText(hint, message);
  input.setAttribute('aria-describedby', errorId(input));
  input.insertAdjacentElement('afterend', hint);
}

export function clearFieldError(input) {
  input.setAttribute('aria-invalid', 'false');
  input.removeAttribute('aria-describedby');
  document.getElementById(errorId(input))?.remove();
}

export function clearFieldErrors(form) {
  for (const input of form.querySelectorAll('[aria-invalid="true"]')) {
    clearFieldError(input);
  }
}

export function applyErrors(form, errors) {
  clearFieldErrors(form);
  let first = null;
  for (const [name, message] of Object.entries(errors)) {
    const input = form.querySelector(`[name="${name}"]`);
    if (!input) continue;
    fieldError(input, message);
    first = first || input;
  }
  // Foco coerente: primeiro campo com erro (ou região de anúncio).
  if (first) {
    first.focus();
  } else {
    announce(Object.values(errors)[0] || 'Revise os campos destacados.');
  }
}

// Botão ocupado: desabilita, mostra o spinner (CSS em [aria-busy]) e, se o
// botão tiver data-busy-label, troca o rótulo enquanto trabalha.
export function setBusy(button, busy) {
  button.disabled = busy;
  const label = button.querySelector('[data-label]') || null;
  if (busy) {
    button.setAttribute('aria-busy', 'true');
    if (button.dataset.busyLabel && label) {
      label.dataset.idle = label.textContent;
      setText(label, button.dataset.busyLabel);
    }
  } else {
    button.removeAttribute('aria-busy');
    if (label && label.dataset.idle !== undefined) {
      setText(label, label.dataset.idle);
      delete label.dataset.idle;
    }
  }
}

// Ícone do sprite /assets/icons.svg (sempre decorativo: aria-hidden).
export function icon(name, className = 'icon') {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', className);
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(ns, 'use');
  use.setAttribute('href', `/assets/icons.svg#i-${name}`);
  svg.append(use);
  return svg;
}

// Toast: aviso curto no canto, lido por leitor de tela (região polite).
const TOAST_ICON = { success: 'check', error: 'alert', info: 'info' };

export function toast(message, { tone = 'success', duration = 3800 } = {}) {
  let region = document.getElementById('toasts');
  if (!region) {
    region = document.createElement('div');
    region.id = 'toasts';
    region.className = 'toasts';
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    document.body.append(region);
  }
  const item = document.createElement('div');
  item.className = `toast toast--${tone}`;
  const text = h('span', message);
  item.append(icon(TOAST_ICON[tone] || 'info', 'icon toast__icon'), text);
  region.append(item);
  const remove = () => {
    item.classList.add('is-leaving');
    setTimeout(() => item.remove(), 250);
  };
  setTimeout(remove, duration);
  item.addEventListener('click', remove);
  return item;
}

// Recado que sobrevive a um redirecionamento (ex.: "Chamado aberto").
const FLASH_KEY = 'elo-flash';

export function flash(message, tone = 'success') {
  try {
    sessionStorage.setItem(FLASH_KEY, JSON.stringify({ message, tone }));
  } catch {
    /* sem storage: o recado se perde, a ação já foi feita */
  }
}

export function consumeFlash() {
  try {
    const saved = sessionStorage.getItem(FLASH_KEY);
    if (!saved) return null;
    sessionStorage.removeItem(FLASH_KEY);
    const { message, tone } = JSON.parse(saved);
    return toast(message, { tone });
  } catch {
    return null;
  }
}

export function announce(message) {
  let live = document.getElementById('announce');
  if (!live) {
    live = document.createElement('p');
    live.id = 'announce';
    live.className = 'sr-only';
    live.setAttribute('aria-live', 'polite');
    document.body.append(live);
  }
  setText(live, message);
}

const SVG_OPEN = '<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="8" cy="8" r="6"/></svg>';
const SVG_ANALYSIS = '<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="8" cy="8" r="6"/><path d="M8 2a6 6 0 0 1 0 12z" fill="currentColor" stroke="none"/></svg>';
const SVG_IN_PROGRESS = '<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 3l8 5-8 5z"/></svg>';
const SVG_RESOLVED = '<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8.5l3.5 3.5L13 4"/></svg>';
const SVG_CLOSED = '<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="10" height="10" rx="1"/></svg>';
const SVG_LOW = '<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 8h10"/></svg>';
const SVG_MEDIUM = '<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 13V8m5 5V3m5 10V6"/></svg>';
const SVG_HIGH = '<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13V3m0 1h8l-2 3 2 3H5"/></svg>';
const SVG_CRITICAL = '<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 2l6 11H2z"/></svg>';

const STATUS_LABELS = {
  open: [SVG_OPEN, 'Aberto'],
  analysis: [SVG_ANALYSIS, 'Em análise'],
  in_progress: [SVG_IN_PROGRESS, 'Em atendimento'],
  resolved: [SVG_RESOLVED, 'Resolvido'],
  closed: [SVG_CLOSED, 'Fechado'],
};

const PRIORITY_LABELS = {
  low: [SVG_LOW, 'Baixa'],
  medium: [SVG_MEDIUM, 'Média'],
  high: [SVG_HIGH, 'Alta'],
  critical: [SVG_CRITICAL, 'Crítica'],
};

function pill(svg, label, kind) {
  const element = document.createElement('span');
  element.className = `pill pill--${kind}`;
  const icon = document.createElement('span');
  icon.className = 'pill__symbol';
  icon.setAttribute('aria-hidden', 'true');
  // Conteúdo estático (nunca dado do usuário).
  icon.innerHTML = svg;
  const text = document.createElement('span');
  setText(text, label);
  element.append(icon, text);
  return element;
}

export function statusPill(status) {
  const [svg, label] = STATUS_LABELS[status] || ['?', status];
  return pill(svg, label, `status-${status}`);
}

export function priorityPill(priority) {
  const [svg, label] = PRIORITY_LABELS[priority] || ['?', priority];
  return pill(svg, label, `priority-${priority}`);
}

// Tempo relativo curto em pt-BR ("agora", "há 5 min", "há 3 h", "há 2 dias").
// Acima de 30 dias mostra a data. `now` é injetável para teste.
export function timeAgo(iso, now = Date.now()) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const minutes = Math.max(0, Math.round((now - then) / 60000));
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.round(hours / 24);
  if (days <= 30) return days === 1 ? 'há 1 dia' : `há ${days} dias`;
  return new Date(then).toLocaleDateString('pt-BR');
}

export function renderEmpty(container, { title, actionText, actionHref, iconName = 'inbox' }) {
  container.replaceChildren();
  const box = document.createElement('div');
  box.className = 'empty';
  const mark = document.createElement('span');
  mark.className = 'empty__icon';
  mark.append(icon(iconName));
  box.append(mark);
  const heading = document.createElement('p');
  heading.className = 'empty__title';
  setText(heading, title);
  const link = document.createElement('a');
  link.className = 'btn btn--primary';
  link.setAttribute('href', actionHref);
  setText(link, actionText);
  box.append(heading, link);
  container.append(box);
}

export const STATUS_PT = { open: 'Aberto', analysis: 'Em análise', in_progress: 'Em atendimento', resolved: 'Resolvido', closed: 'Fechado' };
export const PRIORITY_PT = { low: 'Baixa', medium: 'Média', high: 'Alta', critical: 'Crítica' };
export const EVENT_PT = {
  'status.changed': 'Estado alterado',
  'priority.changed': 'Prioridade alterada',
  'assignee.changed': 'Responsável alterado',
  'comment.added': 'Comentário adicionado',
  deleted: 'Chamado excluído',
};

function ptValue(event, value) {
  if (value === null || value === undefined) return null;
  if (event === 'status.changed' || event === 'deleted') return STATUS_PT[value] || value;
  if (event === 'priority.changed') return PRIORITY_PT[value] || value;
  return value;
}

export function historyText(item) {
  const label = EVENT_PT[item.event] || item.event;
  const before = ptValue(item.event, item.before);
  const after = ptValue(item.event, item.after);
  if (before === null && (after === null || after === undefined || after === '')) return label;
  if (before === null) return `${label}: ${after}`;
  return `${label} (${before} → ${after ?? ''})`;
}

// Painel fatal: título + causa + ações. Foco vai ao título.
export function renderFatal(container, { title, cause, actions = [] }) {
  container.replaceChildren();
  const box = document.createElement('div');
  box.className = 'empty';
  const heading = document.createElement('p');
  heading.className = 'empty__title';
  heading.setAttribute('tabindex', '-1');
  setText(heading, title);
  const causeEl = document.createElement('p');
  causeEl.className = 'form-note';
  setText(causeEl, cause);
  const row = document.createElement('div');
  row.className = 'actions-row actions-row--center';
  for (const [index, action] of actions.entries()) {
    const link = document.createElement('a');
    const primary = action.primary ?? index === 0;
    link.className = primary ? 'btn btn--primary' : 'btn btn--ghost';
    setText(link, action.label);
    if (action.href) {
      link.setAttribute('href', action.href);
    } else {
      link.setAttribute('href', '#');
      link.addEventListener('click', (event) => {
        event.preventDefault();
        action.onClick();
      });
    }
    row.append(link);
  }
  box.append(heading, causeEl, row);
  container.append(box);
  heading.focus();
  return box;
}

// Modal de confirmação acessível: foco preso, Esc fecha.
export function confirmModal({ title, body, confirmLabel, onConfirm }) {
  const previousFocus = document.activeElement;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const dialog = document.createElement('div');
  dialog.className = 'modal';
  dialog.setAttribute('role', 'alertdialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'modal-title');
  const heading = document.createElement('h2');
  heading.id = 'modal-title';
  setText(heading, title);
  const text = document.createElement('p');
  setText(text, body);
  const row = document.createElement('div');
  row.className = 'actions-row';
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'btn btn--ghost';
  setText(cancel, 'Cancelar');
  const confirm = document.createElement('button');
  confirm.type = 'button';
  confirm.className = 'btn btn--danger';
  setText(confirm, confirmLabel);
  row.append(cancel, confirm);
  dialog.append(heading, text, row);
  overlay.append(dialog);
  document.body.append(overlay);

  function close() {
    overlay.remove();
    document.removeEventListener('keydown', onKey, true);
    if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
  }
  function onKey(event) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      close();
    }
    if (event.key === 'Tab') {
      const focusables = [cancel, confirm];
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }
  overlay.addEventListener('mousedown', (event) => {
    if (event.target === overlay) close();
  });
  cancel.addEventListener('click', close);
  confirm.addEventListener('click', () => {
    close();
    onConfirm();
  });
  document.addEventListener('keydown', onKey, true);
  confirm.focus();
  return close;
}

// Contador de caracteres sob o campo (10–100, 30–5000, 1–1000).
export function charCounter(input, max) {
  const counter = document.createElement('p');
  counter.className = 'char-counter form-note';
  counter.setAttribute('aria-live', 'off');
  function update() {
    setText(counter, `${input.value.length}/${max}`);
  }
  input.insertAdjacentElement('afterend', counter);
  input.addEventListener('input', update);
  update();
  return counter;
}

export async function copySupportCode(code) {
  try {
    await navigator.clipboard.writeText(code);
  } catch {
    const area = document.createElement('textarea');
    setText(area, code);
    document.body.append(area);
    area.select();
    if (typeof document.execCommand === 'function') document.execCommand('copy');
    area.remove();
  }
  announce('Código de suporte copiado.');
}
