/**
 * Aplica os consertos de versificação em data/NAA.json, no lugar.
 * Idempotente: rodar duas vezes é seguro. Ver scripts/naa-versificacao.ts.
 *
 * Usage: npx tsx scripts/fix-naa.ts [--dry-run]
 */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CONSERTOS, aplicarConserto } from './naa-versificacao.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const naaPath = join(root, 'data/NAA.json')
const bakPath = join(root, 'data/NAA.json.bak')

type NaaBook = { abbrev: string; chapters: string[][] }

function main() {
  const dryRun = process.argv.includes('--dry-run')
  const naa = JSON.parse(readFileSync(naaPath, 'utf8')) as NaaBook[]
  const byAbbrev = new Map(naa.map((b) => [b.abbrev, b]))

  let aplicados = 0
  for (const c of CONSERTOS) {
    const book = byAbbrev.get(c.abbrev)
    if (!book) {
      console.log(`SKIP ${c.abbrev}: livro ausente`)
      continue
    }
    const antes = [book.chapters[c.origem - 1]?.length, book.chapters[c.destino - 1]?.length]
    const r = aplicarConserto(book.chapters, c)
    if (r.aplicado) {
      aplicados++
      const depois = [book.chapters[c.origem - 1].length, book.chapters[c.destino - 1].length]
      console.log(
        `OK   ${c.abbrev} ${c.origem}/${c.destino}: ${antes[0]}/${antes[1]} vv → ${depois[0]}/${depois[1]} vv`,
      )
    } else {
      console.log(`SKIP ${c.abbrev} ${c.origem}/${c.destino}: ${r.motivo}`)
    }
  }

  if (aplicados === 0) {
    console.log('Nada a fazer.')
    return
  }
  if (dryRun) {
    console.log(`[dry-run] ${aplicados} consertos NÃO gravados.`)
    return
  }
  if (!existsSync(bakPath)) copyFileSync(naaPath, bakPath)
  writeFileSync(naaPath, JSON.stringify(naa))
  console.log(`\n${aplicados} consertos gravados em ${naaPath} (backup: ${bakPath})`)
}

main()
