import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getPericope, loadPericopes, proximaNoTestamento, refLabel } from '../lib/content'
import {
  deleteAnotacao,
  getProgresso,
  listAnotacoes,
  saveAnotacao,
  setProgresso,
} from '../lib/user-db'
import { testamentLabel, testamentOf } from '../lib/testament'
import type { Anotacao, Pericope, ProgressoStatus } from '../lib/types'

export default function Leitura() {
  const { ordem: ordemParam } = useParams()
  const ordem = Number(ordemParam)
  const [p, setP] = useState<Pericope | null>(null)
  const [nextOrdem, setNextOrdem] = useState<number | null>(null)
  const [status, setStatus] = useState<ProgressoStatus>('nao_iniciado')
  const [notes, setNotes] = useState<Anotacao[]>([])
  const [draft, setDraft] = useState('')
  const [err, setErr] = useState('')

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
    setStatus('concluido')
  }

  if (err) return <p className="muted">{err}</p>
  if (!p) return <p className="muted">Carregando…</p>

  return (
    <article className="leitura">
      <p className="crumb">
        <Link to="/">Hoje</Link> · {testamentLabel(testamentOf(p))} ·{' '}
        <Link to="/indice">{p.livro}</Link>
      </p>
      <h1>{p.titulo_pericope_pt}</h1>
      <p className="ref">{refLabel(p)}</p>

      <section className="block">
        <h2>Contexto</h2>
        <p className="prose">{p.contexto_historico_literario}</p>
      </section>

      <section className="block">
        <h2>Texto (NAA)</h2>
        <pre className="texto-biblico">{p.texto_naa}</pre>
      </section>

      <section className="block">
        <h2>Resenha</h2>
        {p.resenha.split('\n\n').map((para, i) => (
          <p key={i} className="prose">
            {para}
          </p>
        ))}
      </section>

      <section className="block">
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
