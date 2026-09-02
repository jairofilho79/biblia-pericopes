import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { SkeletonIndice } from '../components/Skeleton'
import {
  listLivros,
  listPericopes,
  loadPericopes,
  progressoPorLivro,
  refLabel,
  type LivroProgresso,
} from '../lib/content'
import { doneSet } from '../lib/user-db'
import { useSyncRefresh } from '../lib/use-sync-refresh'
import type { Pericope, PericopeIndex } from '../lib/types'

function PeriLink({ p, done }: { p: PericopeIndex; done: boolean }) {
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
  const [items, setItems] = useState<PericopeIndex[]>([])
  const [done, setDone] = useState<Set<number>>(new Set())
  // Lista completa (sem filtro de busca): a barra de progresso do livro
  // aberto precisa do total do livro inteiro, não do que sobrou da busca.
  const [todas, setTodas] = useState<Pericope[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  // Só desliga o skeleton depois que a lista de perícopes chegou pela
  // primeira vez: sem isso, `carregando` vira `false` antes do segundo efeito
  // (que busca `items`) terminar, e some skeleton → quadro em branco → conteúdo.
  const [itensProntos, setItensProntos] = useState(false)

  useEffect(() => {
    let vivo = true
    Promise.all([listLivros(), doneSet(), loadPericopes()])
      .then(([ls, feitas, tudo]) => {
        if (!vivo) return
        setLivros(ls)
        setDone(feitas)
        setTodas(tudo)
      })
      .catch(() => {
        if (vivo) setErro('Não foi possível carregar o índice.')
      })
      .finally(() => {
        if (vivo) setCarregando(false)
      })
    return () => {
      vivo = false
    }
  }, [])

  // Do sync só o `done` muda: livros, `todas` e `items` vêm do pericopes.json,
  // que é conteúdo estático. Recarregar só ele evita piscar a lista e mexer no
  // skeleton por causa de uma conclusão feita em outro aparelho.
  useSyncRefresh(() => {
    // Tropeço aqui é transitório: a próxima rodada de sync avisa de novo.
    void doneSet()
      .then(setDone)
      .catch(() => {})
  })

  useEffect(() => {
    listPericopes({ livro: livro || undefined, q: q || undefined }).then((r) => {
      setItems(r)
      setItensProntos(true)
    })
  }, [livro, q])

  const grouped = useMemo(() => {
    if (livro) return null
    const map = new Map<string, PericopeIndex[]>()
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

  if (erro) return <p className="muted">{erro}</p>

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

      {carregando || !itensProntos ? (
        <SkeletonIndice />
      ) : livro || q ? (
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
