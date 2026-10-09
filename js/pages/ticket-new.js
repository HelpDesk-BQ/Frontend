import { createTicket } from '../api/tickets.js';
import { mountShell, requireAuth } from '../components/app-shell.js';
import { handlePageError } from '../components/guards.js';
import { showToast, showFieldError, clearFieldError } from '../components/toast.js';
import { validateTicketInput } from '../utils/validators.js';

export function initTicketNewPage() {
  const session = requireAuth();
  if (!session) return;
  mountShell({ active: 'tickets', session });

  const form = document.getElementById('ticket-form');
  const titleInput = document.getElementById('title');
  const descriptionInput = document.getElementById('description');
  const priorityInput = document.getElementById('priority');
  const submitBtn = document.getElementById('ticket-submit');
  const formError = document.getElementById('form-error');

  for (const input of [titleInput, descriptionInput, priorityInput]) {
    input?.addEventListener('input', () => clearFieldError(input));
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    formError.textContent = '';
    formError.hidden = true;

    const { ok, errors, title, description } = validateTicketInput({
      title: titleInput.value,
      description: descriptionInput.value,
      priority: priorityInput.value
    });

    if (!ok) {
      if (errors.title) showFieldError(titleInput, errors.title);
      if (errors.description) showFieldError(descriptionInput, errors.description);
      if (errors.priority) showFieldError(priorityInput, errors.priority);
      showToast('Revise os campos destacados.', 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.setAttribute('aria-busy', 'true');
    submitBtn.textContent = 'Abrindo…';

    try {
      const ticket = await createTicket(
        { title, description, priority: priorityInput.value },
        { onUnauthorized: () => handlePageError({ code: 'UNAUTHORIZED' }) }
      );
      showToast('Chamado aberto.', 'info');
      window.location.replace(`ticket-detail.html?id=${encodeURIComponent(ticket.id)}`);
    } catch (error) {
      if (error?.code === 'UNAUTHORIZED') return;
      formError.textContent = error?.message || 'Não foi possível abrir o chamado.';
      formError.hidden = false;
      showToast(formError.textContent, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.removeAttribute('aria-busy');
      submitBtn.textContent = 'Abrir chamado';
    }
  });
}
