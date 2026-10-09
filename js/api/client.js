import { resolveApiBaseUrl } from '../config.js';
import { generateCorrelationId } from '../utils/correlation.js';
import { ApiError, toUserMessage } from './errors.js';

function safeJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function buildHeaders({ token = null, correlationId = null } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  headers['X-Correlation-Id'] = correlationId || generateCorrelationId();
  return headers;
}

export async function apiRequest(
  path,
  { method = 'GET', body, token = null, correlationId = null, fetchImpl = null, baseUrl = null } = {}
) {
  const fetchFn = fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
  if (!fetchFn) throw new ApiError(0, 'NETWORK_ERROR', toUserMessage('NETWORK_ERROR'), null);

  const base = (baseUrl || resolveApiBaseUrl()).replace(/\/$/, '');
  const url = `${base}${path}`;
  const outgoingCorrelationId = correlationId || generateCorrelationId();

  let response;
  try {
    response = await fetchFn(url, {
      method,
      headers: buildHeaders({ token, correlationId: outgoingCorrelationId }),
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', toUserMessage('NETWORK_ERROR'), outgoingCorrelationId);
  }

  const responseCorrelationId = response.headers?.get
    ? response.headers.get('X-Correlation-Id')
    : null;
  const text = await response.text().catch(() => '');
  const json = safeJson(text);

  if (response.ok) {
    return { data: json, status: response.status, correlationId: responseCorrelationId || outgoingCorrelationId };
  }

  const code = json?.error?.code || statusToCode(response.status);
  const message =
    json?.error?.message || toUserMessage(code, `Requisição falhou (${response.status}).`);
  throw new ApiError(
    response.status,
    code,
    message,
    json?.error?.correlationId || responseCorrelationId || outgoingCorrelationId
  );
}

function statusToCode(status) {
  if (status === 400) return 'VALIDATION_ERROR';
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'INVALID_STATE';
  if (status === 413) return 'PAYLOAD_TOO_LARGE';
  if (status === 423) return 'ACCOUNT_LOCKED';
  return 'INTERNAL_ERROR';
}

// GET com query string (?status=&priority=&page=&limit=) para listagens.
export async function apiGet(path, { params = {}, ...options } = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  }
  const suffix = search.size > 0 ? `?${search.toString()}` : '';
  return apiRequest(`${path}${suffix}`, { method: 'GET', ...options });
}

export function getHealth(deps = {}) {
  return apiRequest('/health', { method: 'GET', ...deps });
}
