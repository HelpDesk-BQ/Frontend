import { describe, test, expect } from '@jest/globals';
import { login, logout, getSession, isAuthenticated } from '../js/api/auth.js';

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k)
  };
}

describe('auth', () => {
  test('login posts normalized email and persists session', async () => {
    const store = memoryStorage();
    let seenBody = null;
    const fetchImpl = async (_url, init) => {
      seenBody = JSON.parse(init.body);
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'corr' },
        text: async () =>
          JSON.stringify({
            data: {
              token: 'tok-123',
              user: { id: 'u1', name: 'Lia', email: 'lia@exemplo.local', role: 'requester', active: true }
            }
          })
      };
    };

    const session = await login(
      { email: '  LIA@exemplo.local ', password: 'Solicitante123!' },
      { fetchImpl, baseUrl: 'http://localhost:3000', store }
    );

    expect(seenBody.email).toBe('lia@exemplo.local');
    expect(session.token).toBe('tok-123');
    expect(isAuthenticated(store)).toBe(true);
    expect(getSession(store).user.email).toBe('lia@exemplo.local');
  });

  test('login does not persist on 401', async () => {
    const store = memoryStorage();
    const fetchImpl = async () => ({
      ok: false,
      status: 401,
      headers: { get: () => 'c1' },
      text: async () =>
        JSON.stringify({ error: { code: 'INVALID_CREDENTIALS', message: 'Credenciais inválidas.', correlationId: 'c1' } })
    });

    await expect(
      login({ email: 'ghost@exemplo.local', password: 'x' }, { fetchImpl, baseUrl: 'http://x', store })
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    expect(isAuthenticated(store)).toBe(false);
  });

  test('logout clears session', async () => {
    const store = memoryStorage();
    store.setItem('helpdesk.session', JSON.stringify({ token: 't', user: { id: '1' } }));
    logout(store);
    expect(getSession(store)).toBeNull();
  });

  test('invalid stored JSON returns null session', async () => {
    const store = memoryStorage();
    store.setItem('helpdesk.session', 'not-json');
    expect(getSession(store)).toBeNull();
    expect(isAuthenticated(store)).toBe(false);
  });
});
