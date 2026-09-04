/**
 * Materializa as perícopes novas da tabela de cortes: para cada faixa, extrai o
 * texto da NAA no mesmo formato do catálogo e grava um JSONL.
 *
 * É a entrada tanto do enriquecimento (o material editorial das 195) quanto,
 * depois, da aplicação no catálogo. Rodar duas vezes dá o mesmo resultado.
 *
 * `ordem` provisória começa em 3000 e é estável: deriva da posição canônica, e
 * não de quando o script rodou. O `seq` (posição de leitura) é atribuído
 * depois, na aplicação — ver docs/estado-cobertura-e-cortes.md.
 *
 * Usage: npx tsx scripts/gerar-novas.ts [--out=caminho.jsonl]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CORTES, faixasDeSalmos } from './cortes.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const ORDEM_BASE = 3000

type NaaBook = { abbrev: string; chapters: string[][] }
type Row = {
  ordem: number
  livro: string
  abbrev: string
  capitulo_inicio: number
  versiculo_inicio: number
  capitulo_fim: number
  versiculo_fim: number
}

export type Nova = {
  ordem: number
  /** Ordem da perícope original que este trecho substitui — rastro da origem. */
  substitui: number
  livro: string
  abbrev: string
  capitulo_inicio: number
  versiculo_inicio: number
  capitulo_fim: number
  versiculo_fim: number
  /** Título provisório; o definitivo vem do enriquecimento. */
  titulo_provisorio: string
  texto_naa: string
}

/** Mesmo formato do ETL: "Capítulo N" como cabeçalho, "V texto" por versículo. */
function extrair(book: NaaBook, ci: number, vi: number, cf: number, vf: number): string {
  const linhas: string[] = []
  for (let c = ci; c <= cf; c++) {
    const cap = book.chapters[c - 1]
    if (!cap) throw new Error(`capítulo ${c} ausente em ${book.abbrev}`)
    const de = c === ci ? vi : 1
    const ate = c === cf ? vf : cap.length
    linhas.push(`Capítulo ${c}`)
    for (let v = de; v <= ate; v++) {
      const verso = cap[v - 1]
      if (verso == null) throw new Error(`${book.abbrev} ${c}:${v} ausente na NAA`)
      linhas.push(`${v} ${verso}`)
    }
  }
  return linhas.join('\n')
}

export function gerarNovas(root: string): Nova[] {
  const naa = JSON.parse(readFileSync(join(root, 'data/NAA.json'), 'utf8')) as NaaBook[]
  const byAbbrev = new Map(naa.map((b) => [b.abbrev, b]))
  const rows = readFileSync(join(root, 'data/raw-pericopes.jsonl'), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l) as Row)
  const porOrdem = new Map(rows.map((r) => [r.ordem, r]))

  const novas: Nova[] = []
  let n = 0

  // Cortes manuais, na ordem em que a original aparece no catálogo.
  for (const corte of [...CORTES].sort((a, b) => a.ordem - b.ordem)) {
    const r = porOrdem.get(corte.ordem)
    if (!r) throw new Error(`corte #${corte.ordem}: perícope original não existe`)
    const book = byAbbrev.get(r.abbrev)
    if (!book) throw new Error(`corte #${corte.ordem}: abbrev ${r.abbrev} fora da NAA`)
    for (const parte of corte.partes) {
      const m = /^(\d+):(\d+)-(\d+):(\d+)$/.exec(parte.faixa)
      if (!m) throw new Error(`faixa inválida em #${corte.ordem}: ${parte.faixa}`)
      const [ci, vi, cf, vf] = [+m[1], +m[2], +m[3], +m[4]]
      novas.push({
        ordem: ORDEM_BASE + n++,
        substitui: corte.ordem,
        livro: r.livro,
        abbrev: r.abbrev,
        capitulo_inicio: ci,
        versiculo_inicio: vi,
        capitulo_fim: cf,
        versiculo_fim: vf,
        titulo_provisorio: parte.titulo,
        texto_naa: extrair(book, ci, vi, cf, vf),
      })
    }
  }

  // Salmos: um salmo é uma perícope. As originais são as 5 perícopes-Livro.
  const sl = byAbbrev.get('Sl')
  if (!sl) throw new Error('Salmos ausente na NAA')
  const originaisSl = rows.filter((r) => r.abbrev === 'Sl').map((r) => r.ordem)
  for (const f of faixasDeSalmos()) {
    const primeiro = f.salmos[0]
    const ultimo = f.salmos[f.salmos.length - 1]
    const vf = sl.chapters[ultimo - 1].length
    // A original é a perícope-Livro que contém este salmo.
    const orig = rows.find(
      (r) => r.abbrev === 'Sl' && r.capitulo_inicio <= primeiro && r.capitulo_fim >= primeiro,
    )
    novas.push({
      ordem: ORDEM_BASE + n++,
      substitui: orig?.ordem ?? originaisSl[0],
      livro: 'Salmos',
      abbrev: 'Sl',
      capitulo_inicio: primeiro,
      versiculo_inicio: 1,
      capitulo_fim: ultimo,
      versiculo_fim: vf,
      titulo_provisorio:
        f.salmos.length > 1 ? `Salmos ${primeiro}–${ultimo}` : `Salmo ${primeiro}`,
      texto_naa: extrair(sl, primeiro, 1, ultimo, vf),
    })
  }

  return novas
}

/** Executável: grava o JSONL para inspeção. O ETL usa `gerarNovas` direto. */
function main() {
  const outArg = process.argv.find((a) => a.startsWith('--out='))
  const outPath = outArg ? outArg.slice('--out='.length) : join(root, 'data/novas-pericopes.jsonl')
  const novas = gerarNovas(root)
  writeFileSync(outPath, novas.map((x) => JSON.stringify(x)).join('\n') + '\n')
  const chars = novas.reduce((s, x) => s + x.texto_naa.length, 0)
  console.log(`${novas.length} perícopes novas → ${outPath}`)
  console.log(`  cortes manuais: ${novas.filter((x) => x.abbrev !== 'Sl').length}`)
  console.log(`  salmos: ${novas.filter((x) => x.abbrev === 'Sl').length}`)
  console.log(`  ordens ${ORDEM_BASE}..${ORDEM_BASE + novas.length - 1}`)
  console.log(`  texto bíblico: ${(chars / 1000).toFixed(0)} mil chars`)
}

if (process.argv[1]?.endsWith('gerar-novas.ts')) main()
