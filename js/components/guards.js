import { logout } from '../api/auth.js';

export function isAdmin(user) {
  return user?.role === 'admin';
}

export function canWriteTicket(user) {
  return user?.role === 'technician' || user?.role === 'admin';
}

export function ticketIdFromQuery() {
  const id = new URLSearchParams(window.location.search).get('id');
  return id?.trim() ? id.trim() : null;
}

export function goLogin() {
  logout();
  const next = encodeURIComponent(window.location.pathname.split('/').pop() || 'index.html');
  window.location.replace(`login.html?next=${next}`);
}

// Erro de API em páginas: 401 limpa a sessão e volta ao login;
// demais viram bloco de erro visível + retorno para quem chama.
export function handlePageError(error, { container = null } = {}) {
  if (error?.code === 'UNAUTHORIZED') {
    goLogin();
    return;
  }
  if (container) {
    container.innerHTML = '';
    const title = document.createElement('h2');
    title.textContent = 'Não foi possível carregar.';
    const msg = document.createElement('p');
    msg.textContent =
      (error?.message || 'Algo inesperado aconteceu. Tente novamente.') +
      (error?.correlationId ? ` (ref ${String(error.correlationId).slice(0, 8)})` : '');
    const back = document.createElement('p');
    const link = document.createElement('a');
    link.href = 'tickets.html';
    link.textContent = 'Voltar aos chamados';
    back.appendChild(link);
    container.append(title, msg, back);
  }
}
