import { Fragment, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import ReadingMenu from '../components/ReadingMenu'
import VerseActions from '../components/VerseActions'
import {
  anteriorNoTestamento,
  getPericope,
  loadPericopes,
  proximaNoTestamento,
  refLabel,
} from '../lib/content'
import { paragraphize } from '../lib/paragraphize'
import { groupCorrido, parseTextoNaa, type VerseBlock } from '../lib/parse-texto'
import { clearReadingPosition, getReadingPosition, setReadingPosition } from '../lib/reading-position'
import { getReadingPrefs, type ReadingPrefs } from '../lib/reading-prefs'
import {
  deleteAnotacao,
  getProgresso,
  listAnotacoes,
  listDestaques,
  removeDestaque,
  saveAnotacao,
  setDestaque,
  setProgresso,
} from '../lib/user-db'
import { getVerseFocus, setVerseFocus } from '../lib/verse-highlight'
import { nextSelection, parseVerseRef, rangeLabel, rangeRef, verseRefLabel, versesInRange, type VerseSelection } from '../lib/verse-range'
import { testamentLabel, testamentOf } from '../lib/testament'
import { promptConversa } from '../lib/contexto-ia'
import type { Anotacao, DestaqueCor, Pericope, ProgressoStatus } from '../lib/types'

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
  const [selection, setSelection] = useState<VerseSelection | null>(null)
  const [barOpen, setBarOpen] = useState(false)
  const [destaques, setDestaques] = useState<Map<string, DestaqueCor>>(new Map())
  const [draftRef, setDraftRef] = useState<string | null>(null)
  const [aviso, setAviso] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmarId, setConfirmarId] = useState<string | null>(null)
  const [tab, setTab] = useState<NotesTab>('anotacoes')
  const [copied, setCopied] = useState(false)
  const doneRef = useRef(false)

  // Memoizado: o parser roda uma vez por perícope, não a cada render — e os
  // handlers de seleção precisam dos blocos antes dos returns antecipados.
  const blocks = useMemo(() => (p ? parseTextoNaa(p.texto_naa) : []), [p])
  const selecionados = useMemo(
    () => (selection ? versesInRange(blocks, selection.start, selection.end) : []),
    [blocks, selection],
  )

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
        // Restaurar foco seleciona só aquele versículo e NÃO abre a barra:
        // a barra é resposta a toque, não a navegação.
        setSelection(focus ? { start: focus, end: focus } : null)
        setBarOpen(false)
        setDraftRef(null)
        if (fromQuery) setVerseFocus(ordem, fromQuery)
        const hl = await listDestaques(ordem)
        setDestaques(new Map(hl.map((d) => [d.verseId, d.cor])))
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
    if (!selection || !p) return
    if (!(verseParam && /^\d+:\d+$/.test(verseParam))) return
    const el = document.querySelector('.verse-focus')
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [selection, p, verseParam])

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
    await saveAnotacao(ordem, draft.trim(), editingId ?? undefined, draftRef)
    setDraft('')
    setDraftRef(null)
    setEditingId(null)
    await refreshNotes()
  }

  function editarNota(n: Anotacao) {
    setEditingId(n.id)
    setDraft(n.texto)
    setDraftRef(n.verseRef ?? null)
    setConfirmarId(null)
    setTab('anotacoes')
  }

  function cancelarEdicao() {
    setEditingId(null)
    setDraft('')
    setDraftRef(null)
  }

  async function apagarNota(id: string) {
    await deleteAnotacao(id)
    setConfirmarId(null)
    if (editingId === id) cancelarEdicao()
    await refreshNotes()
  }

  async function markDone() {
    await setProgresso(ordem, 'concluido')
    clearReadingPosition(ordem)
    doneRef.current = true
    setStatus('concluido')
  }

  function selectVerse(id: string) {
    const prox = nextSelection(blocks, selection, id)
    setSelection(prox)
    setBarOpen(prox !== null)
    const verses = prox ? versesInRange(blocks, prox.start, prox.end) : []
    // "versículo em leitura" persistido continua sendo o PRIMEIRO da seleção.
    setVerseFocus(ordem, verses[0]?.id ?? null)
  }

  function flashAviso(msg: string) {
    setAviso(msg)
    window.setTimeout(() => setAviso(''), 1600)
  }

  function citacaoSelecao(): string {
    if (!p) return ''
    return `"${selecionados.map((v) => v.text).join(' ')}" (${rangeLabel(p, selecionados)}, NAA)`
  }

  async function copiarSelecao() {
    try {
      await navigator.clipboard.writeText(citacaoSelecao())
      flashAviso('Copiado ✓')
    } catch {
      flashAviso('Não foi possível copiar')
    }
  }

  async function compartilharSelecao() {
    if (navigator.share) {
      try {
        await navigator.share({ text: citacaoSelecao() })
        return
      } catch (e) {
        // cancelar o share nativo não é erro: some em silêncio
        if (e instanceof Error && e.name === 'AbortError') return
      }
    }
    await copiarSelecao()
  }

  async function destacarSelecao(cor: DestaqueCor) {
    const proximos = new Map(destaques)
    for (const v of selecionados) {
      await setDestaque(ordem, v.id, cor)
      proximos.set(v.id, cor)
    }
    setDestaques(proximos)
  }

  async function removerDestaqueSelecao() {
    const proximos = new Map(destaques)
    for (const v of selecionados) {
      await removeDestaque(`${ordem}:${v.id}`)
      proximos.delete(v.id)
    }
    setDestaques(proximos)
  }

  function anotarSelecao() {
    setTab('anotacoes')
    setEditingId(null)
    setConfirmarId(null)
    setDraftRef(rangeRef(selecionados))
    setBarOpen(false)
    window.setTimeout(() => {
      const el = document.querySelector<HTMLTextAreaElement>('.note-form textarea')
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      el?.focus()
    }, 0)
  }

  function fecharBarra() {
    setBarOpen(false)
  }

  async function copyContexto() {
    if (!p) return
    await navigator.clipboard.writeText(promptConversa(p))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  if (err) return <p className="muted">{err}</p>
  if (!p) return <p className="muted">Carregando…</p>

  const selecionadosIds = new Set(selecionados.map((v) => v.id))

  function verseClass(base: string, id: string): string {
    const cor = destaques.get(id)
    const foco = selecionadosIds.has(id) ? ' verse-focus' : ''
    return `${base}${foco}${cor ? ` verse-hl-${cor}` : ''}`
  }

  function verseAria(b: VerseBlock): string {
    if (!b.verse) return b.text.slice(0, 40)
    const cor = destaques.get(b.id)
    const marcas = [
      selecionadosIds.has(b.id) ? 'selecionado' : '',
      cor ? `destacado em ${cor}` : '',
    ]
      .filter(Boolean)
      .join(', ')
    return `Versículo ${b.chapter}:${b.verse}${marcas ? `, ${marcas}` : ''}`
  }

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
                          className={verseClass('verse-inline', b.id)}
                          aria-pressed={selecionadosIds.has(b.id)}
                          aria-label={verseAria(b)}
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
                    className={verseClass('verse', b.id)}
                    aria-pressed={selecionadosIds.has(b.id)}
                    aria-label={verseAria(b)}
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
              {draftRef && (
                <p className="note-ref-row">
                  <span className="note-ref-chip">{verseRefLabel(p.abbrev, draftRef)}</span>
                  <button type="button" className="linkish" onClick={() => setDraftRef(null)}>
                    Remover vínculo
                  </button>
                </p>
              )}
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={4}
                placeholder="Escreva pensamentos, orações, aplicações…"
              />
              <div className="note-form-actions">
                <button type="submit">{editingId ? 'Salvar alterações' : 'Salvar anotação'}</button>
                {editingId && (
                  <button type="button" className="linkish" onClick={cancelarEdicao}>
                    Cancelar
                  </button>
                )}
              </div>
            </form>
            <ul className="note-list">
              {notes.map((n) => (
                <li key={n.id}>
                  {n.verseRef && (
                    <Link
                      className="note-ref-chip"
                      to={`/leitura/${ordem}?v=${parseVerseRef(n.verseRef)?.start ?? ''}`}
                    >
                      {verseRefLabel(p.abbrev, n.verseRef)}
                    </Link>
                  )}
                  <p>{n.texto}</p>
                  <div className="note-item-actions">
                    {confirmarId === n.id ? (
                      <>
                        <span className="muted">Apagar mesmo?</span>
                        <button
                          type="button"
                          className="linkish"
                          onClick={() => void apagarNota(n.id)}
                        >
                          Sim
                        </button>
                        <button
                          type="button"
                          className="linkish"
                          onClick={() => setConfirmarId(null)}
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" className="linkish" onClick={() => editarNota(n)}>
                          Editar
                        </button>
                        <button
                          type="button"
                          className="linkish"
                          onClick={() => setConfirmarId(n.id)}
                        >
                          Apagar
                        </button>
                      </>
                    )}
                  </div>
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

      {barOpen && selecionados.length > 0 && (
        <VerseActions
          label={rangeLabel(p, selecionados)}
          temDestaque={selecionados.some((v) => destaques.has(v.id))}
          aviso={aviso}
          onCopiar={() => void copiarSelecao()}
          onCompartilhar={() => void compartilharSelecao()}
          onDestacar={(cor) => void destacarSelecao(cor)}
          onRemoverDestaque={() => void removerDestaqueSelecao()}
          onAnotar={anotarSelecao}
          onFechar={fecharBarra}
        />
      )}
    </article>
  )
}
