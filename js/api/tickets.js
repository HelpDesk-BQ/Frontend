import { apiRequest, apiGet } from './client.js';
import { authRequest } from './auth.js';

function depsOf(options = {}) {
  const { store, onUnauthorized, fetchImpl, baseUrl } = options;
  return { store, onUnauthorized, fetchImpl, baseUrl };
}

function pass({ fetchImpl, baseUrl }, token) {
  return { token, fetchImpl, baseUrl };
}

// GET /api/tickets?status=&priority=&page=&limit= → { items, total, page, limit }
export async function listTickets({ status, priority, page = 1, limit = 20 } = {}, options = {}) {
  const { store, onUnauthorized, fetchImpl, baseUrl } = depsOf(options);
  return authRequest(
    (token) =>
      apiGet('/api/tickets', {
        params: { status, priority, page, limit },
        ...pass({ fetchImpl, baseUrl }, token)
      }).then((res) => res.data?.data),
    { store, onUnauthorized }
  );
}

// GET /api/tickets/:id → ticket
export async function getTicket(id, options = {}) {
  const { store, onUnauthorized, fetchImpl, baseUrl } = depsOf(options);
  return authRequest(
    (token) =>
      apiRequest(`/api/tickets/${encodeURIComponent(id)}`, {
        method: 'GET',
        ...pass({ fetchImpl, baseUrl }, token)
      }).then((res) => res.data?.data),
    { store, onUnauthorized }
  );
}

// POST /api/tickets { title, description, priority } → 201 ticket
export async function createTicket({ title, description, priority }, options = {}) {
  const { store, onUnauthorized, fetchImpl, baseUrl } = depsOf(options);
  return authRequest(
    (token) =>
      apiRequest('/api/tickets', {
        method: 'POST',
        body: { title, description, priority },
        ...pass({ fetchImpl, baseUrl }, token)
      }).then((res) => res.data?.data),
    { store, onUnauthorized }
  );
}

// PATCH /api/tickets/:id/status { status, comment? } → { ticket, comment }
export async function changeTicketStatus(id, { status, comment }, options = {}) {
  const { store, onUnauthorized, fetchImpl, baseUrl } = depsOf(options);
  const body = comment?.trim() ? { status, comment: comment.trim() } : { status };
  return authRequest(
    (token) =>
      apiRequest(`/api/tickets/${encodeURIComponent(id)}/status`, {
        method: 'PATCH',
        body,
        ...pass({ fetchImpl, baseUrl }, token)
      }).then((res) => res.data?.data),
    { store, onUnauthorized }
  );
}

// PATCH /api/tickets/:id/priority { priority } → { ticket, changed }
export async function changeTicketPriority(id, { priority }, options = {}) {
  const { store, onUnauthorized, fetchImpl, baseUrl } = depsOf(options);
  return authRequest(
    (token) =>
      apiRequest(`/api/tickets/${encodeURIComponent(id)}/priority`, {
        method: 'PATCH',
        body: { priority },
        ...pass({ fetchImpl, baseUrl }, token)
      }).then((res) => res.data?.data),
    { store, onUnauthorized }
  );
}

// PATCH /api/tickets/:id/assignee { assigneeId: uuid|null } → { ticket, changed }
export async function changeTicketAssignee(id, { assigneeId }, options = {}) {
  const { store, onUnauthorized, fetchImpl, baseUrl } = depsOf(options);
  const next = assigneeId?.trim() ? assigneeId.trim() : null;
  return authRequest(
    (token) =>
      apiRequest(`/api/tickets/${encodeURIComponent(id)}/assignee`, {
        method: 'PATCH',
        body: { assigneeId: next },
        ...pass({ fetchImpl, baseUrl }, token)
      }).then((res) => res.data?.data),
    { store, onUnauthorized }
  );
}

// POST /api/tickets/:id/comments { body } → 201 comment
export async function addTicketComment(id, { body }, options = {}) {
  const { store, onUnauthorized, fetchImpl, baseUrl } = depsOf(options);
  return authRequest(
    (token) =>
      apiRequest(`/api/tickets/${encodeURIComponent(id)}/comments`, {
        method: 'POST',
        body: { body: body.trim() },
        ...pass({ fetchImpl, baseUrl }, token)
      }).then((res) => res.data?.data),
    { store, onUnauthorized }
  );
}

// GET /api/tickets/:id/comments → [comment]
export async function listTicketComments(id, options = {}) {
  const { store, onUnauthorized, fetchImpl, baseUrl } = depsOf(options);
  return authRequest(
    (token) =>
      apiRequest(`/api/tickets/${encodeURIComponent(id)}/comments`, {
        method: 'GET',
        ...pass({ fetchImpl, baseUrl }, token)
      }).then((res) => res.data?.data ?? []),
    { store, onUnauthorized }
  );
}

// GET /api/tickets/:id/history → [event]
export async function listTicketHistory(id, options = {}) {
  const { store, onUnauthorized, fetchImpl, baseUrl } = depsOf(options);
  return authRequest(
    (token) =>
      apiRequest(`/api/tickets/${encodeURIComponent(id)}/history`, {
        method: 'GET',
        ...pass({ fetchImpl, baseUrl }, token)
      }).then((res) => res.data?.data ?? []),
    { store, onUnauthorized }
  );
}

// DELETE /api/tickets/:id { justification } → ticket (soft delete, só admin)
export async function removeTicket(id, { justification }, options = {}) {
  const { store, onUnauthorized, fetchImpl, baseUrl } = depsOf(options);
  return authRequest(
    (token) =>
      apiRequest(`/api/tickets/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        body: { justification: justification.trim() },
        ...pass({ fetchImpl, baseUrl }, token)
      }).then((res) => res.data?.data),
    { store, onUnauthorized }
  );
}
