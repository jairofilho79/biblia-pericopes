import { Link } from 'react-router-dom'
import { refLabel } from '../lib/content'
import type { PericopeIndex } from '../lib/types'

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

export default function ListaPericopes({
  itens,
  concluidas,
  compact = false,
}: {
  itens: ItemPericope[]
  concluidas: Set<number>
  compact?: boolean
}) {
  return (
    <ul className={compact ? 'peri-list compact' : 'peri-list'}>
      {itens.map((it) => {
        const done = concluidas.has(it.ordem)
        return (
          <li key={it.ordem}>
            <Link
              to={`/leitura/${it.ordem}${it.verseId ? `?v=${it.verseId}` : ''}`}
              className={done ? 'done' : undefined}
            >
              <span className="peri-row">
                <span className="check" aria-hidden>
                  {done ? '✓' : ''}
                </span>
                <span className="peri-text">
                  <strong>{it.titulo}</strong>
                  <span>{it.ref}</span>
                  {it.trecho && (
                    <span className="hit-snippet">
                      {it.trecho.antes}
                      {it.trecho.marcado && <mark>{it.trecho.marcado}</mark>}
                      {it.trecho.depois}
                    </span>
                  )}
                </span>
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
