# Frontend — HelpDesk BQ

HTML + CSS + JS puro, sem framework. Cliente real do backend Express.

## Rotas reais consumidas

- `GET /health` — selo de estado em `index.html`.
- `POST /api/sessions` — login em `login.html` (`{ email, password }` estrito).
- `GET /api/tickets?status=&priority=&page=&limit=` — lista em `tickets.html`
  (`{ items, total, page, limit }`).
- `POST /api/tickets` — abertura em `ticket-new.html`
  (`{ title 10–100, description 30–5000, priority }` → 201).
- `GET /api/tickets/:id` — detalhe em `ticket-detail.html`.
- `PATCH /api/tickets/:id/status` — transições
  (`open→analysis→in_progress→resolved→closed`; encerrar exige comentário).
- `PATCH /api/tickets/:id/priority` e `:id/assignee` — técnico/admin
  (sem endpoint de usuários na API: atribuir a si, remover ou colar UUID).
- `GET/POST /api/tickets/:id/comments` + `GET :id/history` — conversa e timeline.
- `DELETE /api/tickets/:id` com `{ justification }` no corpo — só admin.
- `GET /api/reports/summary` — painel em `dashboard.html`
  (`{ total, byStatus, byPriority }`, com escopo por papel).

Permissões espelham o backend: solicitante lê os próprios + comenta;
técnico escreve (sem excluídos/encerrados); admin exclui com justificativa.

## Rodar

```bash
npm install
npm test
npx live-server --port=5500
```

Backend em `http://localhost:3000` (ver `Backend/README.md`).
Para apontar para outra base, defina antes dos módulos:

```html
<script>window.__HELPDESK_API_BASE__ = 'http://localhost:3000';</script>
```

Sessão em `sessionStorage` (`helpdesk.session`), sem segredos no código.