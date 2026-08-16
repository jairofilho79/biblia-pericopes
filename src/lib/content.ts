import type { Pericope } from './types'
import { testamentOf, type Testament } from './testament'

let cache: Pericope[] | null = null

export async function loadPericopes(): Promise<Pericope[]> {
  if (cache) return cache
  const res = await fetch(`${import.meta.env.BASE_URL}data/pericopes.json`)
  if (!res.ok) throw new Error('Falha ao carregar perícopes')
  cache = (await res.json()) as Pericope[]
  return cache
}

export async function listPericopes(opts?: {
  livro?: string
  q?: string
  testament?: Testament
}): Promise<Pericope[]> {
  let list = await loadPericopes()
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
  const list = await loadPericopes()
  return list.find((p) => p.ordem === ordem)
}

export async function listLivros(testament?: Testament): Promise<string[]> {
  const list = testament ? await listPericopes({ testament }) : await loadPericopes()
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

export function refLabel(p: Pericope): string {
  if (p.capitulo_inicio === p.capitulo_fim && p.versiculo_inicio === p.versiculo_fim) {
    return `${p.livro} ${p.capitulo_inicio}:${p.versiculo_inicio}`
  }
  return `${p.livro} ${p.capitulo_inicio}:${p.versiculo_inicio}–${p.capitulo_fim}:${p.versiculo_fim}`
}

export function ordensDoTestamento(all: Pericope[], t: Testament): number[] {
  return all.filter((p) => testamentOf(p) === t).map((p) => p.ordem)
}

export function proximaNoTestamento(all: Pericope[], ordem: number): number | null {
  const found = all.find((p) => p.ordem === ordem)
  if (!found) return null
  const seq = ordensDoTestamento(all, testamentOf(found))
  const i = seq.indexOf(ordem)
  if (i < 0 || i >= seq.length - 1) return null
  return seq[i + 1]
}

function matchesBook(p: Pericope, livroOrAbbrev: string): boolean {
  return p.livro === livroOrAbbrev || p.abbrev === livroOrAbbrev
}

/** Inclusive range check across multi-chapter pericopes. */
export function containsRef(
  p: Pericope,
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
): Promise<Pericope | null> {
  const list = await loadPericopes()
  return list.find((p) => containsRef(p, livroOrAbbrev, cap, ver)) ?? null
}

export async function listPericopesByBookChapter(
  livroOrAbbrev: string,
  cap?: number,
): Promise<Pericope[]> {
  const list = await loadPericopes()
  return list.filter((p) => {
    if (!matchesBook(p, livroOrAbbrev)) return false
    if (cap == null) return true
    return p.capitulo_inicio <= cap && cap <= p.capitulo_fim
  })
}
