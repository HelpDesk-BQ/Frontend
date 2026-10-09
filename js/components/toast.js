let container = null;

export function ensureToastContainer() {
  if (typeof document === 'undefined') return null;
  container = document.getElementById('toast-region');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-region';
    container.className = 'toast-region';
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }
  return container;
}

export function showToast(message, type = 'info') {
  const root = ensureToastContainer();
  if (!root) return;
  const el = document.createElement('p');
  el.className = `toast toast--${type}`;
  el.setAttribute('role', type === 'error' ? 'alert' : 'status');
  el.textContent = message;
  root.appendChild(el);
  window.setTimeout(() => {
    el.classList.add('is-leaving');
    window.setTimeout(() => el.remove(), 240);
  }, 4200);
}

export function showFieldError(input, message) {
  if (!input) return;
  input.setAttribute('aria-invalid', 'true');
  const id = `${input.id}-error`;
  let hint = document.getElementById(id);
  if (!hint) {
    hint = document.createElement('p');
    hint.id = id;
    hint.className = 'field-error';
    input.insertAdjacentElement('afterend', hint);
  }
  hint.textContent = message;
  input.setAttribute('aria-describedby', id);
}

export function clearFieldError(input) {
  if (!input) return;
  input.removeAttribute('aria-invalid');
  input.removeAttribute('aria-describedby');
  const hint = document.getElementById(`${input.id}-error`);
  if (hint) hint.remove();
}
