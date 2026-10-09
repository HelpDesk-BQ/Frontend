import { describe, test, expect } from '@jest/globals';
import {
  listTickets,
  getTicket,
  createTicket,
  changeTicketStatus,
  changeTicketPriority,
  changeTicketAssignee,
  addTicketComment,
  listTicketComments,
  listTicketHistory,
  removeTicket
} from '../js/api/tickets.js';
import { getSummary } from '../js/api/reports.js';
import { authRequest } from '../js/api/auth.js';

function memWithSession() {
  const m = new Map();
  m.set('helpdesk.session', JSON.stringify({ token: 'tok', user: { id: 'u1', role: 'technician' } }));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k)
  };
}

function okFetch(body) {
  return async () => ({
    ok: true,
    status: 200,
    headers: { get: () => 'corr' },
    text: async () => JSON.stringify({ data: body })
  });
}

describe('tickets api', () => {
  test('listTickets monta query e devolve paginação', async () => {
    let url = '';
    const fetchImpl = async (u) => {
      url = u;
      return okFetch({ items: [{ id: '1' }], total: 1, page: 2, limit: 20 })();
    };
    const res = await listTickets(
      { status: 'open', priority: 'high', page: 2, limit: 20 },
      { fetchImpl, baseUrl: 'http://b', store: memWithSession() }
    );
    expect(url).toContain('/api/tickets?');
    expect(url).toContain('status=open');
    expect(url).toContain('page=2');
    expect(res.total).toBe(1);
  });

  test('getTicket busca por id', async () => {
    const res = await getTicket('abc', {
      fetchImpl: okFetch({ id: 'abc', status: 'open' }),
      baseUrl: 'http://b',
      store: memWithSession()
    });
    expect(res.id).toBe('abc');
  });

  test('createTicket envia título, descrição e prioridade', async () => {
    let body = null;
    const fetchImpl = async (_u, init) => {
      body = JSON.parse(init.body);
      return { ok: true, status: 201, headers: { get: () => null }, text: async () => JSON.stringify({ data: { id: 'n' } }) };
    };
    await createTicket(
      { title: 'Título com mais de dez', description: 'x'.repeat(30), priority: 'high' },
      { fetchImpl, baseUrl: 'http://b', store: memWithSession() }
    );
    expect(body.priority).toBe('high');
  });

  test('changeTicketStatus omite comentário vazio', async () => {
    let body = null;
    const fetchImpl = async (_u, init) => {
      body = JSON.parse(init.body);
      return okFetch({ ticket: {}, comment: null })();
    };
    await changeTicketStatus(
      'id1',
      { status: 'analysis', comment: '   ' },
      { fetchImpl, baseUrl: 'http://b', store: memWithSession() }
    );
    expect(body).toEqual({ status: 'analysis' });
  });

  test('changeTicketPriority / changeAssignee normalizam entrada', async () => {
    const seen = [];
    const fetchImpl = async (_u, init) => {
      seen.push(JSON.parse(init.body));
      return okFetch({ ticket: {}, changed: true })();
    };
    const store = memWithSession();
    await changeTicketPriority('i', { priority: 'critical' }, { fetchImpl, baseUrl: 'http://b', store });
    await changeTicketAssignee('i', { assigneeId: '  ' }, { fetchImpl, baseUrl: 'http://b', store });
    expect(seen[0]).toEqual({ priority: 'critical' });
    expect(seen[1]).toEqual({ assigneeId: null });
  });

  test('comments: criar apara texto, listar devolve [] quando ausente', async () => {
    let body = null;
    const post = async (_u, init) => {
      body = JSON.parse(init.body);
      return okFetch({ id: 'c1' })();
    };
    await addTicketComment('t', { body: '  oi  ' }, { fetchImpl: post, baseUrl: 'http://b', store: memWithSession() });
    expect(body).toEqual({ body: 'oi' });

    const empty = async () => ({ ok: true, status: 200, headers: { get: () => null }, text: async () => '{}' });
    const store = memWithSession();
    expect(await listTicketComments('t', { fetchImpl: empty, baseUrl: 'http://b', store })).toEqual([]);
    expect(await listTicketHistory('t', { fetchImpl: empty, baseUrl: 'http://b', store })).toEqual([]);
  });

  test('removeTicket envia justificativa aparada', async () => {
    let body = null;
    const fetchImpl = async (_u, init) => {
      body = JSON.parse(init.body);
      return okFetch({ id: 't' })();
    };
    await removeTicket('t', { justification: '  duplicado  ' }, { fetchImpl, baseUrl: 'http://b', store: memWithSession() });
    expect(body).toEqual({ justification: 'duplicado' });
  });

  test('sem sessão, falha local sem chamar fetch', async () => {
    const emptyStore = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
    let called = false;
    await expect(
      listTickets({}, { fetchImpl: async () => { called = true; }, baseUrl: 'http://b', store: emptyStore })
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    expect(called).toBe(false);
  });

  test('authRequest propaga 401 ao onUnauthorized', async () => {
    const fetchImpl = async () => ({
      ok: false,
      status: 401,
      headers: { get: () => null },
      text: async () => JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'x', correlationId: 'c' } })
    });
    let notified = false;
    await expect(
      getTicket('x', { fetchImpl, baseUrl: 'http://b', store: memWithSession(), onUnauthorized: () => { notified = true; } })
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    expect(notified).toBe(true);
  });
});

describe('reports api', () => {
  test('getSummary devolve total e mapas', async () => {
    const res = await getSummary(
      { status: 'open' },
      { fetchImpl: okFetch({ total: 3, byStatus: { open: 3 }, byPriority: { high: 1 } }), baseUrl: 'http://b', store: memWithSession() }
    );
    expect(res.total).toBe(3);
    expect(res.byStatus.open).toBe(3);
  });

  test('getSummary sem dados devolve forma vazia', async () => {
    const empty = async () => ({ ok: true, status: 200, headers: { get: () => null }, text: async () => '{}' });
    expect(await getSummary({}, { fetchImpl: empty, baseUrl: 'http://b', store: memWithSession() })).toEqual({
      total: 0,
      byStatus: {},
      byPriority: {}
    });
  });
});

describe('authRequest', () => {
  test('executa fn com token da sessão', async () => {
    const out = await authRequest(async (token) => `got ${token}`, { store: memWithSession() });
    expect(out).toBe('got tok');
  });
});
