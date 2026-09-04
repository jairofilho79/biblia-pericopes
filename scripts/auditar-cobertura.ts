/**
 * Audita a cobertura do catálogo contra a NAA: quais versículos ficaram fora de
 * qualquer perícope, quais caíram em duas, e o tamanho das perícopes.
 *
 * Usage: npx tsx scripts/auditar-cobertura.ts [--tamanhos]
 */
import { readFileSync } from 'node:fs'
import { BIBLE_BOOKS } from '../src/lib/bible-books.ts'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const naaPath = join(root, 'data/NAA.json')
const rawPath = join(root, 'data/raw-pericopes.jsonl')

type NaaBook = { abbrev: string; chapters: string[][] }
type Row = {
  ordem: number
  livro: string
  abbrev: string
  capitulo_inicio: number
  versiculo_inicio: number
  capitulo_fim: number
  versiculo_fim: number
  titulo_pericope_pt?: string
  titulo_en?: string
}

/** Faixas contíguas de versículos com a mesma contagem, para o relatório. */
function agrupar(lista: { livro: string; c: number; v: number; n: number }[]) {
  const out: { livro: string; c: number; vIni: number; vFim: number; n: number }[] = []
  for (const r of lista) {
    const last = out[out.length - 1]
    if (last && last.livro === r.livro && last.c === r.c && last.vFim === r.v - 1 && last.n === r.n) {
      last.vFim = r.v
    } else {
      out.push({ livro: r.livro, c: r.c, vIni: r.v, vFim: r.v, n: r.n })
    }
  }
  return out
}

function main() {
  const naa = JSON.parse(readFileSync(naaPath, 'utf8')) as NaaBook[]
  const rows = readFileSync(rawPath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l) as Row)

  const lens = new Map(naa.map((b) => [b.abbrev, b.chapters.map((c) => c.length)]))
  const nome = new Map<string, string>()
  for (const r of rows) if (!nome.has(r.abbrev)) nome.set(r.abbrev, r.livro)

  const cov = new Map<string, number[][]>()
  for (const [ab, l] of lens) cov.set(ab, l.map((n) => new Array(n).fill(0)))

  const foraDaNaa: string[] = []
  const tamanhos: { r: Row; n: number }[] = []

  for (const r of rows) {
    const l = lens.get(r.abbrev)
    const grid = cov.get(r.abbrev)
    if (!l || !grid) {
      foraDaNaa.push(`#${r.ordem} ${r.livro}: abbrev fora da NAA`)
      continue
    }
    let n = 0
    for (let c = r.capitulo_inicio; c <= r.capitulo_fim; c++) {
      if (c < 1 || c > l.length) {
        foraDaNaa.push(`#${r.ordem} ${r.livro} cap ${c} não existe`)
        continue
      }
      const vIni = c === r.capitulo_inicio ? r.versiculo_inicio : 1
      const vFim = c === r.capitulo_fim ? r.versiculo_fim : l[c - 1]
      for (let v = vIni; v <= vFim; v++) {
        if (v < 1 || v > l[c - 1]) {
          foraDaNaa.push(`#${r.ordem} ${r.livro} ${c}:${v} não existe (cap tem ${l[c - 1]})`)
          continue
        }
        grid[c - 1][v - 1]++
        n++
      }
    }
    tamanhos.push({ r, n })
  }

  const buracos: { livro: string; c: number; v: number; n: number }[] = []
  const duplos: typeof buracos = []
  let total = 0
  for (const b of naa) {
    const grid = cov.get(b.abbrev)!
    const livro = nome.get(b.abbrev) ?? b.abbrev
    for (let c = 0; c < grid.length; c++) {
      for (let v = 0; v < grid[c].length; v++) {
        total++
        const n = grid[c][v]
        if (n === 0) buracos.push({ livro, c: c + 1, v: v + 1, n })
        else if (n > 1) duplos.push({ livro, c: c + 1, v: v + 1, n })
      }
    }
  }

  const cobertos = total - buracos.length
  // `src/lib/bible-books.ts` guarda versesPerChapter À MÃO e nenhum script o
  // gera. A busca por referência valida contra ELE, não contra a NAA — então um
  // conserto na NAA que não chegue lá faz o parser recusar versículo que existe.
  // Aconteceu: consertar 5 capítulos embaralhados deixou 10 números velhos, e
  // "Sl 110:7" passou a responder "Salmos 110 tem 5 versículos".
  const divergentes: string[] = []
  for (const b of BIBLE_BOOKS) {
    const real = lens.get(b.abbrev)
    if (!real) {
      divergentes.push(`${b.abbrev} (${b.name}) não existe na NAA`)
      continue
    }
    if (real.length !== b.versesPerChapter.length) {
      divergentes.push(`${b.abbrev}: ${b.versesPerChapter.length} capítulos declarados, NAA tem ${real.length}`)
    }
    b.versesPerChapter.forEach((v, i) => {
      if (v !== real[i]) divergentes.push(`${b.abbrev} ${i + 1}: bible-books ${v} · NAA ${real[i]}`)
    })
  }

  console.log(`Perícopes: ${rows.length}`)
  console.log(`Versículos na NAA: ${total}`)
  console.log(`Cobertos: ${cobertos} (${((cobertos / total) * 100).toFixed(4)}%)`)
  console.log(`Fora de qualquer perícope: ${buracos.length}`)
  console.log(`Em mais de uma perícope: ${duplos.length}`)
  console.log(`Referências fora do texto NAA: ${foraDaNaa.length}`)
  console.log(`bible-books.ts divergindo da NAA: ${divergentes.length}`)

  if (divergentes.length) {
    console.log('\n--- bible-books.ts × NAA ---')
    for (const d of divergentes) console.log(`  ${d}`)
    process.exitCode = 1
  }
  if (buracos.length) {
    console.log('\n--- BURACOS ---')
    for (const f of agrupar(buracos)) {
      console.log(`  ${f.livro} ${f.c}:${f.vIni}${f.vFim > f.vIni ? `-${f.vFim}` : ''}`)
    }
  }
  if (duplos.length) {
    console.log('\n--- SOBREPOSIÇÕES ---')
    for (const f of agrupar(duplos)) {
      console.log(`  ${f.livro} ${f.c}:${f.vIni}${f.vFim > f.vIni ? `-${f.vFim}` : ''} (x${f.n})`)
    }
  }
  for (const l of foraDaNaa) console.log(`  ${l}`)

  if (process.argv.includes('--tamanhos')) {
    tamanhos.sort((a, b) => b.n - a.n)
    console.log('\n--- 20 MAIORES ---')
    for (const { r, n } of tamanhos.slice(0, 20)) {
      const ref = `${r.livro} ${r.capitulo_inicio}:${r.versiculo_inicio}-${r.capitulo_fim}:${r.versiculo_fim}`
      console.log(`  ${String(n).padStart(4)} vv  #${r.ordem} ${ref}  ${r.titulo_en ?? ''}`)
    }
    const nums = tamanhos.map((t) => t.n).sort((a, b) => a - b)
    const q = (f: number) => nums[Math.floor(f * (nums.length - 1))]
    console.log(
      `\n  mediana ${q(0.5)} vv | p90 ${q(0.9)} vv | >50 vv: ${nums.filter((n) => n > 50).length} | >100 vv: ${nums.filter((n) => n > 100).length}`,
    )
  }
}

main()
