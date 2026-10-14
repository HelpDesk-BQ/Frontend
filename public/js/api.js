// Cliente HTTP da API Elo.
// Sessão via cookie httpOnly: o navegador envia sozinho (credentials:include),
// nenhum token é guardado em JS (RNF04/XSS). Erros seguem o contrato do backend.
// Em host local com ?demo=… as chamadas vão para a API falsa (demo-api.js).

import { isDemoMode, demoRequest } from './demo-api.js';

export const API_BASE_URL = globalThis.HELPDESK_API_URL || 'http://localhost:3000';

export class ApiError extends Error {
  constructor(status, code, message, correlationId = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.correlationId = correlationId;
  }
}

function correlationId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `web_${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
}

async function send(path, method, body) {
  if (isDemoMode()) return demoRequest(path, { method, body });
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-Correlation-Id': correlationId() },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Verifique sua conexão.');
  }
  const payload = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, payload };
}

// Avisa a interface (barra de progresso da casca) que há requisição em curso.
function signal(delta) {
  if (typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('elo:request', { detail: delta }));
  }
}

export async function api(path, { method = 'GET', body, redirect401 = true } = {}) {
  signal(1);
  let response;
  try {
    response = await send(path, method, body);
  } finally {
    signal(-1);
  }
  const { payload } = response;
  if (!response.ok) {
    const err = payload?.error || {};
    // Sessão expirada em uso: volta ao login com motivo (fora da tela de login).
    if (response.status === 401 && redirect401 && !window.location.pathname.endsWith('/login.html')) {
      window.location.assign('/screens/login.html?motivo=sessao');
    }
    throw new ApiError(
      response.status,
      err.code || 'REQUEST_FAILED',
      err.message || 'Não foi possível concluir.',
      err.correlationId || null
    );
  }
  return payload?.data;
}

export const sessions = {
  login: (email, password) => api('/api/sessions', { method: 'POST', body: { email, password } }),
  logout: () => api('/api/sessions/logout', { method: 'POST' }),
  me: () => api('/api/sessions/me', { redirect401: false }),
};

export const tickets = {
  create: (input) => api('/api/tickets', { method: 'POST', body: input }),
  list: (params = {}) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') query.set(key, value);
    }
    const suffix = query.toString();
    return api(`/api/tickets${suffix ? `?${suffix}` : ''}`);
  },
  get: (id) => api(`/api/tickets/${encodeURIComponent(id)}`),
  changeStatus: (id, input) => api(`/api/tickets/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: input }),
  changePriority: (id, priority) =>
    api(`/api/tickets/${encodeURIComponent(id)}/priority`, { method: 'PATCH', body: { priority } }),
  changeAssignee: (id, assigneeId) =>
    api(`/api/tickets/${encodeURIComponent(id)}/assignee`, { method: 'PATCH', body: { assigneeId } }),
  remove: (id, justification) =>
    api(`/api/tickets/${encodeURIComponent(id)}`, { method: 'DELETE', body: { justification } }),
  addComment: (id, bodyText) =>
    api(`/api/tickets/${encodeURIComponent(id)}/comments`, { method: 'POST', body: { body: bodyText } }),
  listComments: (id) => api(`/api/tickets/${encodeURIComponent(id)}/comments`),
  listHistory: (id) => api(`/api/tickets/${encodeURIComponent(id)}/history`),
};

export const reports = {
  summary: (params = {}) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') query.set(key, value);
    }
    const suffix = query.toString();
    return api(`/api/reports/summary${suffix ? `?${suffix}` : ''}`);
  },
};

export const users = {
  list: (role) => api(`/api/users${role ? `?role=${encodeURIComponent(role)}` : ''}`),
};
