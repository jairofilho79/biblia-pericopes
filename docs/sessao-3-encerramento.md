# Sessão 3 — encerramento

> **Para a Sessão 4, em uma linha:** rode
> `npx tsx scripts/pronto-para-narrar.ts`. Se ele imprimir `PRONTO PARA NARRAR`
> e sair com código 0, `data/pericopes.json` pode ser gravado inteiro.
> `data/congelamento.json` diz quais ordens, e por quê quando alguma estiver de
> fora.

## O que a sessão entrega

2.823 perícopes, cinco campos editoriais cada, sobre a **Bíblia Livre**.

| régua | estado |
|---|---|
| portão do material | 0 reprovações |
| invenção (afirma o que a Escritura desmente) | 0 |
| registro (coloquialismo) | 0 |
| títulos que colidem | 0 |
| congelamento | 2823 de 2823 |

## As campanhas, e o que cada uma tirou

**A frase que anuncia e não paga — 948 julgamentos.** 23% dos contextos fechavam
mandando o leitor "reparar em duas coisas" que ninguém nomeava. O molde acha a
FORMA, e a mesma forma serve para a frase que ENTREGA: quem separa as duas é
leitura, não regex. 283 ficaram de pé porque a frase seguinte paga o que elas
anunciam — e é por isso que `pronto-para-narrar` CONTA essa régua e não reprova
por ela.

**Os títulos — 38 reescritos.** De 68 caracteres médios para 53. Zero sem
âncora, zero idênticos, zero colisões.

**O TTS — 25 consertos.** 15 leituras literais escritas por extenso (`v.22`,
"1 e 2 Reis", "2.499", "século XIV") e 10 apontamentos tipográficos reescritos
("SENHOR em maiúsculas" → "duas palavras diferentes que soam igual"). A regra
que governa isso: **um campo só serve à tela e à voz**, e qualquer normalização
que existisse só para a fala mataria o realce da seção inteira, em silêncio.

**A invenção — 98 acusações, acervo fechado em zero.** O erro dominante não era
alucinação: era **generalização**. O material pegava um caso e o transformava em
regra, e o conserto quase sempre foi tirar a régua e deixar o caso. "O éfode de
linho era a veste que identificava quem servia como sacerdote" — Davi e o menino
Samuel o vestiram sem sê-lo.

**A repetição — 75 perícopes.** Defeito criado pela própria campanha da frase
pendurada: a resposta que entrou no `contexto` era o fato que a `resenha` já
entregava. Em 71 das 75 quem cedeu foi o contexto, e a proporção diz por quê —
o contexto tinha antecipado o achado, que é o motivo de a resenha existir.

## O que NÃO foi feito, e por quê

**O enriquecimento dos ~1.297 contextos restantes.** O dono adiou para uma
versão futura: *"se foi enriquecido bem antes, foi. Se não… pelo menos mentiroso
não vai ser."*

**As passagens que igrejas honestas leem de formas opostas** (Lv 18 e 20, os
códigos domésticos, 1Tm 2, 1Co 11 e 14). O app é de versão única e qualquer
coisa escrita ali vira posição pública dele. Estão em
`decisoes-do-dono-sessao-3.md`, item 3, e o material atual conta o que está
escrito com a força com que está escrito, dizendo explicitamente onde o texto
para. Congeladas — narrar não muda a decisão, e a decisão pode mudar o texto.

**`palavras_do_trecho` como campo próprio.** Hoje é o último parágrafo da
resenha, separado por convenção. Funciona e a leitura já o renderiza como seção
com título falado. Virar campo de verdade obriga a remexer nas 2.823 e no
manifesto.

## Os cinco casos em que uma régua mecânica mediu a coisa errada

Está aqui porque é o padrão mais caro do projeto, e ele se repete.

1. `cobertura-material.ts` (eco lexical) — 67% de falso alarme, e
   **anticorrelacionada** com qualidade: material bom parafraseia.
2. O detector de frase pendurada usado para julgar CONTEÚDO — recusou "Guarde o
   nome de Nabote: é na propriedade dele que…", que entrega.
3. O portão cobrando defeito **pré-existente**, alheio ao conserto — travava
   correção certa por frase que a campanha já tinha absolvido.
4. A lista de acusações absolvidas morando no gerador do relatório — cada
   consumidor com a sua ideia do que ainda valia, e quatro glosas CERTAS
   contadas como pendência.
5. `pronto-para-narrar` na primeira versão reprovando as 493 candidatas do molde
   do ponteiro, das quais 283 foram julgadas e absolvidas uma a uma.

**A régua mecânica acha o candidato. A leitura decide.**

## Os comandos

```
npx tsx scripts/pronto-para-narrar.ts     # pode narrar?
npx tsx scripts/congelar.ts               # regenera o contrato
npx tsx scripts/relatorio-invencao.ts     # regenera docs/auditoria-invencao.md
npx tsx scripts/invencoes-pendentes.ts    # acusações que ainda valem
```

As filas de auditoria (`data/repeticao/`, `data/conserto-invencao/`,
`data/sobra/`, `data/invencao/`, `data/leitura/`, `data/pendurada*/`) são
gitignoradas: o julgamento já está aplicado em `data/pericopes.json`, e o que
vale ficar está no material e nos relatórios.
