import { isLocalHost, isDemoMode, demoRole, applyDemoParam, demoRequest } from '../../public/js/demo-api.js';
import { api, tickets, ApiError } from '../../public/js/api.js';

function visit(search) {
  window.history.replaceState(null, '', `/screens/tickets.html${search}`);
  applyDemoParam();
}

describe('modo demonstração', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  test('fica desligado por padrão', () => {
    expect(isDemoMode()).toBe(false);
  });

  test('só existe em host local', () => {
    expect(isLocalHost('localhost')).toBe(true);
    expect(isLocalHost('127.0.0.1')).toBe(true);
    expect(isLocalHost('elo.etec.sp.gov.br')).toBe(false);
  });

  test('?demo=papel liga, grava o papel e limpa a URL', () => {
    visit('?demo=technician&id=1');
    expect(demoRole()).toBe('technician');
    expect(window.location.search).toBe('?id=1');
  });

  test('papel desconhecido cai em admin', () => {
    visit('?demo=1');
    expect(demoRole()).toBe('admin');
  });

  test('?demo=0 desliga', () => {
    visit('?demo=admin');
    visit('?demo=0');
    expect(isDemoMode()).toBe(false);
  });

  test('api() responde com dados fictícios sem rede', async () => {
    visit('?demo=admin');
    global.fetch = () => {
      throw new Error('não deveria chamar a rede');
    };
    const me = await api('/api/sessions/me', { redirect401: false });
    expect(me.role).toBe('admin');
    const list = await tickets.list({ status: 'open', limit: 3 });
    expect(list.items.length).toBeLessThanOrEqual(3);
    expect(list.items.every((t) => t.status === 'open')).toBe(true);
  });

  test('criar e comentar persistem entre chamadas', async () => {
    visit('?demo=requester');
    const created = await tickets.create({ title: 'Teste', description: 'Descrição longa o bastante', priority: 'low' });
    await tickets.addComment(created.id, 'Primeiro comentário');
    const comments = await tickets.listComments(created.id);
    expect(comments.map((c) => c.body)).toContain('Primeiro comentário');
    const history = await tickets.listHistory(created.id);
    expect(history.at(-1).event).toBe('comment.added');
  });

  test('transição inválida vira ApiError 422', async () => {
    visit('?demo=admin');
    const { items } = await tickets.list({ status: 'open', limit: 1 });
    await expect(tickets.changeStatus(items[0].id, { status: 'closed' })).rejects.toBeInstanceOf(ApiError);
  });

  test('sem sessão, /me responde 401', async () => {
    visit('?demo=admin');
    await demoRequest('/api/sessions/logout', { method: 'POST' });
    const result = await demoRequest('/api/sessions/me');
    expect(result.status).toBe(401);
  });
});
