import { describe, test, expect } from '@jest/globals';
import { resolveApiBaseUrl, DEFAULT_API_BASE_URL } from '../js/config.js';
import { toUserMessage, buildApiError, ApiError } from '../js/api/errors.js';
import { apiRequest, getHealth } from '../js/api/client.js';
import { getAuthHeader, login } from '../js/api/auth.js';

function mem() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k)
  };
}

describe('config + errors', () => {
  test('defaults to localhost:3000', () => {
    delete process.env.HELPDESK_API_BASE_URL;
    expect(resolveApiBaseUrl()).toBe(DEFAULT_API_BASE_URL);
  });

  test('uses env override and strips trailing slash', () => {
    process.env.HELPDESK_API_BASE_URL = 'http://api.test/';
    expect(resolveApiBaseUrl()).toBe('http://api.test');
    delete process.env.HELPDESK_API_BASE_URL;
  });

  test('toUserMessage falls back safely', () => {
    expect(toUserMessage('INVALID_CREDENTIALS')).toMatch(/Credenciais/);
    expect(toUserMessage('UNKNOWN_CODE', 'fallback')).toBe('fallback');
    expect(toUserMessage(null)).toBeDefined();
  });

  test('buildApiError creates ApiError', () => {
    const err = buildApiError({ status: 404, code: 'NOT_FOUND', correlationId: 'c' });
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(404);
  });
});

describe('client edge cases', () => {
  test('statusToCode mapping via error bodies without code', async () => {
    const cases = [
      [400, 'VALIDATION_ERROR'],
      [403, 'FORBIDDEN'],
      [404, 'NOT_FOUND'],
      [413, 'PAYLOAD_TOO_LARGE'],
      [500, 'INTERNAL_ERROR']
    ];
    for (const [status, code] of cases) {
      const fetchImpl = async () => ({
        ok: false,
        status,
        headers: { get: () => null },
        text: async () => '{}'
      });
      try {
        await apiRequest('/x', { fetchImpl, baseUrl: 'http://x' });
        throw new Error('should throw');
      } catch (err) {
        expect(err.code).toBe(code);
      }
    }
  });

  test('handles non-JSON body and missing headers', async () => {
    const fetchImpl = async () => ({
      ok: true,
      status: 200,
      headers: {},
      text: async () => {
        throw new Error('no text');
      }
    });
    const res = await apiRequest('/health', { fetchImpl, baseUrl: 'http://x' });
    expect(res.status).toBe(200);
  });

  test('getHealth hits /health', async () => {
    let url = '';
    const fetchImpl = async (u) => {
      url = u;
      return { ok: true, status: 200, headers: { get: () => null }, text: async () => '{"status":"ok"}' };
    };
    await getHealth({ fetchImpl, baseUrl: 'http://b' });
    expect(url).toBe('http://b/health');
  });

  test('throws NETWORK_ERROR when fetch missing', async () => {
    const realFetch = globalThis.fetch;
    // @ts-ignore
    globalThis.fetch = undefined;
    try {
      await expect(apiRequest('/health', { baseUrl: 'http://x', fetchImpl: null })).rejects.toMatchObject({
        code: 'NETWORK_ERROR'
      });
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});

describe('auth edge cases', () => {
  test('rejects invalid session payload', async () => {
    const fetchImpl = async () => ({
      ok: true,
      status: 200,
      headers: { get: () => null },
      text: async () => JSON.stringify({ data: { token: null, user: null } })
    });
    await expect(
      login({ email: 'a@b.co', password: 'x' }, { fetchImpl, baseUrl: 'http://x', store: mem() })
    ).rejects.toThrow(/inválida/);
  });

  test('getAuthHeader returns Bearer or null', () => {
    const store = mem();
    expect(getAuthHeader(store)).toBeNull();
    store.setItem('helpdesk.session', JSON.stringify({ token: 't', user: { id: '1' } }));
    expect(getAuthHeader(store)).toBe('Bearer t');
  });
});
