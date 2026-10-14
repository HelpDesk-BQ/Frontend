import { tickets, users, ApiError } from '../api.js';
import { requireSession, applyRoleVisibility, logout } from '../auth.js';
import { initShell } from '../shell.js';
import {
  setText,
  statusPill,
  priorityPill,
  applyErrors,
  fieldError,
  setBusy,
  announce,
  h,
  historyText,
  renderFatal,
  confirmModal,
  charCounter,
  copySupportCode,
  STATUS_PT,
  toast,
  flash,
  icon,
} from '../ui.js';
import { validateComment, validateJustification, validateStatusChange } from '../validators.js';
import { nextStates } from '../transitions.js';

const user = await requireSession();
if (!user) throw new Error('unreachable');
applyRoleVisibility(user);
initShell(user);

const id = new URLSearchParams(window.location.search).get('id');
const title = document.getElementById('ticket-title');
const errorBox = document.getElementById('state-error');
const detail = document.getElementById('detail');
const fatalBox = document.getElementById('fatal');
const skeleton = document.getElementById('detail-skeleton');
const copyButton = document.getElementById('copy-id');
let current = null;

copyButton?.addEventListener('click', async () => {
  if (!current) return;
  try {
    await navigator.clipboard.writeText(current.id);
    toast('ID do chamado copiado.', { tone: 'info' });
  } catch {
    toast('Não foi possível copiar. Selecione o ID e copie manualmente.', { tone: 'error' });
  }
});

// Botões de atalho para o próximo estado: só preenchem o formulário
// (o salvar continua explícito), e levam o foco ao comentário quando ele
// importa (resolver/fechar).
const NEXT_STEP = {
  analysis: ['Iniciar análise', 'arrow-right'],
  in_progress: ['Iniciar atendimento', 'arrow-right'],
  resolved: ['Marcar como resolvido', 'check'],
  closed: ['Fechar chamado', 'check-square'],
};

function renderNextSteps(from) {
  const box = document.getElementById('next-steps');
  if (!box) return;
  const buttons = box.querySelector('.next-steps__buttons');
  buttons.replaceChildren();
  const options = nextStates(from);
  box.hidden = options.length === 0;
  for (const next of options) {
    const [label, iconName] = NEXT_STEP[next] || [STATUS_PT[next] || next, 'arrow-right'];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn--secondary btn--small next-step';
    button.setAttribute('aria-pressed', 'false');
    button.append(icon(iconName, 'btn__icon'), h('span', from === 'resolved' && next === 'in_progress' ? 'Reabrir atendimento' : label));
    button.addEventListener('click', () => {
      const select = document.getElementById('status');
      select.value = next;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      for (const other of buttons.children) other.setAttribute('aria-pressed', String(other === button));
      const target = next === 'resolved' || next === 'closed' ? document.getElementById('comment') : document.getElementById('manage-submit');
      target.focus();
    });
    buttons.append(button);
  }
  // Escolher no select também reflete nos atalhos.
  document.getElementById('status').onchange = (event) => {
    for (const other of buttons.children) other.setAttribute('aria-pressed', 'false');
    const index = options.indexOf(event.target.value);
    if (index >= 0) buttons.children[index].setAttribute('aria-pressed', 'true');
  };
}

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

function fail(error) {
  const message = error instanceof ApiError ? error.message : 'Não foi possível concluir.';
  errorBox.replaceChildren();
  const text = h('p', message);
  errorBox.append(text);
  // Erro 500 traz código de suporte para o atendimento.
  if (error instanceof ApiError && error.code === 'INTERNAL_ERROR' && error.correlationId) {
    const code = h('p', `Código de suporte: ${error.correlationId}`);
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'btn btn--small';
    setText(copy, 'Copiar código');
    copy.addEventListener('click', () => copySupportCode(error.correlationId));
    errorBox.append(code, copy);
  }
  errorBox.hidden = false;
  skeleton.hidden = true;
  announce(message);
}

function fatal(titleText, cause, actions) {
  detail.hidden = true;
  skeleton.hidden = true;
  errorBox.hidden = true;
  setText(title, titleText);
  fatalBox.hidden = false;
  renderFatal(fatalBox, { title: titleText, cause, actions });
}

function initWithoutId() {
  fatal('Chamado não informado', 'Volte à lista e escolha um chamado para ver o detalhe.', [
    { label: 'Voltar à lista', href: '/screens/tickets.html' },
    { label: 'Abrir chamado', href: '/screens/novo.html', primary: false },
  ]);
}

async function initWithId() {
  await reload();
}

async function reload() {
  try {
    const ticket = await tickets.get(id);
    current = ticket;
    setText(title, ticket.title);
    document.title = `${ticket.title} — Elo`;
    document.getElementById('ticket-status').replaceChildren(statusPill(ticket.status));
    document.getElementById('ticket-priority').replaceChildren(priorityPill(ticket.priority));
    const created = new Date(ticket.created_at).toLocaleString('pt-BR');
    const updated = new Date(ticket.updated_at).toLocaleString('pt-BR');
    setText(document.getElementById('ticket-meta'), `#${ticket.id.slice(0, 8)} · criado em ${created} · atualizado em ${updated}`);
    setText(document.getElementById('ticket-description'), ticket.description);
    fillStatusOptions(ticket.status);
    renderNextSteps(ticket.status);
    document.getElementById('priority').value = ticket.priority;
    skeleton.hidden = true;
    detail.hidden = false;
    if (copyButton) copyButton.hidden = false;
    syncDeleteButton();
    await Promise.all([loadComments(), loadHistory(), loadAssignees(ticket)]);
  } catch (error) {
    if (error instanceof ApiError && (error.code === 'NOT_FOUND' || error.status === 404)) {
      fatal('Chamado não encontrado.', 'Pode ter sido excluído. Volte à lista ou abra um novo.', [
        { label: 'Voltar à lista', href: '/screens/tickets.html' },
        { label: 'Abrir chamado', href: '/screens/novo.html', primary: false },
      ]);
      return;
    }
    if (error instanceof ApiError && error.code === 'FORBIDDEN') {
      fatal('Sem acesso a este chamado.', 'Se você precisa dele, peça a um administrador.', [
        { label: 'Voltar à lista', href: '/screens/tickets.html' },
      ]);
      return;
    }
    setText(title, 'Não foi possível carregar');
    fail(error);
    console.error(error);
  }
}

function fillStatusOptions(current) {
  const select = document.getElementById('status');
  select.replaceChildren();
  const placeholder = document.createElement('option');
  placeholder.value = '';
  setText(placeholder, 'Selecione o próximo estado…');
  select.append(placeholder);
  for (const next of nextStates(current)) {
    const option = document.createElement('option');
    option.value = next;
    setText(option, STATUS_PT[next] || next);
    select.append(option);
  }
  setText(
    document.getElementById('current-state-hint'),
    `Estado atual: ${STATUS_PT[current] || current}.`
  );
  const terminal = nextStates(current).length === 0;
  document.getElementById('no-transitions').hidden = !terminal;
  // Sem transições (closed): esconde só estado + comentário da transição;
  // prioridade e responsável continuam editáveis para admin.
  const selectField = select.closest('.field');
  if (selectField) selectField.hidden = terminal;
  const commentField = document.getElementById('comment')?.closest('.field');
  if (commentField) commentField.hidden = terminal;
}

async function loadAssignees(ticket) {
  const select = document.getElementById('assignee');
  if (!select || (user.role !== 'technician' && user.role !== 'admin')) return;
  try {
    const technicians = await users.list('technician');
    select.replaceChildren();
    const empty = document.createElement('option');
    empty.value = '';
    setText(empty, 'Sem responsável');
    select.append(empty);
    const seen = new Set(['']);
    if (ticket.assignee_id) {
      const current = document.createElement('option');
      current.value = ticket.assignee_id;
      setText(current, 'Responsável atual');
      select.append(current);
      seen.add(ticket.assignee_id);
    }
    for (const person of technicians) {
      if (seen.has(person.id)) continue;
      const option = document.createElement('option');
      option.value = person.id;
      setText(option, `${person.name} (${person.email})`);
      select.append(option);
    }
    select.value = ticket.assignee_id || '';
    // Leitura do responsável atual no cabeçalho (só quem pode listar vê).
    const row = document.getElementById('ticket-assignee-row');
    const match = technicians.find((person) => person.id === ticket.assignee_id);
    if (ticket.assignee_id) {
      setText(document.getElementById('ticket-assignee'), match ? match.name : 'Definido');
      row.hidden = false;
    } else {
      row.hidden = true;
    }
  } catch {
    select.disabled = true;
  }
}

async function loadComments() {
  const box = document.getElementById('comments');
  box.replaceChildren();
  try {
    const items = await tickets.listComments(id);
    if (items.length === 0) {
      const empty = h('p', 'Ainda sem comentários.');
      empty.className = 'form-note';
      box.append(empty);
      return;
    }
    for (const item of items) {
      const div = document.createElement('div');
      div.className = 'comment';
      const body = h('p', item.body);
      const meta = h('small', new Date(item.created_at).toLocaleString('pt-BR'));
      meta.className = 'form-note';
      div.append(body, meta);
      box.append(div);
    }
  } catch (error) {
    box.append(h('p', error instanceof ApiError ? error.message : 'Não foi possível concluir.'));
  }
}

async function loadHistory() {
  const list = document.getElementById('history');
  list.replaceChildren();
  try {
    const items = await tickets.listHistory(id);
    if (items.length === 0) {
      const empty = h('li', 'Este ticket não possui nenhuma mudança anterior.');
      empty.className = 'form-note';
      list.append(empty);
      return;
    }
    for (const item of items) {
      const li = document.createElement('li');
      const strong = h('strong', historyText(item));
      const time = document.createElement('time');
      time.setAttribute('dateTime', item.created_at);
      setText(time, new Date(item.created_at).toLocaleString('pt-BR'));
      li.append(strong, document.createElement('br'), time);
      list.append(li);
    }
  } catch (error) {
    list.append(h('li', error instanceof ApiError ? error.message : 'Não foi possível concluir.'));
  }
}

const manageForm = document.getElementById('manage-form');
const manageError = document.getElementById('manage-error');

function manageFail(message, focusTarget) {
  setText(manageError, message);
  manageError.hidden = false;
  (focusTarget || manageForm.status).focus();
}

manageForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  setText(manageError, '');
  manageError.hidden = true;
  const status = manageForm.status.value || null;
  const comment = manageForm.comment.value?.trim() ? manageForm.comment.value.trim() : undefined;
  const priority = manageForm.priority.value;
  const assignee = manageForm.assignee.value?.trim() ? manageForm.assignee.value.trim() : null;
  const wantsStatus = status !== null;
  const wantsPriority = priority !== current.priority;
  const wantsAssignee = assignee !== (current.assignee_id || null);
  if (!wantsStatus && !wantsPriority && !wantsAssignee) {
    manageFail('Nada para salvar. Mude o estado, a prioridade ou o responsável.', manageForm.status);
    return;
  }
  if (wantsStatus) {
    const errors = validateStatusChange({ status, comment });
    if (Object.keys(errors).length > 0) {
      applyErrors(manageForm, errors);
      return;
    }
  }
  const button = document.getElementById('manage-submit');
  setBusy(button, true);
  const done = [];
  try {
    if (wantsStatus) {
      await tickets.changeStatus(id, comment === undefined ? { status } : { status, comment });
      done.push('estado atualizado');
    }
    if (wantsPriority) {
      const result = await tickets.changePriority(id, priority);
      done.push(result.changed ? 'prioridade atualizada' : 'prioridade já estava assim');
    }
    if (wantsAssignee) {
      const result = await tickets.changeAssignee(id, assignee);
      done.push(result.changed ? 'responsável atualizado' : 'responsável já estava assim');
    }
    manageForm.comment.value = '';
    manageForm.status.value = '';
    toast(`Mudanças salvas: ${done.join(', ')}.`);
    await reload();
  } catch (error) {
    // 409 (transição inválida, comentário exigido) volta ao formulário, não fatal.
    manageFail(error instanceof ApiError ? error.message : 'Não foi possível concluir.', manageForm.status);
  } finally {
    setBusy(button, false);
  }
});

document.getElementById('comment-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target;
  const errors = validateComment({ body: form.body.value });
  if (Object.keys(errors).length > 0) {
    applyErrors(form, errors);
    return;
  }
  const button = document.getElementById('comment-submit');
  setBusy(button, true);
  try {
    await tickets.addComment(id, form.body.value.trim());
    form.body.value = '';
    toast('Comentário enviado.');
    await Promise.all([loadComments(), loadHistory()]);
  } catch (error) {
    fail(error);
  } finally {
    setBusy(button, false);
  }
});
charCounter(document.getElementById('body'), 1000);
charCounter(document.getElementById('comment'), 1000);
charCounter(document.getElementById('justification'), 1000);

const deleteButton = document.getElementById('delete-submit');
const confirmInput = document.getElementById('confirm-title');

function syncDeleteButton() {
  deleteButton.disabled = !current || confirmInput.value.trim() !== current.title;
}
confirmInput?.addEventListener('input', syncDeleteButton);

document.getElementById('delete-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target;
  const errors = validateJustification({ justification: form.justification.value });
  if (confirmInput.value.trim() !== current.title) {
    errors.confirmTitle = 'Digite o nome do chamado exatamente como acima para confirmar.';
  }
  if (Object.keys(errors).length > 0) {
    // Erro da confirmação aparece junto ao campo (sem name correspondente no form).
    const known = Object.fromEntries(Object.entries(errors).filter(([name]) => name !== 'confirmTitle'));
    applyErrors(form, known);
    if (errors.confirmTitle) {
      fieldError(confirmInput, errors.confirmTitle);
      confirmInput.focus();
    }
    return;
  }
  const button = document.getElementById('delete-submit');
  setBusy(button, true);
  try {
    await tickets.remove(id, form.justification.value.trim());
    flash('Chamado excluído e registrado na auditoria.');
    window.location.assign('/screens/tickets.html');
  } catch (error) {
    fail(error);
  } finally {
    setBusy(button, false);
  }
});

// Inicialização por último: o top-level await pararia a avaliação do módulo
// e deixaria as consts acima em zona morta (TDZ) durante o reload.
if (!id) {
  initWithoutId();
} else {
  await initWithId();
}
