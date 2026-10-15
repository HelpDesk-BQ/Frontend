<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="public/assets/elo-logo-white.svg">
  <img src="public/assets/elo-logo.svg" alt="Elo" width="180">
</picture>

### Cada chamado no lugar certo, do registro à resolução.

Gestão de chamados de TI da [ETEC Bento Quirino](https://etecbentoquirino.com.br/new/).

**[elobq.vercel.app →](https://elobq.vercel.app)**

![Versão](https://img.shields.io/badge/vers%C3%A3o-0.1%20alfa-8200db?style=flat-square)
[![CI](https://github.com/HelpDesk-BQ/Frontend/actions/workflows/ci.yml/badge.svg)](https://github.com/HelpDesk-BQ/Frontend/actions/workflows/ci.yml)
![HTML/CSS/JS](https://img.shields.io/badge/stack-HTML%20%C2%B7%20CSS%20%C2%B7%20JS-111111?style=flat-square)

<br>

<img src=".github/assets/screenshots/landing-hero.png" alt="Página inicial do Elo" width="100%">

</div>

---

## O que é

O **Elo** organiza os pedidos de suporte de TI da escola. Quem tem um problema abre um
chamado em segundos; a equipe técnica trabalha numa fila priorizada; a administração
acompanha os totais e audita cada mudança. Todo chamado percorre um fluxo claro —
**Aberto → Em análise → Em atendimento → Resolvido → Fechado** — e cada passo fica
registrado com quem fez, quando e o que mudou.

> **Versão alfa (0.1).** A interface está pronta para uso e testes; o sistema ainda está
> em desenvolvimento e várias melhorias estão por vir.

## Para cada papel

| | Solicitante | Técnico | Administrador |
| :-- | :-- | :-- | :-- |
| **Faz** | abre chamados e acompanha cada mudança | atende a fila, muda estado e prioridade, assume chamados | tudo do técnico + exclusão com justificativa |
| **Vê no início** | atalho para abrir chamado e os seus em andamento | o que precisa de atenção, o fluxo e a fila mais urgente | o mesmo, com a visão de todos os chamados |

## O app

<img src=".github/assets/screenshots/app-dashboard.png" alt="Dashboard do técnico e do administrador" width="100%">

<p align="center"><sub><b>Dashboard</b> — o que precisa de atenção agora, como os chamados avançam e os mais urgentes.</sub></p>

<table>
  <tr>
    <td width="50%"><img src=".github/assets/screenshots/app-chamados.png" alt="Lista de chamados"></td>
    <td width="50%"><img src=".github/assets/screenshots/app-detalhe.png" alt="Detalhe do chamado"></td>
  </tr>
  <tr>
    <td align="center"><sub><b>Chamados</b> — abas por estado, selos "novo" e "com você", linha inteira clicável.</sub></td>
    <td align="center"><sub><b>Detalhe</b> — conversa e histórico à esquerda; ações e "próximo passo" à direita.</sub></td>
  </tr>
</table>

## Contas de teste

Para experimentar em [elobq.vercel.app](https://elobq.vercel.app/screens/login.html), entre
com uma conta de demonstração — uma por papel:

| Papel | E-mail | Senha |
| :-- | :-- | :-- |
| Administrador | `admin@exemplo.local` | `Admin123!` |
| Técnico | `tecnico@exemplo.local` | `Tecnico123!` |
| Solicitante | `lia@exemplo.local` | `Solicitante123!` |

São dados fictícios criados pelo seed do [backend](https://github.com/HelpDesk-BQ/Backend)
(`npm run db:seed`). Depois de 3 senhas erradas em 5 minutos, a conta fica bloqueada por
10 minutos.

## Experiência

- **Feedback em tudo:** esqueletos enquanto carrega, barra de progresso, spinner nos botões
  (inclusive no login) e confirmações em toast.
- **Fluxo guiado:** atalhos de "próximo passo" no detalhe, cards do dashboard que levam à
  lista já filtrada, prioridade explicada ao abrir chamado.
- **Acessível:** navegação por teclado, foco visível, estado sempre em texto + símbolo,
  leitor de tela anunciando cada ação e respeito a "reduzir movimento".
- **Responsivo:** do celular (375px) a monitores largos.

## Design

Preto e branco, com o roxo do ícone aparecendo só em momentos pontuais. Títulos em
**JetBrains Mono**, texto em **DM Sans**, cantos retos em linguagem de pixel e um fundo
pixelado em WebGL feito do zero. Seções claras e escuras se alternam a partir dos mesmos
tokens.

Regras completas em [`docs/design-system.md`](docs/design-system.md).

## Tecnologia

HTML, CSS e JavaScript nativos (ES modules), sem framework, sem build e sem dependências de
runtime. Testes com Jest, lint com ESLint e CI no GitHub Actions. O site é estático e está
na **Vercel**, que repassa `/api` para o backend no Render.

Estrutura, rotas da API, segurança, modo demonstração, testes e deploy:
**[documentação técnica →](docs/README.md)**

## Projeto

- [Backend](https://github.com/HelpDesk-BQ/Backend) — API e banco de dados
- [ETEC Bento Quirino](https://etecbentoquirino.com.br/new/) · Operação Software Confiável

<br>

<div align="center">
  <img src="public/assets/elo-icon-1024.png" alt="" width="48">
  <br>
  <sub>Elo · v0.1 alfa</sub>
</div>
