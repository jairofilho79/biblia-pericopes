/**
 * Correções de defeito da fonte na Bíblia Livre.
 *
 * **Método.** Nenhuma correção entrou aqui por julgamento meu. Cada uma foi
 * conferida contra duas testemunhas independentes:
 *
 * - a **KJV** (`data/raw/PericopeGroupedKJVVerses.json`, o mesmo dataset de onde
 *   vêm os limites das perícopes) — inglês, mas da mesma linhagem textual
 *   Textus Receptus da BLIVRE;
 * - a **Almeida de 1911**, domínio público, que é a *ancestral* da Bíblia Livre
 *   — a BLIVRE é uma modernização da Almeida de 1819.
 *
 * Onde as duas concordam contra a BLIVRE, é defeito da BLIVRE. Onde alguma
 * discorda, não se mexe. A comparação já derrubou dois candidatos: `cada um um
 * cordeiro` (Êx 12:3) e `cada um um bolo` (1Cr 16:3) parecem duplicata e são
 * português correto — a Almeida 1911 traz igual.
 *
 * **Nada aparece na tela.** Não há marcação de "aqui foi corrigido": o leitor
 * fica com a história, não com o aparato crítico.
 *
 * Toda correção é verificada antes de aplicar. Se a fonte mudar e o defeito não
 * estiver mais lá, isto LANÇA em vez de aplicar às cegas.
 */

/**
 * Palavra repetida por engano de digitação: `sobre sobre vós`. A segunda sai.
 *
 * O pronome enclítico NÃO entra aqui — `tirou-o o SENHOR`, `traga-a a ti`,
 * `puseram-no no cárcere` são português correto, e são 66 casos. Nem `se se`
 * (condicional + reflexivo: "se se circuncidar").
 */
export const DUPLICADAS: [string, string][] = [
  // A regra do cabeçalho tem uma exceção achada na produção: `se se` é
  // português correto na condicional ("se se circuncidar"), mas em Ef 5:13
  // — "tudo o que se se torna visível é luz" — não há condicional nenhuma, e
  // o segundo `se` é digitação. Entrou depois de eu conferir a frase inteira.
  ['EPH 5:13', 'se'],
  ['NUM 16:33', 'a'],
  ['JDG 6:34', 'a'],
  ['1KI 1:51', 'que'],
  ['1KI 3:21', 'que'],
  ['1KI 11:31', 'que'],
  ['1KI 13:3', 'que'],
  ['1CH 5:1', 'de'],
  ['2CH 9:6', 'que'],
  ['2CH 22:9', 'para'],
  ['EZR 2:34', 'de'],
  ['EZR 6:10', 'ao'],
  ['NEH 2:12', 'o'],
  ['JOB 2:1', 'e'],
  ['JOB 13:11', 'sobre'],
  ['JOB 20:2', 'meus'],
  ['PRO 22:1', 'o'],
  ['PRO 23:25', 'te'],
  ['ISA 1:25', 'minha'],
  ['ISA 8:5', 'a'],
  ['ISA 43:9', 'isto'],
  ['ISA 53:12', 'e'],
  ['ISA 58:4', 'vossa'],
  ['ISA 65:5', 'de'],
  ['ISA 66:14', 'do'],
  ['JER 6:10', 'que'],
  ['JER 7:20', 'que'],
  ['JER 9:7', 'que'],
  ['JER 14:9', 'nós'],
  ['JER 17:16', 'ser'],
  ['EZE 8:4', 'a'],
  ['EZE 17:18', 'todas'],
  ['EZE 28:2', 'de'],
  ['EZE 47:9', 'este'],
  ['DAN 5:16', 'puderes'],
  ['DAN 8:27', 'do'],
  ['JOE 2:14', 'de'],
  ['AMO 1:5', 'de'],
  ['AMO 6:10', 'da'],
  ['HAB 1:14', 'como'],
  ['LUK 11:8', 'seu'],
  ['LUK 23:47', 'o'],
  ['JOH 10:15', 'também'],
  ['ACT 14:16', 'os'],
  ['ACT 21:27', 'quase'],
  ['GAL 2:2', 'eu'],
  ['2PE 1:14', 'meu'],
  ['REV 2:8', 'o'],
  ['REV 21:1', 'e'],
]

/**
 * Fecha-parênteses sem abertura em lugar nenhum do capítulo: `que se façam
 * franjas) nos arremates`. Nem a KJV nem a Almeida 1911 têm parêntese nesses
 * pontos — é sujeira de diagramação. Some o caractere; nenhuma palavra muda.
 */
export const PARENTESES_ORFAOS: string[] = [
  'LEV 8:13',
  'NUM 15:38',
  'JER 17:5',
  'JER 17:23',
  'LAM 1:19',
  'LAM 3:36',
  'EZE 22:10',
  'MAT 23:5',
  'JOH 2:6',
  'HEB 10:29',
  'REV 17:14',
]

export type Correcao = {
  ref: string
  /** Trecho exato a encontrar. Guard: se não casar, a fonte mudou. */
  de: string
  para: string
  motivo: string
}

/** As que não cabem numa regra — cada uma conferida à mão. */
export const CORRECOES: Correcao[] = [
  {
    ref: 'PSA 125:1',
    de: 'Os que confiam no SENHOR',
    para: 'Cântico dos degraus:Os que confiam no SENHOR',
    motivo:
      'É o único dos quinze Cantares dos Degraus (Sl 120–134) sem o sobrescrito. ' +
      'A KJV traz "A Song of degrees." e a própria fonte escreve "Cântico dos degraus" ' +
      'nos outros catorze — a string vem dela, não de mim.',
  },
  {
    ref: 'PSA 80:1',
    de: 'Samo de Asafe',
    para: 'Salmo de Asafe',
    motivo:
      'Erro de digitação no sobrescrito: "Samo". A própria fonte escreve "Salmo" ' +
      'em 75 dos outros sobrescritos, e a KJV traz "A Psalm of Asaph".',
  },
  {
    ref: 'PSA 75:1',
    de: 'conforme “altachete”',
    para: 'conforme “Altachete”',
    motivo:
      'Nome próprio da melodia, que a própria fonte capitaliza como "Altachete" ' +
      'nos Salmos 57, 58 e 59. Só aqui saiu em minúscula.',
  },
  {
    ref: 'PSA 150:3',
    de: 'com com de trombeta',
    para: 'com som de trombeta',
    motivo:
      'Não é duplicata, é uma letra corrompida: a KJV traz "with the sound of the ' +
      'trumpet" e a Almeida 1911 "com o som de trombeta". O paralelismo do próprio ' +
      'versículo confirma ("louvai-o com lira e harpa").',
  },
  {
    ref: 'EXO 2:19',
    de: 'deu de beber as as ovelhas',
    para: 'deu de beber às ovelhas',
    motivo:
      'A duplicata pede crase, não simples remoção: "beber as ovelhas" ficaria ' +
      'agramatical. A KJV traz "watered the flock" e a Almeida 1911 "abeberou o rebanho".',
  },
  {
    ref: '1SA 20:42',
    de: 'para sempre.',
    para: 'para sempre. Então Davi se levantou e se foi; e Jônatas entrou na cidade.',
    motivo:
      'A BLIVRE perdeu o fecho da cena, que as duas testemunhas trazem: a KJV, ' +
      '"And he arose and departed: and Jonathan went into the city."; a Almeida 1911, ' +
      '"Então se levantou David, e se foi; e Jonathan entrou na cidade." A frase aqui é ' +
      'essa da Almeida 1911 com a ortografia e os nomes atualizados — não é tradução minha.',
  },

  // ── Achados LENDO o texto, perícope por perícope, e por varredura de palavra
  // suspeita (`scripts/palavras-suspeitas.ts`). Os seis primeiros mudam o
  // sentido; os dez seguintes são letra trocada, e oito deles estão em livros
  // que nenhum leitor humano tinha aberto ainda.

  {
    ref: 'LUK 14:11',
    de: 'Porque qualquer que exaltar a si mesmo, e aquele que humilhar a si mesmo, será exaltado.',
    para: 'Porque qualquer que exaltar a si mesmo será humilhado, e aquele que humilhar a si mesmo será exaltado.',
    motivo:
      'A oração "será humilhado" caiu, e as duas metades da frase ficaram com o mesmo desfecho — o versículo afirma o contrário do que diz. KJV: "whosoever exalteth himself shall be abased"; Almeida 1911: "qualquer que a si mesmo se exaltar será humilhado". Esta é a ÚNICA correção do catálogo que acrescenta palavras, e a redação restaurada não é minha: é a que a própria Bíblia Livre usa nos dois paralelos, Lc 18:14 e Mt 23:12.',
  },
  {
    ref: 'LUK 21:18',
    de: 'cabeça parecerá',
    para: 'cabeça perecerá',
    motivo:
      'Promessa de proteção virou frase sem pé, no meio de um trecho sobre perseguição. KJV "perish"; Almeida 1911 "não perecerá nem um cabello".',
  },
  {
    ref: 'LUK 20:46',
    de: 'querem andar roupas compridas',
    para: 'querem andar com roupas compridas',
    motivo: 'Falta a preposição. KJV "walk in long robes"; Almeida 1911 "andar com vestidos compridos".',
  },
  {
    ref: 'ACT 4:32',
    de: 'era de um só oração',
    para: 'era de um só coração',
    motivo:
      'Caiu o "c". A própria concordância denuncia: "um só oração" não fecha. KJV "of one heart and of one soul"; Almeida 1911 "era um o coração e a alma".',
  },
  {
    ref: 'ACT 17:24',
    de: 'não habita em tempos feitos por mãos',
    para: 'não habita em templos feitos por mãos',
    motivo:
      'O erro inverte o argumento do discurso no areópago, que é justamente sobre lugar. KJV "dwelleth not in temples made with hands"; Almeida 1911 "não habita em templos feitos por mãos" — e a própria fonte escreve "templos" certo em At 7:48, na mesma construção.',
  },
  {
    ref: 'ACT 25:12',
    de: 'Então Paulo, tendo conversado com o Conselho',
    para: 'Então Festo, tendo conversado com o Conselho',
    motivo:
      'Do jeito que está, Paulo confere com o conselho e responde ao próprio apelo. KJV "Then Festus, when he had conferred with the council"; Almeida 1911 "Então Festo, tendo fallado com o conselho".',
  },

  {
    ref: 'PHM 1:25',
    de: 'Jesus Cirsto',
    para: 'Jesus Cristo',
    motivo:
      'Letras trocadas no nome. KJV "the Lord Jesus Christ"; Almeida 1911 "nosso Senhor Jesus Christo". Este versículo acumula duas correções: a subscrição de escriba e este erro.',
  },
  { ref: 'REV 2:24', de: 'esta dourina', para: 'esta doutrina', motivo:
      'Caiu o "t". KJV "as many as have not this doctrine"; Almeida 1911 "não teem esta doutrina".' },
  {
    ref: 'REV 6:1',
    de: 'quando o Coreiro abriu',
    para: 'quando o Cordeiro abriu',
    motivo:
      'Caiu o "d" no nome da figura central do Apocalipse, na primeira aparição dela no capítulo. KJV "the Lamb"; Almeida 1911 "o Cordeiro".',
  },
  {
    ref: 'REV 6:5',
    de: 'abriu o terceiro celo',
    para: 'abriu o terceiro selo',
    motivo: 'Caiu o "s". O versículo 1 do mesmo capítulo escreve "selos" certo. Almeida 1911 "o terceiro sello".',
  },
  { ref: 'REV 6:15', de: 'e os rigos', para: 'e os ricos', motivo: 'Letra trocada. KJV "the rich men"; Almeida 1911 "os ricos".' },
  { ref: '2TI 2:16', de: 'inútes', para: 'inúteis', motivo:
      'Caiu o "i". KJV "shun profane and vain babblings"; Almeida 1911 "clamores vãos e profanos" — as duas trazem o adjetivo, e "inútes" não existe.' },
  {
    ref: 'HEB 11:34',
    de: 'tonaram-se fortes',
    para: 'tornaram-se fortes',
    motivo:
      'Caiu o "r". KJV "waxed valiant in fight"; Almeida 1911 "na batalha se esforçaram" — as duas trazem o verbo, e "tonaram" não existe em português.',
  },
  {
    ref: 'EPH 5:31',
    de: 'deixará oseu pai',
    para: 'deixará o seu pai',
    motivo:
      'Palavras coladas. KJV "shall a man leave his father"; Almeida 1911 "deixará o homem seu pae" — as duas separam o artigo.',
  },
  // ── Não-palavras: a segunda testemunha aqui é a PRÓPRIA FONTE, que grafa a
  // forma certa em outro lugar. Conferi as contagens no corpus antes de
  // escrever cada uma. (`hava` também aparece em 2Rs 17:24, mas ali é o nome
  // da cidade de Ava, que a KJV confirma — não entrou.)

  {
    ref: 'LUK 1:63',
    de: 'todos se surpeenderam',
    para: 'todos se surpreenderam',
    motivo: 'Caiu o "r". A própria fonte grafa "surpreenderam" corretamente em outro versículo.',
  },
  {
    ref: 'LUK 2:48',
    de: 'ficarm surpresos',
    para: 'ficaram surpresos',
    motivo: 'Caiu o "a". A própria fonte grafa "ficaram" 65 vezes no corpus.',
  },
  {
    ref: 'LUK 3:1',
    de: 'Herodes tetraca da Galileia',
    para: 'Herodes tetrarca da Galileia',
    motivo:
      'Caiu o "r". A própria fonte grafa "tetrarca" 6 vezes, duas delas neste mesmo versículo.',
  },
  {
    ref: 'LUK 9:40',
    de: 'que o exupulsassem',
    para: 'que o expulsassem',
    motivo: 'Letras a mais. A própria fonte grafa "expulsassem" corretamente em outro versículo.',
  },
  {
    ref: 'LUK 21:15',
    de: 'não posam',
    para: 'não possam',
    motivo: 'Caiu o "s". A própria fonte grafa "possam" 12 vezes no corpus.',
  },
  {
    ref: 'LUK 12:28',
    de: 'amanhá é lançada no forno',
    para: 'amanhã é lançada no forno',
    motivo: 'Acento no lugar do til. A própria fonte grafa "amanhã" 72 vezes no corpus.',
  },
  {
    ref: 'LUK 9:33',
    de: 'estavam saíndo da presença dele',
    para: 'estavam saindo da presença dele',
    motivo: 'Acento indevido. A própria fonte grafa "saindo" 42 vezes no corpus.',
  },
  {
    ref: 'LUK 4:25',
    de: 'hava muitas viúvas em Israel',
    para: 'havia muitas viúvas em Israel',
    motivo: 'Caiu o "i". A própria fonte grafa "havia" 1.324 vezes no corpus.',
  },
  {
    ref: 'PSA 109:12',
    de: 'Haja ninguém que tenha piedade dele, e haja ninguém',
    para: 'Não haja ninguém que tenha piedade dele, e não haja ninguém',
    motivo:
      'Falta a negação nas duas metades, e "Haja ninguém" nem é português. KJV "Let there be none to extend mercy unto him"; Almeida 1911 "Não haja ninguem que se compadeça d\'elle".',
  },
  {
    ref: 'NUM 31:34',
    de: 'E setenta e um mil asnos',
    para: 'E sessenta e um mil asnos',
    motivo:
      'O primeiro defeito NUMÉRICO do catálogo, e ele tem três testemunhas. A KJV traz "threescore and one thousand asses" (61.000). A aritmética do próprio capítulo prova o mesmo: os versículos 39 e 45 dividem o rebanho em duas metades de "trinta mil e quinhentos", o que exige 61.000 e não 71.000. Achado por um subagent que conferiu a conta em vez de recitar a lista.',
  },
  {
    ref: '2SA 16:9',
    de: 'Por que almadiçoa este cão morto',
    para: 'Por que amaldiçoa este cão morto',
    motivo:
      'Letras trocadas. A própria fonte grafa "amaldiçoa" 9 vezes; "almadiçoa" só aparece aqui e no versículo seguinte.',
  },
  {
    ref: 'PSA 37:21',
    de: 'O perverso toma emprestado, e paga de volta',
    para: 'O perverso toma emprestado, e não paga de volta',
    motivo:
      'Falta a negação, e sem ela o contraste da frase se desfaz — o perverso passa a fazer o mesmo que o justo. KJV "The wicked borroweth, and payeth not again"; Almeida 1911 "O impio toma emprestado, e não paga".',
  },
  {
    ref: 'PSA 57:3',
    de: 'ao que procura me demorar',
    para: 'ao que procura me devorar',
    motivo:
      'Uma letra, e a frase deixa de fazer sentido. KJV "him that would swallow me up"; Almeida 1911 "o que procura devorar-me".',
  },
  {
    ref: 'PSA 29:3',
    de: 'A voz do SEHOR',
    para: 'A voz do SENHOR',
    motivo:
      'O nome divino grafado errado. A própria fonte escreve "SENHOR" 6.537 vezes, e esta é a única ocorrência de "SEHOR" no corpus inteiro.',
  },
  {
    ref: 'PSA 33:22',
    de: 'tua bondade, SENOR',
    para: 'tua bondade, SENHOR',
    motivo:
      'O nome divino grafado errado. A própria fonte escreve "SENHOR" 6.537 vezes, e esta é a única ocorrência de "SENOR" no corpus inteiro.',
  },
  {
    ref: 'GEN 19:26',
    de: 'se tornou estátua de sai',
    para: 'se tornou estátua de sal',
    motivo:
      'Uma letra num dos versículos mais conhecidos da Bíblia, e "sai" não é palavra naquela posição. KJV "she became a pillar of salt"; Almeida 1911 "ficou convertida n\'uma estatua de sal" — e a própria fonte grafa "sal" 29 vezes.',
  },
  {
    ref: 'REV 17:4',
    de: 'e adorada com ouro',
    para: 'e adornada com ouro',
    motivo:
      'Caiu o "n", e o verbo trocado muda a frase de enfeite para culto. A própria fonte grafa "adornada" 5 vezes, inclusive na mesma construção em Ap 18:16.',
  },
  {
    ref: 'REV 3:4',
    de: 'Mas também em Sardo',
    para: 'Mas também em Sardes',
    motivo:
      'Nome da cidade trocado. A própria fonte grafa "Sardes" nas outras duas ocorrências (Ap 1:11 e 3:1), e a carta inteira é endereçada a ela.',
  },
  {
    ref: 'REV 2:14',
    de: 'colocarmeios',
    para: 'colocar meios',
    motivo:
      'Palavras coladas. KJV "to cast a stumblingblock"; Almeida 1911 "pôr tropeço" — as duas trazem verbo e objeto separados.',
  },
  {
    ref: '1PE 2:20',
    de: 'e suportais, isso é a Deus',
    para: 'e suportais, isso é agradável a Deus',
    motivo:
      'Caiu a palavra do predicado e a frase não fecha. KJV "this is acceptable with God"; Almeida 1911 "isso é agradavel a Deus".',
  },
  {
    ref: '2PE 3:16',
    de: 'em duas as [suas] cartas',
    para: 'em todas as [suas] cartas',
    motivo:
      'Como está, o texto afirma que Paulo escreveu DUAS cartas. KJV "as also in all his epistles"; Almeida 1911 "em todas as suas epistolas".',
  },
  {
    ref: '1JO 2:26',
    de: 'acerca dos que vos tentam vos enganar',
    para: 'acerca dos que tentam vos enganar',
    motivo:
      '"vos" duplicado. KJV "concerning them that seduce you"; Almeida 1911 "ácerca dos que vos enganam" — nas duas o pronome aparece uma vez só.',
  },
  {
    ref: 'REV 1:13',
    de: 'semelhante a [o] Filho',
    para: 'semelhante ao Filho',
    motivo:
      'Contração perdida. KJV "like unto the Son of man"; Almeida 1911 "semelhante ao Filho do homem". Varri o padrão inteiro antes de escrever isto: há só dois casos de preposição seguida de artigo entre colchetes, e o outro (Is 1:14, "cansado de as suportar") é português correto — por isso a correção é pontual e não virou regra.',
  },
  {
    ref: 'JUD 1:11',
    de: 'por interesse por [interesse de] lucro',
    para: 'por [interesse de] lucro',
    motivo:
      '"por interesse" duplicado. KJV "ran greedily after the error of Balaam for reward"; Almeida 1911 "se lançaram no erro de Balaão por interesse". Não entra em DUPLICADAS porque a segunda ocorrência está partida por colchete.',
  },
  {
    ref: 'HEB 13:3',
    de: 'Lembrai-vos dos prisoneiros',
    para: 'Lembrai-vos dos prisioneiros',
    motivo: 'Caiu o "i". A própria fonte grafa "prisioneiros" nas outras 17 ocorrências do corpus.',
  },
  {
    ref: 'JAM 1:13',
    de: 'e ele mesmo tenta ninguém',
    para: 'e ele mesmo a ninguém tenta',
    motivo:
      'Falta a negação, e sem ela o versículo afirma que Deus tenta — o contrário exato do que a frase inteira sustenta. KJV "neither tempteth he any man"; Almeida 1911 "e a ninguem tenta".',
  },
  {
    ref: 'ROM 15:19',
    de: 'no poder do Espíritode Deus',
    para: 'no poder do Espírito de Deus',
    motivo:
      'Palavras coladas. KJV "by the power of the Spirit of God"; Almeida 1911 "pelo poder do Espirito de Deus" — e a própria fonte separa as duas em todas as outras ocorrências.',
  },
  { ref: 'AMO 9:14', de: 'meu povo Isarael', para: 'meu povo Israel', motivo: 'Letras trocadas no nome do povo. KJV "my people of Israel".' },
  {
    ref: 'HOS 1:1',
    de: 'nos dias de Joeroboão',
    para: 'nos dias de Jeroboão',
    motivo:
      'Letra a mais no nome do rei. KJV "Jeroboam"; Almeida 1911 "Jeroboão" — e a própria fonte grafa "Jeroboão" certo nas dezenas de outras ocorrências.',
  },
]


/**
 * Subscrições de escriba: notas tardias de copista que a fonte colou DENTRO do
 * último versículo de treze epístolas — "[Escrita de Roma para os efésios, e
 * enviada por Tíquico]". **Não são Escritura.** A KJV as imprime em itálico
 * fora do texto e as edições modernas as omitem.
 *
 * Sai o trecho inteiro. Sem isto, a remoção de colchetes deste mesmo módulo
 * apagaria a marcação e o leitor veria a nota do copista como palavra de Deus.
 *
 * NÃO entram aqui dois parênteses de fim de versículo que a varredura acusa e
 * são texto bíblico de verdade — 2Sm 1:18 (o Cântico do Arco) e Gl 3:13 (a
 * citação de Deuteronômio). A KJV traz os dois entre parênteses também.
 */
export const SUBSCRICOES: string[] = [
  'ROM 16:27',
  '1CO 16:24',
  '2CO 13:14',
  'GAL 6:18',
  'EPH 6:24',
  'PHI 4:23',
  'COL 4:18',
  '1TH 5:28',
  '2TH 3:18',
  '1TI 6:21',
  '2TI 4:22',
  'TIT 3:15',
  'PHM 1:25',
  'HEB 13:25',
]

/** Trecho entre colchetes ou parênteses no fim do versículo, com o ponto solto. */
const FIM_SUBSCRICAO = /\s*(?:\[[^\]]*\]|\([^)]*\))\s*\.?\s*$/

/**
 * Frases que a Bíblia Livre omitiu e que as DUAS testemunhas trazem.
 *
 * A redação restaurada é a da Almeida de 1911 — ancestral da própria BLIVRE —
 * com ortografia, nomes e pontuação atualizados para a dicção da fonte. Não é
 * tradução minha: é a testemunha falando em português de hoje. Cada uma foi
 * conferida também contra a KJV.
 *
 * Achadas por comparação sistemática de comprimento contra as duas testemunhas,
 * não por leitura de sorte. O critério: BLIVRE < 70% da Almeida 1911 E < 80% da
 * KJV, com o versículo da Almeida acima de 60 caracteres. Foram 84 candidatos;
 * estes 28 são os que se confirmaram como omissão. Os outros 56 eram concisão
 * legítima, divisão de versículo diferente, ou crux de tradução — e ficaram
 * intactos de propósito.
 */
export const OMISSOES: Correcao[] = [
  { ref: 'GEN 14:20', de: 'que entregou teus inimigos em tua mão.',
    para: 'que entregou teus inimigos em tua mão. E deu-lhe o dízimo de tudo.',
    motivo: 'Sumiu o dízimo de Abraão a Melquisedeque. KJV: "And he gave him tithes of all."' },
  { ref: 'GEN 18:5', de: 'pois por isso passastes perto de vosso servo.',
    para: 'pois por isso passastes perto de vosso servo. E disseram: Assim faze como tens dito.',
    motivo: 'Sumiu a resposta dos visitantes. KJV: "And they said, So do, as thou hast said."' },
  { ref: 'GEN 18:10', de: 'Sara, tua mulher, terá um filho.',
    para: 'Sara, tua mulher, terá um filho. E Sara ouviu isso à porta da tenda, que estava atrás dele.',
    motivo: 'Sem isto, o riso de Sara dois versículos adiante vem do nada. KJV: "And Sarah heard it in the tent door."' },
  { ref: 'GEN 24:30', de: 'nas mãos de sua irmã, que dizia,',
    para: 'nas mãos de sua irmã, e quando ouviu as palavras de sua irmã Rebeca, que dizia,',
    motivo: 'KJV: "and when he heard the words of Rebekah his sister".' },
  { ref: 'EXO 6:28', de: 'Quando o SENHOR falou a Moisés',
    para: 'E aconteceu que, naquele dia, quando o SENHOR falou a Moisés',
    motivo: 'Sumiu a fórmula de abertura. KJV: "And it came to pass on the day when".' },
  { ref: 'JDG 6:30', de: 'Tira fora teu filho',
    para: 'Então os homens daquela cidade disseram a Joás: Tira fora teu filho',
    motivo: 'Sumiu quem fala. KJV: "Then the men of the city said unto Joash".' },
  { ref: 'JDG 11:39', de: 'E ela nunca conheceu homem.',
    para: 'E ela nunca conheceu homem. E daqui veio o costume em Israel,',
    motivo: 'KJV: "And it was a custom in Israel" — abre o versículo seguinte.' },
  { ref: 'JDG 19:3', de: 'e ela o meteu na casa de seu pai.',
    para: 'e ela o meteu na casa de seu pai; e o pai da moça, vendo-o, alegrou-se ao encontrá-lo.',
    motivo: 'KJV: "and when the father of the damsel saw him, he rejoiced to meet him."' },
  { ref: '1SA 10:25', de: 'o qual guardou diante do SENHOR.',
    para: 'o qual guardou diante do SENHOR. Então Samuel despediu todo o povo, cada um para sua casa.',
    motivo: 'KJV: "And Samuel sent all the people away, every man to his house."' },
  { ref: '1SA 15:25', de: 'E volta comigo',
    para: 'Agora, pois, peço-te, perdoa o meu pecado; e volta comigo',
    motivo: 'Sumiu a súplica de Saul. KJV: "Now therefore, I pray thee, pardon my sin".' },
  { ref: '1SA 28:12', de: 'a Saul, dizendo:',
    para: 'a Saul, dizendo: Por que me enganaste? Pois tu mesmo és Saul.',
    motivo: 'O versículo ficava terminando em dois-pontos, sem a fala. KJV: "Why hast thou deceived me? for thou art Saul."' },
  { ref: '2SA 2:32', de: 'E caminharam toda aquela noite Joabe e os seus',
    para: 'E levantaram Asael, e o sepultaram na sepultura de seu pai, que estava em Belém. E caminharam toda aquela noite Joabe e os seus',
    motivo: 'Sumiu o sepultamento de Asael inteiro. KJV: "And they took up Asahel, and buried him in the sepulcher of his father, which was in Bethlehem."' },
  { ref: '1KI 16:29', de: 'o ano trinta e oito de Asa rei de Judá.',
    para: 'o ano trinta e oito de Asa rei de Judá; e reinou Acabe, filho de Onri, sobre Israel em Samaria vinte e dois anos.',
    motivo: 'Sumiu a duração do reinado. KJV: "reigned over Israel in Samaria twenty and two years."' },
  { ref: '2KI 4:30', de: 'que não te deixarei.',
    para: 'que não te deixarei. Então ele se levantou, e a seguiu.',
    motivo: 'KJV: "And he arose, and followed her."' },
  { ref: '2KI 6:32', de: 'me envia a tirar a cabeça?',
    para: 'me envia a tirar a cabeça? Olhai, pois: quando vier o mensageiro, fechai-lhe a porta e empurrai-o para fora com ela. Por acaso não vem o ruído dos pés de seu senhor após ele?',
    motivo: 'Sumiu a ordem de Eliseu inteira. KJV: "look, when the messenger cometh, shut the door… is not the sound of his master\u2019s feet behind him?"' },
  { ref: '1CH 16:36', de: 'De eternidade a eternidade.',
    para: 'De eternidade a eternidade. E todo o povo disse: Amém! e louvou ao SENHOR.',
    motivo: 'Sumiu a resposta do povo. KJV: "And all the people said, Amen, and praised the LORD."' },
  { ref: '1CH 21:5', de: 'E achou-se em todo Israel',
    para: 'E Joabe deu a Davi a soma do número do povo. E achou-se em todo Israel',
    motivo: 'KJV: "And Joab gave the sum of the number of the people unto David."' },
  { ref: '1CH 21:15', de: 'e arrependeu-se daquele mal,',
    para: 'e arrependeu-se daquele mal, e disse ao anjo destruidor: Basta! Retira agora a tua mão. E o anjo do SENHOR estava junto à eira de Ornã, o jebuseu.',
    motivo: 'Sumiu a ordem que interrompe a praga e a eira que vira o templo. KJV: "It is enough, stay now thine hand."' },
  { ref: '2CH 12:1', de: 'havia confirmado o reino, deixou',
    para: 'havia confirmado o reino, e havendo-se fortalecido, deixou',
    motivo: 'KJV: "and had strengthened himself".' },
  { ref: '2CH 30:19', de: 'Ao SENHOR, o Deus de seus pais,',
    para: 'que preparou o seu coração para buscar a Deus, o SENHOR, o Deus de seus pais,',
    motivo: 'O versículo abria sem sujeito. KJV: "That prepareth his heart to seek God".' },
  { ref: '2CH 31:1', de: 'e também em Efraim e Manassés,',
    para: 'e também em Efraim e Manassés, até que tudo destruíram; então todos os filhos de Israel voltaram, cada um para a sua possessão, para as suas cidades.',
    motivo: 'KJV: "until they had utterly destroyed them all. Then all the children of Israel returned…"' },
  { ref: 'EZR 2:62', de: 'por isso foram rejeitados do sacerdócio.',
    para: 'por isso, como imundos, foram rejeitados do sacerdócio.',
    motivo: 'KJV: "therefore were they, as polluted, put from the priesthood."' },
  { ref: 'ISA 56:9', de: 'Todos vós, animais do campo, vinde comer!',
    para: 'Todos vós, animais do campo, todos os animais dos bosques, vinde comer!',
    motivo: 'KJV: "yea, all ye beasts in the forest."' },
  { ref: 'ISA 57:20', de: 'que não pode se aquietar.',
    para: 'que não pode se aquietar, e cujas águas lançam de si lama e lodo.',
    motivo: 'KJV: "whose waters cast up mire and dirt."' },
  { ref: 'MAT 26:67', de: 'e lhe deram socos.',
    para: 'e lhe deram socos; e outros o esbofeteavam,',
    motivo: 'KJV: "and others smote him with the palms of their hands".' },
  { ref: 'LUK 19:12', de: 'partiu para uma terra distante.',
    para: 'partiu para uma terra distante, a fim de tomar para si um reino e depois voltar.',
    motivo: 'Sem isto a parábola das minas perde o enredo. KJV: "to receive for himself a kingdom, and to return."' },
  { ref: 'LUK 22:58', de: 'Também tu és um deles.',
    para: 'Também tu és um deles. Porém Pedro disse: Homem, não sou.',
    motivo: 'Sumiu a segunda negação de Pedro. KJV: "And Peter said, Man, I am not."' },
  { ref: 'ACT 24:8', de: 'investigando-o tu mesmo,',
    para: 'mandando aos seus acusadores que viessem a ti. Investigando-o tu mesmo,',
    motivo: 'KJV: "Commanding his accusers to come unto thee".' },
]

const porRef = new Map<string, { dup?: string; paren?: boolean; sub?: boolean; manual?: Correcao }>()
for (const [ref, palavra] of DUPLICADAS) porRef.set(ref, { ...porRef.get(ref), dup: palavra })
for (const ref of PARENTESES_ORFAOS) porRef.set(ref, { ...porRef.get(ref), paren: true })
for (const ref of SUBSCRICOES) porRef.set(ref, { ...porRef.get(ref), sub: true })
for (const c of [...CORRECOES, ...OMISSOES]) porRef.set(c.ref, { ...porRef.get(c.ref), manual: c })

/**
 * Aplica as correções registradas para o versículo. Devolve o texto intacto
 * quando não há nenhuma — o caso dos outros 31.037.
 */
export function corrigirVersiculo(
  cod: string,
  capitulo: number,
  versiculo: number,
  texto: string,
): string {
  const ref = `${cod} ${capitulo}:${versiculo}`
  const alvo = porRef.get(ref)
  if (!alvo) return texto

  let saida = texto

  if (alvo.dup) {
    const p = alvo.dup.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`((?<![\\p{L}])${p})(\\s+)${p}(?![\\p{L}])`, 'iu')
    if (!re.test(saida)) {
      throw new Error(
        `Correção de duplicata em ${ref} não encontrou "${alvo.dup} ${alvo.dup}". A fonte mudou — reveja a tabela.`,
      )
    }
    saida = saida.replace(re, '$1')
  }

  if (alvo.paren) {
    if (!saida.includes(')')) {
      throw new Error(
        `Correção de parêntese órfão em ${ref} não encontrou ")". A fonte mudou — reveja a tabela.`,
      )
    }
    saida = saida.replace(/\s*\)/, '')
  }

  if (alvo.sub) {
    if (!FIM_SUBSCRICAO.test(saida)) {
      throw new Error(
        `Subscrição em ${ref} não encontrada. A fonte mudou — reveja a tabela.`,
      )
    }
    saida = saida.replace(FIM_SUBSCRICAO, '')
  }

  if (alvo.manual) {
    if (!saida.includes(alvo.manual.de)) {
      throw new Error(
        `Correção em ${ref} não encontrou "${alvo.manual.de}". A fonte mudou — reveja a tabela.`,
      )
    }
    saida = saida.replace(alvo.manual.de, alvo.manual.para)
  }

  return saida
}
