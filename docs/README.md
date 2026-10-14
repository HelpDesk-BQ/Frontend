# Elo · documentação técnica

Interface web do Elo: HTML, CSS e JavaScript nativos (ES modules), multipágina, **sem
build e sem dependências de runtime**. As páginas ficam em `public/` e falam com a API do
[Backend](https://github.com/HelpDesk-BQ/Backend).

- Design system (tokens, componentes, regras): [`design-system.md`](design-system.md)
- Visão geral e screenshots: [`../README.md`](../README.md)

---

## Sumário

1. [Estrutura](#estrutura)
2. [Páginas e rotas da API](#páginas-e-rotas-da-api)
3. [Papéis e o que cada um vê](#papéis-e-o-que-cada-um-vê)
4. [Módulos JavaScript](#módulos-javascript)
5. [Rodando localmente](#rodando-localmente)
6. [Modo demonstração](#modo-demonstração)
7. [Testes e CI](#testes-e-ci)
8. [Segurança](#segurança)
9. [Acessibilidade e responsividade](#acessibilidade-e-responsividade)
10. [Deploy na Vercel](#deploy-na-vercel)

---

## Estrutura

```
public/
├── index.html              landing page
├── serve.json              rewrite "/" → index.html (servidor local)
├── assets/                 logo, favicon, ícone PNG e sprite de ícones (icons.svg)
├── css/
│   ├── tokens.css          design tokens (cor, tipo, raio, espaço, sombra, movimento)
│   ├── base.css            reset, tipografia, foco, navbar da landing
│   ├── components.css      botões, campos, cards, pills, tabelas, toast, esqueleto…
│   ├── landing.css         estilos só da landing
│   └── app.css             casca do app (barra lateral), dashboard, lista, detalhe
├── js/
│   ├── api.js              cliente HTTP (cookie httpOnly, contrato de erro)
│   ├── auth.js             sessão, requireSession, RBAC de interface
│   ├── demo-api.js         API falsa em memória para o modo demo (só localhost)
│   ├── shell.js            casca do app: usuário, gaveta mobile, progresso, flash
│   ├── ticket-rows.js      linhas de tabela de chamados (dashboard e lista)
│   ├── ui.js               helpers de DOM: textContent, pills, modal, toast, ícones…
│   ├── validators.js       validação dos formulários (espelha o backend)
│   ├── transitions.js      mapa de transições de estado (espelho do backend)
│   ├── nav.js              menu mobile da landing
│   ├── landing.js          animações e scrollspy da landing
│   ├── pixel-blast.js      fundo pixelado em WebGL (sem dependências)
│   └── pages/              um módulo por tela: login, dashboard, tickets, novo, detalhe
└── screens/                telas do app: login, dashboard, tickets, novo, detalhe, 404
tests/unit/                 Jest + jsdom (api, auth, ui, validators, transitions, demo)
```

## Páginas e rotas da API

| Tela | Rotas usadas | Observações |
| --- | --- | --- |
| `/` (landing) | — | apresentação; links para entrar e abrir chamado |
| `screens/login.html` | `POST /api/sessions`, `GET /api/sessions/me` | 401 credencial inválida · 423 bloqueio após 3 tentativas |
| `screens/dashboard.html` | `GET /api/reports/summary`, `GET /api/tickets` | conteúdo muda por papel (ver abaixo) |
| `screens/tickets.html` | `GET /api/tickets`, `GET /api/reports/summary` | abas por estado com contagem, filtro de prioridade, paginação; filtros na URL (`?status=&priority=`) |
| `screens/novo.html` | `POST /api/tickets` | destaque só para o solicitante; a rota é aberta a todos os autenticados |
| `screens/detalhe.html?id=` | `GET/DELETE /api/tickets/:id`, `PATCH …/status`, `…/priority`, `…/assignee`, `GET/POST …/comments`, `GET …/history`, `GET /api/users?role=technician` | duas colunas: conteúdo à esquerda, ações à direita |
| `screens/404.html` | — | página não encontrada |

O front-end **não define regras**: transições, permissões e validações finais são do
servidor. `transitions.js` e `validators.js` só evitam idas e voltas desnecessárias.

## Papéis e o que cada um vê

| | Solicitante | Técnico | Administrador |
| --- | --- | --- | --- |
| Navegação | Início · Meus chamados | Dashboard · Chamados | Dashboard · Chamados |
| Dashboard | chamada para abrir chamado + seus chamados em andamento | precisa de atenção, fluxo, fila urgente, prioridade | igual ao técnico |
| "Novo chamado" no topo | sim | não | não |
| Chamados | só os próprios (o servidor filtra) | fila autorizada | todos |
| Detalhe | lê, comenta | + muda estado, prioridade e responsável | + exclui com justificativa |

A visibilidade na interface usa `data-requires="papel …"` + `applyRoleVisibility(user)`
(`auth.js`). Esconder na interface não é segurança — o servidor valida cada ação.

## Módulos JavaScript

- **`api.js`** — `api(path, { method, body })` com `credentials: 'include'`, cabeçalho
  `X-Correlation-Id` e erros como `ApiError(status, code, message, correlationId)`.
  401 fora do login redireciona para `login.html?motivo=sessao`. Emite o evento
  `elo:request` (+1/−1) que a casca usa para a barra de progresso.
- **`shell.js`** — `initShell(user)`: preenche nome/e-mail/papel, troca rótulos do
  solicitante, contagem de ativos, gaveta mobile, barra de progresso e `consumeFlash()`.
- **`ui.js`** — tudo que toca o DOM com texto usa `setText` (nunca `innerHTML`). Também:
  `statusPill`, `priorityPill`, `renderEmpty`, `renderFatal`, `confirmModal` (foco preso),
  `setBusy` (spinner + `data-busy-label`), `toast`, `flash`/`consumeFlash`, `icon`, `timeAgo`.
- **`ticket-rows.js`** — `ticketRow(item, { user, columns })`: linha clicável, selos
  "novo" (< 24h) e "com você" (responsável = usuário, se a API trouxer `assignee_id`).

## Rodando localmente

Requisitos: Node 20+ (só para servir e testar; o site não tem build).

```bash
npm install
npm run dev            # serve public/ em http://localhost:5500
```

Com a API local rodando em `http://localhost:3000` (porta 5500 casa com o `CORS_ORIGIN` do
backend). Login de exemplo do seed do backend: `lia@exemplo.local` / `Solicitante123!`.

Sem backend, use o [modo demonstração](#modo-demonstração).

## Modo demonstração

Para revisar a interface sem API nem Postgres:

| URL | Efeito |
| --- | --- |
| `…/screens/dashboard.html?demo=admin` | entra como administrador |
| `?demo=technician` · `?demo=requester` | técnico · solicitante |
| `?demo=0` | desliga e volta para a API real |
| `&banner=0` | esconde a faixa de aviso nesta aba (útil para screenshots) |

`demo-api.js` responde a todos os endpoints com 14 chamados fictícios, técnicos,
comentários, histórico e totais. Criar, comentar, mudar estado/prioridade/responsável e
excluir funcionam e persistem na aba (`sessionStorage`). Transições inválidas são
recusadas como no servidor.

**Só liga em `localhost` / `127.0.0.1` / `[::1]`** e só quando pedido por `?demo=`. Em
qualquer outro host (deploy) o código é ignorado e a API real é usada.

## Testes e CI

```bash
npm test               # Jest + jsdom
npm run test:coverage  # com cobertura (limite global de 80%)
npm run lint           # ESLint
```

A cobertura mede `api.js`, `auth.js`, `ui.js` e `validators.js`. Os módulos de página são
fiação fina, verificada manualmente (ou no modo demo).

O workflow `.github/workflows/ci.yml` roda em todo PR e push na `main`: `npm ci`,
lint, testes com cobertura e `npm audit --audit-level=high`.

## Segurança

- **Sessão em cookie `httpOnly`** (`helpdesk_token`, `SameSite=Lax`). Nenhum token em JS
  ou storage; `fetch` sempre com `credentials: 'include'`.
- **XSS:** só `textContent`; CSP restritiva em toda página (`script-src 'self'`, sem
  inline); estilos dinâmicos só via CSSOM.
- **CSRF:** mutações só em POST/PATCH/DELETE (Lax bloqueia cross-site); nenhum GET com efeito.
- **Erros 500** mostram um código de suporte (correlation id) com botão de copiar.
- Exclusão exige justificativa e digitar o título do chamado.

## Acessibilidade e responsividade

- Labels associados, erros junto ao campo com foco, regiões `aria-live`, skip-link,
  foco visível (contorno de 2px), modal com foco preso e Esc.
- Estado e prioridade sempre em texto + símbolo, nunca só cor.
- Esqueletos e spinners têm texto alternativo; ícones são decorativos (`aria-hidden`).
- `prefers-reduced-motion` desliga animações, transições e o fundo animado.
- Layout fluido até 1600px; barra lateral vira gaveta abaixo de 900px; tabelas viram
  cartões abaixo de 640px; testado em 375px sem rolagem horizontal.

## Deploy na Vercel

O site é estático: na Vercel, **Framework Preset: Other**, sem comando de build,
**Output Directory: `public`**. A Vercel serve `index.html` em `/` sozinha (o `serve.json`
é só para o servidor local).

Antes de apontar para a API em produção, há três ajustes — todos no front-end, exceto o
último:

1. **URL da API.** `api.js` usa `globalThis.HELPDESK_API_URL` e cai em
   `http://localhost:3000`. Definir a URL de produção (por exemplo, um `public/js/config.js`
   carregado antes dos módulos, ou trocar o valor padrão).
2. **CSP.** Cada HTML tem `connect-src 'self' http://localhost:3000`. Trocar pelo domínio
   da API em produção (ou mover a CSP para cabeçalhos num `vercel.json`).
3. **Cookie entre domínios (backend).** Com front e API em domínios diferentes, o cookie
   `SameSite=Lax` não viaja nos `fetch`. Ou os dois ficam no mesmo site (ex.:
   `app.dominio` + `api.dominio`), ou o backend passa a usar `SameSite=None; Secure` e CORS
   com `credentials` para a origem da Vercel.
