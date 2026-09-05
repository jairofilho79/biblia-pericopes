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
    ref: 'PSA 89:38',
    de: 'Porém tu te rebelaste, e [o] rejeitaste',
    para: 'Porém tu o aborreceste, e [o] rejeitaste',
    motivo:
      'A fonte põe DEUS se rebelando, o que nenhuma testemunha sustenta: KJV "But thou hast cast off and abhorred"; Almeida 1911 "Porém tu rejeitaste e aborreceste". A palavra que entra é a da Almeida, não uma escolha minha — é a tradução ancestral da Bíblia Livre e domínio público, e trocar só o verbo errado mantém o resto do versículo intacto.',
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

  // --- Ortografia provada pela própria fonte ---
  // Para erro de acento a regra das duas testemunhas é canhão em passarinho,
  // e pior: a Almeida de 1911 é anterior às reformas ortográficas, então ela
  // grafa `benção` e `fossemos` sem que isso queira dizer nada. A testemunha
  // boa aqui é a Bíblia Livre contra si mesma — ela escreve `princípio` 98
  // vezes e `principio` 2. Contar é mais firme do que interpretar.
  { ref: 'PRO 1:7', de: 'o principio do conhecimento',
    para: 'o princípio do conhecimento',
    motivo: 'A testemunha aqui é a própria fonte: a Bíblia Livre escreve `princípio` 98 vezes e `principio` 2. Não é decisão de tradução, é grafia da casa.' },
  { ref: 'REV 22:13', de: 'o principio e o fim',
    para: 'o princípio e o fim',
    motivo: 'Mesmo caso de Pv 1:7: a própria fonte escreve `princípio` 98 vezes contra 2 sem acento.' },
  { ref: 'ACT 13:2', de: 'o Espirito Santo',
    para: 'o Espírito Santo',
    motivo: 'A própria fonte escreve `Espírito` 598 vezes. Esta é a única sem acento.' },
  { ref: 'MAT 7:17', de: 'a arvore má',
    para: 'a árvore má',
    motivo: 'A própria fonte escreve `árvore` 101 vezes e `arvore` uma.' },
  { ref: 'PSA 72:19', de: 'Amem, e amém!',
    para: 'Amém, e amém!',
    motivo: 'A própria fonte escreve `amém` certo na segunda vez, três palavras adiante — ela se contradiz dentro da mesma linha.' },
  { ref: 'JDG 3:19', de: 'E sairam-se',
    para: 'E saíram-se',
    motivo: 'A própria fonte escreve `saíram` 133 vezes contra duas sem o acento, e sem ele a palavra lê-se como outra coisa.' },
  { ref: '1SA 23:13', de: 'e sairam de Queila',
    para: 'e saíram de Queila',
    motivo: 'Mesmo caso de Jz 3:19: a própria fonte escreve `saíram` 133 vezes e sem acento só duas.' },
  { ref: 'ISA 43:7', de: 'para minha gloria',
    para: 'para minha glória',
    motivo: 'A própria fonte escreve `glória` 354 vezes e `gloria` duas.' },
  { ref: 'REV 20:8', de: 'dos quais o numero',
    para: 'dos quais o número',
    motivo: 'A própria fonte escreve `número` 104 vezes, e esta é a única sem acento.' },
  { ref: 'JER 52:4', de: 'no decimo mês',
    para: 'no décimo mês',
    motivo: 'A própria fonte escreve `décimo` 70 vezes, e esta é a única sem acento.' },
  { ref: 'JER 25:36', de: 'dos lideres do rebanho',
    para: 'dos líderes do rebanho',
    motivo: 'A própria fonte escreve `líderes` 65 vezes, e esta é a única sem acento.' },
  { ref: '2TI 3:3', de: 'sem dominio próprio',
    para: 'sem domínio próprio',
    motivo: 'A própria fonte escreve `domínio` 51 vezes, e esta é a única sem acento.' },
  { ref: '2CH 36:21', de: 'de sua ruina',
    para: 'de sua ruína',
    motivo: 'A própria fonte escreve `ruína` 28 vezes, e esta é a única sem acento.' },
  { ref: 'EZE 31:12', de: 'mais terrivel',
    para: 'mais terrível',
    motivo: 'A própria fonte escreve `terrível` 19 vezes, e esta é a única sem acento.' },
  { ref: '1CO 15:52', de: 'à ultima trombeta',
    para: 'à última trombeta',
    motivo: 'A própria fonte escreve `última` 11 vezes, e esta é a única sem acento.' },
  { ref: 'LUK 4:40', de: 'troxeram-lhe',
    para: 'trouxeram-lhe',
    motivo: 'A própria fonte escreve `trouxeram` 40 vezes e `troxeram` uma. É o segundo defeito desta mesma linha, ao lado de `varias`.' },
  { ref: 'LUK 4:40', de: 'de varias doenças',
    para: 'de várias doenças',
    motivo: 'A própria fonte escreve `várias` 10 vezes; no mesmo versículo há ainda `troxeram` por `trouxeram`.' },
  { ref: 'GAL 3:24', de: 'fossemos justificados',
    para: 'fôssemos justificados',
    motivo: 'A Almeida de 1911 também escreve `fossemos`, mas ela é anterior às reformas ortográficas e por isso não serve de testemunha para acento. Quem serve é a própria fonte, que escreve `fôssemos` 10 vezes.' },
  { ref: 'HEB 12:17', de: 'herdar a benção',
    para: 'herdar a bênção',
    motivo: 'Como em Gl 3:24, a Almeida de 1911 grafa `benção` por ser de antes das reformas. A própria fonte escreve `bênção` 58 vezes e `benção` duas.' },
  { ref: 'JAM 3:10', de: 'procedem benção e maldição',
    para: 'procedem bênção e maldição',
    motivo: 'Mesmo caso de Hb 12:17: a própria fonte escreve `bênção` 58 vezes e `benção` duas.' },

  // --- Letra ou espaço, conferidos nas duas testemunhas ---
  { ref: 'ACT 9:4', de: 'ouviu ma voz',
    para: 'ouviu uma voz',
    motivo: 'KJV: "heard a voice"; Almeida: "ouviu uma voz". A letra que caiu é o `u` do artigo, e as duas testemunhas dizem a mesma coisa.' },
  { ref: 'LAM 3:6', de: 'como os que já morrera há',
    para: 'como os que já morreram há',
    motivo: 'KJV: "as they that be dead of old"; Almeida: "como os que estavam mortos ha muito". O sujeito é plural — `os que` —, e nenhuma das duas põe o verbo no futuro.' },
  { ref: 'MAR 12:37', de: 'é so eu filho',
    para: 'é seu filho',
    motivo: 'Um espaço no lugar errado partiu `seu` em duas palavras. Almeida: "como é logo seu filho?"; KJV: "whence is he then his son?". O `pois` que a Bíblia Livre já traz faz o trabalho do `logo`, então só o `seu` precisa voltar.' },
  { ref: 'REV 10:4', de: 'eu estava a pondo de',
    para: 'eu estava a ponto de',
    motivo: 'KJV: "I was about to write". `a pondo de` não é construção do português; `a ponto de` é, e é o que as duas testemunhas dizem.' },
  { ref: 'DEU 4:42', de: 'destas cidades salvara a vida',
    para: 'destas cidades salvasse a vida',
    motivo: '`salvara` é o imperfeito do subjuntivo ESPANHOL — o mesmo rastro de base castelhana que deixou `preguntar` em Dt 13:14 e outros três lugares. Em português a forma é `salvasse`, e é o modo que as duas testemunhas pedem: KJV "that fleeing... he might live", Almeida "e se acolhesse a uma d\'estas cidades, e vivesse".' },

  // --- Pentateuco, Josué e Reis ---
  { ref: 'EXO 25:16', de: 'porás no arca',
    para: 'porás na arca',
    motivo: 'KJV: "put into the ark"; Almeida: "porás na arca". `arca` é feminino em toda a fonte — são cinco lugares com o mesmo tropeço.' },
  { ref: 'EXO 25:21', de: 'e no arca porás',
    para: 'e na arca porás',
    motivo: 'Mesmo tropeço de Êx 25:16, no mesmo versículo em que a fonte já escreve `da arca` certo. KJV: "in the ark"; Almeida: "na arca".' },
  { ref: 'LEV 24:10', de: 'Naquela muita o filho',
    para: 'E o filho',
    motivo: '`Naquela muita` não quer dizer nada em português — é resíduo do castelhano `en aquella sazón`, o mesmo rastro de base espanhola que deixou `preguntar`. Aqui nenhuma das duas testemunhas traz marcador de tempo: KJV "And the son of an Israelitish woman", Almeida "E saiu um filho d\'uma mulher israelita". A leitura testemunhada é simplesmente `E`.' },
  { ref: '1KI 3:16', de: 'Naquela muita vieram',
    para: 'Então vieram',
    motivo: 'O gêmeo de Lv 24:10, e aqui as duas testemunhas trazem o marcador: KJV "Then came there two women", Almeida "Então vieram duas mulheres prostitutas ao rei". A palavra que entra é a da Almeida.' },
  { ref: 'DEU 13:14', de: 'e preguntarás com empenho',
    para: 'e perguntarás com empenho',
    motivo: 'Almeida: "com diligencia perguntarás"; KJV: "ask diligently". `preguntar` é o verbo espanhol — quatro lugares na fonte, todos do mesmo rastro de base castelhana.' },
  { ref: 'DEU 17:9', de: 'e preguntarás;',
    para: 'e perguntarás;',
    motivo: 'Mesmo castelhanismo de Dt 13:14. KJV: "and inquire"; Almeida: "e inquirirás" — o verbo português é `perguntar`, e a fonte o escreve certo em toda parte.' },
  { ref: 'EXO 19:4', de: 'sobre asas de águas',
    para: 'sobre asas de águias',
    motivo: 'KJV: "on eagles\' wings"; Almeida: "sobre azas d\'aguias". A ave virou água em oito lugares da fonte — falta um `i`.' },
  { ref: 'LEV 11:13', de: 'abominação: a água, o quebra-ossos',
    para: 'abominação: a águia, o quebra-ossos',
    motivo: 'É a lista das aves imundas, e água não é ave. KJV: "the eagle, and the ossifrage"; Almeida: "a aguia, e o quebrantosso".' },
  { ref: 'DEU 14:12', de: 'não comereis: a água,',
    para: 'não comereis: a águia,',
    motivo: 'Mesma lista de aves de Lv 11:13. KJV: "the eagle, and the ossifrage"; Almeida: "a aguia, e o quebrantosso".' },
  { ref: 'DEU 28:49', de: 'que voe como água',
    para: 'que voe como águia',
    motivo: 'KJV: "as swift as the eagle flieth"; Almeida: "que vôa como a aguia". Água não voa.' },
  { ref: 'DEU 32:11', de: 'Como a água desperta sua ninhada',
    para: 'Como a águia desperta sua ninhada',
    motivo: 'KJV: "As an eagle stirreth up her nest"; Almeida: "Como a aguia desperta o seu ninho". O versículo inteiro fala de asas e de penas.' },
  { ref: 'JOS 13:5', de: 'Baal-Gade o pdo monte',
    para: 'Baal-Gade ao pé do monte',
    motivo: '`o pdo` é `ao pé do` com as letras comidas. Almeida: "desde Baal-gad, ao pé do monte Hermon"; KJV: "from Baal-gad under mount Hermon".' },
  { ref: 'JOS 13:6', de: 'de Israel:;somente',
    para: 'de Israel; somente',
    motivo: 'Dois sinais de pontuação colados e o espaço perdido. Almeida: "de diante dos filhos de Israel: tão sómente"; KJV: "from before the children of Israel: only". Nada muda de sentido — muda o que a narração vai ler em voz alta.' },
  { ref: 'LEV 25:30', de: 'ficará para sempre por daquele',
    para: 'ficará para sempre daquele',
    motivo: '`por daquele` empilha duas preposições e não é português. KJV: "shall be established forever to him that bought it"; Almeida: "em perpetuidade ficará ao que a comprou".' },
  { ref: 'LEV 25:32', de: 'Porém em quanto às cidades',
    para: 'Porém quanto às cidades',
    motivo: 'Um `em` a mais antes de `quanto às`. Almeida: "Mas, tocante ás cidades dos levitas"; KJV: "Notwithstanding the cities of the Levites".' },
  { ref: 'LEV 25:33', de: 'dos levitas é a possessão deles',
    para: 'dos levitas são a possessão deles',
    motivo: 'O sujeito é `as casas`, plural. KJV: "the houses... are their possession"; Almeida: "as casas das cidades dos levitas são a sua possessão".' },
  { ref: 'LEV 25:44', de: 'que estão em vosso ao redor',
    para: 'que estão ao vosso redor',
    motivo: 'KJV: "that are round about you"; Almeida: "que estão ao redor de vós". As palavras são as mesmas da fonte, postas na ordem que o português pede.' },
  { ref: 'LEV 25:54', de: 'resgatar em esses anos',
    para: 'resgatar nesses anos',
    motivo: '`em esses` é a contração espanhola por fazer — o mesmo rastro de `preguntar`. KJV: "in these years"; Almeida: "se d\'esta sorte se não resgatar".' },
  { ref: 'NUM 23:3', de: 'e qualquer um coisa que me mostrar',
    para: 'e qualquer coisa que me mostrar',
    motivo: 'Um `um` sobrando entre `qualquer` e `coisa`. KJV: "whatsoever he showeth me"; Almeida: "o que me mostrar te notificarei".' },
  { ref: 'NUM 23:19', de: 'não fará?; Falou',
    para: 'não fará? Falou',
    motivo: 'Interrogação e ponto e vírgula colados. KJV: "hath he said, and shall he not do it? or hath he spoken". A pontuação quebrada é o que a narração tropeça.' },
  { ref: 'NUM 24:1', de: 'a encontro de agouros',
    para: 'ao encontro de agouros',
    motivo: 'Almeida: "ao encontro dos encantamentos"; KJV: "to seek for enchantments". Falta a contração do artigo.' },
  { ref: 'NUM 24:21', de: 'na rocha tua ninho',
    para: 'na rocha teu ninho',
    motivo: '`ninho` é masculino. KJV: "thou puttest thy nest in a rock"; Almeida: "pozeste o teu ninho na penha".' },
  { ref: 'NUM 31:9', de: 'e todos suas animais',
    para: 'e todos os seus animais',
    motivo: 'KJV: "the spoil of all their cattle"; Almeida: "tambem roubaram todos os seus animaes". O possessivo estava no feminino e faltava o artigo.' },

  // --- Históricos, Jó, Provérbios e profetas menores ---
  { ref: '1SA 6:19', de: 'olhado no arca',
    para: 'olhado na arca',
    motivo: 'KJV: "looked into the ark"; Almeida: "olharam para dentro da arca". `arca` é feminino, e a fonte erra o gênero em cinco lugares.' },
  { ref: '2KI 12:10', de: 'dinheiro no arca',
    para: 'dinheiro na arca',
    motivo: 'KJV: "much money in the chest"; Almeida: "já havia muito dinheiro na arca". Mesmo tropeço de gênero de Êx 25:16.' },
  { ref: '2CH 24:10', de: 'lançavam no arca',
    para: 'lançavam na arca',
    motivo: 'KJV: "cast into the chest"; Almeida: "a lançaram na arca". Mesmo tropeço de gênero de Êx 25:16.' },
  { ref: '2SA 11:3', de: 'a preguntar por aquela mulher',
    para: 'a perguntar por aquela mulher',
    motivo: 'Almeida: "e perguntou por aquella mulher"; KJV: "and inquired after the woman". `preguntar` é o verbo espanhol, e são quatro lugares na fonte.' },
  { ref: '2CH 18:7', de: 'podemos preguntar ao SENHOR',
    para: 'podemos perguntar ao SENHOR',
    motivo: 'KJV: "by whom we may inquire of the LORD"; Almeida: "por quem podemos consultar ao Senhor". Mesmo castelhanismo de Dt 13:14.' },
  { ref: '2SA 1:23', de: 'Mais ligeiros que águas',
    para: 'Mais ligeiros que águias',
    motivo: 'KJV: "swifter than eagles"; Almeida: "mais ligeiros do que as aguias". O verso seguinte diz `mais fortes que leões` — a comparação é toda de bichos.' },
  { ref: 'JOB 39:27', de: 'que a água voa alto',
    para: 'que a águia voa alto',
    motivo: 'KJV: "Doth the eagle mount up at thy command"; Almeida: "Ou se remonta a aguia ao teu mandado". Água não faz ninho na altura.' },
  { ref: 'ISA 7:15', de: 'Manteiga e mal ele comerá',
    para: 'Manteiga e mel ele comerá',
    motivo: 'KJV: "Butter and honey shall he eat"; Almeida: "Manteiga e mel comerá". O `mal` certo está três palavras adiante, no mesmo versículo — a fonte usa as duas palavras lado a lado e trocou uma.' },
  { ref: 'HOS 1:2', de: 'se prostitui munto',
    para: 'se prostitui muito',
    motivo: 'A própria fonte escreve `muito` 495 vezes e `munto` uma. KJV: "hath committed great whoredom".' },
  { ref: 'HOS 3:3', de: 'nem e eu',
    para: 'e também eu',
    motivo: 'A fonte nega o que as duas testemunhas afirmam: KJV "so will I also be for thee", Almeida "e tambem eu ficarei para ti". O `nem` inverte a promessa de Oseias à mulher — é o décimo defeito do catálogo que muda o sentido.' },
  { ref: 'HOS 10:14', de: 'a mãe foram despedaçada',
    para: 'a mãe foi despedaçada',
    motivo: 'KJV: "the mother was dashed in pieces"; Almeida: "a mãe ali foi despedaçada". Sujeito no singular, verbo no plural.' },
  { ref: 'HOS 11:12', de: 'e era é fiel',
    para: 'e era fiel',
    motivo: 'Dois verbos empilhados. KJV: "and is faithful with the saints"; Almeida: "e com os sanctos está fiel".' },
  { ref: 'ZEC 7:1', de: 'a Zacarias noquarto',
    para: 'a Zacarias no quarto',
    motivo: 'Espaço perdido. KJV: "in the fourth day of the ninth month"; Almeida: "no dia quarto do nono mez".' },
  { ref: 'ZEC 7:13', de: 'assim tamb\u00a0em quando',
    para: 'assim também quando',
    motivo: 'Não é espaço: é um espaço NÃO-SEPARÁVEL (U+00A0) no meio da palavra, o único do arquivo inteiro, e por isso invisível a olho e a `\\s{2,}`. KJV: "so they cried"; Almeida: "assim tambem elles clamaram".' },
  { ref: '2SA 15:7', de: 'voto que ei prometido',
    para: 'voto que hei prometido',
    motivo: 'KJV: "my vow, which I have vowed"; Almeida: "o meu voto que votei ao Senhor". A própria fonte escreve `hei` 75 vezes — é o verbo auxiliar, sem o agá.' },
  { ref: '2SA 16:10', de: 'Ele almadiçoa assim',
    para: 'Ele amaldiçoa assim',
    motivo: 'A própria fonte escreve `amaldiçoa` 8 vezes e `almadiçoa` duas, as duas nesta linha e na anterior — as letras trocadas de lugar. Almeida: "Ora deixae-o amaldiçoar".' },
  { ref: '2SA 16:10', de: 'que almadiçoasse a Davi',
    para: 'que amaldiçoasse a Davi',
    motivo: 'O segundo `almadiçoa` da mesma linha; a fonte escreve `amaldiçoasse` certo em Dt 23:4 e Js 24:9. KJV: "the LORD hath said unto him, Curse David"; Almeida: "Amaldiçôa a David".' },
  { ref: '2SA 18:2', de: 'e a outra terceira parte',
    para: 'e a outra terça parte',
    motivo: 'O mesmo versículo já disse `terça parte` duas vezes antes; na terceira mudou de palavra. KJV repete "a third part" nas três. É a fonte se contradizendo dentro da linha.' },
  { ref: '2SA 19:11', de: 'E el rei Davi',
    para: 'E o rei Davi',
    motivo: '`el rei` é o artigo espanhol, e sobrou em dois lugares da fonte contra centenas de `o rei`. KJV: "And king David sent"; Almeida: "Então o rei David enviou".' },
  { ref: '2KI 23:4', de: 'Então mandou el rei',
    para: 'Então mandou o rei',
    motivo: 'O gêmeo de 2Sm 19:11, e o único outro `el rei` da fonte — achado ao contar a expressão. KJV: "And the king commanded Hilkiah the high priest".' },
  { ref: 'JOB 28:22', de: 'O perdição e a morte',
    para: 'A perdição e a morte',
    motivo: 'Almeida: "A perdição e a morte dizem"; KJV: "Destruction and death say". `perdição` é feminino, e a fonte já põe `a morte` certo ao lado.' },
  { ref: 'JOB 29:10', de: 'apegavam a céu da boca',
    para: 'apegavam ao céu da boca',
    motivo: 'KJV: "their tongue cleaved to the roof of their mouth"; Almeida: "a sua lingua se pegava ao seu paladar". Falta a contração do artigo.' },
  { ref: 'JOB 31:9', de: 'Se foi meu coração se deixou',
    para: 'Se o meu coração se deixou',
    motivo: 'KJV: "If mine heart have been deceived by a woman"; Almeida: "Se o meu coração se deixou seduzir por uma mulher". O `foi` sobra e o artigo falta.' },
  { ref: 'JOB 31:9', de: 'ou se estive espreitei à porta',
    para: 'ou se espreitei à porta',
    motivo: 'Dois verbos para uma ação só. KJV: "or if I have laid wait at my neighbor\'s door"; Almeida: "ou se eu armei traições á porta do meu proximo".' },
  { ref: 'PRO 29:8', de: 'trazem confusão a cidade',
    para: 'trazem confusão à cidade',
    motivo: 'KJV: "bring a city into a snare"; Almeida: "abrazam a cidade". Falta a crase, e sem ela a frase muda de regência.' },
  { ref: 'PRO 29:25', de: 'confia no senhor',
    para: 'confia no SENHOR',
    motivo: 'A própria fonte escreve `SENHOR` em versalete 6.537 vezes para o nome divino, e aqui uma só em minúsculas. KJV: "whoso putteth his trust in the LORD".' },
  { ref: 'PRO 29:27', de: 'O justos odeiam',
    para: 'Os justos odeiam',
    motivo: 'Artigo no singular com substantivo no plural. KJV: "An unjust man is an abomination to the just"; Almeida: "Abominação é para os justos o homem iniquo".' },
  { ref: '1SA 24:19', de: 'o deixará ir saro e salvo',
    para: 'o deixará ir são e salvo',
    motivo: '`saro` não existe: é o castelhano `sano y salvo` na metade do caminho, o mesmo rastro de base espanhola de `preguntar` e `el rei`. KJV: "will he let him go well away?"; Almeida: "o deixaria ir por bom caminho?".' },
  { ref: 'ISA 14:23', de: 'poças d´água',
    para: 'poças d\'água',
    motivo: 'O acento agudo solto no lugar do apóstrofo — o único do arquivo inteiro, achado ao varrer os caracteres invisíveis atrás do espaço não-separável de Zc 7:13. A própria fonte escreve `d\'água` com apóstrofo três vezes. KJV: "pools of water"; Almeida: "lagoas d\'aguas".' },

  // --- Gênesis, Levítico e Jeremias ---
  { ref: 'GEN 19:15', de: 'teus dois filhas',
    para: 'tuas duas filhas',
    motivo: 'KJV: "thy two daughters"; Almeida: "tuas duas filhas". O possessivo e o numeral ficaram no masculino.' },
  { ref: 'GEN 19:17', de: 'nem pares toda esta planície',
    para: 'nem pares em toda esta planície',
    motivo: 'KJV: "neither stay thou in all the plain"; Almeida: "e não pares em toda esta campina". Falta a preposição.' },
  { ref: 'LEV 25:6', de: 'e a tua criado, e a tua estrangeiro',
    para: 'e a teu criado, e a teu estrangeiro',
    motivo: 'O mesmo versículo escreve `a teu servo` certo três palavras antes. KJV: "for thy hired servant, and for thy stranger"; Almeida: "e ao teu jornaleiro, e ao estrangeiro".' },
  { ref: 'LEV 25:7', de: 'e à animal que houver',
    para: 'e ao animal que houver',
    motivo: 'KJV: "and for the beast that are in thy land"; Almeida: "e aos teus animaes, que estão na tua terra". `animal` é masculino, e a fonte já escreve `a teu animal` certo antes.' },
  { ref: 'LEV 25:13', de: 'Em este ano de jubileu',
    para: 'Neste ano de jubileu',
    motivo: '`Em este` é a contração espanhola por fazer — mesmo rastro de `preguntar` e de `em esses anos` em Lv 25:54. Almeida: "N\'este anno do jubileu"; KJV: "In the year of this jubilee".' },
  { ref: 'LEV 25:29', de: 'em cidade cercado',
    para: 'em cidade cercada',
    motivo: 'KJV: "a dwelling house in a walled city"; Almeida: "uma casa de moradia em cidade murada". `cidade` é feminino.' },
  { ref: 'JER 16:5', de: 'nem mostre compaixão deles',
    para: 'nem mostres compaixão deles',
    motivo: 'A fala é toda na segunda pessoa — `não entres`, `nem vás` —, e só este verbo saiu dela. KJV: "neither go to lament nor bemoan them"; Almeida: "nem te compadeças d\'elles".' },
  { ref: 'JER 17:20', de: 'por esta portas',
    para: 'por estas portas',
    motivo: 'KJV: "that enter in by these gates"; Almeida: "que entraes por estas portas". Demonstrativo no singular com substantivo no plural.' },
  { ref: 'JER 18:15', de: 'e fazem- lhes tropeçar',
    para: 'e fazem-lhes tropeçar',
    motivo: 'Espaço sobrando depois do hífen — a ênclise partida em duas. KJV: "they have caused them to stumble"; Almeida: "porque os fizeram tropeçar".' },
  { ref: 'JER 20:4', de: 'cairão pelo espada',
    para: 'cairão pela espada',
    motivo: 'KJV: "they shall fall by the sword"; Almeida: "cairão á espada de seus inimigos". `espada` é feminino, e o mesmo versículo escreve `à espada` certo no fim.' },
  { ref: 'JER 4:6', de: 'Erguei bandeia',
    para: 'Erguei bandeira',
    motivo: 'A própria fonte escreve `bandeira` 26 vezes e `bandeia` uma. KJV: "Set up the standard toward Zion"; Almeida: "Arvorae a bandeira para Sião".' },
  { ref: 'JER 6:11', de: 'cheio dá fúria',
    para: 'cheio da fúria',
    motivo: 'Acento onde não cabe: `dá` é verbo, e aqui é a contração `da`. KJV: "I am full of the fury of the LORD"; Almeida: "já estou cheio do furor do Senhor".' },
  { ref: 'JER 6:18', de: 'disto, o multidão',
    para: 'disto, ó multidão',
    motivo: 'É vocativo, e sem o acento vira artigo — e artigo masculino com substantivo feminino. KJV: "and know, O congregation"; Almeida: "e informa-te tu, ó congregação".' },
  { ref: 'JER 6:20', de: 'Vossos holocaustosnão',
    para: 'Vossos holocaustos não',
    motivo: 'Duas palavras coladas, e sem ponto entre elas a limpeza da ETL não as separa. KJV: "your burnt offerings are not acceptable"; Almeida: "vossos holocaustos não me agradam".' },
  { ref: 'JER 7:34', de: 'e da ruas de Jerusalém',
    para: 'e das ruas de Jerusalém',
    motivo: 'KJV: "and from the streets of Jerusalem"; Almeida: "e das ruas de Jerusalem". Artigo no singular com substantivo no plural.' },
  { ref: 'JER 8:5', de: 'de Jerusalém continuam se desviando',
    para: 'de Jerusalém continua se desviando',
    motivo: 'O sujeito é `este povo`, singular. KJV: "Why then is this people of Jerusalem slid back"; Almeida: "Porque pois se desvia este povo de Jerusalem".' },
  { ref: 'JER 8:19', de: 'desde uma da terra distante',
    para: 'desde uma terra distante',
    motivo: 'Duas preposições empilhadas. KJV: "of them that dwell in a far country"; Almeida: "já se ouve da terra mui remota".' },

  // --- Romanos, Coríntios e Gálatas ---
  { ref: 'ROM 4:3', de: 'e isso lhe foi lhe imputado',
    para: 'e isso lhe foi imputado',
    motivo: 'O `lhe` aparece duas vezes. KJV: "and it was counted unto him for righteousness"; Almeida: "e isso lhe foi imputado como justiça".' },
  { ref: 'ROM 7:2', de: 'enquanto o ele viver',
    para: 'enquanto ele viver',
    motivo: 'Um artigo antes do pronome. KJV: "so long as he liveth"; Almeida: "emquanto elle viver".' },
  { ref: 'ROM 8:36', de: 'somos entreges à morte',
    para: 'somos entregues à morte',
    motivo: 'A própria fonte escreve `entregues` 23 vezes e `entreges` uma. Almeida: "somos entregues á morte todo o dia".' },
  { ref: '1CO 1:14', de: 'a Deus que batizei nenhum de vós',
    para: 'a Deus que a nenhum de vós batizei',
    motivo: 'Sem a negação a frase diz o contrário do que Paulo quer dizer. KJV: "I thank God that I baptized none of you"; Almeida: "Dou graças a Deus, porque a nenhum de vós baptizei". A ordem que entra é a da Almeida.' },
  { ref: '1CO 5:2', de: 'vós não deveríeis se entristecer',
    para: 'vós não deveríeis vos entristecer',
    motivo: 'O pronome não concorda com `vós`. KJV: "and have not rather mourned"; Almeida: "e nem ao menos vos entristecestes".' },
  { ref: '1CO 7:5', de: 'outra vez a se juntarem',
    para: 'outra vez a vos juntar',
    motivo: 'A frase é toda na segunda pessoa do plural — `não vos priveis`, `voltai-vos` — e só este verbo saiu dela. KJV: "and come together again"; Almeida: "e depois ajuntae-vos outra vez".' },
  { ref: '1CO 7:21', de: 'podes te tornares livre',
    para: 'podes te tornar livre',
    motivo: 'Dois verbos conjugados onde cabe um só. KJV: "but if thou mayest be made free"; Almeida: "e, se ainda podes ser livre".' },
  { ref: '1CO 7:29', de: 'os que tem mulheres',
    para: 'os que têm mulheres',
    motivo: 'Terceira pessoa do plural leva acento. KJV: "they that have wives"; Almeida: "os que teem mulheres".' },
  { ref: '1CO 10:23', de: 'me são licitas, mas nem todas as coisas edificam',
    para: 'me são lícitas, mas nem todas as coisas edificam',
    motivo: 'A própria fonte escreve `lícitas` com acento na primeira metade deste versículo e sem acento na segunda — ela se contradiz dentro da linha, e no arquivo inteiro grafa `lícitas` 3 vezes e `licitas` uma.' },
  { ref: '1CO 11:8', de: 'o homem não provem da mulher',
    para: 'o homem não provém da mulher',
    motivo: 'A própria fonte escreve `provém` com acento em toda parte. Almeida: "Porque o varão não provém da mulher".' },
  { ref: '1CO 12:24', de: 'os nosso mais respeitáveis',
    para: 'os nossos mais respeitáveis',
    motivo: 'Possessivo no singular com artigo no plural. KJV: "For our comely parts have no need"; Almeida: "Porque os que em nós são mais honestos".' },
  { ref: '1CO 14:15', de: 'Então é o que?',
    para: 'Então, o que é?',
    motivo: 'As palavras estão fora de ordem. KJV: "What is it then?"; Almeida: "Que farei pois?".' },
  { ref: '1CO 14:30', de: 'a outro, que estiver sentada',
    para: 'a outro, que estiver sentado',
    motivo: '`outro` é masculino. KJV: "to another that sitteth by"; Almeida: "se a outro, que estiver assentado".' },
  { ref: '1CO 15:6', de: 'visto de uma fez por mais',
    para: 'visto de uma vez por mais',
    motivo: 'KJV: "he was seen of above five hundred brethren at once"; Almeida: "Depois foi visto, uma vez, por mais de quinhentos irmãos".' },
  { ref: '1CO 15:17', de: 'vossa fé é vá,',
    para: 'vossa fé é vã,',
    motivo: 'Acento agudo no lugar do til — `vá` é verbo. KJV: "your faith is vain"; Almeida: "é vã a vossa fé".' },
  { ref: '1CO 15:24', de: 'o Reino de Deus e ao Pai',
    para: 'o Reino a Deus e ao Pai',
    motivo: 'O `e ao Pai` que sobra denuncia o que a frase queria: entregar o Reino A Deus, e não falar do Reino DE Deus. KJV: "delivered up the kingdom to God, even the Father"; Almeida: "entregado o reino a Deus, ao Pae".' },
  { ref: '1CO 16:2', de: 'ponha [alguma coisa] à pate',
    para: 'ponha [alguma coisa] à parte',
    motivo: 'Falta uma letra. KJV: "lay by him in store"; Almeida: "cada um de vós ponha de parte o que poder ajuntar".' },
  { ref: '1CO 16:19', de: 'Priscila vos saúdam-vos afetuosamente',
    para: 'Priscila saúdam-vos afetuosamente',
    motivo: 'O `vos` aparece duas vezes. KJV: "Aquila and Priscilla salute you much in the Lord"; Almeida: "Saudam-vos affectuosamente no Senhor Aquila e Prisca".' },
  { ref: '1CO 16:20', de: 'Saudai-vos uns as outros',
    para: 'Saudai-vos uns aos outros',
    motivo: 'KJV: "Greet ye one another with a holy kiss"; Almeida: "Saudae-vos uns aos outros com osculo sancto". Falta a contração, e `outros` é masculino.' },
  { ref: '2CO 1:22', de: 'em nosso corações',
    para: 'em nossos corações',
    motivo: 'Possessivo no singular com substantivo no plural. KJV: "in our hearts"; Almeida: "em nossos corações".' },
  { ref: '2CO 3:1', de: 'começamos a recomendarmos a nós mesmos',
    para: 'começamos a recomendar a nós mesmos',
    motivo: 'Dois verbos conjugados onde cabe um só. KJV: "Do we begin again to commend ourselves?"; Almeida: "começamos outra vez a louvar-nos a nós mesmos?".' },
  { ref: '2CO 6:12', de: 'mas vós estais estreitos em nossos sentimentos',
    para: 'mas vós estais estreitos em vossos sentimentos',
    motivo: 'Com `nossos` a frase se contradiz: Paulo diz que o aperto não vem dele, e sim dos coríntios. KJV: "but ye are straitened in your own bowels"; Almeida: "mas estaes estreitados nas vossas entranhas".' },
  { ref: '2CO 10:12', de: 'não ousamos a nos classificar',
    para: 'não ousamos nos classificar',
    motivo: 'Uma preposição a mais. KJV: "For we dare not make ourselves of the number"; Almeida: "Porque não ousamos juntar-nos".' },
  { ref: '2CO 11:11', de: 'Por que? Porque não vos amo?',
    para: 'Por quê? Porque não vos amo?',
    motivo: 'Interrogativo isolado no fim da frase leva circunflexo. A própria fonte escreve `Por quê?` com acento em dois lugares e sem acento em dois: este e 1Rs 11:22.' },
  { ref: '1KI 11:22', de: 'Faraó: Por que? O que te falta',
    para: 'Faraó: Por quê? O que te falta',
    motivo: 'O gêmeo de 2Co 11:11 e o único outro do arquivo, achado ao contar a expressão. Interrogativo sozinho no fim da frase leva circunflexo, e a própria fonte o escreve assim duas vezes.' },
  { ref: '2CO 11:17', de: 'nesta firme orgulho confiante',
    para: 'neste firme orgulho confiante',
    motivo: '`orgulho` é masculino. KJV: "in this confidence of boasting"; Almeida: "n\'esta confiança de gloria".' },
  { ref: '2CO 12:8', de: 'para que [isso] de afastasse de mim',
    para: 'para que [isso] se afastasse de mim',
    motivo: 'KJV: "that it might depart from me"; Almeida: "para que se desviasse de mim". O pronome reflexivo virou preposição.' },
  { ref: 'GAL 3:8', de: 'Todas nas nações serão abençoadas',
    para: 'Todas as nações serão abençoadas',
    motivo: 'KJV: "In thee shall all nations be blessed"; Almeida: "Todas as nações serão bemditas em ti". A preposição colou no artigo.' },
  { ref: 'GAL 5:21', de: 'eu também haviavos dito antes',
    para: 'eu também havia vos dito antes',
    motivo: 'Duas palavras coladas — e o mesmo versículo escreve `havia vos dito` certo poucas palavras antes. KJV: "as I have also told you in time past".' },

  // --- Efésios a Judas ---
  { ref: 'EPH 1:3', de: 'bênçãos espirituis',
    para: 'bênçãos espirituais',
    motivo: 'A própria fonte escreve `espirituais` 13 vezes e `espirituis` uma. Almeida: "com todas as bençãos espirituaes".' },
  { ref: 'EPH 4:14', de: 'pelo engano dos pessoas',
    para: 'pelo engano das pessoas',
    motivo: '`pessoas` é feminino. KJV: "by the sleight of men"; Almeida: "pelo engano dos homens".' },
  { ref: 'EPH 6:7', de: 'e não aos pessoas',
    para: 'e não às pessoas',
    motivo: 'Mesmo tropeço de gênero de Ef 4:14. KJV: "and not to men"; Almeida: "e não aos homens".' },
  { ref: 'EPH 6:13', de: 'resistir no dia mal',
    para: 'resistir no dia mau',
    motivo: '`mal` é advérbio; o adjetivo é `mau`. KJV: "to withstand in the evil day"; Almeida: "para que possaes resistir no dia mau".' },
  { ref: 'PHI 2:28', de: 'vendo-o de novo, alegrei-vos',
    para: 'vendo-o de novo, vos alegreis',
    motivo: 'O verbo está na primeira pessoa quando quem se alegra são eles. KJV: "that, when ye see him again, ye may rejoice"; Almeida: "para que, vendo-o outra vez, vos regozijeis".' },
  { ref: 'PHI 2:29', de: 'e honrai ao que são como ele',
    para: 'e honrai aos que são como ele',
    motivo: 'Artigo no singular com verbo no plural. KJV: "and hold such in reputation"; Almeida: "e tende em honra aos taes".' },
  { ref: 'PHI 3:4', de: 'Embora eu também tenho',
    para: 'Embora eu também tenha',
    motivo: '`Embora` pede subjuntivo. KJV: "Though I might also have confidence in the flesh"; Almeida: "Ainda que tambem tenho de que confiar na carne".' },
  { ref: 'COL 2:2', de: 'riquezas da pleno entendimento',
    para: 'riquezas do pleno entendimento',
    motivo: 'Artigo feminino com substantivo masculino. KJV: "unto all riches of the full assurance of understanding"; Almeida: "em todas as riquezas da plenitude de intelligencia".' },
  { ref: 'COL 3:6', de: 'Por causa delas que a ira de Deus vem',
    para: 'Por causa delas a ira de Deus vem',
    motivo: 'Um `que` solto que deixa a frase sem oração principal. KJV: "For which things\' sake the wrath of God cometh"; Almeida: "Pelas quaes coisas vem a ira de Deus".' },
  { ref: '2TI 3:8', de: 'esses se opõem a verdade',
    para: 'esses se opõem à verdade',
    motivo: 'Falta a crase. KJV: "so do these also resist the truth"; Almeida: "assim tambem estes resistem á verdade".' },
  { ref: 'TIT 1:11', de: 'Aos quais devem se calar',
    para: 'Aos quais se deve calar',
    motivo: 'KJV: "Whose mouths must be stopped"; Almeida: "Aos quaes convem tapar a bocca". O verbo estava no plural sem sujeito que o justificasse.' },
  { ref: 'TIT 3:9', de: 'e às genealogias e discussões, e às disputas',
    para: 'e as genealogias e discussões, e as disputas',
    motivo: '`evitar` é transitivo direto e não pede preposição — a própria fonte escreve `evita as questões tolas` certo no começo deste mesmo versículo. A Almeida 1911 usa `resiste ás questões`, verbo que pede a preposição; a Bíblia Livre trocou o verbo e ficou com a regência do outro.' },
  { ref: 'TIT 3:9', de: 'porque elas são inúteis e vás',
    para: 'porque elas são inúteis e vãs',
    motivo: 'Acento agudo no lugar do til — `vás` é do verbo ir. KJV: "for they are unprofitable and vain"; Almeida: "porque são inuteis e vãos". Mesmo defeito de 1Co 15:17.' },
  { ref: 'PHM 1:5', de: 'de teu amor e a fé',
    para: 'de teu amor e da fé',
    motivo: 'KJV: "Hearing of thy love and faith"; Almeida: "Ouvindo a tua caridade e a fé". A regência de `ouvir de` pede a preposição nas duas.' },
  { ref: 'PHM 1:15', de: 'Porque talvez por isso que ele tenha',
    para: 'Porque talvez por isso ele tenha',
    motivo: 'Um `que` a mais. KJV: "For perhaps he therefore departed for a season"; Almeida: "Porque bem pode ser que elle se tenha por isso apartado de ti".' },
  { ref: '1TI 5:21', de: 'sem preconceitos, fazendo nada por favoritismo',
    para: 'sem preconceitos, nada fazendo por favoritismo',
    motivo: 'Sem a inversão a frase perde a negação. KJV: "doing nothing by partiality"; Almeida: "nada fazendo por parcialidade" — a ordem que entra é a dela.' },
  { ref: '1TI 6:10', de: 'Alguns o cobiçam, e então se desviaram',
    para: 'Alguns o cobiçaram, e então se desviaram',
    motivo: 'Presente e passado na mesma frase. KJV: "which while some coveted after, they have erred from the faith"; Almeida: "o que apetecendo alguns, se desviaram da fé".' },
  { ref: 'HEB 6:7', de: 'por quem e lavrada',
    para: 'por quem é lavrada',
    motivo: 'O verbo `é` sem acento vira conjunção. Almeida: "para aquelles por quem é lavrada"; KJV: "for them by whom it is dressed".' },
  { ref: 'HEB 9:9', de: 'que não podem, quanto a consciência',
    para: 'que não podem, quanto à consciência',
    motivo: 'Falta a crase. KJV: "that could not make him that did the service perfect, as pertaining to the conscience"; Almeida: "que, quanto á consciencia, não podiam aperfeiçoar".' },
  { ref: 'HEB 10:23', de: 'a esperança que declararmos ter',
    para: 'a esperança que declaramos ter',
    motivo: 'Infinitivo pessoal onde cabe o presente. KJV: "Let us hold fast the profession of our faith"; Almeida: "Retenhamos firmes a confissão da nossa esperança".' },
  { ref: '1TH 2:6', de: 'ainda que tínhamos autoridade',
    para: 'ainda que tivéssemos autoridade',
    motivo: '`ainda que` pede subjuntivo. KJV: "when we might have been burdensome"; Almeida: "ainda que podiamos, como apostolos de Christo, ser-vos pesados".' },
  { ref: '1TH 2:13', de: 'a palavra da Deus pregada',
    para: 'a palavra de Deus pregada',
    motivo: 'Artigo feminino diante de `Deus`. KJV: "the word of God which ye heard of us"; Almeida: "a palavra da prégação de Deus".' },
  { ref: '1TH 3:4', de: 'convosco vós dizíamos',
    para: 'convosco nós dizíamos',
    motivo: 'O verbo está na primeira pessoa e o pronome na segunda — quem dizia era Paulo. KJV: "when we were with you, we told you before"; Almeida: "estando ainda comvosco, vos prediziamos".' },
  { ref: '1TH 4:4', de: 'saiba ser ter o seu instrumento',
    para: 'saiba ter o seu instrumento',
    motivo: 'Dois verbos onde cabe um. KJV: "should know how to possess his vessel"; Almeida: "saiba possuir o seu vaso".' },
  { ref: '1TH 4:11', de: 'quietos, trantando dos vossos',
    para: 'quietos, tratando dos vossos',
    motivo: 'Uma letra a mais. KJV: "and to do your own business"; Almeida: "e tratar dos vossos proprios negocios".' },
  { ref: 'HEB 12:5', de: 'nem te canses de ser reprendido',
    para: 'nem te canses de ser repreendido',
    motivo: 'A própria fonte escreve `repreendido` três vezes e `reprendido` uma. Almeida: "e não desmaies quando por elle fores reprehendido".' },
  { ref: 'HEB 13:20', de: 'do eterno Testamento eterno',
    para: 'do eterno Testamento',
    motivo: '`eterno` aparece dos dois lados da palavra. KJV: "through the blood of the everlasting covenant"; Almeida: "que pelo sangue do concerto eterno".' },
  { ref: 'HEB 13:22', de: 'que suportai esta palavra',
    para: 'que suporteis esta palavra',
    motivo: 'Imperativo dentro de oração subordinada. KJV: "suffer the word of exhortation"; Almeida: "que supporteis a palavra d\'esta exhortação".' },
  { ref: 'JAM 1:6', de: 'em fé, duvidando em nada',
    para: 'em fé, em nada duvidando',
    motivo: 'Na ordem da fonte a negação se perde e a frase manda duvidar. KJV: "let him ask in faith, nothing wavering"; Almeida: "peça-a com fé, não duvidando".' },
  { ref: 'JUD 1:5', de: 'Mas eu quer vos lembrar',
    para: 'Mas eu quero vos lembrar',
    motivo: 'Verbo na terceira pessoa com pronome na primeira. KJV: "I will therefore put you in remembrance"; Almeida: "Porém quero lembrar-vos".' },
  { ref: '1JO 2:23', de: 'aquele que confessa o filho',
    para: 'aquele que confessa o Filho',
    motivo: 'O mesmo versículo escreve `o Filho` com maiúscula na primeira metade. KJV: "but he that acknowledgeth the Son hath the Father also"; Almeida: "e aquelle que confessa o Filho".' },
  { ref: '1JO 2:27', de: 'que recebeste dele continua em vós',
    para: 'que recebestes dele continua em vós',
    motivo: 'O versículo inteiro trata os leitores por `vós` — `não tendes`, `vos ensine` — e só este verbo saiu do plural. KJV: "the anointing which ye have received of him abideth in you"; Almeida: "E a uncção que vós recebestes d\'elle fica em vós".' },
  { ref: '2PE 1:3', de: 'Como seu divino poder ele tem nos dado',
    para: 'Como seu divino poder nos tem dado',
    motivo: 'Um sujeito a mais: o poder já é quem dá. KJV: "According as his divine power hath given unto us all things"; Almeida: "Como o seu divino poder nos deu tudo".' },
  { ref: '2PE 1:17', de: 'tendo sido lhe enviada tal voz',
    para: 'tendo-lhe sido enviada tal voz',
    motivo: 'O pronome no meio da locução verbal. Almeida: "quando da magnifica gloria lhe foi enviada uma tal voz"; KJV: "when there came such a voice to him".' },
  { ref: '2PE 2:9', de: 'e reservar aos injustos',
    para: 'e reservar os injustos',
    motivo: '`reservar` é transitivo direto. KJV: "and to reserve the unjust unto the day of judgment"; Almeida: "e reservar os injustos para o dia de juizo".' },
  { ref: '2PE 3:8', de: 'desta uma coisa não ignoreis',
    para: 'esta uma coisa não ignoreis',
    motivo: '`ignorar` é transitivo direto e não pede preposição. KJV: "be not ignorant of this one thing"; Almeida: "não ignoreis uma coisa".' },
  { ref: 'JAM 5:4', de: 'chegaram os ouvidos do Senhor',
    para: 'chegaram aos ouvidos do Senhor',
    motivo: 'Sem a preposição os ouvidos viram sujeito. KJV: "are entered into the ears of the Lord of Sabaoth"; Almeida: "entraram nos ouvidos do Senhor dos exercitos".' },
  { ref: 'JAM 5:11', de: 'Eis que considerarmos benditos',
    para: 'Eis que consideramos benditos',
    motivo: 'Infinitivo pessoal onde cabe o presente. KJV: "Behold, we count them happy which endure"; Almeida: "Eis que temos por bemaventurados os que soffrem".' },
  { ref: '1PE 2:19', de: 'se alguém, por causa da consciência a respeito de Deus, experimente dores',
    para: 'se alguém, por causa da consciência a respeito de Deus, experimenta dores',
    motivo: 'Subjuntivo onde a frase é afirmativa. KJV: "if a man for conscience toward God endure grief"; Almeida: "se alguem, por causa da consciencia para com Deus, soffre aggravos".' },
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

  // --- Palavra que a fonte comeu, restaurada da Almeida ---
  { ref: '1SA 27:9', de: 'E Davi aquela terra',
    para: 'E Davi feria aquela terra',
    motivo: 'Faltava o verbo: a frase começava sem dizer o que Davi fazia com a terra. KJV: "And David smote the land"; Almeida: "E David feria aquella terra". A palavra que entra é a da Almeida.' },
  { ref: '2SA 16:2', de: 'do rei, em que s; os pães',
    para: 'do rei, em que se montem; os pães',
    motivo: 'A palavra ficou pela metade — `em que s;` não diz nada. KJV: "for the king\'s household to ride on"; Almeida: "para se montarem n\'elles". O verbo restaurado é o da Almeida.' },
  { ref: 'JER 19:6', de: 'Por isso eis vêm dias',
    para: 'Por isso eis que vêm dias',
    motivo: 'Faltava o `que`. KJV: "Therefore, behold, the days come"; Almeida: "Por isso eis que dias veem, diz o Senhor". A própria fonte escreve `eis que vêm dias` 8 vezes e sem o `que` só aqui.' },
  { ref: 'JER 20:7', de: 'cada deles zomba de mim',
    para: 'cada um deles zomba de mim',
    motivo: 'Faltava o `um`. KJV: "every one mocketh me"; Almeida: "cada um d\'elles zomba de mim". A palavra que volta é a da Almeida.' },
  { ref: '1CO 1:29', de: 'para que ninguém orgulhe de si mesmo',
    para: 'para que ninguém se orgulhe de si mesmo',
    motivo: 'Faltava o pronome reflexivo, e sem ele o verbo fica sem sujeito de quem se orgulha. KJV: "That no flesh should glory in his presence"; Almeida: "Para que nenhuma carne se glorie perante elle".' },
  { ref: '1CO 2:9', de: 'e não subiram que ao coração humano',
    para: 'e o ouvido não ouviu, e não subiram ao coração humano',
    motivo: 'É a maior restauração desta fase, e o `que` solto é a prova de que houve queda: ele é o resto da oração que sumiu. As duas testemunhas trazem a frase inteira — KJV "Eye hath not seen, nor ear heard, neither have entered into the heart of man"; Almeida "As coisas que o olho não viu, e o ouvido não ouviu, e não subiram ao coração do homem" — e o Textus Receptus, a linhagem desta edição, traz o `οὐδὲ οὖς ἤκουσεν`. A oração que volta é a da Almeida, palavra por palavra.' },
  { ref: 'GAL 1:19', de: 'E vi nenhum outro dos apóstolos',
    para: 'E não vi nenhum outro dos apóstolos',
    motivo: 'Faltava a negação, e sem ela a frase diz o contrário: que Paulo VIU os outros apóstolos. KJV: "But other of the apostles saw I none"; Almeida: "E não vi a nenhum outro dos apostolos".' },
  { ref: 'GAL 3:6', de: 'e foi lhe reputado como justiça',
    para: 'e isso lhe foi reputado como justiça',
    motivo: 'Faltava o sujeito. É a mesma citação de Gênesis que Rm 4:3 traz completa na própria fonte — `e isso lhe foi imputado como justiça`. Almeida: "e isso lhe foi imputado como justiça".' },
  { ref: 'PHI 1:12', de: 'que as coisas me aconteceram foram',
    para: 'que as coisas que me aconteceram foram',
    motivo: 'Faltava o `que` que abre a oração relativa. KJV: "that the things which happened unto me"; Almeida: "que as coisas que me aconteceram contribuiram".' },
  { ref: 'HEB 8:2', de: 'que Senhor ergueu',
    para: 'que o Senhor ergueu',
    motivo: 'Faltava o artigo, e sem ele a frase fica sem sujeito. KJV: "which the Lord pitched, and not man"; Almeida: "o qual o Senhor fundou, e não o homem".' },
  { ref: '2TH 1:4', de: 'vossas perseguições aflições',
    para: 'vossas perseguições e aflições',
    motivo: 'Faltava a conjunção entre os dois substantivos. KJV: "in all your persecutions and tribulations"; Almeida: "e em todas as vossas perseguições e afflicções".' },
  { ref: '1JO 5:14', de: 'a confiança que diante dele',
    para: 'a confiança que temos diante dele',
    motivo: 'Faltava o verbo. KJV: "this is the confidence that we have in him"; Almeida: "E esta é a confiança que temos para com elle". A palavra que volta é a da Almeida.' },
]

// `manuais` é lista, e não um só: há versículo com dois defeitos — Lc 4:40 traz
// `troxeram` e `varias` na mesma linha. Enquanto isto era um campo único, a
// segunda receita apagava a primeira sem dizer nada, e o defeito seguia servido.
const porRef = new Map<string, { dup?: string; paren?: boolean; sub?: boolean; manuais: Correcao[] }>()
const entrada = (ref: string) => porRef.get(ref) ?? { manuais: [] }
for (const [ref, palavra] of DUPLICADAS) porRef.set(ref, { ...entrada(ref), dup: palavra })
for (const ref of PARENTESES_ORFAOS) porRef.set(ref, { ...entrada(ref), paren: true })
for (const ref of SUBSCRICOES) porRef.set(ref, { ...entrada(ref), sub: true })
for (const c of [...CORRECOES, ...OMISSOES]) {
  const e = entrada(c.ref)
  porRef.set(c.ref, { ...e, manuais: [...e.manuais, c] })
}

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

  for (const m of alvo.manuais) {
    if (!saida.includes(m.de)) {
      throw new Error(
        `Correção em ${ref} não encontrou "${m.de}". A fonte mudou — reveja a tabela.`,
      )
    }
    saida = saida.replace(m.de, m.para)
  }

  return saida
}
