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
      '2CH 36:21', 'EZK 31:12', '1CO 15:52', 'LUK 4:40', 'GAL 3:24', 'DEU 4:42',
    ],
  },
  { classe: 'corrupção de palavra', refs: ['MRK 12:37', 'ACT 9:4', 'LAM 3:6'] },
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
    refs: ['ZEC 7:1', 'ZEC 7:13', 'MRK 14:16', 'LUK 6:1'],
  },
]

export const TODAS_AS_REFS: RefDefeito[] = DEFEITOS.flatMap((d) => d.refs)

/** Códigos VPL na ordem canônica — a mesma ordem dos livros no catálogo. */
export const CODIGOS_VPL = [
  'GEN','EXO','LEV','NUM','DEU','JOS','JDG','RUT','1SA','2SA','1KI','2KI','1CH','2CH',
  'EZR','NEH','EST','JOB','PSA','PRO','ECC','SNG','ISA','JER','LAM','EZK','DAN','HOS',
  'JOL','AMO','OBA','JON','MIC','NAM','HAB','ZEP','HAG','ZEC','MAL','MAT','MRK','LUK',
  'JHN','ACT','ROM','1CO','2CO','GAL','EPH','PHP','COL','1TH','2TH','1TI','2TI','TIT',
  'PHM','HEB','JAS','1PE','2PE','1JN','2JN','3JN','JUD','REV',
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
