import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listLivros, listPericopes, refLabel } from '../lib/content'
import { doneSet } from '../lib/user-db'
import type { Pericope } from '../lib/types'

function PeriLink({ p, done }: { p: Pericope; done: boolean }) {
  return (
    <Link to={`/leitura/${p.ordem}`} className={done ? 'done' : undefined}>
      <span className="peri-row">
        <span className="check" aria-hidden>
          {done ? '✓' : ''}
        </span>
        <span className="peri-text">
          <strong>{p.titulo_pericope_pt}</strong>
          <span>{refLabel(p)}</span>
        </span>
      </span>
    </Link>
  )
}

export default function Indice() {
  const [livros, setLivros] = useState<string[]>([])
  const [livro, setLivro] = useState('')
  const [q, setQ] = useState('')
  const [items, setItems] = useState<Pericope[]>([])
  const [done, setDone] = useState<Set<number>>(new Set())

  useEffect(() => {
    listLivros().then(setLivros)
    doneSet().then(setDone)
  }, [])

  useEffect(() => {
    listPericopes({ livro: livro || undefined, q: q || undefined }).then(setItems)
  }, [livro, q])

  const grouped = useMemo(() => {
    if (livro) return null
    const map = new Map<string, Pericope[]>()
    for (const p of items) {
      const arr = map.get(p.livro) ?? []
      arr.push(p)
      map.set(p.livro, arr)
    }
    return map
  }, [items, livro])

  return (
    <section className="indice">
      <h1>Índice</h1>
      <div className="filters">
        <input
          type="search"
          placeholder="Buscar título ou referência…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select value={livro} onChange={(e) => setLivro(e.target.value)}>
          <option value="">Todos os livros</option>
          {livros.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>

      {livro || q ? (
        <ul className="peri-list">
          {items.map((p) => (
            <li key={p.ordem}>
              <PeriLink p={p} done={done.has(p.ordem)} />
            </li>
          ))}
        </ul>
      ) : (
        [...(grouped?.entries() ?? [])].map(([book, list]) => (
          <div key={book} className="book-group">
            <h2>
              <button type="button" className="linkish" onClick={() => setLivro(book)}>
                {book}
              </button>{' '}
              <span className="muted">
                ({list.filter((p) => done.has(p.ordem)).length}/{list.length})
              </span>
            </h2>
            <ul className="peri-list compact">
              {list.slice(0, 5).map((p) => (
                <li key={p.ordem}>
                  <PeriLink p={p} done={done.has(p.ordem)} />
                </li>
              ))}
            </ul>
            {list.length > 5 && (
              <button type="button" className="ghost" onClick={() => setLivro(book)}>
                Ver todas ({list.length})
              </button>
            )}
          </div>
        ))
      )}
    </section>
  )
}
