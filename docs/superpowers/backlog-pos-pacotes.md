# Backlog pós-pacotes 2–4 (2026-09-01)

Achados não-bloqueantes das revisões finais, adjudicados como melhorias
futuras. Nenhum corrompe dados nem quebra fluxo principal.

## Sync / Worker (endurecimento)

- Validações do Worker: exigir inteiro em `pericopeOrdem` (hoje aceita
  `1.5`/`1e308`); validar o invariante `id === "${ordem}:${verseId}"` nos
  destaques (um id divergente vira destaque indeletável pela UI); `LIMIT`/
  paginação no pull de `destaques` (entidade mais volumosa); cap de tamanho
  do corpo bruto do POST `/api/sync` (hoje ~10 MB teóricos).
- Sem live refresh após pull: dados sincronizados de outro aparelho só
  aparecem ao navegar/remontar. Considerar um evento `pericopes-sync`
  disparado após `applyRemote*` (o streak da Home tem a mesma limitação,
  comentada em `Home.tsx`).

## Leitura

- Chip de vínculo de anotação navega via URL (`?v=`) e o load effect
  descarta rascunho/edição em andamento; virar handler local
  (seleção + scroll) ou preservar `draft` quando só o `verseParam` muda.
- Barra de ações (`VerseActions`): `role="dialog"` sem foco movido para
  dentro nem devolvido ao versículo ao fechar; alvo de melhoria de a11y.
- Swipe sem guard de diálogo aberto (assimetria com o teclado, que usa
  `hasOpenDialog`); hoje inócuo porque a barra fecha na navegação.
- TTS: `onerror` aborta a fila inteira (escolha de design registrada);
  falta cobertura de teste para "play superseded" e para o hook de wake
  lock (repo sem infra de teste de hooks).
- Espaçamento padrão de leitura mudou de 1.75 para 1.65 com a escala nova
  `[1.5, 1.65, 1.8, 1.95]` — deliberado (spec §6); quem preferir mais
  respiro ajusta no "Aa".

## Navegação / Índice / Busca

- Após navegar por chip, o foco não move para a seção (adicionar
  `tabindex="-1"` + `focus({ preventScroll: true })`).
- ←/→ com foco na linha de chips: `preventDefault` impede a rolagem
  horizontal por teclado da própria linha.
- Referência viva muda de largura ("Gn 1:1" → "Gn 12:34") e faz a linha
  de chips tremer; reservar `min-width` em `ch`.
- Pesquisar: "(primeiros)" aparece com exatamente 50 resultados (buscar
  `limit + 1` e fatiar); `<mark>` some durante a janela de debounce
  (guardar o termo junto dos hits).
- Flash de 1 frame da barra de chips antes de `--top-h` ser medido.
- Seletor `.book-group` duplicado no CSS (propriedades disjuntas; squash
  cosmético).

## UI geral

- Skeletons anunciam rótulo genérico "Carregando…" (poderiam ser
  específicos por página).
- Feedback do botão "Sair" só via `title`/aria-live (usuário de toque não
  vê indicação visível de falha).
