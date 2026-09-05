# Defeitos da Bíblia Livre achados durante a Sessão 3

> Lista viva. A revisão editorial da Sessão 2 varreu por **razão de comprimento**
> contra Almeida 1911 e KJV, o que acha frase omitida e versículo truncado — mas
> é cega para erro curto: acento perdido, concordância errada, palavra trocada.
> Esses aparecem quando alguém **lê** o texto, e é o que os subagents estão
> fazendo, uma perícope por vez.
>
> Nada aqui foi aplicado ainda. Ver "Como aplicar" no fim: corrigir o texto
> depois do material escrito tem custo, e ele é gerenciável, mas não é zero.

## 1. Acento perdido (18 versículos) — resquício da ortografia de 1911

Achados por varredura: palavra que aparece no corpus com e sem acento, sendo a
forma sem acento rara. Conferidos um a um contra Almeida 1911 e KJV.

`principio`→princípio (Pv 1:7, Ap 22:13) · `Espirito`→Espírito (At 13:2) ·
`arvore`→árvore (Mt 7:17, no mesmo versículo que já traz "boa árvore") ·
`Amem`→Amém (Sl 72:19, colado num "amém" acentuado) · `sairam`→saíram
(Jz 3:19, 1Sm 23:13) · `gloria`→glória (Is 43:7) · `numero`→número (Ap 20:8) ·
`decimo`→décimo (Jr 52:4) · `lideres`→líderes (Jr 25:36) · `dominio`→domínio
(2Tm 3:3) · `ruina`→ruína (2Cr 36:21) · `terrivel`→terrível (Ez 31:12) ·
`ultima`→última (1Co 15:52) · `varias`→várias (Lc 4:40) · `fossemos`→fôssemos
(Gl 3:24) · `salvara`→salvará (Dt 4:42)

**21 candidatos foram descartados pelas duas testemunhas** — e é o valor do
método: `faca` em Pv 23:2 é faca mesmo; `não pecas` em 1Co 7:28 é o verbo;
`tomara que mates` no Sl 139 é a interjeição; `eu me refugio` no Sl 57 é verbo;
`gloria-te` em 2Rs 14:10 é verbo; `orna-te` em Jó 40:10 é verbo; nove são
mais-que-perfeito legítimo (`falara`, `chegara`, `achara`, `florescera`…); e
`Tera`, `Hara`, `Susa`, `Has-Baz` e `Joana` são nomes próprios.

## 2. Corrupção de palavra (3 versículos) — mais grave que acento

| ref | BLIVRE | testemunhas | correção |
|---|---|---|---|
| Mc 12:37 | "como, pois, é **so eu** filho?" | A11 "seu filho" · KJV "his son" | **seu** filho |
| At 9:4 | "ouviu **ma** voz lhe dizendo" | A11 "uma voz" · KJV "a voice" | **uma** voz |
| Lm 3:6 | "como os que já **morrera**" | KJV "as they that be dead" (plural) | **morreram** |

## 3. Concordância de gênero (5 versículos)

`no arca` → `na arca`. "Arca" é feminino, e o próprio corpus escreve "na arca"
17 vezes contra 5 de "no arca":

Êx 25:16 · Êx 25:21 · 1Sm 6:19 · 2Rs 12:10 · 2Cr 24:10

## 4. Marcador temporal corrompido (2 versículos)

`Naquela muita` → `Naquele tempo`. São as **únicas duas ocorrências** da
expressão no corpus inteiro, e as duas abrem narrativa:

| ref | BLIVRE | Almeida 1911 | KJV |
|---|---|---|---|
| Lv 24:10 | "**Naquela muita** o filho de uma mulher israelita…" | "E saiu um filho d'uma mulher israelita…" | "And the son of an Israelitish woman…" |
| 1Rs 3:16 | "**Naquela muita** vieram duas mulheres prostitutas ao rei" | "Então vieram duas mulheres prostitutas ao rei" | "Then came there two women…" |

A própria BLIVRE escreve **"Naquele tempo" 28 vezes** — é o idioma dela, então a
correção não inventa vocabulário. Nenhuma das duas testemunhas traz conteúdo
que a frase corrompida carregue: em 1Rs 3:16 as duas trazem um marcador
temporal ("Então"/"Then"), e em Lv 24:10 nenhuma traz marcador nenhum. Trocar
por "Naquele tempo" preserva o sentido nos dois casos e não acrescenta nada.

## Achado que NÃO é defeito

**`alambre`** (Êx 26:11, "colchetes de alambre") é palavra antiga para bronze —
KJV traz "taches of brass". Está certa, só é desconhecida. **Não se corrige: se
explica**, e foi o que a perícope 136 fez, no parágrafo das palavras do trecho.
É a mesma regra de `estopa` em Isaías 1.

## Como aplicar — e por que não agora

Corrigir o texto **depois** do material escrito quebra as citações: a perícope
132 cita "E porás no arca o testemunho" palavra por palavra, e o portão
reprovaria a citação no instante em que o versículo mudasse.

O caminho, no fim da fila:

1. Levar as correções para `scripts/blivre-correcoes.ts`, com guard por trecho
   esperado, como as 65 que já estão lá.
2. Rodar o ETL, que regera `data/raw-pericopes.jsonl`.
3. `cacheDesatualizado` (em `scripts/montar-catalogo.ts`) compara o `texto` do
   raw com o `texto` gravado em `data/enriched/<ordem>.json` e aponta
   exatamente as perícopes cujo texto mudou.
4. Devolver **só essas** para a fila. São poucas: 26 versículos em 31.102.

Isso é preciso e barato. O que seria caro é corrigir de forma dispersa e
reescrever no escuro.
