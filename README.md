# Frontend HelpDesk BQ

Interface web (HTML/CSS/JS nativo, multipage) do HelpDesk BQ.

## Páginas (`public/`)

| Página (`public/`, telas em `screens/`) | Rota API | Quem usa |
|---|---|---|
| `/` (landing) | — (apresentação) | visitantes |
| `screens/login.html` | `POST /api/sessions` (401/423) | todos |
| `screens/tickets.html` | `GET /api/tickets` (filtros, paginação, vazio) | todos (dono forçado p/ solicitante) |
| `screens/novo.html` | `POST /api/tickets` | autenticados |
| `screens/detalhe.html?id=` | detalhe, transição, prioridade, **responsável**, comentários, histórico, delete admin | transição/prioridade/responsável: técnico+admin; delete: admin |
| `screens/dashboard.html` | `GET /api/reports/summary` + **tabela recentes** | todos (escopo próprio p/ solicitante) |
| `screens/404.html` | página não encontrada | visitantes |

## Início rápido

```bash
npm install
npx serve public -l 5500   # casa com CORS_ORIGIN da API
```

```bash
npm test              
npm run test:coverage 
npm run lint
```

Login demo: `lia@exemplo.local` / `Solicitante123!` (técnico e admin no seed do backend).

## Segurança

- Sessão em **cookie `httpOnly`** (`helpdesk_token`, `SameSite=Lax`): `fetch` sempre com
  `credentials: 'include'`; **nenhum token em JS/storage**. 401 fora do login
  volta a `/screens/login.html?motivo=sessao` com faixa explicativa.
- Pills com SVG + texto (nunca só cor); modal de delete com foco preso e Esc;
  erros 500 exibem código de suporte com botão copiar.
- CSRF: mutações só em POST/PATCH/DELETE (Lax bloqueia cross-site); sem GET com efeito.
- XSS: só `textContent` (`ui.setText`); CSP restritiva em todas as páginas; zero libs de runtime.
- Servidor é a autoridade do RBAC; `data-requires` só esconde UI.

## Acessibilidade e mobile

- Labels associados, erros junto ao campo + foco, `aria-live`, skip-link, foco visível.
- Vermelho só em acentos grandes; CTA primário Ink; pills com texto + símbolo.
- Tabelas empilham ≤ 640 px; testado em 360 px sem rolagem horizontal.
