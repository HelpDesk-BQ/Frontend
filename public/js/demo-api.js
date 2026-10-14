// Modo demonstração: API falsa em memória para revisar a UI sem backend.
//
// Liga só em host local (localhost / 127.0.0.1 / [::1]) e só quando pedido:
//   ?demo=admin | ?demo=technician | ?demo=requester   (ou ?demo=1 → admin)
//   ?demo=0  desliga e apaga os dados fictícios
//   &banner=0  esconde a faixa de aviso (para screenshots), nesta aba
// A escolha fica no localStorage; os dados (chamados, comentários, histórico)
// ficam no sessionStorage, então criar/comentar/mudar estado persiste entre
// telas até fechar a aba. Em produção (qualquer outro host) nunca é ativado.

import { ALLOWED_TRANSITIONS } from './transitions.js';

const MODE_KEY = 'elo-demo';
const BANNER_KEY = 'elo-demo-banner';
const DB_KEY = 'elo-demo-db';
const ROLES = ['admin', 'technician', 'requester'];
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]', '::1'];
const LATENCY_MS = 220;

function storage(kind) {
  try {
    return window[kind];
  } catch {
    return null;
  }
}

export function isLocalHost(hostname = window.location.hostname) {
  return LOCAL_HOSTS.includes(hostname);
}

// Aplica ?demo=… uma vez por carregamento: grava a escolha, recomeça os
// dados fictícios e tira o parâmetro da barra de endereço.
export function applyDemoParam(location = window.location) {
  if (!isLocalHost(location.hostname)) return;
  const url = new URL(location.href);
  const param = url.searchParams.get('demo');
  if (param === null) return;
  const local = storage('localStorage');
  if (param === '0' || param === 'off') local?.removeItem(MODE_KEY);
  else local?.setItem(MODE_KEY, ROLES.includes(param) ? param : 'admin');
  storage('sessionStorage')?.removeItem(DB_KEY);
  if (url.searchParams.get('banner') === '0') storage('sessionStorage')?.setItem(BANNER_KEY, 'off');
  url.searchParams.delete('demo');
  url.searchParams.delete('banner');
  window.history.replaceState(null, '', url.pathname + url.search + url.hash);
}

// Papel ativo no modo demo, ou null (sempre null fora de host local).
export function demoRole() {
  if (!isLocalHost()) return null;
  const role = storage('localStorage')?.getItem(MODE_KEY);
  return ROLES.includes(role) ? role : null;
}

export function isDemoMode() {
  return demoRole() !== null;
}

/* ---------- Dados fictícios ---------- */

const USERS = [
  { id: 'u-admin', name: 'Ana Ribeiro', email: 'ana.ribeiro@etec.sp.gov.br', role: 'admin' },
  { id: 'u-tec-1', name: 'Carlos Mendes', email: 'carlos.mendes@etec.sp.gov.br', role: 'technician' },
  { id: 'u-tec-2', name: 'Beatriz Lima', email: 'beatriz.lima@etec.sp.gov.br', role: 'technician' },
  { id: 'u-req', name: 'João Pereira', email: 'joao.pereira@etec.sp.gov.br', role: 'requester' },
];

const USER_FOR_ROLE = { admin: 'u-admin', technician: 'u-tec-1', requester: 'u-req' };

const SEED = [
  ['Impressora do setor fiscal parou', 'A impressora HP do setor fiscal não imprime desde ontem. Aparece "erro de bobina".', 'open', 'high', null],
  ['Rede sem fio instável no laboratório 3', 'A rede cai a cada 10 minutos durante as aulas práticas, afetando cerca de 30 alunos.', 'analysis', 'critical', 'u-tec-1'],
  ['Conta de e-mail institucional bloqueada', 'Professora não consegue acessar o e-mail após troca de senha.', 'in_progress', 'medium', 'u-tec-2'],
  ['Troca de projetor da sala 12', 'Projetor com imagem amarelada e lâmpada piscando.', 'resolved', 'medium', 'u-tec-1'],
  ['Instalar software de CAD nos PCs do lab 5', 'Precisamos do AutoCAD instalado nas 20 máquinas antes do início do módulo.', 'open', 'low', null],
  ['Computador da secretaria não liga', 'Ao apertar o botão nada acontece. Fonte pode ter queimado.', 'in_progress', 'high', 'u-tec-2'],
  ['Acesso ao sistema acadêmico negado', 'Coordenador recebe "acesso negado" ao abrir o diário de classe.', 'analysis', 'high', 'u-tec-1'],
  ['Teclado com teclas falhando', 'Teclas A, S e D não respondem no PC 07 do lab 2.', 'closed', 'low', 'u-tec-2'],
  ['Atualizar antivírus dos servidores', 'Licença expira na sexta-feira; renovar e atualizar definições.', 'open', 'medium', null],
  ['Câmera da sala de reunião sem imagem', 'Videoconferência sem vídeo; câmera USB não é reconhecida.', 'resolved', 'low', 'u-tec-1'],
  ['Servidor de arquivos lento', 'Abrir pastas compartilhadas leva mais de um minuto.', 'in_progress', 'critical', 'u-tec-1'],
  ['Mouse sem fio sem pilha na biblioteca', 'Dois mouses sem funcionar nas estações de consulta.', 'closed', 'low', 'u-tec-2'],
  ['Wi-Fi não alcança o auditório', 'Sinal fraco no fundo do auditório durante eventos.', 'open', 'medium', null],
  ['Licença do Office expirada no lab 1', 'Word abre em modo somente leitura em todas as máquinas.', 'analysis', 'medium', 'u-tec-2'],
];

const HOUR = 3600 * 1000;

function buildDb() {
  const now = Date.now();
  const tickets = [];
  const comments = {};
  const history = {};
  SEED.forEach(([title, description, status, priority, assignee], index) => {
    const id = `d${String(1042 - index).padStart(7, '0')}-demo`;
    const created = now - (index * 7 + 3) * HOUR;
    tickets.push({
      id,
      title,
      description,
      status,
      priority,
      assignee_id: assignee,
      requester_id: index % 3 === 0 ? 'u-req' : 'u-admin',
      created_at: new Date(created).toISOString(),
      updated_at: new Date(created + 2 * HOUR).toISOString(),
    });
    // Histórico coerente com o estado atual (percorre o fluxo até ele).
    const path = ['open', 'analysis', 'in_progress', 'resolved', 'closed'];
    const reached = path.slice(0, path.indexOf(status) + 1);
    history[id] = reached.slice(1).map((to, step) => ({
      id: `${id}-h${step}`,
      event: 'status.changed',
      before: reached[step],
      after: to,
      created_at: new Date(created + (step + 1) * HOUR).toISOString(),
    }));
    comments[id] =
      status === 'open'
        ? []
        : [
            {
              id: `${id}-c0`,
              body: 'Recebido. Vou verificar no local ainda hoje.',
              author_id: assignee,
              created_at: new Date(created + HOUR / 2).toISOString(),
            },
          ];
  });
  return { session: null, tickets, comments, history };
}

function load() {
  const session = storage('sessionStorage');
  try {
    const saved = session?.getItem(DB_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    /* dados corrompidos: recria */
  }
  const db = buildDb();
  db.session = USER_FOR_ROLE[demoRole() || 'admin'];
  save(db);
  return db;
}

function save(db) {
  try {
    storage('sessionStorage')?.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    /* sem storage: segue só em memória nesta tela */
  }
}

/* ---------- Roteamento ---------- */

const ok = (data, status = 200) => ({ ok: true, status, payload: { data } });
const fail = (status, code, message) => ({ ok: false, status, payload: { error: { code, message } } });

function userById(id) {
  return USERS.find((u) => u.id === id) || null;
}

function visibleTickets(db, user) {
  return user.role === 'requester' ? db.tickets.filter((t) => t.requester_id === user.id) : db.tickets;
}

function touch(ticket) {
  ticket.updated_at = new Date().toISOString();
}

function addHistory(db, id, event, before, after) {
  (db.history[id] ||= []).push({
    id: `${id}-h${Date.now()}`,
    event,
    before,
    after,
    created_at: new Date().toISOString(),
  });
}

function route(db, method, url, body) {
  const path = url.pathname;
  const params = url.searchParams;
  const user = userById(db.session);

  if (path === '/api/sessions' && method === 'POST') {
    db.session = USER_FOR_ROLE[demoRole() || 'admin'];
    return ok(userById(db.session));
  }
  if (path === '/api/sessions/logout' && method === 'POST') {
    db.session = null;
    return ok({});
  }
  if (path === '/api/sessions/me') {
    return user ? ok(user) : fail(401, 'UNAUTHENTICATED', 'Sessão expirada.');
  }
  if (!user) return fail(401, 'UNAUTHENTICATED', 'Sessão expirada.');

  if (path === '/api/users') {
    const role = params.get('role');
    return ok(USERS.filter((u) => !role || u.role === role));
  }

  if (path === '/api/reports/summary') {
    const items = visibleTickets(db, user).filter(
      (t) => (!params.get('status') || t.status === params.get('status')) && (!params.get('priority') || t.priority === params.get('priority'))
    );
    const byStatus = {};
    const byPriority = {};
    for (const t of items) {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
      byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
    }
    return ok({ total: items.length, byStatus, byPriority });
  }

  if (path === '/api/tickets' && method === 'POST') {
    const now = new Date().toISOString();
    const ticket = {
      id: `d${Date.now()}-demo`,
      title: body.title,
      description: body.description,
      priority: body.priority,
      status: 'open',
      assignee_id: null,
      requester_id: user.id,
      created_at: now,
      updated_at: now,
    };
    db.tickets.unshift(ticket);
    db.comments[ticket.id] = [];
    db.history[ticket.id] = [];
    return ok(ticket, 201);
  }

  if (path === '/api/tickets' && method === 'GET') {
    const items = visibleTickets(db, user)
      .filter((t) => (!params.get('status') || t.status === params.get('status')) && (!params.get('priority') || t.priority === params.get('priority')))
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    const page = Math.max(1, Number(params.get('page')) || 1);
    const limit = Math.max(1, Number(params.get('limit')) || 20);
    return ok({ items: items.slice((page - 1) * limit, page * limit), total: items.length, page, limit });
  }

  const match = path.match(/^\/api\/tickets\/([^/]+)(?:\/(status|priority|assignee|comments|history))?$/);
  if (!match) return fail(404, 'NOT_FOUND', 'Recurso não encontrado.');
  const [, id, sub] = match;
  const ticket = visibleTickets(db, user).find((t) => t.id === decodeURIComponent(id));
  if (!ticket) return fail(404, 'TICKET_NOT_FOUND', 'Chamado não encontrado.');

  if (!sub && method === 'GET') return ok(ticket);
  if (!sub && method === 'DELETE') {
    db.tickets = db.tickets.filter((t) => t.id !== ticket.id);
    return ok({});
  }
  if (sub === 'status') {
    if (!(ALLOWED_TRANSITIONS[ticket.status] || []).includes(body.status)) {
      return fail(422, 'INVALID_TRANSITION', 'Transição de estado não permitida.');
    }
    addHistory(db, ticket.id, 'status.changed', ticket.status, body.status);
    ticket.status = body.status;
    if (body.comment) {
      db.comments[ticket.id].push({ id: `${ticket.id}-c${Date.now()}`, body: body.comment, author_id: user.id, created_at: new Date().toISOString() });
    }
    touch(ticket);
    return ok(ticket);
  }
  if (sub === 'priority') {
    const changed = ticket.priority !== body.priority;
    if (changed) {
      addHistory(db, ticket.id, 'priority.changed', ticket.priority, body.priority);
      ticket.priority = body.priority;
      touch(ticket);
    }
    return ok({ ...ticket, changed });
  }
  if (sub === 'assignee') {
    const next = body.assigneeId || null;
    const changed = ticket.assignee_id !== next;
    if (changed) {
      addHistory(db, ticket.id, 'assignee.changed', userById(ticket.assignee_id)?.name ?? null, userById(next)?.name ?? 'Sem responsável');
      ticket.assignee_id = next;
      touch(ticket);
    }
    return ok({ ...ticket, changed });
  }
  if (sub === 'comments' && method === 'POST') {
    const comment = { id: `${ticket.id}-c${Date.now()}`, body: body.body, author_id: user.id, created_at: new Date().toISOString() };
    db.comments[ticket.id].push(comment);
    addHistory(db, ticket.id, 'comment.added', null, null);
    touch(ticket);
    return ok(comment, 201);
  }
  if (sub === 'comments') return ok(db.comments[ticket.id] || []);
  if (sub === 'history') return ok(db.history[ticket.id] || []);
  return fail(405, 'METHOD_NOT_ALLOWED', 'Operação não suportada.');
}

// Mesmo formato que o api() lê de um fetch: { ok, status, payload }.
export async function demoRequest(path, { method = 'GET', body } = {}) {
  await new Promise((resolve) => setTimeout(resolve, LATENCY_MS));
  const db = load();
  const result = route(db, method, new URL(path, 'http://demo.local'), body || {});
  save(db);
  return result;
}

/* ---------- Faixa de aviso ---------- */

function showBanner(role) {
  if (document.querySelector('.demo-banner')) return;
  const labels = { admin: 'administrador', technician: 'técnico', requester: 'solicitante' };
  const bar = document.createElement('div');
  bar.className = 'demo-banner';
  bar.setAttribute('role', 'status');
  const text = document.createElement('span');
  text.textContent = `Modo demonstração · dados fictícios · papel: ${labels[role]}`;
  const links = document.createElement('span');
  links.className = 'demo-banner__links';
  const hrefFor = (value) => {
    const url = new URL(window.location.href);
    url.searchParams.set('demo', value);
    return url.pathname + url.search;
  };
  for (const r of ROLES.filter((r) => r !== role)) {
    const a = document.createElement('a');
    a.href = hrefFor(r);
    a.textContent = `ver como ${labels[r]}`;
    links.append(a);
  }
  const off = document.createElement('a');
  off.href = hrefFor('0');
  off.textContent = 'sair do modo demo';
  links.append(off);
  bar.append(text, links);
  document.body.append(bar);
}

applyDemoParam();
const activeRole = demoRole();
if (activeRole && storage('sessionStorage')?.getItem(BANNER_KEY) !== 'off') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => showBanner(activeRole));
  } else {
    showBanner(activeRole);
  }
}
