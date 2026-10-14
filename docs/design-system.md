# Elo Design System

Fonte da verdade: [`public/css/tokens.css`](../public/css/tokens.css). Componentes em
[`components.css`](../public/css/components.css), navbar e tipografia em
[`base.css`](../public/css/base.css). Nenhum valor solto: se precisar de um novo, ele
vira token primeiro.

## Princípios

1. **Preto e branco.** A interface é neutra; o conteúdo é o destaque.
2. **Roxo é acento, não cor de interface.** Aparece só em detalhes pequenos (lista abaixo).
   Nunca em botão, fundo de bloco ou texto corrido.
3. **Linguagem de pixel / código.** Cantos pequenos, marcadores quadrados, títulos em
   monoespaçada e rótulos em caixa alta.
4. **Uma escala para cada coisa.** Raio, altura de controle, espaço e sombra têm
   escalas fechadas.

## Cor

| Token | Valor | Uso |
| --- | --- | --- |
| `--color-ink` | `#111111` | texto, botão primário, superfícies escuras |
| `--color-graphite` | `#262626` | hover do primário |
| `--color-charcoal` | `#525252` | texto secundário |
| `--color-ash` | `#6b6b6b` | texto terciário, hover de borda |
| `--border-color` / `--color-mist` | `#e5e5e5` | bordas de card, divisórias |
| `--border-color-strong` | `#d4d4d4` | bordas de controles (campo, pill, botão secundário) |
| `--surface-canvas` | `#f5f5f5` | fundo da página |
| `--surface-surface` | `#ffffff` | cards, faixas alternadas |
| `--surface-elevated` | `#fafafa` | cabeçalhos de tabela, navbar, rodapé |
| `--color-brand` | `#8200db` | acento pontual |
| `--color-brand-pixel` | `#b497cf` | fundo pixelado e acento sobre fundo escuro |
| `--color-signal-red` | `#d04841` | erro, perigo, prioridade crítica — só isso |

**Onde o roxo pode aparecer:** o pixel do item ativo da
navbar, o pixel do selo do hero, o cursor `_` do título, o fundo pixelado, o marca-texto
(`--color-highlight`), o traço do ícone e o fio de 2px dos cards no hover, a seleção de
texto. Fora disso, não.

## Seções claras e escuras

A landing alterna seções inteiras claras e escuras. Uma seção escura recebe
`.is-dark`, que **remapeia os tokens** (texto vira branco, superfícies e bordas
escurecem, o roxo vira lavanda, o foco fica branco). Componentes não têm variante escura
própria: se usam token, já funcionam. Hoje: painel direito do hero, Fluxo e o CTA final. O rodapé é claro e separado do CTA
por uma linha — os dois nunca se misturam.

## Moldura (trilhos)

`.frame` limita a landing a `--page-max-width` com dois trilhos verticais
(`border-inline`), que sobem pela navbar. Seções são separadas por linhas retas, sem
raio; o respiro interno é `--frame-pad`. `.bleed` faz uma faixa estourar os trilhos até a
borda da tela (sangria) — usar com parcimônia (hoje só a faixa de números).

## Marca-texto

`<mark class="hl">` destaca a palavra que carrega a ideia da seção (uma por título).
A faixa varre da esquerda para a direita quando a seção aparece; `.hl--instant` varre no
carregamento (para conteúdo acima da dobra).

## Tipografia

- **Títulos (h1–h4), rótulos, números, menu:** JetBrains Mono, peso 500
  (`--font-weight-heading`), tracking negativo (`--tracking-heading` / `--tracking-display`).
- **Texto, botões, campos:** DM Sans, 400/500.
- **Rótulo de seção (`.eyebrow`):** mono 12px, caixa alta, `--tracking-label`, em cinza.

Escala: `display` (hero) · `h2` (seção) · `heading` 32 · `subheading` 20 · `h3` 18 ·
`h4` 16 · `body-lg` 18 · `body` 16 · `body-sm` 14 · `caption` 12.

## Raio (linguagem de pixel)

Só três valores:

| Token | Valor | Onde |
| --- | --- | --- |
| `--radius-xs` | 2px | marcadores: nós do fluxo, checks, marcadores da timeline |
| `--radius-sm` | 4px | **todos os elementos**: cards, campos, pills, selo, tabelas, modal, menu, painéis |
| `--radius-button` | 8px | **botões** — a única exceção (inclui o botão do menu mobile) |

- **Não existe círculo.** Todo marcador é quadrado.
- Nada de raio fora desses três tokens.

## Bordas e sombra

- Borda padrão: `--border` (1px `--border-color`). Controles usam `--border-color-strong`.
- "Borda de 2px" (perigo, crítico, campo inválido) = borda 1px + `box-shadow: inset 0 0 0 1px`,
  para não mudar o tamanho do elemento.
- Sem sombra em repouso. `--shadow-xs` (item ativo do menu), `--shadow-sm` (navbar ao rolar),
  `--shadow-md` (menu mobile), `--shadow-lg` (moldura do hero, modal).

## Controles

Alturas: `--control-sm` 32 · `--control-md` 40 · `--control-lg` 48. Campo, botão e
toggle do menu compartilham as mesmas alturas.

### Botões

| Classe | Aparência | Quando |
| --- | --- | --- |
| `.btn--primary` | preto sólido, sem borda | ação principal — uma por área |
| `.btn--secondary` (`.btn--outline`) | branco, borda fina | alternativa ao primário |
| `.btn--ghost` | sem fundo e sem borda, hover cinza | terciária, cancelar, sair |
| `.btn--danger` | vermelho sólido | destrutiva (sempre com confirmação) |

Tamanhos: `.btn--small` (32) · padrão (40) · `.btn--large` (48). Dentro de `.is-dark`
o primário vira branco e o secundário escuro com contorno claro, sem classe extra.

`.btn--arrow` (CTAs de "Abrir chamado"): no hover o rótulo desliza para a esquerda e
uma seta entra no espaço liberado; a largura do botão não muda.

## Navbar

`[marca] [links] [ações]`, conservadora: **opaca** (fundo branco, sem transparência),
**compacta** (56px) e sempre do mesmo tamanho — não muda ao rolar. Links em mono 13px, cinza;
o ativo (`aria-current`) fica preto com o pixel roxo à esquerda. No mobile (< 860px) os
links vão para um painel aberto pelo botão (`js/nav.js`); sem JS eles continuam visíveis.

## Movimento

`--duration-fast` 0.15s (hover) · `--duration-base` 0.25s (cards) · `--duration-slow`
0.8s (entradas). Easing `--ease-out`. Cards sobem 2px no hover. Tudo é desligado com
`prefers-reduced-motion`.

## Foco

`:focus-visible` → contorno de 2px `--color-ink` com 2px de afastamento (branco em `.is-dark`).

## Fundo pixelado

`js/pixel-blast.js` — WebGL puro (porte do PixelBlast do react-bits, pontilhado Bayer).
Marque o elemento com `class="pixel-bg"` e `data-pixel-blast`; opções em
`data-pixel-color`, `-size`, `-scale`, `-density`, `-speed`, `-edge-fade`, `-ripples`.
Use máscara (`mask-image`) para enfraquecer os pixels atrás de texto. Opacidade via
`--pixel-opacity`. Para quando sai da tela; quadro estático com movimento reduzido.

## Ícones

Sprite único em `public/assets/icons.svg` (16×16, traço 1.5, cantos retos). No HTML:
`<svg class="icon" aria-hidden="true"><use href="/assets/icons.svg#i-check"/></svg>`;
no JS: `icon('check')` (`ui.js`). Ícone é sempre decorativo — o texto ao lado carrega o
significado. Dentro de botão use a classe `btn__icon`.

## Feedback e carregamento

- **Barra de progresso:** 2px roxa no topo enquanto houver requisição (só após 150ms).
- **Esqueletos:** blocos cinza com brilho no lugar do conteúdo que está carregando
  (dashboard, lista, detalhe). Nunca texto "Carregando…" solto.
- **Botão ocupado:** `setBusy(botão, true)` mostra o spinner quadrado; com
  `data-busy-label` o rótulo vira "Entrando…", "Salvando…", "Enviando…".
- **Toast:** confirmação curta no canto superior direito (`toast()`); `flash()` guarda o
  recado para a próxima tela (ex.: depois de abrir um chamado).
- **Selos:** `badge--new` (chamado com menos de 24h, roxo suave) e `badge--mine`
  (responsável é você, contorno).

## Micro-interações

Linha de tabela inteira clicável com seta no hover; cards sobem 2px; setas de "ver mais"
deslizam; conteúdo carregado entra com fade de 0.35s; barras de prioridade crescem. Tudo
desligado com `prefers-reduced-motion`.
