/**
 * Fatia o catálogo em três conjuntos servíveis:
 *   public/data/index.json        — metadados de todas as perícopes (~480 KB)
 *   public/data/texto/<slug>.json — texto_naa por livro (4,3 MB no total)
 *   public/data/estudo/<slug>.json— contexto/resenha/perguntas/tópicos (9,0 MB)
 *
 * Roda antes do vite (build e dev). É função pura do catálogo: os derivados
 * não são versionados.
 */
import { mkdirSync, readFileSync, statSync, writeFileSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { livroSlug } from '../src/lib/livro-slug'
import { readingMinutes } from '../src/lib/reading-time'
import type { Pericope } from '../src/lib/types'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const catalogoPath = join(root, 'data/pericopes.json')
const outDir = join(root, 'public/data')

function precisaGerar(): boolean {
  if (process.argv.includes('--force')) return true
  try {
    const catalogo = statSync(catalogoPath).mtimeMs
    return statSync(join(outDir, 'index.json')).mtimeMs < catalogo
  } catch {
    return true // saída ausente: gera
  }
}

function main(): void {
  if (!precisaGerar()) {
    console.log('[shard] saídas em dia — nada a fazer')
    return
  }
  const catalogo = JSON.parse(readFileSync(catalogoPath, 'utf8')) as Pericope[]

  const porSlug = new Map<string, { livro: string; itens: Pericope[] }>()
  for (const p of catalogo) {
    const slug = livroSlug(p.livro)
    const atual = porSlug.get(slug)
    if (atual && atual.livro !== p.livro) {
      // Em voz alta: silenciosamente um livro sobrescreveria o outro.
      throw new Error(`colisão de slug "${slug}": "${atual.livro}" e "${p.livro}"`)
    }
    if (atual) atual.itens.push(p)
    else porSlug.set(slug, { livro: p.livro, itens: [p] })
  }

  const indice = catalogo.map((p) => ({
    ordem: p.ordem,
    livro: p.livro,
    abbrev: p.abbrev,
    capitulo_inicio: p.capitulo_inicio,
    versiculo_inicio: p.versiculo_inicio,
    capitulo_fim: p.capitulo_fim,
    versiculo_fim: p.versiculo_fim,
    titulo_pericope_pt: p.titulo_pericope_pt,
    // Pré-calculado aqui para a Home não precisar do texto só para dizer "~5 min".
    minutos: readingMinutes(p.texto_naa),
  }))

  for (const sub of ['texto', 'estudo']) {
    rmSync(join(outDir, sub), { recursive: true, force: true })
    mkdirSync(join(outDir, sub), { recursive: true })
  }
  writeFileSync(join(outDir, 'index.json'), JSON.stringify(indice))

  for (const [slug, { itens }] of porSlug) {
    writeFileSync(
      join(outDir, 'texto', `${slug}.json`),
      JSON.stringify(itens.map((p) => ({ ordem: p.ordem, texto_naa: p.texto_naa }))),
    )
    writeFileSync(
      join(outDir, 'estudo', `${slug}.json`),
      JSON.stringify(
        itens.map((p) => ({
          ordem: p.ordem,
          contexto_historico_literario: p.contexto_historico_literario,
          resenha: p.resenha,
          perguntas_reflexao: p.perguntas_reflexao,
          ...(p.topicos_pregar ? { topicos_pregar: p.topicos_pregar } : {}),
        })),
      ),
    )
  }
  console.log(`[shard] ${indice.length} perícopes em ${porSlug.size} livros`)
}

main()
