import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  listLivros,
  listPericopes,
  loadPericopes,
  progressoPorLivro,
  refLabel,
  type LivroProgresso,
} from '../lib/content'
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

function BookProgress({ prog }: { prog: LivroProgresso }) {
  return (
    <span className="book-progress-wrap">
      {/* a barra é decoração: quem lê com leitor de tela recebe o "N de M" */}
      <span className="book-progress" aria-hidden>
        <span className="book-progress-fill" style={{ width: `${prog.pct}%` }} />
      </span>
      <span className="book-progress-label">
        {prog.concluidas} de {prog.total}
      </span>
    </span>
  )
}

export default function Indice() {
  const [livros, setLivros] = useState<string[]>([])
  const [livro, setLivro] = useState('')
  const [q, setQ] = useState('')
  const [items, setItems] = useState<Pericope[]>([])
  const [done, setDone] = useState<Set<number>>(new Set())
  // Lista completa (sem filtro de busca): a barra de progresso do livro
  // aberto precisa do total do livro inteiro, não do que sobrou da busca.
  const [todas, setTodas] = useState<Pericope[]>([])

  useEffect(() => {
    listLivros().then(setLivros)
    doneSet().then(setDone)
    loadPericopes().then(setTodas)
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

  const progresso = useMemo(() => progressoPorLivro(items, done), [items, done])
  // Progresso do livro aberto vem sempre da lista cheia: com livro+busca
  // ativos ao mesmo tempo, `items` já veio filtrado pela query e sub-contaria
  // o livro.
  const progressoTodas = useMemo(() => progressoPorLivro(todas, done), [todas, done])
  const progAberto = livro ? (progressoTodas.get(livro) ?? null) : null

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
        <>
          {progAberto && (
            <div className="book-group-head">
              <h2>{livro}</h2>
              <BookProgress prog={progAberto} />
            </div>
          )}
          <ul className="peri-list">
            {items.map((p) => (
              <li key={p.ordem}>
                <PeriLink p={p} done={done.has(p.ordem)} />
              </li>
            ))}
          </ul>
        </>
      ) : (
        [...(grouped?.entries() ?? [])].map(([book, list]) => {
          const prog = progresso.get(book)
          return (
            <div key={book} className="book-group">
              <div className="book-group-head">
                <h2>
                  <button type="button" className="linkish" onClick={() => setLivro(book)}>
                    {book}
                  </button>
                </h2>
                {prog && <BookProgress prog={prog} />}
              </div>
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
          )
        })
      )}
    </section>
  )
}
