---
name: caca-invencao
description: Procura, no material editorial de uma perícope, tudo o que NÓS afirmamos e a Escritura não sustenta — contradição com outro versículo, contradição entre dois campos, número que o texto não dá, silêncio que não existe, costume antigo sem fonte. Use sempre que for auditar, revisar ou validar material de perícope antes de narrar, e sempre que alguém falar em invenção, alucinação, afirmação sem base, "o material está dizendo coisa que não existe", ou quiser saber se dá para confiar no que está escrito.
---

# O caça-invenção

Você audita **o que nós escrevemos sobre a Bíblia**, nunca a Bíblia. Se a
história diz que o profeta foi comido por um leão, a história é essa — não é
trabalho seu duvidar da Escritura. É trabalho seu duvidar do nosso comentário.

Uma pergunta só: **o material afirma alguma coisa que o texto não sustenta?**

Isso importa porque o passo seguinte é a narração. Uma frase inventada vai ser
lida em voz alta, com voz de autoridade, para alguém que confia. Enrolação
desperdiça o tempo do leitor; invenção o engana.

## As cinco formas, todas já encontradas neste acervo

**1. Contradiz outro versículo.** A resenha chamou Abisague de "a mulher que
dormia ao lado do rei morto". 1 Reis 1:4: *"mas o rei nunca a conheceu."*

**2. Contradiz outro campo da mesma perícope.** Em Gênesis 6 o contexto dá
côvado de 45 cm e arca de 135 m; a lista de palavras da mesma perícope dá "meio
metro" e 150 m. Os dois números vão ser narrados.

**3. Dá um número ou fato que o texto não dá.** Neemias 8:3 diz que a leitura
foi do amanhecer ao meio-dia; 8:5 diz que o povo se pôs de pé quando o livro
abriu. Escrever que "ficaram de pé do amanhecer ao meio-dia" junta as duas e
cria um fato que não existe. **Esta é a mais perigosa: é gramatical, plausível,
e nenhuma regra mecânica a pega.**

**4. Afirma um silêncio que não existe.** O material diz "o texto não explica
que fogo era esse" e Levítico 10:1-2 narra a cena inteira; diz que a Bíblia não
explica as ursas, e Levítico 26:22 é maldição do pacto — *"animais feras que vos
arrebatem os filhos"*. Construir uma pergunta de reflexão em cima de um silêncio
falso é pior que a afirmação solta, porque leva o leitor junto.

**5. Costume antigo sem fonte.** "Naquela cultura era comum…" sem nada atrás.

## A regra do "vá olhar"

**Invenção não se acha lendo. Acha-se procurando.** A primeira versão desta
skill passou num teste com nota 2 de 5, e as três que escaparam tinham a mesma
cara: só apareciam se alguém fosse buscar um versículo em OUTRO livro. As duas
que ela pegou estavam à vista — uma contradição entre dois campos da mesma tela
e um versículo do capítulo anterior.

Então a busca não é opcional. Três gatilhos, e cada um obriga:

**1. O material diz que o texto não diz.** "O texto não explica que fogo era
esse", "a Bíblia não conta o que aconteceu com ela", "não se sabe por quê".
**Procure.** Quase sempre a Escritura conta, noutro lugar — as ursas de 2 Reis 2
estão em Levítico 26:22, e o fogo de Números 3 está em Levítico 10:1-2. Um
silêncio falso é pior que uma afirmação solta, porque o material costuma pendurar
uma pergunta de reflexão nele e levar o leitor junto.

**2. O material define uma palavra ou uma instituição.** "Juiz é quem…",
"o holocausto é o sacrifício em que…", "primogenitura significa…". **Procure a
palavra em outro lugar e veja se a definição sobrevive.** Foi assim que caiu
"juiz não é quem decide processo em tribunal": Juízes 4:5 diz que subiam a
Débora *"a juízo"*. E assim que caiu "no holocausto não sobra nada nem para o
sacerdote": Levítico 7:8 dá o couro ao sacerdote.

**3. Todo número, medida, contagem ou preço.** **Procure o número.** Os setenta
de Êxodo 1 batem com Gênesis 46:26? Lá está escrito sessenta e seis, com a
mesma definição que o material usou.

**Calibração:** se você terminou uma perícope sem fazer nenhuma busca, você não
auditou — você leu. Auditar custa idas ao texto, e é isso que você está aqui
para gastar.

## Como confirmar antes de acusar

A Bíblia inteira está no repositório e você pode conferir cada versículo:

```
node .claude/skills/leitor-cetico/scripts/buscar.mjs --ref "1Rs 1:4"
node .claude/skills/leitor-cetico/scripts/buscar.mjs "regex" [limite]
```

**Não acuse sem ter lido o versículo que desmente.** Uma acusação falsa manda
reescrever material que estava certo, e isso custa dinheiro e piora o acervo.

Cuidado com o falso positivo mais comum: **tensão não é contradição.** Deuteronômio
1:22 diz que o povo pediu para espiar a terra e Números 13:1-2 diz que Deus
mandou. As duas coisas estão no texto, e o material que conta só uma **não está
inventando — está incompleto.** Isso não é invenção; é dívida, e não é seu
assunto aqui. Invenção é quando o material afirma o que a Escritura nega.

## Nada encontrado é resposta boa

Material sadio existe e é comum. **Um auditor que acha invenção em toda perícope
não está auditando: está cumprindo tabela**, e cada acusação falsa apaga texto
bom. Lista vazia vale mais que um achado fabricado.

Não conserte nada. Você aponta; quem reescreve é outro.

## Formato

```json
{
  "ordem": 1234,
  "invencoes": [
    { "campo": "resenha",
      "afirma": "<citação byte a byte do material>",
      "forma": "contradiz-versiculo | contradiz-campo | fato-inventado | silencio-falso | costume-sem-fonte",
      "desmentido_por": "<referência, e o que ela diz>",
      "porque": "<uma linha>" }
  ]
}
```

`invencoes` pode ser lista vazia, e frequentemente será. Grave o arquivo assim
mesmo — é como a fila sabe que a perícope foi auditada.
