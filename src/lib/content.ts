import type { Pericope, PericopeIndex } from './types'
import { testamentOf, type Testament } from './testament'
import { livroSlug } from './livro-slug'
import { carregarEstudo, carregarTexto } from './shards'

let indice: PericopeIndex[] | null = null
let carregando: Promise<PericopeIndex[]> | null = null

/**
 * Índice de metadados: ~480 KB que destravam Home, Índice e Pesquisa por
 * referência. O conteúdo pesado vem depois, por livro (shards.ts).
 *
 * Chamadas concorrentes compartilham a mesma promessa — três telas montando
 * juntas não podem virar três downloads.
 */
export async function loadIndex(): Promise<PericopeIndex[]> {
  if (indice) return indice
  if (carregando) return carregando
  carregando = (async () => {
    const res = await fetch(`${import.meta.env.BASE_URL}data/index.json`)
    if (!res.ok) throw new Error('Falha ao carregar o índice de perícopes')
    indice = (await res.json()) as PericopeIndex[]
    carregando = null
    return indice
  })().catch((err: unknown) => {
    carregando = null
    throw err
  })
  return carregando
}

export async function listPericopes(opts?: {
  livro?: string
  q?: string
  testament?: Testament
}): Promise<PericopeIndex[]> {
  let list = await loadIndex()
  if (opts?.testament) list = list.filter((p) => testamentOf(p) === opts.testament)
  if (opts?.livro) list = list.filter((p) => p.livro === opts.livro)
  if (opts?.q) {
    const q = opts.q.toLowerCase()
    list = list.filter(
      (p) =>
        p.titulo_pericope_pt.toLowerCase().includes(q) ||
        p.livro.toLowerCase().includes(q) ||
        `${p.capitulo_inicio}:${p.versiculo_inicio}`.includes(q),
    )
  }
  return list
}

export async function getPericope(ordem: number): Promise<Pericope | undefined> {
  const meta = (await loadIndex()).find((p) => p.ordem === ordem)
  if (!meta) return undefined
  const slug = livroSlug(meta.livro)
  // Os dois shards do livro em paralelo: são requisições de usuário, não de
  // fundo, e a leitura só desenha com as duas.
  const [texto, estudo] = await Promise.all([carregarTexto(slug), carregarEstudo(slug)])
  const bloco = estudo.get(ordem)
  const corpo = texto.get(ordem)
  if (bloco === undefined || corpo === undefined) return undefined
  return { ...meta, texto_naa: corpo, ...bloco }
}

export async function listLivros(testament?: Testament): Promise<string[]> {
  const list = testament ? await listPericopes({ testament }) : await loadIndex()
  const seen = new Set<string>()
  const books: string[] = []
  for (const p of list) {
    if (!seen.has(p.livro)) {
      seen.add(p.livro)
      books.push(p.livro)
    }
  }
  return books
}

export function refLabel(p: PericopeIndex): string {
  if (p.capitulo_inicio === p.capitulo_fim && p.versiculo_inicio === p.versiculo_fim) {
    return `${p.livro} ${p.capitulo_inicio}:${p.versiculo_inicio}`
  }
  return `${p.livro} ${p.capitulo_inicio}:${p.versiculo_inicio}–${p.capitulo_fim}:${p.versiculo_fim}`
}

export function ordensDoTestamento(all: PericopeIndex[], t: Testament): number[] {
  return all.filter((p) => testamentOf(p) === t).map((p) => p.ordem)
}

export function proximaNoTestamento(all: PericopeIndex[], ordem: number): number | null {
  const found = all.find((p) => p.ordem === ordem)
  if (!found) return null
  const seq = ordensDoTestamento(all, testamentOf(found))
  const i = seq.indexOf(ordem)
  if (i < 0 || i >= seq.length - 1) return null
  return seq[i + 1]
}

export function anteriorNoTestamento(all: PericopeIndex[], ordem: number): number | null {
  const found = all.find((p) => p.ordem === ordem)
  if (!found) return null
  const seq = ordensDoTestamento(all, testamentOf(found))
  const i = seq.indexOf(ordem)
  if (i <= 0) return null
  return seq[i - 1]
}

function matchesBook(p: PericopeIndex, livroOrAbbrev: string): boolean {
  return p.livro === livroOrAbbrev || p.abbrev === livroOrAbbrev
}

/** Inclusive range check across multi-chapter pericopes. */
export function containsRef(
  p: PericopeIndex,
  livroOrAbbrev: string,
  cap: number,
  ver: number,
): boolean {
  if (!matchesBook(p, livroOrAbbrev)) return false
  const start = p.capitulo_inicio * 100_000 + p.versiculo_inicio
  const end = p.capitulo_fim * 100_000 + p.versiculo_fim
  const point = cap * 100_000 + ver
  return point >= start && point <= end
}

export async function findPericopeByRef(
  livroOrAbbrev: string,
  cap: number,
  ver: number,
): Promise<PericopeIndex | null> {
  const list = await loadIndex()
  return list.find((p) => containsRef(p, livroOrAbbrev, cap, ver)) ?? null
}

export async function listPericopesByBookChapter(
  livroOrAbbrev: string,
  cap?: number,
): Promise<PericopeIndex[]> {
  const list = await loadIndex()
  return list.filter((p) => {
    if (!matchesBook(p, livroOrAbbrev)) return false
    if (cap == null) return true
    return p.capitulo_inicio <= cap && cap <= p.capitulo_fim
  })
}

export type LivroProgresso = {
  livro: string
  total: number
  concluidas: number
  /** 0–100, arredondado; 0 quando o livro não tem nenhuma perícope. */
  pct: number
}

/**
 * Contagem por livro na ordem de primeira aparição da lista recebida — a mesma
 * ordem em que o Índice agrupa, então o mapa serve direto para os cabeçalhos.
 */
export function progressoPorLivro(
  all: PericopeIndex[],
  done: Set<number>,
): Map<string, LivroProgresso> {
  const out = new Map<string, LivroProgresso>()
  for (const p of all) {
    const atual = out.get(p.livro) ?? { livro: p.livro, total: 0, concluidas: 0, pct: 0 }
    atual.total += 1
    if (done.has(p.ordem)) atual.concluidas += 1
    out.set(p.livro, atual)
  }
  for (const v of out.values()) {
    v.pct = v.total ? Math.round((v.concluidas / v.total) * 100) : 0
  }
  return out
}
