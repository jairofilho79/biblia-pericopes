import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  BIBLE_BOOKS,
  filterBooks,
  maxChapter,
  maxVerse,
  type BibleBook,
} from '../lib/bible-books'
import {
  findPericopeByRef,
  listPericopesByBookChapter,
  refLabel,
} from '../lib/content'
import {
  indexPronto,
  LIMITE_RESULTADOS,
  marcarTrecho,
  MIN_CHARS,
  searchTexto,
  type FulltextHit,
} from '../lib/fulltext'
import { testamentLabel } from '../lib/testament'
import type { Pericope } from '../lib/types'

type Group = {
  testament: 'vt' | 'nt'
  sections: { section: string; books: BibleBook[] }[]
}

function groupBooks(books: BibleBook[]): Group[] {
  const out: Group[] = []
  for (const t of ['vt', 'nt'] as const) {
    const ofT = books.filter((b) => b.testament === t)
    if (!ofT.length) continue
    const sections: Group['sections'] = []
    for (const b of ofT) {
      const last = sections[sections.length - 1]
      if (last && last.section === b.section) last.books.push(b)
      else sections.push({ section: b.section, books: [b] })
    }
    out.push({ testament: t, sections })
  }
  return out
}

export default function Pesquisar() {
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<BibleBook | null>(null)
  const [cap, setCap] = useState('')
  const [ver, setVer] = useState('')
  const [peris, setPeris] = useState<Pericope[]>([])
  const [capFilter, setCapFilter] = useState<number | null>(null)
  const [hit, setHit] = useState<Pericope | null>(null)
  const [miss, setMiss] = useState('')
  const [modo, setModo] = useState<'ref' | 'texto'>('ref')
  const [texto, setTexto] = useState('')
  const [hits, setHits] = useState<FulltextHit[]>([])
  const [buscando, setBuscando] = useState(false)
  const [preparando, setPreparando] = useState(false)
  const [erro, setErro] = useState(false)

  const termo = texto.trim()

  const filtered = useMemo(() => filterBooks(q), [q])
  const groups = useMemo(() => groupBooks(filtered), [filtered])

  const capNum = Number(cap)
  const verNum = Number(ver)
  const capOk =
    selected != null && Number.isInteger(capNum) && capNum >= 1 && capNum <= maxChapter(selected)
  const verMax = selected && capOk ? maxVerse(selected, capNum) : 0
  const verOk = capOk && Number.isInteger(verNum) && verNum >= 1 && verNum <= verMax

  useEffect(() => {
    if (!selected) {
      setPeris([])
      return
    }
    listPericopesByBookChapter(selected.abbrev, capFilter ?? undefined).then(setPeris)
  }, [selected, capFilter])

  // Debounce de 300 ms: digitar não pode disparar uma varredura por tecla.
  useEffect(() => {
    if (modo !== 'texto' || termo.length < MIN_CHARS) {
      setHits([])
      setBuscando(false)
      setPreparando(false)
      setErro(false)
      return
    }
    let vivo = true
    setBuscando(true)
    setErro(false)
    // A primeira busca paga a construção do índice; as seguintes, não.
    setPreparando(!indexPronto())
    const timer = window.setTimeout(() => {
      searchTexto(termo)
        .then((r) => {
          if (vivo) setHits(r)
        })
        .catch(() => {
          if (vivo) {
            setHits([])
            setErro(true)
          }
        })
        .finally(() => {
          if (!vivo) return
          setBuscando(false)
          setPreparando(false)
        })
    }, 300)
    return () => {
      vivo = false
      window.clearTimeout(timer)
    }
  }, [modo, termo])

  function selectBook(book: BibleBook) {
    setSelected(book)
    setCap('')
    setVer('')
    setCapFilter(null)
    setHit(null)
    setMiss('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function clearBook() {
    setSelected(null)
    setCap('')
    setVer('')
    setCapFilter(null)
    setHit(null)
    setMiss('')
  }

  async function onSearch(e: FormEvent) {
    e.preventDefault()
    if (!selected || !capOk) return
    setMiss('')
    setHit(null)

    if (verOk) {
      const found = await findPericopeByRef(selected.abbrev, capNum, verNum)
      setCapFilter(null)
      if (!found) {
        setMiss(`Nenhuma perícope contém ${selected.name} ${capNum}:${verNum}.`)
        return
      }
      setHit(found)
      return
    }

    setCapFilter(capNum)
  }

  return (
    <section className="pesquisar">
      <h1>Pesquisar</h1>

      <div className="modo-busca" role="group" aria-label="Modo de busca">
        <button
          type="button"
          className={`modo-btn${modo === 'ref' ? ' active' : ''}`}
          aria-pressed={modo === 'ref'}
          onClick={() => setModo('ref')}
        >
          Referência
        </button>
        <button
          type="button"
          className={`modo-btn${modo === 'texto' ? ' active' : ''}`}
          aria-pressed={modo === 'texto'}
          onClick={() => setModo('texto')}
        >
          No texto
        </button>
      </div>

      {modo === 'texto' ? (
        <>
          <div className="filters">
            <input
              type="search"
              placeholder="Buscar no texto bíblico…"
              value={texto}
              autoFocus
              onChange={(e) => setTexto(e.target.value)}
              aria-label="Buscar no texto bíblico"
            />
          </div>

          {termo.length > 0 && termo.length < MIN_CHARS && (
            <p className="muted">Digite ao menos {MIN_CHARS} letras.</p>
          )}

          <div aria-live="polite">
            {preparando && <p className="muted">Preparando busca…</p>}
            {!preparando && buscando && <p className="muted">Buscando…</p>}

            {!buscando && erro && (
              <p className="muted">
                Não foi possível buscar agora — verifique a conexão e tente de novo.
              </p>
            )}

            {!buscando && !erro && termo.length >= MIN_CHARS && (
              <p className="peri-count">
                {hits.length === 0
                  ? 'Nenhum resultado'
                  : `${hits.length} resultado${hits.length === 1 ? '' : 's'}${
                      hits.length === LIMITE_RESULTADOS ? ' (primeiros)' : ''
                    }`}
              </p>
            )}
          </div>

          <ul className="peri-list">
            {hits.map((h) => {
              const { antes, marcado, depois } = marcarTrecho(h.snippet, termo)
              return (
                <li key={h.ordem}>
                  <Link to={`/leitura/${h.ordem}${h.verseId ? `?v=${h.verseId}` : ''}`}>
                    <strong>{h.titulo}</strong>
                    <span>{h.refLabel}</span>
                    <span className="hit-snippet">
                      {antes}
                      {marcado && <mark>{marcado}</mark>}
                      {depois}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </>
      ) : selected ? (
        <>
          <div className="ref-sticky">
            <div className="selected-book">
              <div className="selected-book-meta">
                <span className="selected-book-name">{selected.name}</span>
                <span className="muted">
                  {selected.abbrev} · {selected.section}
                </span>
              </div>
              <button type="button" className="ghost trocar-livro" onClick={clearBook}>
                Trocar livro
              </button>
            </div>

            <form className="ref-form" onSubmit={onSearch}>
              <label>
                Capítulo
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={maxChapter(selected)}
                  placeholder={`1–${maxChapter(selected)}`}
                  value={cap}
                  autoFocus
                  onChange={(e) => {
                    setCap(e.target.value)
                    setVer('')
                    setHit(null)
                    setMiss('')
                    setCapFilter(null)
                  }}
                />
              </label>
              <label>
                Versículo
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={verMax || undefined}
                  placeholder={capOk ? `1–${verMax}` : 'Capítulo primeiro'}
                  value={ver}
                  disabled={!capOk}
                  onChange={(e) => {
                    setVer(e.target.value)
                    setHit(null)
                    setMiss('')
                  }}
                />
              </label>
              <button type="submit" disabled={!capOk}>
                Pesquisar
              </button>
            </form>
          </div>

          {miss && <p className="muted">{miss}</p>}

          {hit && (
            <div className="search-hit">
              <p className="muted">Perícope encontrada</p>
              <Link to={`/leitura/${hit.ordem}?v=${capNum}:${verNum}`}>
                <strong>{hit.titulo_pericope_pt}</strong>
                <span>{refLabel(hit)}</span>
              </Link>
            </div>
          )}

          <p className="peri-count">
            {capFilter != null
              ? `${peris.length} perícope${peris.length === 1 ? '' : 's'} no capítulo ${capFilter}`
              : `${peris.length} perícope${peris.length === 1 ? '' : 's'} em ${selected.name}`}
            {capFilter != null && (
              <>
                {' · '}
                <button type="button" className="linkish" onClick={() => setCapFilter(null)}>
                  Ver todas do livro
                </button>
              </>
            )}
          </p>

          <ul className="peri-list">
            {peris.map((p) => (
              <li key={p.ordem}>
                <Link to={`/leitura/${p.ordem}`}>
                  <strong>{p.titulo_pericope_pt}</strong>
                  <span>{refLabel(p)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <div className="filters">
            <input
              type="search"
              placeholder="Filtrar livros…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Filtrar livros"
            />
          </div>

          <div className="book-catalog">
            {groups.map((g) => (
              <div key={g.testament} className="testament-block">
                <h1 className="testament-h">{testamentLabel(g.testament)}</h1>
                {g.sections.map((s) => (
                  <div key={s.section} className="section-block">
                    <h3 className="section-h">{s.section}</h3>
                    <ul className="book-list">
                      {s.books.map((b) => (
                        <li key={b.abbrev}>
                          <button
                            type="button"
                            className="book-chip"
                            onClick={() => selectBook(b)}
                          >
                            <span className="book-name">{b.name}</span>
                            <span className="book-abbrev">{b.abbrev}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ))}
            {!filtered.length && <p className="muted">Nenhum livro correspondente.</p>}
          </div>

          {q === '' && (
            <p className="muted catalog-hint">
              {BIBLE_BOOKS.length} livros · escolha um para ver as perícopes
            </p>
          )}
        </>
      )}
    </section>
  )
}
