import { sessions, ApiError } from '../api.js';
import { currentUser } from '../auth.js';
import { applyErrors, setBusy, setText, announce } from '../ui.js';
import { validateLogin } from '../validators.js';

const form = document.getElementById('login-form');
const submit = document.getElementById('submit');
const formError = document.getElementById('form-error');
const password = document.getElementById('password');
const toggle = document.getElementById('password-toggle');

const EYE_OPEN = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M2 10s3-5.5 8-5.5S18 10 18 10s-3 5.5-8 5.5S2 10 2 10z"/><circle cx="10" cy="10" r="2.5"/></svg>';
const EYE_CLOSED = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M2 10s3-5.5 8-5.5S18 10 18 10s-3 5.5-8 5.5S2 10 2 10z"/><circle cx="10" cy="10" r="2.5"/><path d="M4 4l12 12"/></svg>';

toggle.addEventListener('click', () => {
  const visible = password.type === 'password';
  password.type = visible ? 'text' : 'password';
  toggle.setAttribute('aria-pressed', String(visible));
  toggle.setAttribute('aria-label', visible ? 'Ocultar senha' : 'Mostrar senha');
  // Ícones estáticos (nunca dado do usuário).
  toggle.innerHTML = visible ? EYE_CLOSED : EYE_OPEN;
  password.focus();
});

if (new URLSearchParams(window.location.search).get('motivo') === 'sessao') {
  const banner = document.getElementById('session-banner');
  setText(banner, 'Sua sessão terminou. Entre de novo para continuar.');
  banner.hidden = false;
}

if (await currentUser()) {
  window.location.assign('/screens/dashboard.html');
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const input = {
    email: form.email.value,
    password: form.password.value,
  };
  const errors = validateLogin(input);
  if (Object.keys(errors).length > 0) {
    applyErrors(form, errors);
    return;
  }
  formError.hidden = true;
  setBusy(submit, true);
  try {
    await sessions.login(input.email.trim(), input.password);
    announce('Login realizado. Redirecionando para o painel.');
    window.location.assign('/screens/dashboard.html');
  } catch (error) {
    const message =
      error instanceof ApiError && error.code === 'ACCOUNT_LOCKED'
        ? 'Acesso bloqueado por 10 minutos após 3 tentativas. Aguarde e tente de novo — se não foi você, fale com o administrador.'
        : error instanceof ApiError
          ? error.message
          : 'Não foi possível concluir.';
    setText(formError, message);
    formError.hidden = false;
    form.password.value = '';
    form.password.focus();
  } finally {
    setBusy(submit, false);
  }
});
