import {
  getTicket,
  changeTicketStatus,
  changeTicketPriority,
  changeTicketAssignee,
  addTicketComment,
  listTicketComments,
  listTicketHistory,
  removeTicket
} from '../api/tickets.js';
import { mountShell, requireAuth } from '../components/app-shell.js';
import { canWriteTicket, handlePageError, isAdmin, ticketIdFromQuery } from '../components/guards.js';
import { showToast, showFieldError, clearFieldError } from '../components/toast.js';
import { ALLOWED_TRANSITIONS } from '../config.js';
import { statusLabel, priorityLabel, formatDateTime, historyLabel, historyDetail } from '../utils/format.js';
import { validateCommentInput, validateJustificationInput, validateStatusInput } from '../utils/validators.js';

export function initTicketDetailPage() {
  const session = requireAuth();
  if (!session) return;
  mountShell({ active: 'tickets', session });

  const id = ticketIdFromQuery();
  const root = document.getElementById('ticket-detail');
  if (!id) {
    handlePageError({ message: 'Chamado não informado.' }, { container: root });
    return;
  }

  const opts = { onUnauthorized: () => handlePageError({ code: 'UNAUTHORIZED' }) };
  const writer = canWriteTicket(session.user);
  const admin = isAdmin(session.user);

  boot();

  async function boot() {
    root.innerHTML = '<p class="muted" aria-live="polite">Carregando chamado…</p>';
    try {
      const ticket = await getTicket(id, opts);
      const [commentsRes, historyRes] = await Promise.allSettled([
        listTicketComments(id, opts),
        listTicketHistory(id, opts)
      ]);
      render(ticket, {
        comments: commentsRes.status === 'fulfilled' ? commentsRes.value : null,
        history: historyRes.status === 'fulfilled' ? historyRes.value : null
      });
    } catch (error) {
      handlePageError(error, { container: root });
    }
  }

  function definition(label, value) {
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value;
    return [dt, dd];
  }

  function render(ticket, { comments, history }) {
    root.innerHTML = '';

    const eyebrow = document.createElement('p');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent = `Chamado · ${ticket.id.slice(0, 8)}`;
    const title = document.createElement('h1');
    title.textContent = ticket.title;
    const badges = document.createElement('p');
    const statusBadge = document.createElement('span');
    statusBadge.className = `badge badge--status-${ticket.status}`;
    statusBadge.textContent = statusLabel(ticket.status);
    const priorityBadge = document.createElement('span');
    priorityBadge.className = `badge badge--priority-${ticket.priority}`;
    priorityBadge.textContent = priorityLabel(ticket.priority);
    badges.append(statusBadge, ' ', priorityBadge);

    const desc = document.createElement('p');
    desc.className = 'lede';
    desc.textContent = ticket.description;

    const dl = document.createElement('dl');
    dl.className = 'definition-list';
    dl.append(
      ...definition('Aberto em', formatDateTime(ticket.created_at)),
      ...definition('Atualizado em', formatDateTime(ticket.updated_at)),
      ...definition('Responsável', ticket.assignee_id ? ticket.assignee_id : 'Sem responsável')
    );

    root.append(eyebrow, title, badges, desc, dl);

    if (writer) {
      root.appendChild(statusSection(ticket));
      root.appendChild(prioritySection(ticket));
      root.appendChild(assigneeSection(ticket, session.user.id));
    }
    root.appendChild(commentsSection(comments));
    root.appendChild(historySection(history));
    if (admin) {
      root.appendChild(deleteSection());
    }
  }

  function sectionShell(heading) {
    const section = document.createElement('section');
    section.className = 'section';
    const h = document.createElement('h2');
    h.textContent = heading;
    section.appendChild(h);
    return section;
  }

  function statusSection(ticket) {
    const section = sectionShell('Mudar estado');
    const next = ALLOWED_TRANSITIONS[ticket.status] || [];
    if (next.length === 0) {
      const p = document.createElement('p');
      p.className = 'muted';
      p.textContent = 'Este chamado não admite mais transições.';
      section.appendChild(p);
      return section;
    }
    const form = document.createElement('form');
    form.noValidate = true;
    const wrap = document.createElement('div');
    wrap.className = 'field';
    const label = document.createElement('label');
    label.htmlFor = 'next-status';
    label.textContent = 'Próximo estado';
    const select = document.createElement('select');
    select.id = 'next-status';
    select.className = 'select';
    for (const s of next) {
      const o = document.createElement('option');
      o.value = s;
      o.textContent = statusLabel(s);
      select.appendChild(o);
    }
    wrap.append(label, select);
    const commentWrap = document.createElement('div');
    commentWrap.className = 'field';
    const commentLabel = document.createElement('label');
    commentLabel.htmlFor = 'status-comment';
    commentLabel.textContent = 'Comentário (obrigatório ao encerrar)';
    const comment = document.createElement('textarea');
    comment.id = 'status-comment';
    comment.rows = 3;
    comment.maxLength = 1000;
    commentWrap.append(commentLabel, comment);
    const btn = document.createElement('button');
    btn.type = 'submit';
    btn.className = 'btn btn-primary';
    btn.textContent = 'Aplicar transição';
    form.append(wrap, commentWrap, btn);
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      clearFieldError(select);
      clearFieldError(comment);
      const { ok, errors, comment: text } = validateStatusInput({ status: select.value, comment: comment.value });
      if (!ok) {
        if (errors.status) showFieldError(select, errors.status);
        if (errors.comment) showFieldError(comment, errors.comment);
        return;
      }
      btn.disabled = true;
      try {
        await changeTicketStatus(id, { status: select.value, comment: text || undefined }, opts);
        showToast('Estado atualizado.', 'info');
        boot();
      } catch (error) {
        if (error?.code === 'UNAUTHORIZED') return;
        showToast(error?.message || 'Falha ao mudar estado.', 'error');
        btn.disabled = false;
      }
    });
    section.appendChild(form);
    return section;
  }

  function prioritySection(ticket) {
    const section = sectionShell('Prioridade');
    const form = document.createElement('form');
    form.noValidate = true;
    const wrap = document.createElement('div');
    wrap.className = 'field';
    const label = document.createElement('label');
    label.htmlFor = 'priority-select';
    label.textContent = `Atual: ${priorityLabel(ticket.priority)}`;
    const select = document.createElement('select');
    select.id = 'priority-select';
    select.className = 'select';
    for (const p of ['low', 'medium', 'high', 'critical']) {
      const o = document.createElement('option');
      o.value = p;
      o.textContent = priorityLabel(p);
      if (p === ticket.priority) o.selected = true;
      select.appendChild(o);
    }
    wrap.append(label, select);
    const btn = document.createElement('button');
    btn.type = 'submit';
    btn.className = 'btn btn-secondary';
    btn.textContent = 'Salvar prioridade';
    form.append(wrap, btn);
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      btn.disabled = true;
      try {
        const res = await changeTicketPriority(id, { priority: select.value }, opts);
        showToast(res.changed ? 'Prioridade atualizada.' : 'Prioridade inalterada.', 'info');
        boot();
      } catch (error) {
        if (error?.code === 'UNAUTHORIZED') return;
        showToast(error?.message || 'Falha ao salvar prioridade.', 'error');
        btn.disabled = false;
      }
    });
    section.appendChild(form);
    return section;
  }

  function assigneeSection(ticket, myId) {
    const section = sectionShell('Responsável');
    const current = document.createElement('p');
    current.className = 'muted';
    current.textContent = ticket.assignee_id ? `Atual: ${ticket.assignee_id}` : 'Sem responsável no momento.';
    const row = document.createElement('p');
    row.className = 'button-row';
    const mine = document.createElement('button');
    mine.type = 'button';
    mine.className = 'btn btn-secondary';
    mine.textContent = 'Atribuir a mim';
    mine.addEventListener('click', () => saveAssignee(myId, mine));
    const clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'btn btn-secondary';
    clear.textContent = 'Remover responsável';
    clear.addEventListener('click', () => saveAssignee(null, clear));
    row.append(mine, clear);

    const form = document.createElement('form');
    form.noValidate = true;
    const wrap = document.createElement('div');
    wrap.className = 'field';
    const label = document.createElement('label');
    label.htmlFor = 'assignee-id';
    label.textContent = 'ID do responsável (UUID)';
    const input = document.createElement('input');
    input.id = 'assignee-id';
    input.type = 'text';
    input.placeholder = 'colar UUID do técnico';
    input.value = ticket.assignee_id || '';
    wrap.append(label, input);
    const btn = document.createElement('button');
    btn.type = 'submit';
    btn.className = 'btn btn-secondary';
    btn.textContent = 'Salvar responsável';
    form.append(wrap, btn);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      saveAssignee(input.value.trim() || null, btn);
    });

    const note = document.createElement('p');
    note.className = 'small muted';
    note.textContent = 'A API ainda não lista usuários; use o próprio ID ou cole um UUID válido.';
    section.append(current, row, form, note);
    return section;
  }

  async function saveAssignee(assigneeId, btn) {
    btn.disabled = true;
    try {
      const res = await changeTicketAssignee(id, { assigneeId }, opts);
      showToast(res.changed ? 'Responsável atualizado.' : 'Responsável inalterado.', 'info');
      boot();
    } catch (error) {
      if (error?.code === 'UNAUTHORIZED') return;
      showToast(error?.message || 'Falha ao salvar responsável.', 'error');
      btn.disabled = false;
    }
  }

  function commentsSection(comments) {
    const section = sectionShell('Comentários');
    if (comments === null) {
      const p = document.createElement('p');
      p.className = 'muted';
      p.textContent = 'Não foi possível carregar os comentários.';
      section.appendChild(p);
    } else if (comments.length === 0) {
      const p = document.createElement('p');
      p.className = 'muted';
      p.textContent = 'Nenhum comentário ainda.';
      section.appendChild(p);
    } else {
      const list = document.createElement('ol');
      list.className = 'timeline';
      for (const c of comments) {
        const li = document.createElement('li');
        const body = document.createElement('p');
        body.textContent = c.body;
        const meta = document.createElement('p');
        meta.className = 'small muted';
        meta.textContent = `${formatDateTime(c.created_at)}${c.is_resolution ? ' · resolução' : ''}`;
        li.append(body, meta);
        list.appendChild(li);
      }
      section.appendChild(list);
    }

    const form = document.createElement('form');
    form.noValidate = true;
    const wrap = document.createElement('div');
    wrap.className = 'field';
    const label = document.createElement('label');
    label.htmlFor = 'comment-body';
    label.textContent = 'Adicionar comentário';
    const textarea = document.createElement('textarea');
    textarea.id = 'comment-body';
    textarea.rows = 3;
    textarea.maxLength = 1000;
    wrap.append(label, textarea);
    const btn = document.createElement('button');
    btn.type = 'submit';
    btn.className = 'btn btn-primary';
    btn.textContent = 'Comentar';
    form.append(wrap, btn);
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      clearFieldError(textarea);
      const { ok, errors, body } = validateCommentInput({ body: textarea.value });
      if (!ok) {
        showFieldError(textarea, errors.body);
        return;
      }
      btn.disabled = true;
      try {
        await addTicketComment(id, { body }, opts);
        showToast('Comentário publicado.', 'info');
        boot();
      } catch (error) {
        if (error?.code === 'UNAUTHORIZED') return;
        showToast(error?.message || 'Falha ao comentar.', 'error');
        btn.disabled = false;
      }
    });
    section.appendChild(form);
    return section;
  }

  function historySection(history) {
    const section = sectionShell('Histórico');
    if (history === null) {
      const p = document.createElement('p');
      p.className = 'muted';
      p.textContent = 'Não foi possível carregar o histórico.';
      section.appendChild(p);
      return section;
    }
    if (history.length === 0) {
      const p = document.createElement('p');
      p.className = 'muted';
      p.textContent = 'Sem eventos registrados.';
      section.appendChild(p);
      return section;
    }
    const list = document.createElement('ol');
    list.className = 'timeline';
    for (const h of history) {
      const li = document.createElement('li');
      const name = document.createElement('p');
      name.textContent = historyLabel(h.event);
      const detail = document.createElement('p');
      detail.className = 'small muted';
      detail.textContent = `${historyDetail(h)} · ${formatDateTime(h.created_at)}`;
      li.append(name, detail);
      list.appendChild(li);
    }
    section.appendChild(list);
    return section;
  }

  function deleteSection() {
    const section = sectionShell('Zona de risco');
    const form = document.createElement('form');
    form.noValidate = true;
    const wrap = document.createElement('div');
    wrap.className = 'field';
    const label = document.createElement('label');
    label.htmlFor = 'delete-justification';
    label.textContent = 'Justificativa da exclusão (só admin)';
    const input = document.createElement('textarea');
    input.id = 'delete-justification';
    input.rows = 2;
    input.maxLength = 1000;
    wrap.append(label, input);
    const btn = document.createElement('button');
    btn.type = 'submit';
    btn.className = 'btn btn-danger';
    btn.textContent = 'Excluir chamado';
    form.append(wrap, btn);
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      clearFieldError(input);
      const { ok, errors, justification } = validateJustificationInput({ justification: input.value });
      if (!ok) {
        showFieldError(input, errors.justification);
        return;
      }
      if (!window.confirm('Excluir este chamado? A ação registra auditoria.')) return;
      btn.disabled = true;
      try {
        await removeTicket(id, { justification }, opts);
        showToast('Chamado excluído.', 'info');
        window.location.replace('tickets.html');
      } catch (error) {
        if (error?.code === 'UNAUTHORIZED') return;
        showToast(error?.message || 'Falha ao excluir.', 'error');
        btn.disabled = false;
      }
    });
    section.appendChild(form);
    return section;
  }
}
