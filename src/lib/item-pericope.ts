import { refLabel } from './content'
import type { PericopeIndex } from './types'

export type ItemPericope = {
  ordem: number
  titulo: string
  ref: string
  /** "capitulo:versiculo" para o deep-link `?v=` da Leitura; ausente fora da busca no texto. */
  verseId?: string
  /** Trecho já partido para o <mark>, por `marcarTrecho`. */
  trecho?: { antes: string; marcado: string; depois: string }
}

export function itemDeIndice(p: PericopeIndex): ItemPericope {
  return { ordem: p.ordem, titulo: p.titulo_pericope_pt, ref: refLabel(p) }
}
