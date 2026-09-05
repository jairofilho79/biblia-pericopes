/**
 * Os defeitos da Bíblia Livre achados lendo o texto, como DADO.
 *
 * A prosa — o que cada um é, como foi conferido nas duas testemunhas, e a lista
 * igualmente importante do que NÃO é defeito — mora em
 * `docs/defeitos-blivre-achados-na-producao.md`. Aqui ficam só as referências,
 * porque duas máquinas precisam delas: o congelamento (`scripts/congelar.ts`),
 * que impede a Sessão 4 de narrar perícope cujo texto ainda vai mudar, e a
 * aplicação futura em `scripts/blivre-correcoes.ts`.
 *
 * **Nada aqui foi aplicado ao texto ainda.** Enquanto não for, toda perícope que
 * contém uma destas referências é material que vai ser reescrito.
 */

/** Referência no formato do VPL: `COD C:V`. */
export type RefDefeito = string

export const DEFEITOS: { classe: string; refs: RefDefeito[] }[] = [
  {
    classe: 'acento perdido',
    refs: [
      'PRO 1:7', 'REV 22:13', 'ACT 13:2', 'MAT 7:17', 'PSA 72:19', 'JDG 3:19',
      '1SA 23:13', 'ISA 43:7', 'REV 20:8', 'JER 52:4', 'JER 25:36', '2TI 3:3',
      '2CH 36:21', 'EZE 31:12', '1CO 15:52', 'LUK 4:40', 'GAL 3:24', 'DEU 4:42',
    ],
  },
  { classe: 'corrupção de palavra', refs: ['MAR 12:37', 'ACT 9:4', 'LAM 3:6'] },
  {
    classe: 'concordância (no arca → na arca)',
    refs: ['EXO 25:16', 'EXO 25:21', '1SA 6:19', '2KI 12:10', '2CH 24:10'],
  },
  { classe: 'marcador temporal (Naquela muita)', refs: ['LEV 24:10', '1KI 3:16'] },
  {
    classe: 'grafia espanholada (preguntar)',
    refs: ['DEU 13:14', 'DEU 17:9', '2SA 11:3', '2CH 18:7'],
  },
  {
    classe: 'água onde é águia',
    refs: [
      'EXO 19:4', 'LEV 11:13', 'DEU 14:12', 'DEU 28:49', 'DEU 32:11',
      '2SA 1:23', 'JOB 39:27', 'REV 12:14',
    ],
  },
  { classe: 'corruptela pontual', refs: ['JOS 13:5', 'JOS 13:6'] },
  { classe: 'palavra trocada / verbo faltando', refs: ['1SA 24:19', '1SA 27:9'] },
  { classe: 'mal onde é mel', refs: ['ISA 7:15'] },
  {
    classe: 'erro de digitação e concordância (Oseias)',
    refs: ['HOS 1:2', 'HOS 3:3', 'HOS 10:14', 'HOS 11:12'],
  },
  {
    classe: 'espaço perdido ou sobrando',
    refs: ['ZEC 7:1', 'ZEC 7:13', 'MAR 14:16', 'LUK 6:1'],
  },
  // Lucas — 44 defeitos achados numa rodada só, mais do que todo o Antigo
  // Testamento junto. O livro entrou na Bíblia Livre bem mais sujo que os
  // outros, e vale relerem-no inteiro antes de publicar.
  {
    classe: 'letra trocada ou faltando (Lucas)',
    refs: [
      'LUK 1:63', 'LUK 2:38', 'LUK 2:48', 'LUK 3:1', 'LUK 9:40', 'LUK 11:42',
      'LUK 21:15', 'LUK 24:39', 'LUK 4:25', 'LUK 6:6', 'LUK 6:34', 'LUK 12:28',
      // O único que muda o sentido: "nem um cabelo de vossa cabeça parecerá",
      // onde as duas testemunhas trazem PERECERÁ (KJV "perish", Almeida 1911
      // "não perecerá nem um cabello"). Frase de consolo virou frase sem pé.
      'LUK 21:18',
    ],
  },
  {
    classe: 'concordância (Lucas)',
    refs: ['LUK 1:2', 'LUK 2:1', 'LUK 2:32', 'LUK 8:37', 'LUK 9:5', 'LUK 15:16',
      'LUK 13:4', 'LUK 14:8', 'LUK 18:43', 'LUK 22:56'],
  },
  {
    classe: 'palavra faltando (Lucas)',
    refs: [
      'LUK 1:5', 'LUK 2:6', 'LUK 3:11', 'LUK 8:8', 'LUK 10:21', 'LUK 24:21',
      // "querem andar roupas compridas" — falta o COM, e as duas testemunhas
      // o trazem (KJV "walk in long robes", Almeida "andar com vestidos").
      'LUK 20:46',
      // O pior de toda a corrida: falta a ORAÇÃO INTEIRA "será humilhado".
      // "Qualquer que exaltar a si mesmo, e aquele que humilhar a si mesmo,
      // será exaltado" — o versículo afirma o contrário do que diz. KJV:
      // "shall be abased"; Almeida 1911: "será humilhado".
      'LUK 14:11',
    ],
  },
  {
    classe: 'palavra sobrando ou duplicada (Lucas)',
    refs: ['LUK 1:24', 'LUK 9:10', 'LUK 10:25', 'LUK 10:38', 'LUK 14:14', 'LUK 21:10'],
  },
  {
    classe: 'espaço perdido ou sobrando (Lucas)',
    refs: [
      'LUK 9:23', 'LUK 9:56', 'LUK 10:37', 'LUK 19:27', 'LUK 20:16',
      'LUK 6:39', 'LUK 17:14', 'LUK 21:34', 'LUK 22:38', 'LUK 22:60', 'LUK 23:46',
    ],
  },
  {
    classe: 'acento errado (Lucas)',
    refs: ['LUK 7:13', 'LUK 9:33', 'LUK 23:29'],
  },
  // A Paixão de Marcos e o começo de João, achados na mesma rodada. Marcos 14
  // a 16 tem duas aspas curvas que nunca fecham, o que engole o versículo
  // seguinte inteiro dentro da citação.
  {
    classe: 'aspa que não fecha (Marcos)',
    refs: ['MAR 14:58', 'MAR 14:70'],
  },
  {
    classe: 'palavra colada, faltando ou duplicada (Marcos 14—16)',
    refs: ['MAR 15:24', 'MAR 15:44', 'MAR 15:46', 'MAR 16:4', 'MAR 16:7', 'MAR 16:14'],
  },
  {
    classe: 'palavra partida ou colada (João)',
    refs: ['JOH 2:7', 'JOH 4:54', 'JOH 6:34', 'JOH 6:64'],
  },
  {
    classe: 'palavra duplicada ou trocada (João)',
    refs: ['JOH 2:17', 'JOH 2:20', 'JOH 3:26', 'JOH 4:9', 'JOH 6:1', 'JOH 7:22', 'JOH 7:23'],
  },
  // Achados por `scripts/palavras-suspeitas.ts`, não por leitura: palavra que
  // aparece uma vez só no corpus e está a uma letra de uma palavra comum.
  // Oito destes estão em livros que nenhum subagent leu ainda, e todos os dez
  // foram confirmados contra a KJV e a Almeida 1911 antes de entrar.
  {
    classe: 'letra trocada, achada por máquina',
    refs: [
      // "Jesus Cirsto" (Almeida: "Jesus Christo")
      'PHM 1:25',
      // "esta dourina" (KJV "this doctrine")
      'REV 2:24',
      // "o Coreiro abriu um dos selos" — o CORDEIRO, figura central do livro,
      // errado na primeira aparição do capítulo (KJV "the Lamb").
      'REV 6:1',
      // "abriu o terceiro celo" — SELO, e o próprio versículo 1 escreve certo.
      'REV 6:5',
      // "e os rigos" (KJV "the rich men")
      'REV 6:15',
      // "conversas profanas e inútes" — inúteis (KJV "vain babblings")
      '2TI 2:16',
      // "tonaram-se fortes na batalha" — tornaram-se
      'HEB 11:34',
      // "deixará oseu pai" — o seu, palavras coladas
      'EPH 5:31',
      // "meu povo Isarael" (KJV "my people of Israel")
      'AMO 9:14',
      // "nos dias de Joeroboão" — Jeroboão
      'HOS 1:1',
    ],
  },
  {
    classe: 'pontuação ou construção quebrada (Lucas)',
    refs: [
      'LUK 7:2', 'LUK 11:9', 'LUK 14:5', 'LUK 18:29', 'LUK 22:67', 'LUK 23:49', 'LUK 23:50',
    ],
  },
  {
    classe: 'erro de digitação (João 8—21)',
    refs: [
      'JOH 8:41', 'JOH 8:57', 'JOH 9:16', 'JOH 9:18',
      'JOH 9:32', 'JOH 9:38', 'JOH 9:39', 'JOH 10:35',
      'JOH 11:2', 'JOH 12:36', 'JOH 13:4', 'JOH 13:29',
      'JOH 14:27', 'JOH 15:2', 'JOH 17:19', 'JOH 18:1',
      'JOH 20:17', 'JOH 20:24', 'JOH 20:30', 'JOH 21:16',
      'JOH 21:18', 'JOH 21:25',
    ],
  },
  {
    classe: 'erro de digitação (Atos)',
    refs: [
      'ACT 1:15', 'ACT 2:23', 'ACT 3:1', 'ACT 3:19',
      'ACT 4:10', 'ACT 4:11', 'ACT 4:32', 'ACT 5:10',
      'ACT 7:13', 'ACT 7:41', 'ACT 7:43', 'ACT 7:50',
      'ACT 7:55', 'ACT 7:60', 'ACT 8:40', 'ACT 9:11',
      'ACT 10:31', 'ACT 12:7', 'ACT 12:8', 'ACT 12:15',
      'ACT 12:17', 'ACT 13:11', 'ACT 13:14', 'ACT 13:17',
      'ACT 14:7', 'ACT 14:10', 'ACT 14:15', 'ACT 14:18',
      'ACT 15:7', 'ACT 16:15', 'ACT 16:18', 'ACT 16:29',
      'ACT 17:18', 'ACT 17:24', 'ACT 17:26', 'ACT 17:30',
      'ACT 18:7', 'ACT 18:15', 'ACT 18:21', 'ACT 19:18',
      'ACT 21:1', 'ACT 21:25', 'ACT 21:26', 'ACT 21:38',
      'ACT 21:39', 'ACT 22:7', 'ACT 22:15', 'ACT 22:23',
      'ACT 22:28', 'ACT 23:23', 'ACT 23:27', 'ACT 25:5',
      'ACT 25:12', 'ACT 25:20', 'ACT 25:22', 'ACT 26:1',
      'ACT 26:17', 'ACT 26:22', 'ACT 26:26', 'ACT 27:40',
      'ACT 27:43', 'ACT 28:4', 'ACT 28:13', 'ACT 28:25',
    ],
  },
  {
    classe: 'erro de digitação (Romanos)',
    refs: [
      'ROM 4:3', 'ROM 7:2', 'ROM 8:36', 'ROM 15:19',
    ],
  },
  {
    classe: 'erro de digitação (1 Coríntios)',
    refs: [
      '1CO 1:14', '1CO 1:29', '1CO 2:9', '1CO 5:2',
      '1CO 5:5', '1CO 7:5', '1CO 7:21', '1CO 7:26',
      '1CO 7:29', '1CO 10:23', '1CO 11:8', '1CO 12:24',
      '1CO 13:10', '1CO 14:15', '1CO 14:30', '1CO 15:6',
      '1CO 15:17', '1CO 15:24', '1CO 16:2', '1CO 16:19',
      '1CO 16:20',
    ],
  },
  {
    classe: 'erro de digitação (2 Coríntios)',
    refs: [
      '2CO 1:22', '2CO 3:1', '2CO 6:12', '2CO 8:15',
      '2CO 10:12', '2CO 11:11', '2CO 11:17', '2CO 12:8',
    ],
  },
  {
    classe: 'erro de digitação (Gálatas)',
    refs: [
      'GAL 1:15', 'GAL 1:19', 'GAL 3:6', 'GAL 3:8',
      'GAL 5:21',
    ],
  },
  {
    classe: 'erro de digitação (Efésios)',
    refs: [
      'EPH 1:3', 'EPH 4:14', 'EPH 5:13', 'EPH 6:7',
      'EPH 6:13',
    ],
  },
  {
    classe: 'erro de digitação (Filipenses e Colossenses)',
    refs: [
      'PHI 1:12', 'PHI 2:28', 'PHI 2:29', 'PHI 3:4',
      'COL 2:2', 'COL 3:6',
    ],
  },
  {
    classe: 'erro de digitação (2 Timóteo, Tito e Filemom)',
    refs: [
      '2TI 3:8', 'TIT 1:11', 'TIT 3:9',
      'PHM 1:5', 'PHM 1:15',
    ],
  },
  {
    classe: 'erro de digitação (1 Timóteo e Hebreus)',
    refs: [
      '1TI 5:21', '1TI 6:10', '1TI 6:15',
      'HEB 6:7', 'HEB 8:2', 'HEB 9:9', 'HEB 10:23',
    ],
  },
  {
    classe: 'erro de digitação (Tessalonicenses)',
    refs: [
      '1TH 2:6', '1TH 2:13', '1TH 3:4', '1TH 4:4',
      '1TH 4:11', '2TH 1:4',
    ],
  },
  {
    classe: 'erro de digitação (Hebreus, Tiago, 1 João e Judas)',
    refs: [
      'HEB 12:5', 'HEB 12:17', 'HEB 13:3', 'HEB 13:20',
      'HEB 13:22', 'JAM 1:6', 'JAM 1:13', 'JAM 3:10',
      '1JO 5:14', 'JUD 1:5',
    ],
  },
  {
    classe: 'erro de digitação (Pedro, João e Apocalipse)',
    refs: [
      '1JO 2:23', '1JO 2:26', '1JO 2:27',
      '2PE 1:3', '2PE 1:17', '2PE 2:9', '2PE 3:8', '2PE 3:16',
      'JUD 1:11', 'REV 1:13', 'REV 1:17', 'REV 8:3',
    ],
  },
  {
    classe: 'erro de digitação (Tiago e 1 Pedro)',
    refs: [
      'JAM 5:4', 'JAM 5:11', '1PE 2:19', '1PE 2:20',
      '1PE 3:6', '1PE 4:4',
    ],
  },
  {
    classe: 'erro de digitação (Apocalipse)',
    refs: [
      'REV 9:18', 'REV 10:4', 'REV 12:12', 'REV 13:5',
      'REV 13:8', 'REV 13:16', 'REV 15:2', 'REV 16:9',
      'REV 2:14', 'REV 2:23', 'REV 3:4',
      'REV 16:21', 'REV 17:3', 'REV 17:4', 'REV 19:1',
    ],
  },
  {
    classe: 'erro de digitação (Gênesis, Levítico e Números)',
    refs: [
      'GEN 19:15', 'GEN 19:17', 'GEN 19:26',
      'LEV 25:6', 'LEV 25:7', 'LEV 25:13', 'LEV 25:29', 'LEV 25:30',
      'LEV 25:32', 'LEV 25:33', 'LEV 25:44', 'LEV 25:54',
      'NUM 23:3', 'NUM 23:19', 'NUM 24:1', 'NUM 24:21', 'NUM 31:9',
    ],
  },
  // Jeremias e os Salmos, na última rodada. O saltério mostrou o mesmo perfil
  // de Lucas, Atos e Levítico 25: concentração alta num livro só.
  {
    classe: 'erro de digitação (Jeremias)',
    refs: [
      'JER 16:5', 'JER 17:20', 'JER 18:15', 'JER 19:6',
      'JER 20:4', 'JER 20:7',
    ],
  },
  {
    classe: 'erro de digitação (Salmos 1—33)',
    refs: [
      'PSA 3:2', 'PSA 5:5', 'PSA 9:1', 'PSA 10:4', 'PSA 10:8', 'PSA 10:13',
      'PSA 11:1', 'PSA 14:1', 'PSA 16:3', 'PSA 17:7', 'PSA 17:13', 'PSA 17:14',
      'PSA 18:7', 'PSA 18:10', 'PSA 20:4', 'PSA 21:8', 'PSA 22:10', 'PSA 25:16',
      'PSA 27:8', 'PSA 28:3', 'PSA 29:3', 'PSA 30:9', 'PSA 31:19', 'PSA 31:22',
      'PSA 32:8', 'PSA 33:6', 'PSA 33:20', 'PSA 33:22',
    ],
  },
  {
    classe: 'erro de digitação (Salmos 34—54)',
    refs: [
      'PSA 34:18', 'PSA 35:2', 'PSA 35:12', 'PSA 36:2', 'PSA 36:11',
      'PSA 37:14', 'PSA 37:20', 'PSA 37:21', 'PSA 39:11', 'PSA 40:16',
      'PSA 42:7', 'PSA 44:18', 'PSA 44:19', 'PSA 45:8', 'PSA 48:4',
      'PSA 49:14', 'PSA 50:17', 'PSA 52:7', 'PSA 53:1', 'PSA 54:5',
    ],
  },
  {
    classe: 'erro de digitação (Salmos 55—74)',
    refs: [
      'PSA 55:11', 'PSA 55:19', 'PSA 57:3', 'PSA 62:3', 'PSA 64:10',
      'PSA 65:5', 'PSA 65:9', 'PSA 66:10', 'PSA 67:2', 'PSA 68:9',
      'PSA 68:27', 'PSA 68:30', 'PSA 69:20', 'PSA 69:28',
      'PSA 73:18', 'PSA 74:5',
    ],
  },
]

export const TODAS_AS_REFS: RefDefeito[] = DEFEITOS.flatMap((d) => d.refs)

/**
 * Códigos VPL na ordem canônica — a mesma ordem dos livros no catálogo.
 *
 * São os códigos que o ARQUIVO usa, não os de nenhum padrão externo. Onze
 * livros divergem das siglas mais comuns (`MAR` e não MRK, `JOH` e não JHN,
 * `EZE` e não EZK, `SOL`, `JOE`, `NAH`, `PHI`, `JAM`, `1JO`, `2JO`, `3JO`), e
 * o catálogo já nasceu com as siglas erradas em 44 referências. Como o
 * congelamento traduz código→abreviação por esta mesma lista, ele funcionava
 * mesmo assim; mas uma correção registrada com a sigla errada em
 * `blivre-correcoes.ts` NUNCA dispararia, porque lá o código vem da leitura do
 * arquivo. O teste `casam com um versículo de verdade` guarda isso.
 */
export const CODIGOS_VPL = [
  'GEN','EXO','LEV','NUM','DEU','JOS','JDG','RUT','1SA','2SA','1KI','2KI','1CH','2CH',
  'EZR','NEH','EST','JOB','PSA','PRO','ECC','SOL','ISA','JER','LAM','EZE','DAN','HOS',
  'JOE','AMO','OBA','JON','MIC','NAH','HAB','ZEP','HAG','ZEC','MAL','MAT','MAR','LUK',
  'JOH','ACT','ROM','1CO','2CO','GAL','EPH','PHI','COL','1TH','2TH','1TI','2TI','TIT',
  'PHM','HEB','JAM','1PE','2PE','1JO','2JO','3JO','JUD','REV',
] as const

export type Faixa = {
  ordem: number
  abbrev: string
  capitulo_inicio: number
  versiculo_inicio: number
  capitulo_fim: number
  versiculo_fim: number
}

/**
 * As perícopes que contêm alguma referência com defeito.
 *
 * `abbrevPorCodigo` traduz o código VPL para a abreviação em português do
 * catálogo — a correspondência é posicional, pela ordem canônica, e é a mesma
 * que `blivre-fonte.ts` usa para montar a fonte.
 */
export function pericopesAfetadas(
  faixas: Faixa[],
  abbrevPorCodigo: Map<string, string>,
  refs: RefDefeito[] = TODAS_AS_REFS,
): Set<number> {
  const afetadas = new Set<number>()
  for (const ref of refs) {
    const m = /^(\S+) (\d+):(\d+)$/.exec(ref)
    if (!m) throw new Error(`referência de defeito malformada: ${ref}`)
    const abbrev = abbrevPorCodigo.get(m[1])
    if (!abbrev) throw new Error(`código VPL desconhecido em ${ref}`)
    const c = Number(m[2])
    const v = Number(m[3])
    for (const f of faixas) {
      if (f.abbrev !== abbrev) continue
      const depoisDoInicio =
        f.capitulo_inicio < c || (f.capitulo_inicio === c && f.versiculo_inicio <= v)
      const antesDoFim = f.capitulo_fim > c || (f.capitulo_fim === c && f.versiculo_fim >= v)
      if (depoisDoInicio && antesDoFim) afetadas.add(f.ordem)
    }
  }
  return afetadas
}
