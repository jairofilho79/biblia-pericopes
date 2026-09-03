/**
 * ETL: KJV_Pericopes bounds × NAA.json → data/raw-pericopes.jsonl
 * Usage: npx tsx scripts/etl-pericopes.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { BOOK_MAP } from './book-map.ts'
import { resolveBounds } from './pericope-bounds.ts'
import { ajustarVersificacao } from './versificacao.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const naaPath = join(root, 'data/NAA.json')
const kjvPath = join(root, 'data/raw/PericopeGroupedKJVVerses.json')
const outPath = join(root, 'data/raw-pericopes.jsonl')
const warnPath = join(root, 'data/etl-warnings.json')

type NaaBook = { abbrev: string; name: string; chapters: string[][] }
type KjvRow = {
  Pericope: string
  'Reference Start': string
  'Reference End': string
  /** Fonte de verdade dos limites: ver scripts/pericope-bounds.ts. */
  Verses?: { Reference: string; Text: string }[]
}

type Warning = { ordem: number; type: string; detail: string }

function extractVerses(
  book: NaaBook,
  cStart: number,
  vStart: number,
  cEnd: number,
  vEnd: number,
): { text: string; count: number; warnings: string[] } {
  const warnings: string[] = []
  const lines: string[] = []
  let count = 0
  let lastChapter = -1

  for (let c = cStart; c <= cEnd; c++) {
    const chapter = book.chapters[c - 1]
    if (!chapter) {
      warnings.push(`capítulo ${c} ausente em ${book.name}`)
      continue
    }
    const from = c === cStart ? vStart : 1
    const to = c === cEnd ? vEnd : chapter.length
    if (c !== lastChapter) {
      lines.push(`Capítulo ${c}`)
      lastChapter = c
    }
    for (let v = from; v <= to; v++) {
      const verse = chapter[v - 1]
      if (verse == null) {
        warnings.push(`${book.name} ${c}:${v} ausente na NAA`)
        continue
      }
      lines.push(`${v} ${verse}`)
      count++
    }
  }
  return { text: lines.join('\n'), count, warnings }
}

function main() {
  const naa = JSON.parse(readFileSync(naaPath, 'utf8')) as NaaBook[]
  const byAbbrev = new Map(naa.map((b) => [b.abbrev, b]))
  const kjv = JSON.parse(readFileSync(kjvPath, 'utf8')) as KjvRow[]
  const warnings: Warning[] = []
  const lines: string[] = []

  for (let i = 0; i < kjv.length; i++) {
    const row = kjv[i]
    const bruto = resolveBounds(row)
    // Depois do resolveBounds, nunca antes: a tabela de versificação é escrita
    // contra a faixa REAL da perícope, não contra a declarada no dataset.
    const { start, end, ajustado } = ajustarVersificacao(i, bruto.start, bruto.end)
    const corrigido = bruto.corrigido
    if (ajustado) {
      warnings.push({
        ordem: i,
        type: 'versificacao_ajustada',
        detail: `${start.livroEn} ${start.capitulo}:${start.versiculo}→${end.capitulo}:${end.versiculo}`,
      })
    }
    if (corrigido) {
      warnings.push({
        ordem: i,
        type: 'limite_corrigido',
        detail: `declarado ${row['Reference Start']}→${row['Reference End']}, real ${start.livroEn} ${start.capitulo}:${start.versiculo}→${end.capitulo}:${end.versiculo}`,
      })
    }
    const mapped = BOOK_MAP[start.livroEn]
    if (!mapped) {
      warnings.push({ ordem: i, type: 'livro_desconhecido', detail: start.livroEn })
      continue
    }
    if (start.livroEn !== end.livroEn) {
      warnings.push({
        ordem: i,
        type: 'span_multi_livro',
        detail: `${row['Reference Start']} → ${row['Reference End']}`,
      })
      continue
    }
    const book = byAbbrev.get(mapped.abbrev)
    if (!book) {
      warnings.push({ ordem: i, type: 'abbrev_naa', detail: mapped.abbrev })
      continue
    }

    const { text, count, warnings: w } = extractVerses(
      book,
      start.capitulo,
      start.versiculo,
      end.capitulo,
      end.versiculo,
    )
    for (const detail of w) {
      warnings.push({ ordem: i, type: 'versiculo', detail })
    }
    if (count === 0) {
      warnings.push({ ordem: i, type: 'vazio', detail: row.Pericope })
      continue
    }

    const raw = {
      ordem: i,
      titulo_en: row.Pericope,
      livro_en: start.livroEn,
      livro: mapped.name,
      abbrev: mapped.abbrev,
      capitulo_inicio: start.capitulo,
      versiculo_inicio: start.versiculo,
      capitulo_fim: end.capitulo,
      versiculo_fim: end.versiculo,
      texto_naa: text,
    }
    lines.push(JSON.stringify(raw))
  }

  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, lines.join('\n') + '\n')
  writeFileSync(warnPath, JSON.stringify(warnings, null, 2))
  console.log(`OK: ${lines.length} perícopes → ${outPath}`)
  console.log(`Avisos: ${warnings.length} → ${warnPath}`)
}

main()
