import { tickets, ApiError } from '../api.js';
import { requireSession, applyRoleVisibility, logout } from '../auth.js';
import { initShell } from '../shell.js';
import { applyErrors, setBusy, setText, announce, charCounter, confirmModal, flash } from '../ui.js';
import { validateTicket } from '../validators.js';

const user = await requireSession();
if (!user) throw new Error('unreachable');
applyRoleVisibility(user);
initShell(user);

const form = document.getElementById('ticket-form');
const submit = document.getElementById('submit');
const formError = document.getElementById('form-error');
charCounter(form.title, 100);
charCounter(form.description, 5000);

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

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (submit.disabled) return; // anti-duplicidade
  const input = {
    title: form.title.value,
    description: form.description.value,
    priority: form.priority.value,
  };
  const errors = validateTicket(input);
  if (Object.keys(errors).length > 0) {
    applyErrors(form, errors);
    return;
  }
  formError.hidden = true;
  setBusy(submit, true);
  try {
    await tickets.create({
      title: input.title.trim(),
      description: input.description.trim(),
      priority: input.priority,
    });
    announce('Chamado aberto. Indo para o painel.');
    flash('Chamado aberto. A equipe de TI já pode ver.');
    window.location.assign('/screens/dashboard.html');
  } catch (error) {
    const message = error instanceof ApiError ? error.message : 'Não foi possível concluir.';
    setText(formError, message);
    formError.hidden = false;
    formError.setAttribute('tabindex', '-1');
    formError.focus();
  } finally {
    setBusy(submit, false);
  }
});
