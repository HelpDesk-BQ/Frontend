import { apiRequest } from './client.js';
import { ApiError, toUserMessage } from './errors.js';
import { createSessionStore } from '../utils/storage.js';
import { normalizeEmail } from '../utils/validators.js';

// login é o único fluxo de escrita real: POST /api/sessions (RF01/RF02).
export async function login({ email, password }, { fetchImpl, baseUrl, store } = {}) {
  const normalizedEmail = normalizeEmail(email);
  const { data } = await apiRequest('/api/sessions', {
    method: 'POST',
    body: { email: normalizedEmail, password },
    fetchImpl,
    baseUrl
  });

  const session = { token: data?.data?.token, user: data?.data?.user };
  if (!session.token || !session.user) {
    throw new Error('Resposta de autenticação inválida.');
  }
  createSessionStore(store).write(session);
  return session;
}

export function logout(store) {
  createSessionStore(store).clear();
}

export function getSession(store) {
  return createSessionStore(store).read();
}

export function isAuthenticated(store) {
  const session = getSession(store);
  return Boolean(session && session.token);
}

export function getAuthHeader(store) {
  const session = getSession(store);
  return session ? `Bearer ${session.token}` : null;
}

// Atalho autenticado: injeta o Bearer da sessão em qualquer chamada.
// Sem sessão, falha local com UNAUTHORIZED (páginas redirecionam ao login).
export async function authRequest(fn, { store, onUnauthorized } = {}) {
  const session = getSession(store);
  if (!session?.token) {
    const error = new ApiError(401, 'UNAUTHORIZED', toUserMessage('UNAUTHORIZED'), null);
    if (typeof onUnauthorized === 'function') onUnauthorized(error);
    throw error;
  }
  try {
    return await fn(session.token);
  } catch (error) {
    if (error?.code === 'UNAUTHORIZED' && typeof onUnauthorized === 'function') {
      onUnauthorized(error);
    }
    throw error;
  }
}
