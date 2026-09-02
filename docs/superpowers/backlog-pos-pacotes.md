# Backlog pós-pacotes 2–4 (2026-09-01)

Achados não-bloqueantes das revisões finais, adjudicados como melhorias
futuras. Nenhum corrompe dados nem quebra fluxo principal.

## Carga de dados

- ~~Primeira tela bloqueada pelo catálogo monolítico (`pericopes.json`, 13,7 MB
  crus / 4.446.987 bytes comprimidos).~~ Feito em 2026-09-02: `npm run shard`
  fatia o catálogo em `public/data/index.json` (metadados enxutos, servidos
  de cara) mais `texto/` e `estudo/` por livro, baixados por uma fila de
  fundo depois da primeira tela. Medido no build de produção servido local:
  a primeira tela cai de 4.446.987 para 70.739 bytes comprimidos — cerca de
  63× menos payload bloqueante (os tempos não são comparáveis entre as duas
  medições: a antiga foi pela internet contra o Cloudflare, a nova é
  servidor local — só a comparação de bytes, ambos comprimidos, é justa). O
  precache do service worker cai de ~15,7 MB para 2.271 KiB (49 entradas),
  com `index.json` como única entrada JSON. Migração de cliente com o SW da
  versão anterior instalado, offline completo em perícopes nunca visitadas
  e busca full-text sobre os shards seguem funcionando — a busca não chegou
  a ser observada progredindo ao vivo (shards já estavam em cache na sessão
  de verificação), mas está coberta por teste e revisão. Spec:
  `docs/superpowers/specs/2026-09-02-carga-progressiva-dados-design.md`.
- Precache do service worker hoje é dominado por ~25 variantes woff2 de
  subset das 5 famílias de fonte (fontsource); carregar só os subsets
  realmente usados cortaria a maior parte dos 2.271 KiB restantes.

## Sync / Worker (endurecimento)

- ~~Validações do Worker: inteiro em `pericopeOrdem`; invariante
  `id === "${ordem}:${verseId}"` nos destaques; cap do corpo bruto do POST
  `/api/sync`.~~ Feito em 2026-09-01 (`worker/sync-logic.ts`): `isOrdem`
  exige inteiro seguro `>= 0` nas três listas, `validDestaque` recusa id
  divergente, e `corpoExcedeLimite` barra corpo acima de `MAX_CORPO`
  (32 MiB) com 413 — que o cliente trata como rejeição determinística,
  junto do 400.
- `LIMIT`/paginação no pull de `destaques` (entidade mais volumosa) —
  pendente, e é pacote próprio: o cursor hoje é o `agora` opaco do
  servidor, então truncar sem mudar o protocolo faz o cliente pular
  linhas. Precisa de cursor com chave composta (`server_em` + desempate)
  e laço de re-pull no cliente.
- ~~Sem live refresh após pull: dados sincronizados de outro aparelho só
  aparecem ao navegar/remontar.~~ Feito em 2026-09-02: os `applyRemote*`
  devolvem quantas linhas mudaram, o pull avisa por `sync-event.ts` só
  quando mudou algo, e Home, Índice e Leitura assinam via
  `useSyncRefresh`. O evento anda num `EventTarget` do módulo, não na
  `window`. Na Leitura o refresh é estreito (destaques, notas, status)
  para não apagar rascunho em digitação.

## Leitura

- ~~Chip de vínculo de anotação navega via URL (`?v=`) e o load effect
  descarta rascunho/edição em andamento.~~ Feito em 2026-09-02: o efeito
  virou dois — a carga pesada depende só de `ordem` (e é lá que rascunho,
  edição e confirmação zeram), e um efeito síncrono separado cuida do foco
  do versículo em `[ordem, verseParam]`. Manteve o `?v=` como deep-link,
  que a Pesquisa usa.
- ~~Barra de ações (`VerseActions`): `role="dialog"` sem foco movido para
  dentro nem devolvido ao versículo ao fechar.~~ Feito em 2026-09-02: o foco
  entra na caixa (que tem `aria-label`) e volta ao versículo ao fechar, com
  guard de `isConnected`. Continua sem armadilha de foco (Tab sai da barra) —
  ela não é modal, e uma armadilha sem `aria-modal` seria pior.
- ~~Swipe sem guard de diálogo aberto (assimetria com o teclado).~~ Feito
  em 2026-09-02: `onEnd` usa o mesmo `hasOpenDialog` do teclado, importado
  de lá em vez de duplicado, para as duas formas de navegar não poderem
  discordar.
- TTS: `onerror` aborta a fila inteira (escolha de design registrada);
  falta cobertura de teste para "play superseded" e para o hook de wake
  lock (repo sem infra de teste de hooks).
- Espaçamento padrão de leitura mudou de 1.75 para 1.65 com a escala nova
  `[1.5, 1.65, 1.8, 1.95]` — deliberado (spec §6); quem preferir mais
  respiro ajusta no "Aa".

## Navegação / Índice / Busca

- ~~Após navegar por chip, o foco não move para a seção.~~ Feito em
  2026-09-02: as quatro seções têm `tabindex="-1"` e `irPara` faz
  `focus({ preventScroll: true })` depois da rolagem suave.
- ~~←/→ com foco na linha de chips: `preventDefault` impedia a rolagem
  horizontal por teclado da própria linha.~~ Feito em 2026-09-02:
  `shouldHandleKey` devolve `null` quando o alvo está dentro de
  `.section-chips-row`.
- ~~Referência viva muda de largura ("Gn 1:1" → "Gn 12:34") e faz a linha
  de chips tremer.~~ Feito em 2026-09-02: `min-width: 10ch` em
  `.section-ref`, medido do pior rótulo real ("1Sm 150:89").
- ~~Pesquisar: "(primeiros)" aparece com exatamente 50 resultados; `<mark>`
  some durante a janela de debounce.~~ Feito em 2026-09-02: a busca pede
  `LIMITE_RESULTADOS + 1` e `fatiarResultado` decide o corte; o termo viaja
  junto dos hits no mesmo estado.
- ~~Flash de 1 frame da barra de chips antes de `--top-h` ser medido.~~ Feito
  em 2026-09-02: a medição virou `useLayoutEffect`, então roda antes da
  pintura. **Mas ver o item abaixo** — o benefício visível não pôde ser
  confirmado.
- **Barra de chips sobrepõe o header ao rolar** (achado em 2026-09-02,
  PRÉ-EXISTENTE, confirmado idêntico na base sem o P3). Com o header
  visível, os chips grudam em `top: 0` e cobrem os 55px dele. A regra
  vencedora é `.section-chips { top: var(--top-h, 0px) }`, ela casa com o
  elemento, `--top-h` vale `55px` no `:root` e é visível pelos chips — e
  mesmo assim o `top` computado resolve para `0px`. A regra
  `.shell:has(.top-hidden)` não está casando. Causa não identificada em três
  tentativas de investigação. Consequência colateral: enquanto o `top` não
  consumir `--top-h`, a correção do flash acima está certa no código mas sem
  efeito visível — as duas coisas precisam ser resolvidas juntas.
- ~~Seletor `.book-group` duplicado no CSS.~~ Feito em 2026-09-02: as duas
  regras viraram uma (ambas no topo, sem `@media` em volta).

## UI geral

- Skeletons anunciam rótulo genérico "Carregando…" (poderiam ser
  específicos por página).
- Feedback do botão "Sair" só via `title`/aria-live (usuário de toque não
  vê indicação visível de falha).
