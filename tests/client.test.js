import { describe, test, expect } from '@jest/globals';
import { apiRequest, buildHeaders } from '../js/api/client.js';
import { ApiError } from '../js/api/errors.js';

function jsonResponse({ status = 200, body = {}, correlationId = 'corr-1' }) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => (name === 'X-Correlation-Id' ? correlationId : null) },
    text: async () => JSON.stringify(body)
  };
}

describe('api client', () => {
  test('sends JSON + correlation id headers', async () => {
    let seen = null;
    const fetchImpl = async (url, init) => {
      seen = { url, init };
      return jsonResponse({ body: { status: 'ok' } });
    };
    await apiRequest('/health', { fetchImpl, baseUrl: 'http://localhost:3000' });
    expect(seen.url).toBe('http://localhost:3000/health');
    expect(seen.init.headers['Content-Type']).toBe('application/json');
    expect(seen.init.headers['X-Correlation-Id']).toBeDefined();
  });

  test('attaches Bearer token when provided', async () => {
    let seen = null;
    const fetchImpl = async (url, init) => {
      seen = init;
      return jsonResponse({ body: {} });
    };
    await apiRequest('/health', { fetchImpl, baseUrl: 'http://x', token: 'abc' });
    expect(seen.headers.Authorization).toBe('Bearer abc');
  });

  test('maps 401 INVALID_CREDENTIALS to ApiError with PT-BR message', async () => {
    const fetchImpl = async () =>
      jsonResponse({
        status: 401,
        body: { error: { code: 'INVALID_CREDENTIALS', message: 'Credenciais inválidas.', correlationId: 'c1' } }
      });
    await expect(apiRequest('/api/sessions', { method: 'POST', fetchImpl, baseUrl: 'http://x' })).rejects.toMatchObject({
      status: 401,
      code: 'INVALID_CREDENTIALS'
    });
  });

  test('maps 423 ACCOUNT_LOCKED', async () => {
    const fetchImpl = async () =>
      jsonResponse({ status: 423, body: { error: { code: 'ACCOUNT_LOCKED', message: 'x', correlationId: 'c2' } } });
    try {
      await apiRequest('/api/sessions', { method: 'POST', fetchImpl, baseUrl: 'http://x' });
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.code).toBe('ACCOUNT_LOCKED');
    }
  });

  test('converts network failure to NETWORK_ERROR', async () => {
    const fetchImpl = async () => {
      throw new Error('down');
    };
    await expect(apiRequest('/health', { fetchImpl, baseUrl: 'http://x' })).rejects.toMatchObject({
      code: 'NETWORK_ERROR'
    });
  });

  test('buildHeaders generates correlation id when absent', () => {
    const h = buildHeaders({});
    expect(h['X-Correlation-Id']).toBeDefined();
  });
});
