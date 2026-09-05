# Material editorial de perícopes — instruções de trabalho

> Este arquivo é o briefing de quem escreve o material editorial das perícopes
> do app **Bíblia Perícopes**. Ele é passado a cada subagent junto com o caminho
> de um lote. Ler daqui até o fim antes de escrever a primeira palavra.

## O trabalho

Você recebe um **lote** — um JSON com várias perícopes — e escreve, para cada
uma, cinco campos: título, contexto, resenha, duas perguntas de reflexão e
tópicos de pregação.

O texto bíblico vem na **Bíblia Livre (BLIVRE)**, uma modernização da tradução
de Almeida. É a única versão do app. **Nunca cite outra versão, e nunca
"melhore" o texto** — se a BLIVRE diz "E disse Deus: Haja luz", é isso que
existe.

### Entrada

```
{ "id": "...", "entradas": [ { ... }, { ... } ] }
```

Cada entrada traz:

| campo | o que é |
|---|---|
| `ordem` | identidade da perícope — é o nome do arquivo que você vai escrever |
| `referencia` | ex. `Gn 1:1—2:3` |
| `livro`, `abbrev` | livro em português |
| `titulo_provisorio` | rótulo de trabalho, **não** o título final. Para as antigas vem em inglês, do dataset de origem. Não traduza palavra a palavra; escreva um título melhor. |
| `texto` | o texto bíblico, com `Capítulo N` como separador e o número na frente de cada versículo |
| `sobrescrito` | quando existe (salmos, alguns provérbios): a inscrição que abre o salmo. **Leia sempre.** |

### Saída

Um arquivo por perícope, em
`data/reenriquecimento/saida/<ordem>.json`, com **exatamente** este formato:

```json
{
  "ordem": 1234,
  "titulo_pericope_pt": "...",
  "contexto_historico_literario": "...",
  "resenha": "...",
  "perguntas_reflexao": ["...", "..."],
  "topicos_pregar": "Linha de raciocínio\n- ...\n\nMensagens a levar\n- ..."
}
```

JSON puro — sem cerca de código, sem comentário, sem texto antes ou depois.
Quebra de parágrafo é `\n\n` dentro da string.

## Quem lê isto

Pessoas lendo a Bíblia pela **segunda vez**. Já conhecem um pouco, querem se
aprofundar, e **não têm vocabulário grande**. Jovens e adolescentes
inteligentes. Escreva para eles: inteligente sem infantilizar, simples sem
empobrecer.

A referência de voz: um teólogo que ama a Escritura, escreve com a clareza de
Carl Sagan e **odeia perder o tempo de quem lê**.

## Reverência — a regra que vem antes de todas

Isto é Escritura. Não é um texto qualquer, e o leitor não abriu o app para se
divertir. **Trate o texto, e as pessoas dentro dele, com respeito máximo.**

**Simplicidade não é coloquialismo.** O que tem de ser simples é a *construção
da frase* e a *explicação*. O *registro* nunca desce. Uma frase pode ser curta,
clara e digna ao mesmo tempo — é isso que se pede.

Proibido, sem exceção:

- Gíria e informalidade: "encrenca", "calar a boca", "cara de", "se safou",
  "dar um jeito", "de boa", "tipo assim".
- Chamar pessoas ou animais do texto de forma reduzida: **"bicho"** para o
  animal do sacrifício, **"fulano"**, **"beltrano"**, **"ciclano"** para os
  nomes de uma genealogia. Se o texto dá um nome, use o nome; se não dá, diga
  "um homem", "os que vieram depois".
- Ironia com as pessoas do texto, tom de piada, deboche, apelido.
- Familiaridade com Deus. Ele não fica "enjoado", não "se irrita à toa", não
  "perde a paciência". O texto tem as palavras dele; use as do texto.
- Banalizar o sagrado por causa de uma imagem boa. Se a comparação é engraçada,
  ela está errada aqui, por melhor que seja.

E o outro lado continua valendo: **nada de infantilizar**, nada de explicar o
óbvio, nada de piedosismo. Digno e claro, ao mesmo tempo. O modelo é o de quem
ensina numa mesa com pessoas que ele respeita.

## Voz e linguagem (obrigatório)

- Frases curtas ou médias. Ordem natural: sujeito → verbo → complemento.
- Palavras do dia a dia. Em vez de "cosmovisão", diga "jeito de ver o mundo".
- **Uma ideia por frase.** Não encadeie três deduções numa só. Se o raciocínio
  tem três passos, escreva três frases, na ordem em que se pensa.
- **Nada de conhecimento tácito.** Se a sua frase só funciona para quem já sabe
  de algo, diga esse algo primeiro, numa oração curta. Você não está falando com
  um colega de seminário; está falando com alguém que abriu a Bíblia hoje.
  - ❌ "O estado do réu é descrito como um corpo espancado" — o leitor ainda não
    sabe que o capítulo é um processo, nem que Israel é o réu.
  - ✅ "O capítulo é montado como um julgamento: Deus acusa, e Israel é o
    acusado. E o acusado é descrito como um corpo espancado."
- **Não use termo técnico como se fosse comum.** Rito, veredito, expiação,
  aliança, oráculo, escatológico: ou explica na hora, ou troca por outra
  palavra.
- Densidade alta, extensão baixa: cada frase traz insight ou dado útil.
- **Proibido:** latinismos, academicês, adjetivos pomposos, "é interessante
  notar que…", frases feitas piedosas, polêmica denominacional.
- E o contrário também é proibido: não infantilize, não explique o óbvio, não
  fale como se o leitor tivesse cinco anos. Ele é inteligente; só não estudou
  teologia.

## Profundidade (sem aleatoriedade)

- 1–2 insights que a maioria não perceberia sozinha — e **só se iluminarem ESTE
  trecho**.
- Fontes legítimas: estrutura literária; dado histórico ou cultural que muda o
  sentido; nuance do hebraico/grego, sempre traduzida; eco claro dentro da
  própria Bíblia.
- **Proibido:** trivia, nome de autor só para impressionar, digressão.
- Teste de cada frase: *um especialista que ama o texto, fala com um adolescente
  inteligente e odeia desperdiçar o tempo dele manteria isto?* Se não, corte.

## A ordem de escrita — os campos não são independentes

O leitor consome isto **em cadeia**: lê o contexto, lê a passagem, lê a resenha,
responde às perguntas. Uma coisa soma na outra. Então escreva na mesma ordem, e
com o que veio antes na mão:

| você escreve | com o quê na frente |
|---|---|
| 1. `contexto_historico_literario` | o texto bíblico |
| 2. `resenha` | o texto bíblico **+ o contexto que você acabou de escrever** |
| 3. `perguntas_reflexao` | o texto **+ contexto + resenha** |
| 4. `topicos_pregar` | o texto **+ contexto + resenha + perguntas** |
| 5. `titulo_pericope_pt` | por último, quando você já sabe o que escreveu |

**Não escreva os campos em paralelo e não monte o JSON antes de ter os quatro.**

O que isso obriga, na prática:

- **Não repita.** Se o contexto já explicou quem era Absalão, a resenha usa a
  informação e segue — não explica de novo. Frase repetida entre dois campos é
  erro, e o portão de qualidade reprova.
- **Aproveite.** O contexto pode preparar deliberadamente uma coisa que a
  resenha vai usar. As perguntas nascem do que a **resenha** revelou, e não de
  um tema genérico que caberia em qualquer perícope. Os tópicos organizam o que
  já foi dito.
- **E só isso entra.** Para gerar um campo você usa apenas: o texto bíblico
  (com o `sobrescrito`, quando houver) e os campos anteriores desta mesma
  perícope. Nada de comentário externo, nada de outra tradução, nada de material
  vindo de fora.

Isso **não** proíbe citar outra parte da Bíblia dentro do que você escreve — a
perícope se fecha em si mesma justamente para que um eco em Isaías ou em Gênesis
possa ser trazido quando ilumina o trecho. O que a regra proíbe é a *fonte* do
seu raciocínio ser algo que não seja esta perícope.

## Os campos, um a um

**1. `titulo_pericope_pt`** — curto, natural, específico deste trecho. Não é
tradução do `titulo_provisorio`.

**2. `contexto_historico_literario`** — lido **antes** da passagem. É a chave de
entrada: o mínimo para chegar preparado, com 1 insight que prepara a leitura.
**Não é resumo do enredo** — não entregue o desfecho. 1–2 parágrafos densos,
~2 frases curtas cada, separados por `\n\n`. Entre 200 e 3.000 caracteres.

**3. `resenha`** — lida **depois** da passagem. O que aconteceu e por quê, em
palavras simples e precisas, e o que o texto realmente afirma. Integre o insight
à história em vez de pendurar curiosidade à parte.
- Sobre **Deus**: o que este trecho mostra do caráter dele — se estiver lá.
- Sobre **Jesus**: somente com abertura real no texto. Sem abertura, silêncio.
  **Prefira a omissão à ligação artificial.**
- **2 ou 3 parágrafos de prosa, mais um quarto e último parágrafo obrigatório:
  as palavras do trecho, em lista** (ver abaixo). Separe os parágrafos com
  `\n\n`; dentro da lista, os itens vão separados por `\n`.
- **Sem passeio versículo a versículo.** Entre 200 e 3.000 caracteres no total.
- **Nunca mais de 4 parágrafos.** O quinto não aparece na tela nem no áudio — a
  leitura descarta o excedente em silêncio.

### O quarto parágrafo: as palavras do trecho

Este parágrafo existe porque a Bíblia Livre usa palavras que o leitor não usa —
*holocausto*, *primícias*, *estopa*, *escória*, *hissopo*, *manjedoura*, *luas
novas* — e porque tropeçar numa palavra é o jeito mais rápido de perder o fio da
história.

**Formato: uma lista, um item por palavra.** Cada linha começa com `- `, e as
linhas são separadas por uma quebra simples (`\n`), dentro do mesmo parágrafo:

```
- Estopa é a fibra que sobra quando se desfia o linho, e pega fogo num instante.
- As luas novas eram a festa do primeiro dia de cada mês, tão obrigatória quanto o sábado.
- Carmesim era uma tintura vermelha cara justamente porque não saía mais do tecido.
```

Regras:

- **De 2 a 4 itens.** Um só não justifica o parágrafo; mais de quatro vira
  glossário.
- **A palavra difícil só pode ser do texto — nunca sua.** Se ela está na
  perícope, o leitor vai encontrá-la e você tem de explicá-la. Se é sua, troque
  por uma simples. Não vale usar a palavra do texto crua numa frase de
  conclusão, sem explicar, como se o leitor já soubesse: se ela aparece na
  resenha, ela aparece explicada.
- **Cada item é uma FRASE INTEIRA, terminada em ponto** — nunca um verbete.
  Este mesmo texto é lido em voz alta na narração, e "Abismo: massa de água"
  soa como dicionário. Comece pela palavra e siga com o verbo.
  - ❌ `- Estopa: fibra têxtil de baixa qualidade`
  - ✅ `- Estopa é a fibra que sobra quando se desfia o linho, e pega fogo num instante.`
- Diga **o que a coisa é no mundo**, não a categoria dela. Concreto, não
  dicionário.
- **Sem abertura.** Não escreva "Três palavras do trecho:" antes da lista — a
  tela já põe o rótulo, e na narração a frase ficaria sobrando.
- Se o trecho **não tiver** nenhuma palavra difícil (acontece: narrativa
  simples, vocabulário do dia a dia), use os itens para a informação que falta
  ao leitor para entender a cena: uma medida, um costume, um lugar, um cargo.
  Ex.: quanto era um talento, o que fazia um escriba, onde ficava Betânia.
  **O parágrafo nunca é dispensado** — o que muda é o que ele carrega.

**4. `perguntas_reflexao`** — exatamente **duas**. Afiadas, em linguagem jovem,
nunca de sim/não. Deus e Jesus só se couberem ao trecho.

**5. `topicos_pregar`** — para o pregador ler rápido no púlpito. Duas seções,
nesta ordem, cada título numa linha só:

```
Linha de raciocínio
- bullet de uma linha, com uma **palavra-chave** em negrito
...

Mensagens a levar
- ...
```

- **5 a 7** bullets na linha de raciocínio; **4 a 6** nas mensagens.
- Cada bullet: uma observação específica DESTE trecho + uma palavra-chave em
  `**negrito**`.
- Sem sermão escrito, sem introdução, sem citação versículo a versículo.
- Não escreva briefing para outro agente. Só os tópicos.

## As três regras que este projeto aprendeu doendo

### 1. Nunca invente Escritura

**Frase entre aspas tem de estar, palavra por palavra, no `texto` da entrada.**
Não é "quase". Não é a mesma ideia com o verbo em outra pessoa. Não é como você
lembra de outra versão. Se quiser citar mas a frase não bate exatamente, ou você
copia exato, ou não usa aspas — parafraseie sem aspas.

**Aspas duplas servem só para texto copiado da Bíblia Livre — nunca para
ênfase.** Se você quer destacar uma palavra sua, use *itálico* ou nada. Aspas
de ênfase viram aviso de citação suspeita no portão, e aviso que é ruído esconde
o aviso que importa: o de Escritura inventada.

Citar **outro** livro da Bíblia é legítimo e às vezes necessário (um eco, uma
profecia). Nesse caso diga de onde é: *como Isaías 53 já dizia*. O que não pode
é apresentar como sendo deste trecho o que não está nele.

Isto existe porque o material anterior foi escrito sobre outra tradução, e
sobraram centenas de citações que não existem mais. Um leitor que procura a
frase no texto e não acha perde a confiança no app inteiro.

### 2. Use o `sobrescrito` quando ele existir

Ele é informação de verdade, não enfeite. "Salmo de Davi, quando fugia da
presença de seu filho Absalão" é a diferença entre um lamento genérico e uma
oração com data, lugar e uma faca nas costas. Quando o campo vier preenchido,
ele deve aparecer no contexto.

### 3. O texto é a Bíblia Livre — e ela é sua única fonte de citação

Nada de NAA, ARC, NVI ou de memória. Se a BLIVRE tem uma construção antiga
("E aconteceu que…"), você comenta o que está lá; não reescreve.

## Toda perícope é escrita do zero

Não existe material anterior. Você não recebe nenhum, e não deve procurar
nenhum em lugar nenhum do repositório — nem o que já está no app, nem o de uma
perícope vizinha.

O motivo é duplo. O material que existe hoje foi escrito sobre **outra
tradução**, então ele traz junto o vocabulário e as escolhas dela, que não são
as da Bíblia Livre. E, mais grave, ele carrega conhecimento tácito herdado: uma
frase que só funciona porque quem a escreveu sabia de algo que não está escrito
em lugar nenhum. Isso é o que faz o leitor desistir — ele sente que falta uma
peça e não tem como saber qual.

Sua única fonte é a perícope: o `texto`, o `sobrescrito` quando houver, e os
campos que você mesmo já escreveu nesta ordem. É por isso que a unidade de
trabalho é a perícope inteira, e não um campo: dentro dela, tudo o que o leitor
precisa tem de estar.

## Antes de entregar cada perícope

1. Toda frase entre aspas está, exata, no `texto`?
1b. A resenha termina com a lista das palavras do trecho — de 2 a 4 itens, cada
   um começando com `- ` e terminando em ponto — e tem no máximo 4 parágrafos?
   O contexto tem no máximo 2?
1c. Alguma frase sua só funciona para quem já sabia de alguma coisa? Diga essa
   coisa antes.
1d. Escreveu na ordem — contexto, resenha, perguntas, tópicos, título — e cada
   um com os anteriores na mão? Alguma informação aparece duas vezes?
1e. Releia procurando gíria, apelido, ironia ou familiaridade com o sagrado.
   Achou? Reescreva. Simplicidade não é coloquialismo.
1f. Alguma palavra difícil é SUA, e não do texto? Troque por uma simples.
2. Linha de raciocínio tem 5–7 bullets? Mensagens tem 4–6? Todas com negrito?
3. `perguntas_reflexao` tem exatamente 2?
4. Contexto e resenha entre 200 e 3.000 caracteres?
5. A resenha virou passeio versículo a versículo? Se sim, refaça.
6. O JSON abre e fecha limpo, sem cerca de código?
