import { login } from '../api/auth.js';
import { validateLoginInput } from '../utils/validators.js';
import { showToast, showFieldError, clearFieldError } from '../components/toast.js';

function param(name) {
  return new URLSearchParams(window.location.search).get(name);
}

export function initLogin() {
  const form = document.getElementById('login-form');
  if (!form) return;
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const submitBtn = document.getElementById('login-submit');
  const formError = document.getElementById('form-error');

  emailInput?.addEventListener('input', () => clearFieldError(emailInput));
  passwordInput?.addEventListener('input', () => clearFieldError(passwordInput));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    formError.textContent = '';
    formError.hidden = true;

    const { ok, errors, normalizedEmail } = validateLoginInput({
      email: emailInput.value,
      password: passwordInput.value
    });

    if (!ok) {
      if (errors.email) showFieldError(emailInput, errors.email);
      if (errors.password) showFieldError(passwordInput, errors.password);
      (errors.email ? emailInput : passwordInput)?.focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.setAttribute('aria-busy', 'true');
    submitBtn.textContent = 'Entrando…';

    try {
      await login({ email: normalizedEmail, password: passwordInput.value });
      const next = param('next');
      const safe = next && /^[a-z0-9-]+\.html$/i.test(next) ? next : 'index.html';
      window.location.replace(safe);
    } catch (err) {
      const message = err?.message || 'Não foi possível entrar. Tente novamente.';
      formError.textContent = message + (err?.correlationId ? ` (ref ${err.correlationId.slice(0, 8)})` : '');
      formError.hidden = false;
      showToast(message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.removeAttribute('aria-busy');
      submitBtn.textContent = 'Entrar';
    }
  });
}
