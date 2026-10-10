import { api, ApiError, API_BASE_URL, sessions, tickets, reports, users } from '../../public/js/api.js';

function mockFetchOnce({ status = 200, body = {} } = {}) {
  global.fetch = async () => ({ ok: status >= 200 && status < 300, status, json: async () => body });
}

describe('api base', () => {
  test('targets the local backend by default', () => {
    expect(API_BASE_URL).toBe('http://localhost:3000');
  });
});

describe('api()', () => {
  test('sends credentials and unwraps { data }', async () => {
    let seen;
    global.fetch = async (url, init) => {
      seen = { url, init };
      return { ok: true, status: 200, json: async () => ({ data: { id: 't-1' } }) };
    };

    const result = await api('/tickets/t-1');

    expect(result).toEqual({ id: 't-1' });
    expect(seen.url).toBe('http://localhost:3000/tickets/t-1');
    expect(seen.init.credentials).toBe('include');
    expect(seen.init.method).toBe('GET');
  });

  test('posts JSON bodies', async () => {
    let seen;
    global.fetch = async (url, init) => {
      seen = init;
      return { ok: true, status: 201, json: async () => ({ data: {} }) };
    };

    await api('/tickets', { method: 'POST', body: { title: 'x' } });

    expect(seen.method).toBe('POST');
    expect(JSON.parse(seen.body)).toEqual({ title: 'x' });
    expect(seen.headers['Content-Type']).toBe('application/json');
  });

  test('throws ApiError with backend code on failure', async () => {
    mockFetchOnce({
      status: 403,
      body: { error: { code: 'FORBIDDEN', message: 'Ação não autorizada.', correlationId: 'c-1' } },
    });

    const error = await api('/tickets/x').catch((err) => err);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(403);
    expect(error.code).toBe('FORBIDDEN');
    expect(error.message).toBe('Ação não autorizada.');
  });

  test('maps network failure to safe message', async () => {
    global.fetch = async () => {
      throw new TypeError('fetch failed');
    };

    const error = await api('/tickets').catch((err) => err);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('NETWORK_ERROR');
    expect(error.message).toBe('Verifique sua conexão.');
  });

  test('falls back to generic error without backend envelope', async () => {
    mockFetchOnce({ status: 500, body: {} });

    const error = await api('/tickets').catch((err) => err);

    expect(error.code).toBe('REQUEST_FAILED');
    expect(error.message).toBe('Não foi possível concluir.');
  });

  test('skips empty query params', async () => {
    let seen;
    global.fetch = async (requestUrl, init) => {
      seen = [requestUrl, init.method];
      return { ok: true, status: 200, json: async () => ({ data: {} }) };
    };

    await tickets.list({ status: '', priority: undefined });

    expect(seen).toEqual(['http://localhost:3000/api/tickets', 'GET']);
  });

  test('carries correlation id and redirects on 401 outside login', async () => {
    mockFetchOnce({
      status: 401,
      body: { error: { code: 'UNAUTHORIZED', message: 'Autenticação necessária.', correlationId: 'req_1' } },
    });

    const error = await api('/tickets').catch((err) => err);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.correlationId).toBe('req_1');
  });

  test('generates correlation id without crypto', async () => {
    const realCrypto = globalThis.crypto;
    let seen;
    global.fetch = async (requestUrl, init) => {
      seen = init;
      return { ok: true, status: 200, json: async () => ({ data: {} }) };
    };
    try {
      Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });
      await api('/tickets');
      expect(seen.headers['X-Correlation-Id']).toMatch(/^web_/);
    } finally {
      Object.defineProperty(globalThis, 'crypto', { value: realCrypto, configurable: true });
    }
  });
});

describe('endpoint helpers', () => {
  test.each([
    ['login', () => sessions.login('a@b.c', 'pw'), 'http://localhost:3000/api/sessions', 'POST'],
    ['logout', () => sessions.logout(), 'http://localhost:3000/api/sessions/logout', 'POST'],
    ['me', () => sessions.me(), 'http://localhost:3000/api/sessions/me', 'GET'],
    ['create', () => tickets.create({ title: 't' }), 'http://localhost:3000/api/tickets', 'POST'],
    ['list with filters', () => tickets.list({ status: 'open', page: 2 }), 'http://localhost:3000/api/tickets?status=open&page=2', 'GET'],
    ['get', () => tickets.get('t-1'), 'http://localhost:3000/api/tickets/t-1', 'GET'],
    ['changeStatus', () => tickets.changeStatus('t-1', { status: 'analysis' }), 'http://localhost:3000/api/tickets/t-1/status', 'PATCH'],
    ['changePriority', () => tickets.changePriority('t-1', 'high'), 'http://localhost:3000/api/tickets/t-1/priority', 'PATCH'],
    ['changeAssignee', () => tickets.changeAssignee('t-1', null), 'http://localhost:3000/api/tickets/t-1/assignee', 'PATCH'],
    ['remove', () => tickets.remove('t-1', 'x'), 'http://localhost:3000/api/tickets/t-1', 'DELETE'],
    ['addComment', () => tickets.addComment('t-1', 'oi'), 'http://localhost:3000/api/tickets/t-1/comments', 'POST'],
    ['listComments', () => tickets.listComments('t-1'), 'http://localhost:3000/api/tickets/t-1/comments', 'GET'],
    ['listHistory', () => tickets.listHistory('t-1'), 'http://localhost:3000/api/tickets/t-1/history', 'GET'],
    ['summary', () => reports.summary({}), 'http://localhost:3000/api/reports/summary', 'GET'],
    ['users all', () => users.list(), 'http://localhost:3000/api/users', 'GET'],
    ['users by role', () => users.list('technician'), 'http://localhost:3000/api/users?role=technician', 'GET'],
  ])('%s hits %s with %s', async (_label, call, url, method) => {
    let seen;
    global.fetch = async (requestUrl, init) => {
      seen = [requestUrl, init.method];
      return { ok: true, status: 200, json: async () => ({ data: {} }) };
    };

    await call();

    expect(seen).toEqual([url, method]);
  });
});
