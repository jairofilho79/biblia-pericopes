# Player imersivo (P6 — TTS fase 2) — design

Data: 2026-09-02

## Problema

A Leitura hoje lê em voz alta com o TTS sintético do navegador (Web Speech
API), com realce da unidade falada e rolagem acompanhando. Funciona em toda
perícope, mas a voz é a do sistema.

Em paralelo, uma sessão dedicada gerou narrações profissionais com voz clonada
e publicou, junto do áudio, um manifesto de sincronização. O player que existe
hoje (`src/components/NarracaoPlayer.tsx`) é um `<audio controls>` cru: toca,
mas não conversa com a tela.

Esta fase substitui esse player por um que dirige a leitura — realçando o
versículo e a palavra em curso e rolando junto — e retira o TTS sintético do
app.

## Decisões de produto (tomadas com o usuário)

1. **Ouvir passa a existir só onde há narração.** O TTS sintético do navegador
   sai do app inteiro, deliberadamente. Onde não há áudio, a Leitura não
   oferece nenhuma forma de ouvir e não menciona que a narração falta.
2. **A rolagem do usuário continua livre.** O player acompanha a leitura, não
   sequestra a tela.
3. **Realce por palavra é requisito**, não enfeite. A motivação veio do uso
   real: *"se eu olhar pro lado, eu já me perco de onde ele está lendo"*.

Consequência aceita: o Velho Testamento inteiro e a parte ainda não gerada do
Novo ficam sem leitura em voz alta até o corpus cobri-los. A cobertura era
~309/1047 perícopes do NT em 2026-09-02, e cresce com um lote diário.

## Objetivo

Ouvir a perícope com a voz narrada, com o versículo e a palavra em curso
realçados e a tela acompanhando — sem que o usuário perca o lugar ao desviar o
olhar.

**Não é objetivo:** gerar áudio, mexer no pipeline de narração, nem cobrir
perícopes sem áudio.

## O contrato (verificado, não presumido)

`GET /api/audio/nt-ml/<ordem>.json` devolve:

```
{ ordem, livro, abbrev, titulo, voz, motor, sr,
  pausa_unidade, pausa_secao, dur_total,
  unidades: [{ i, secao, arquivo, texto, chars, inicio, dur, palavras }] }
```

- `inicio`/`dur` em segundos **dentro do m4a costurado** — é o eixo do
  `timeupdate`.
- `secao` ∈ `{titulo, contexto, texto, resenha, reflexoes}`.
- `palavras: [{ t, i, d }]` — um item por token de `texto.split(' ')`, `i`
  **absoluto** no m4a, `d` a duração. Alinhamento forçado (MMS), não
  estimativa.
- `arquivo` é interno: ignorar.

Medições feitas sobre o manifesto real da ordem 1600 (Mateus 1:1-17), e que
sustentam o desenho abaixo:

| Verificação | Resultado |
|---|---|
| Unidades com contagem de tokens divergente de `texto.split(' ')` | **0** |
| Palavras fora da janela `[inicio, inicio+dur]` da própria unidade | **0** |
| Maior intervalo entre palavras no versículo mais longo (14,6 s, 29 palavras) | 0,56 s |
| Velocidade entre unidades | 9,5 a 14,2 chars/s |

O último número é o que **desqualifica a estimativa proporcional** e justifica
depender do alinhamento: com 50% de variação entre unidades, distribuir a
duração por caractere erraria por palavras inteiras num versículo longo. E
realce na palavra errada é pior que realce nenhum — destrói exatamente a
confiança que a feature existe para dar.

## O mapeamento manifesto ↔ tela

Este é o risco central. Um erro de um índice desloca o realce da perícope
inteira, e o sintoma é sutil: tudo parece funcionar, só que no versículo
errado.

**O mapeamento não é posicional puro.** As duas listas têm elementos que a
outra não tem:

- Cada seção do manifesto começa com uma unidade de **cabeçalho falado** —
  `"Contexto."`, `"Resenha."`, `"Reflexões."`, `"Texto Bíblico."` — que não
  corresponde a nenhum bloco de conteúdo na tela.
- `parseTextoNaa` emite blocos `{ kind: 'chapter' }` (marcadores "Capítulo N")
  que não são narrados como unidade própria — o `"Capítulo N."` vem **fundido**
  ao primeiro versículo do capítulo.
- As unidades de `reflexoes` vêm prefixadas com `"Reflexão N. "`.

Contagens medidas na ordem 1600, depois de descontar o cabeçalho de cada seção:

| Seção | Tela | Manifesto (sem cabeçalho) |
|---|---|---|
| `contexto` | 2 parágrafos | 2 |
| `texto` | 17 versículos (+1 marcador de capítulo) | 17 |
| `resenha` | 2 parágrafos | 2 |
| `reflexoes` | 2 itens | 2 |

**A regra:**

1. Descartar a primeira unidade de cada seção (o cabeçalho falado).
2. `texto` → os blocos `kind === 'verse'`, na ordem, ignorando os marcadores de
   capítulo. O alvo no DOM é `[data-verse-id="<c:v>"]`.
3. `contexto` → `[data-verse-id="contexto-<n>"]`; `resenha` →
   `resenha-<n>`; `reflexoes` → `reflexao-<n>`.
4. `titulo` → sem alvo no DOM; toca sem realce.

**E validar, nunca presumir.** Depois de montar o mapa, conferir por seção que
a contagem de unidades bate com a contagem de alvos no DOM. Se não bater, essa
seção toca **sem realce** em vez de realçar por chute. O mesmo vale se um alvo
não existir no DOM.

A validação é o que transforma um desalinhamento futuro — outra versão do
`paragraphize`, uma mudança no gerador — em "o realce sumiu nesta seção" em vez
de "o realce está mentindo".

## Realce e rolagem

O mecanismo já existe e é reaproveitado inteiro: a Leitura mantém um estado da
unidade em fala e aplica `verse-speaking` / `prose-speaking` (sublinhado em
`app.css:927-935`), com um efeito que rola até o elemento realçado. O que muda
é a **fonte**: em vez dos eventos do TTS, o `timeupdate` do `<audio>`.

- A unidade em curso é a que satisfaz `inicio <= t < inicio + dur`. Busca por
  varredura a partir da última conhecida (o tempo anda para frente na maior
  parte do tempo), com fallback para busca binária depois de um seek.
- A rolagem mantém os guardas que já existem: não rola com a barra de ações
  aberta, nem com anotação em edição ou rascunho aberto — a pessoa está
  escrevendo, mover a tela debaixo dela é hostil.
- **Rolagem do usuário tem precedência.** Se a pessoa rolar manualmente, o
  player para de rolar sozinho até a próxima troca de unidade — e nunca briga
  com o dedo dela.

## Realce por palavra

Dentro da unidade em curso, a palavra é a que satisfaz `i <= t < i + d`.

O texto renderizado precisa ser tokenizável do mesmo jeito que o manifesto:
`texto.split(' ')`. Como o contrato garante mesma contagem e mesma ordem, o
n-ésimo token do DOM corresponde ao n-ésimo item de `palavras` — **desde que a
mesma validação de contagem seja aplicada por unidade**. Unidade cujo texto
renderizado não produza a mesma contagem de tokens realça só no nível da
unidade.

### Quebrar o versículo em palavras

O texto hoje é um nó único: `<span className="verse-text">{b.text}</span>`,
dentro de um `<button>` que carrega `onClick` de seleção e um `aria-label`.
Realçar palavra exige envolver cada token num elemento próprio, e isso toca
três coisas que já funcionam:

- **Seleção e cópia.** A Leitura deixa selecionar versículos e copiar/
  compartilhar. Se a quebra emitir os tokens sem os espaços entre eles, o texto
  copiado sai grudado. Os espaços têm que sobreviver à quebra.
- **O `aria-label` do botão.** Ele descreve o versículo inteiro; a quebra não
  pode fazer o leitor de tela soletrar palavra a palavra.
- **Custo de DOM.** Um versículo mediano tem 12 palavras, o maior medido tem 29.

**Quebrar só a unidade em curso**, revertendo para texto simples quando a
unidade muda. Mantém o DOM da página praticamente intacto, limita a mudança ao
trecho que está sendo lido, e evita mexer na seleção de texto do resto da
página. O custo é uma remontagem pequena a cada troca de unidade (~6 s pela
mediana medida) — barata, e fora do caminho do `timeupdate`, que só troca uma
classe.

**Fallback obrigatório:** manifesto sem o campo `palavras` (ainda não
realinhado) cai no realce por unidade, sem erro visível. O campo estava sendo
republicado em 2026-09-02, então as duas formas convivem por um tempo.

O realce por palavra deve ser visualmente mais leve que o do versículo — dois
realces de mesmo peso competem e cansam. Peso exato fica para a implementação,
mas a hierarquia é: versículo é o contexto, palavra é o ponteiro.

## Remoção do TTS sintético

Sai:

- `src/lib/tts.ts` e `src/lib/tts.test.ts`
- `src/lib/tts-prefs.ts` e `src/lib/tts-prefs.test.ts`
- `src/components/TtsMenu.tsx`
- As ~79 linhas de fiação de TTS em `src/pages/Leitura.tsx` (de 987)

**Fica:**

- `src/lib/use-wake-lock.ts` — está ligado a *ter perícope aberta*
  (`Leitura.tsx:374`, `useWakeLock(p !== null)`), não ao TTS. Com narração
  tocando ele importa mais, não menos.
- As classes `verse-speaking` / `prose-speaking` e o efeito de rolagem — mudam
  de dono, não de existência.

Os itens de backlog sobre o TTS sintético (o `onerror` que aborta a fila, a
cobertura de teste de "play superseded") deixam de existir junto com o código;
o backlog precisa ser atualizado, não carregado adiante.

## Cobertura parcial

`HEAD` no `.m4a` decide se há narração — é a checagem barata que o player atual
já faz. Sem narração, a Leitura fica como está hoje **menos** o TTS: sem
player, sem menção, sem promessa não cumprida.

Manifesto ausente com áudio presente não deve acontecer, mas se acontecer o
player toca sem realce em vez de sumir — o áudio é o valor principal.

## Riscos

- **Desalinhamento silencioso.** Mitigado pela validação por seção descrita
  acima: na dúvida, realce nenhum.
- **Custo do `timeupdate`.** Dispara ~4x/s; a busca da unidade e da palavra
  precisa ser barata e não recriar a árvore. Realce por classe em elementos já
  renderizados, sem remontar a lista de versículos.
- **Perder o TTS é irreversível na prática.** Depois de remover, voltar atrás
  custa reimplementar. A decisão é deliberada e está registrada acima com o
  motivo.
- **Tokenização divergente.** O texto na tela e o narrado passam por caminhos
  diferentes (`parse-texto` e o normalizador do gerador). A validação de
  contagem por unidade é o que impede isso de virar realce errado.

## Critérios de aceite

1. Numa perícope com narração, tocar realça o versículo em curso e a palavra em
   curso, e a tela acompanha. Verificado no app rodando, não só em teste.
2. Rolar manualmente durante a reprodução não é revertido pelo player.
3. Um seek (arrastar a barra) reposiciona o realce corretamente, para frente e
   para trás.
4. Perícope sem narração não mostra player nem qualquer menção a áudio, e não
   oferece TTS.
5. Manifesto sem `palavras` realça por unidade, sem erro visível.
6. Uma seção cuja contagem não bate toca sem realce naquela seção, e as outras
   seções seguem realçando.
7. Nenhum resquício do TTS sintético: `grep -rn "tts" src/` não retorna código
   vivo, e o backlog não lista mais itens sobre ele.
8. Selecionar e copiar um versículo durante a reprodução devolve o texto com
   os espaços corretos, e o leitor de tela continua anunciando o versículo
   inteiro, não palavra a palavra.
9. `npm test`, `npx tsc -b`, `npm run typecheck:worker`, `npx oxlint` e
   `npm run build` passam.
