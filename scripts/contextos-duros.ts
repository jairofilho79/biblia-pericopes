/**
 * O contexto entrega dado, ou só aponta o dedo?
 *
 * O dono disse que o material estava "misterioso demais" e um revisor achou o
 * endereço: não é geral, é o `contexto_historico_literario`. As marcas medidas
 * no acervo inteiro foram três, e todas as três são desta função:
 *
 * - 44% dos contextos trazem fórmula de instrução ao leitor ("repare em duas
 *   coisas", "guarde isso enquanto lê"), e em 40% ela é o parágrafo FINAL,
 *   ocupando metade do campo;
 * - 25% não trazem um nome próprio nem um número;
 * - o campo se chama histórico-literário e traz marcador de tempo histórico em
 *   5% dos casos.
 *
 * A regra nova não proíbe apontar; proíbe apontar EM VEZ de dizer. Ver
 * `docs/prompt-reenriquecimento.md`, seção "A regra da chave".
 *
 * Rode: `npx tsx scripts/contextos-duros.ts [--lista]`
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/** Fórmulas que mandam o leitor observar, em vez de dizer a coisa. */
export const APONTA =
  /\b(repare|reparem|preste atenção|prestem atenção|guarde (isso|essa|este|isto)|vale (acompanhar|reparar|notar|marcar|observar|seguir)|leia prestando|observe|acompanhe|leve a pergunta|note (que|como))\b/i

/** Promessa sem conteúdo: anuncia que existe algo e não diz o que é. */
export const PROMESSA =
  /\b(uma coisa|duas coisas|três coisas|um detalhe|dois detalhes|o que vem a seguir|ela surpreende|isso surpreende)\b/i

/**
 * Dado duro: o que alguém poderia conferir. Nome próprio que não seja
 * onipresente, número por algarismo ou por extenso, ou medida e tempo.
 */
export const DADO_DURO =
  /(\d)|\b(século|séculos|anos?|meses|mês|dias?|côvados?|talentos?|siclos?|denários?|efa|hebraico|grego|aramaico|significa|quer dizer|chamava-se|era o nome)\b/i

const ONIPRESENTES = new Set(['Deus', 'Senhor', 'SENHOR', 'Jesus', 'Cristo', 'Israel', 'Espírito'])

export function temNomeProprio(texto: string): boolean {
  for (const m of texto.matchAll(/(?<![.!?]\s)(?<!^)\b(\p{Lu}\p{Ll}{2,})/gu)) {
    if (!ONIPRESENTES.has(m[1])) return true
  }
  return false
}

export type Diagnostico = {
  aponta: boolean
  /** O parágrafo final é só a fórmula de apontar. */
  fechaApontando: boolean
  promessaVaga: boolean
  semDadoDuro: boolean
  duro: boolean
}

export function diagnosticar(contexto: string): Diagnostico {
  const paragrafos = contexto.split(/\n\n+/).filter((p) => p.trim())
  const ultimo = paragrafos.at(-1) ?? ''
  const aponta = APONTA.test(contexto)
  const fechaApontando = paragrafos.length > 1 && APONTA.test(ultimo)
  const promessaVaga = PROMESSA.test(contexto)
  const semDadoDuro = !DADO_DURO.test(contexto) && !temNomeProprio(contexto)
  return {
    aponta,
    fechaApontando,
    promessaVaga,
    semDadoDuro,
    duro: !fechaApontando && !promessaVaga && !semDadoDuro,
  }
}

if (process.argv[1]?.endsWith('contextos-duros.ts')) {
  type P = {
    abbrev: string
    capitulo_inicio: number
    versiculo_inicio: number
    ordem: number
    contexto_historico_literario: string
  }
  const root = join(import.meta.dirname, '..')
  const d = JSON.parse(readFileSync(join(root, 'data/pericopes.json'), 'utf8')) as P[]
  const diag = d.map((p) => ({ p, ...diagnosticar(p.contexto_historico_literario) }))
  const pct = (n: number) => `${((100 * n) / d.length).toFixed(0)}%`
  const conta = (f: (x: (typeof diag)[number]) => boolean) => diag.filter(f).length
  console.log(`contextos: ${d.length}`)
  console.log(`  manda reparar em algo:        ${conta((x) => x.aponta)} (${pct(conta((x) => x.aponta))})`)
  console.log(`  FECHAM apontando:             ${conta((x) => x.fechaApontando)} (${pct(conta((x) => x.fechaApontando))})`)
  console.log(`  promessa vaga:                ${conta((x) => x.promessaVaga)} (${pct(conta((x) => x.promessaVaga))})`)
  console.log(`  sem nome próprio nem número:  ${conta((x) => x.semDadoDuro)} (${pct(conta((x) => x.semDadoDuro))})`)
  console.log(`  ── precisam de reescrita:     ${conta((x) => !x.duro)} (${pct(conta((x) => !x.duro))})`)
  if (process.argv.includes('--lista')) {
    for (const x of diag.filter((y) => !y.duro)) console.log(`${x.p.ordem}\t${x.p.abbrev} ${x.p.capitulo_inicio}:${x.p.versiculo_inicio}`)
  }
}
