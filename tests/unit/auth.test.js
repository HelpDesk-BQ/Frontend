import { currentUser, requireSession, logout, applyRoleVisibility } from '../../public/js/auth.js';

function stubFetch(handler) {
  global.fetch = handler;
}

describe('currentUser', () => {
  test('returns user from /me', async () => {
    stubFetch(async () => ({ ok: true, status: 200, json: async () => ({ data: { id: 'u-1', role: 'admin' } }) }));

    await expect(currentUser()).resolves.toEqual({ id: 'u-1', role: 'admin' });
  });

  test('returns null on 401', async () => {
    stubFetch(async () => ({
      ok: false,
      status: 401,
      json: async () => ({ error: { code: 'UNAUTHORIZED', message: 'Autenticação necessária.' } }),
    }));

    await expect(currentUser()).resolves.toBeNull();
  });
});

describe('requireSession', () => {
  test('returns user when role is allowed', async () => {
    stubFetch(async () => ({ ok: true, status: 200, json: async () => ({ data: { id: 'u-1', role: 'technician' } }) }));

    const user = await requireSession(['technician', 'admin']);
    expect(user).toEqual({ id: 'u-1', role: 'technician' });
  });

  test('returns null when unauthenticated (redirect handled by browser)', async () => {
    stubFetch(async () => ({
      ok: false,
      status: 401,
      json: async () => ({ error: { code: 'UNAUTHORIZED', message: 'x' } }),
    }));

    await expect(requireSession()).resolves.toBeNull();
  });

  test('returns null when role is not allowed', async () => {
    stubFetch(async () => ({ ok: true, status: 200, json: async () => ({ data: { id: 'u-1', role: 'requester' } }) }));

    await expect(requireSession(['admin'])).resolves.toBeNull();
  });
});

describe('logout', () => {
  test('calls logout endpoint', async () => {
    const seen = [];
    stubFetch(async (url, init) => {
      seen.push([url, init.method]);
      return { ok: true, status: 200, json: async () => ({ data: { loggedOut: true } }) };
    });

    // jsdom não navega de verdade (só registra); o redirecionamento é validado no roteiro manual.
    await logout('/login.html').catch(() => {});

    expect(seen).toEqual([['http://localhost:3000/api/sessions/logout', 'POST']]);
  });
});

describe('applyRoleVisibility', () => {
  test('hides elements outside the role', () => {
    document.body.innerHTML =
      '<button data-requires="admin">Excluir</button><a data-requires="requester technician">X</a>';
    applyRoleVisibility({ id: 'u-1', role: 'technician' });

    expect(document.querySelector('button').hidden).toBe(true);
    expect(document.querySelector('a').hidden).toBe(false);
  });
});
