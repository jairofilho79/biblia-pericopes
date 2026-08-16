import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { getPericope, loadPericopes, proximaNoTestamento, refLabel } from '../lib/content'
import { paragraphize } from '../lib/paragraphize'
import { parseTextoNaa } from '../lib/parse-texto'
import {
  bumpReadingSize,
  FONT_OPTIONS,
  getReadingPrefs,
  setReadingFont,
  type ReadingFont,
  type ReadingPrefs,
} from '../lib/reading-prefs'
import {
  deleteAnotacao,
  getProgresso,
  listAnotacoes,
  saveAnotacao,
  setProgresso,
} from '../lib/user-db'
import { getVerseFocus, setVerseFocus } from '../lib/verse-highlight'
import { testamentLabel, testamentOf } from '../lib/testament'
import type { Anotacao, Pericope, ProgressoStatus } from '../lib/types'

export default function Leitura() {
  const { ordem: ordemParam } = useParams()
  const [searchParams] = useSearchParams()
  const ordem = Number(ordemParam)
  const verseParam = searchParams.get('v')
  const [p, setP] = useState<Pericope | null>(null)
  const [nextOrdem, setNextOrdem] = useState<number | null>(null)
  const [status, setStatus] = useState<ProgressoStatus>('nao_iniciado')
  const [notes, setNotes] = useState<Anotacao[]>([])
  const [draft, setDraft] = useState('')
  const [err, setErr] = useState('')
  const [prefs, setPrefs] = useState<ReadingPrefs>(() => getReadingPrefs())
  const [focusId, setFocusId] = useState<string | null>(null)

  async function refreshNotes() {
    setNotes(await listAnotacoes(ordem))
  }

  useEffect(() => {
    ;(async () => {
      try {
        const all = await loadPericopes()
        const peri = await getPericope(ordem)
        if (!peri) {
          setErr('Perícope não encontrada')
          return
        }
        setP(peri)
        setNextOrdem(proximaNoTestamento(all, ordem))
        const fromQuery =
          verseParam && /^\d+:\d+$/.test(verseParam) ? verseParam : null
        const focus = fromQuery ?? getVerseFocus(ordem)
        setFocusId(focus)
        if (fromQuery) setVerseFocus(ordem, fromQuery)
        const prog = await getProgresso(ordem)
        const next = prog?.status ?? 'em_andamento'
        setStatus(next === 'nao_iniciado' ? 'em_andamento' : next)
        if (!prog || prog.status === 'nao_iniciado') {
          await setProgresso(ordem, 'em_andamento')
        }
        await refreshNotes()
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Erro')
      }
    })()
  }, [ordem, verseParam])

  useEffect(() => {
    if (!focusId || !p) return
    const el = document.querySelector(`.verse.verse-focus`)
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [focusId, p])

  async function onSaveNote(e: FormEvent) {
    e.preventDefault()
    if (!draft.trim()) return
    await saveAnotacao(ordem, draft.trim())
    setDraft('')
    await refreshNotes()
  }

  async function markDone() {
    await setProgresso(ordem, 'concluido')
    setStatus('concluido')
  }

  function selectVerse(id: string) {
    const next = focusId === id ? null : id
    setFocusId(next)
    setVerseFocus(ordem, next)
  }

  function onSize(delta: number) {
    setPrefs(bumpReadingSize(delta))
  }

  function onFont(font: ReadingFont) {
    setPrefs(setReadingFont(font))
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
      <p className="ref">{refLabel(p)}</p>

      <div className="read-toolbar" role="toolbar" aria-label="Preferências de leitura">
        <div className="read-size" aria-label="Tamanho do texto">
          <button type="button" className="read-tool" onClick={() => onSize(-1)} aria-label="Diminuir texto">
            A−
          </button>
          <span className="read-size-label" aria-hidden>
            A
          </span>
          <button type="button" className="read-tool" onClick={() => onSize(1)} aria-label="Aumentar texto">
            A+
          </button>
        </div>
        <div className="read-fonts" role="group" aria-label="Fonte">
          {FONT_OPTIONS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`read-tool${prefs.font === f.id ? ' active' : ''}`}
              aria-pressed={prefs.font === f.id}
              onClick={() => onFont(f.id)}
            >
              {f.label}
            </button>
          ))}
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
          {blocks.map((b) =>
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
        <h2>Suas anotações</h2>
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
        <div className="actions">
          {status !== 'concluido' ? (
            <button type="button" className="cta" onClick={markDone}>
              Marcar como concluída
            </button>
          ) : (
            <p className="badge">Concluída</p>
          )}
          {nextOrdem != null && (
            <Link className="ghost" to={`/leitura/${nextOrdem}`}>
              Próxima →
            </Link>
          )}
        </div>
      </section>
    </article>
  )
}
