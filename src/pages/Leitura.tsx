import { Fragment, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import ReadingMenu from '../components/ReadingMenu'
import {
  anteriorNoTestamento,
  getPericope,
  loadPericopes,
  proximaNoTestamento,
  refLabel,
} from '../lib/content'
import { paragraphize } from '../lib/paragraphize'
import { groupCorrido, parseTextoNaa } from '../lib/parse-texto'
import { clearReadingPosition, getReadingPosition, setReadingPosition } from '../lib/reading-position'
import { getReadingPrefs, type ReadingPrefs } from '../lib/reading-prefs'
import {
  deleteAnotacao,
  getProgresso,
  listAnotacoes,
  saveAnotacao,
  setProgresso,
} from '../lib/user-db'
import { getVerseFocus, setVerseFocus } from '../lib/verse-highlight'
import { testamentLabel, testamentOf } from '../lib/testament'
import { promptConversa } from '../lib/contexto-ia'
import type { Anotacao, Pericope, ProgressoStatus } from '../lib/types'

type NotesTab = 'anotacoes' | 'topicos' | 'contexto'
type Vizinha = { ordem: number; titulo: string }

function inlineBold(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}

function TopicsView({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <div className="topics-view">
      {lines.map((line, i) => {
        const t = line.trim()
        if (!t) return null
        if (/^[-*]\s+/.test(t)) {
          return (
            <p key={i} className="topic-bullet">
              {inlineBold(t.replace(/^[-*]\s+/, ''))}
            </p>
          )
        }
        return (
          <h3 key={i} className="topic-h">
            {inlineBold(t.replace(/^#+\s*/, ''))}
          </h3>
        )
      })}
    </div>
  )
}

export default function Leitura() {
  const { ordem: ordemParam } = useParams()
  const [searchParams] = useSearchParams()
  const ordem = Number(ordemParam)
  const verseParam = searchParams.get('v')
  const [p, setP] = useState<Pericope | null>(null)
  const [prev, setPrev] = useState<Vizinha | null>(null)
  const [next, setNext] = useState<Vizinha | null>(null)
  const [status, setStatus] = useState<ProgressoStatus>('nao_iniciado')
  const [notes, setNotes] = useState<Anotacao[]>([])
  const [draft, setDraft] = useState('')
  const [err, setErr] = useState('')
  const [prefs, setPrefs] = useState<ReadingPrefs>(() => getReadingPrefs())
  const [focusId, setFocusId] = useState<string | null>(null)
  const [tab, setTab] = useState<NotesTab>('anotacoes')
  const [copied, setCopied] = useState(false)
  const doneRef = useRef(false)

  async function refreshNotes() {
    setNotes(await listAnotacoes(ordem))
  }

  useEffect(() => {
    ;(async () => {
      doneRef.current = false
      try {
        const all = await loadPericopes()
        const peri = await getPericope(ordem)
        if (!peri) {
          setErr('Perícope não encontrada')
          return
        }
        setP(peri)
        const vizinha = (o: number | null): Vizinha | null => {
          if (o == null) return null
          const v = all.find((x) => x.ordem === o)
          return v ? { ordem: v.ordem, titulo: v.titulo_pericope_pt } : null
        }
        setPrev(vizinha(anteriorNoTestamento(all, ordem)))
        setNext(vizinha(proximaNoTestamento(all, ordem)))
        setCopied(false)
        const fromQuery =
          verseParam && /^\d+:\d+$/.test(verseParam) ? verseParam : null
        const focus = fromQuery ?? getVerseFocus(ordem)
        setFocusId(focus)
        if (fromQuery) setVerseFocus(ordem, fromQuery)
        const prog = await getProgresso(ordem)
        const next = prog?.status ?? 'em_andamento'
        setStatus(next === 'nao_iniciado' ? 'em_andamento' : next)
        if (prog?.status === 'concluido') doneRef.current = true
        if (!prog || prog.status === 'nao_iniciado') {
          await setProgresso(ordem, 'em_andamento')
        }
        await refreshNotes()
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Erro')
      }
    })()
  }, [ordem, verseParam])

  // Prioridade de rolagem ao abrir: ?v= na URL > posição salva > topo.
  useEffect(() => {
    if (!p || p.ordem !== ordem) return
    if (verseParam && /^\d+:\d+$/.test(verseParam)) return
    window.scrollTo(0, getReadingPosition(ordem) ?? 0)
  }, [ordem, p, verseParam])

  useEffect(() => {
    if (!focusId || !p) return
    if (!(verseParam && /^\d+:\d+$/.test(verseParam))) return
    const el = document.querySelector('.verse-focus')
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [focusId, p, verseParam])

  useEffect(() => {
    let last = 0
    let timer: number | undefined
    const save = () => {
      if (doneRef.current) return
      setReadingPosition(ordem, window.scrollY)
    }
    const onScroll = () => {
      const now = Date.now()
      if (now - last > 500) {
        last = now
        save()
      } else {
        window.clearTimeout(timer)
        timer = window.setTimeout(save, 500)
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('scroll', onScroll)
    }
  }, [ordem])

  async function onSaveNote(e: FormEvent) {
    e.preventDefault()
    if (!draft.trim()) return
    await saveAnotacao(ordem, draft.trim())
    setDraft('')
    await refreshNotes()
  }

  async function markDone() {
    await setProgresso(ordem, 'concluido')
    clearReadingPosition(ordem)
    doneRef.current = true
    setStatus('concluido')
  }

  function selectVerse(id: string) {
    const next = focusId === id ? null : id
    setFocusId(next)
    setVerseFocus(ordem, next)
  }

  async function copyContexto() {
    if (!p) return
    await navigator.clipboard.writeText(promptConversa(p))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  if (err) return <p className="muted">{err}</p>
  if (!p) return <p className="muted">Carregando…</p>

  const blocks = parseTextoNaa(p.texto_naa)

  return (
    <article className="leitura">
      <p className="crumb">
        <Link to="/">Hoje</Link> · {testamentLabel(testamentOf(p))} ·{' '}
        <Link to="/indice">{p.livro}</Link>
      </p>
      <h1>{p.titulo_pericope_pt}</h1>
      <div className="ref-row">
        <p className="ref">{refLabel(p)}</p>
        <div className="ref-nav">
          {prev && (
            <Link className="read-tool ref-arrow" aria-label={`Anterior: ${prev.titulo}`} to={`/leitura/${prev.ordem}`}>
              ←
            </Link>
          )}
          {next && (
            <Link className="read-tool ref-arrow" aria-label={`Próxima: ${next.titulo}`} to={`/leitura/${next.ordem}`}>
              →
            </Link>
          )}
          <ReadingMenu prefs={prefs} onPrefs={setPrefs} />
        </div>
      </div>

      <section className="block block-plain">
        <h2>Contexto</h2>
        {paragraphize(p.contexto_historico_literario, { maxParas: 2 }).map((para, i) => (
          <p key={i} className="prose">
            {para}
          </p>
        ))}
      </section>

      <section className="block block-plain">
        <h2>Texto (NAA)</h2>
        <div className="texto-biblico">
          {prefs.layout === 'corrido'
            ? groupCorrido(blocks).map((g, gi) => (
                <div key={g.label ? `c-${g.chapter}` : `orfao-${gi}`} className="corrido-group">
                  {g.label && <h3 className="cap-label">{g.label}</h3>}
                  <p className="corrido">
                    {g.verses.map((b) => (
                      <Fragment key={b.id}>
                        <button
                          type="button"
                          className={`verse-inline${focusId === b.id ? ' verse-focus' : ''}`}
                          aria-pressed={focusId === b.id}
                          aria-label={
                            b.verse
                              ? `Versículo ${b.chapter}:${b.verse}${focusId === b.id ? ', em leitura' : ''}`
                              : b.text.slice(0, 40)
                          }
                          onClick={() => selectVerse(b.id)}
                        >
                          {b.verse > 0 && <sup className="verse-num">{b.verse}</sup>}
                          <span className="verse-text">{b.text}</span>
                        </button>{' '}
                      </Fragment>
                    ))}
                  </p>
                </div>
              ))
            : blocks.map((b) =>
                b.kind === 'chapter' ? (
                  <h3 key={`c-${b.chapter}`} className="cap-label">
                    {b.label}
                  </h3>
                ) : (
                  <button
                    key={b.id}
                    type="button"
                    className={`verse${focusId === b.id ? ' verse-focus' : ''}`}
                    aria-pressed={focusId === b.id}
                    aria-label={
                      b.verse
                        ? `Versículo ${b.chapter}:${b.verse}${focusId === b.id ? ', em leitura' : ''}`
                        : b.text.slice(0, 40)
                    }
                    onClick={() => selectVerse(b.id)}
                  >
                    {b.verse > 0 && <sup className="verse-num">{b.verse}</sup>}
                    <span className="verse-text">{b.text}</span>
                  </button>
                ),
              )}
        </div>
      </section>

      <section className="block block-plain">
        <h2>Resenha</h2>
        {paragraphize(p.resenha, { maxParas: 3 }).map((para, i) => (
          <p key={i} className="prose">
            {para}
          </p>
        ))}
      </section>

      <section className="block block-plain">
        <h2>Reflexão</h2>
        <ol className="perguntas">
          {p.perguntas_reflexao.map((q, i) => (
            <li key={i}>{q}</li>
          ))}
        </ol>
      </section>

      <section className="block notes">
        <div className="notes-tabs" role="tablist" aria-label="Anotações, tópicos e contexto">
          {(
            [
              ['anotacoes', 'Anotações'],
              ['topicos', 'Tópicos'],
              ['contexto', 'Contexto'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={`notes-tab${tab === id ? ' active' : ''}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'anotacoes' && (
          <>
            <form onSubmit={onSaveNote} className="note-form">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={4}
                placeholder="Escreva pensamentos, orações, aplicações…"
              />
              <button type="submit">Salvar anotação</button>
            </form>
            <ul className="note-list">
              {notes.map((n) => (
                <li key={n.id}>
                  <p>{n.texto}</p>
                  <button type="button" className="linkish" onClick={() => deleteAnotacao(n.id).then(refreshNotes)}>
                    Apagar
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {tab === 'topicos' &&
          (p.topicos_pregar ? (
            <TopicsView text={p.topicos_pregar} />
          ) : (
            <p className="muted">Ainda não gerado.</p>
          ))}

        {tab === 'contexto' && (
          <div className="contexto-ia">
            <button type="button" className="ghost copy-btn" onClick={copyContexto}>
              {copied ? 'Copiado' : 'Copiar'}
            </button>
            <pre className="contexto-ia-text">{promptConversa(p)}</pre>
          </div>
        )}

        <div className="actions">
          {status !== 'concluido' ? (
            <button type="button" className="cta" onClick={markDone}>
              Marcar como concluída
            </button>
          ) : next ? (
            <Link className="done-card" to={`/leitura/${next.ordem}`}>
              <span className="badge">Concluída ✓</span>
              <span className="done-next">
                Próxima: <strong>{next.titulo}</strong> →
              </span>
            </Link>
          ) : (
            <p className="badge">Concluída ✓</p>
          )}
        </div>
        <nav className="pager" aria-label="Navegação entre perícopes">
          {prev ? (
            <Link className="ghost pager-link" to={`/leitura/${prev.ordem}`}>
              ← {prev.titulo}
            </Link>
          ) : (
            <span aria-hidden />
          )}
          {next ? (
            <Link className="ghost pager-link pager-next" to={`/leitura/${next.ordem}`}>
              {next.titulo} →
            </Link>
          ) : (
            <span aria-hidden />
          )}
        </nav>
      </section>
    </article>
  )
}
