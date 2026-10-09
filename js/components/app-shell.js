import { getSession, logout } from '../api/auth.js';

export function requireAuth({ redirectTo = 'login.html' } = {}) {
  const session = getSession();
  if (!session || !session.token) {
    const next = encodeURIComponent(window.location.pathname.split('/').pop() || 'index.html');
    window.location.replace(`${redirectTo}?next=${next}`);
    return null;
  }
  return session;
}

export function mountShell({ active = 'home', session = null } = {}) {
  const nav = document.querySelector('[data-app-nav]');
  if (nav) {
    nav.querySelectorAll('a').forEach((a) => {
      if (a.dataset.nav === active) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  const userSlot = document.querySelector('[data-user-slot]');
  if (userSlot && session?.user) {
    userSlot.textContent = `${session.user.name} · ${session.user.role}`;
  }

  const logoutBtn = document.querySelector('[data-logout]');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      logout();
      window.location.replace('login.html');
    });
  }
}

export function setApiStatus(state) {
  const el = document.querySelector('[data-api-status]');
  if (!el) return;
  el.dataset.state = state;
  el.textContent =
    state === 'online'
      ? 'API conectada'
      : state === 'offline'
        ? 'API indisponível'
        : 'Verificando API…';
}
