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

      {selected ? (
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
