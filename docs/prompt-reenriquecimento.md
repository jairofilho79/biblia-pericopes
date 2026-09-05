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
| `material_anterior` | só nas perícopes novas (`ordem >= 3000`). Ver a seção própria. |

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
  as palavras do trecho** (ver abaixo). Separe todos com `\n\n`.
- **Sem passeio versículo a versículo.** Entre 200 e 3.000 caracteres no total.
- **Nunca mais de 4 parágrafos.** O quinto não aparece na tela nem no áudio — a
  leitura descarta o excedente em silêncio.

### O quarto parágrafo: as palavras do trecho

Este parágrafo existe porque a Bíblia Livre usa palavras que o leitor não usa —
*holocausto*, *primícias*, *estopa*, *escória*, *sobejo*, *manjedoura*, *luas
novas* — e porque tropeçar numa palavra é o jeito mais rápido de perder o fio da
história.

Regras:

- Escolha de **2 a 4 palavras ou expressões que estão no `texto` da perícope** e
  que um leitor comum não saberia. Palavra que você mesmo inventou não conta:
  tem de ser palavra que ele vai encontrar lendo.
- Explique cada uma em **uma frase**, concreta, sem definição de dicionário.
  Diga o que a coisa é no mundo, não a categoria dela.
  - ❌ "Estopa: fibra têxtil de baixa qualidade."
  - ✅ "Estopa é a fibra que sobra quando se desfia o linho, e pega fogo num
    instante."
- **Prosa corrida, não lista.** Este parágrafo é narrado em voz alta junto com o
  resto da resenha, e uma lista de verbetes soa como dicionário no áudio.
  Emende as explicações numa frase só ou em duas, ligadas.
- Comece com uma abertura curta que avise o que vem — "Três palavras do
  trecho:", "Duas expressões que valem parar:" — e siga direto.
- Se o trecho **não tiver** nenhuma palavra difícil (acontece: narrativa simples,
  vocabulário do dia a dia), use o parágrafo para a informação que falta ao
  leitor para entender a cena: uma medida, um costume, um lugar, um cargo.
  Ex.: quanto era um talento, o que fazia um escriba, onde ficava Betânia.
  **O parágrafo nunca é dispensado** — o que muda é o que ele carrega.

Exemplo do formato (Isaías 1):

> Três palavras do trecho: *estopa* é a fibra que sobra quando se desfia o
> linho, e pega fogo num instante; as *luas novas* eram a festa do primeiro dia
> de cada mês, tão obrigatória quanto o sábado; e *carmesim* era uma tintura
> vermelha cara justamente porque não saía mais do tecido depois de tingido — é
> a mancha que ninguém consegue lavar.

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

## Quando vier `material_anterior` (perícopes novas, `ordem >= 3000`)

Essas já foram escritas no padrão que queremos — o problema é só que citam outra
tradução. Seu trabalho:

- **Preserve o pensamento**: o insight, o ângulo, o achado literário, a estrutura
  dos tópicos. Não recomece do zero, e não invente um ângulo novo só para
  parecer diferente.
- **Reancore no texto**: toda citação passa a ser da BLIVRE, exata. Se a BLIVRE
  não sustenta uma afirmação que dependia da palavra da outra versão, refaça a
  frase para dizer o que **esta** tradução diz.
- Se a BLIVRE trouxer algo que a anterior não tinha (um sobrescrito, uma
  expressão mais forte), aproveite.
- O resto do briefing continua valendo integralmente — inclusive as contagens de
  bullets e os limites de tamanho.

Quando **não** vier `material_anterior`, escreva do zero. Não procure o material
antigo em lugar nenhum: ele foi escrito por um modelo mais fraco, sobre outra
tradução, e olhar para ele só puxaria a qualidade para baixo.

## Antes de entregar cada perícope

1. Toda frase entre aspas está, exata, no `texto`?
1b. A resenha termina com o parágrafo das palavras do trecho, em prosa corrida,
   e tem no máximo 4 parágrafos? O contexto tem no máximo 2?
1c. Alguma frase sua só funciona para quem já sabia de alguma coisa? Diga essa
   coisa antes.
2. Linha de raciocínio tem 5–7 bullets? Mensagens tem 4–6? Todas com negrito?
3. `perguntas_reflexao` tem exatamente 2?
4. Contexto e resenha entre 200 e 3.000 caracteres?
5. A resenha virou passeio versículo a versículo? Se sim, refaça.
6. O JSON abre e fecha limpo, sem cerca de código?
