import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPericope, loadPericopes, ordensDoTestamento, refLabel } from '../lib/content'
import { countConcluidasNaSequencia, getProximaOrdemNaSequencia } from '../lib/user-db'
import { testamentLabel, type Testament } from '../lib/testament'
import type { Pericope } from '../lib/types'

type Track = {
  testament: Testament
  peri: Pericope
  done: number
  total: number
  allDone: boolean
}

export default function Home() {
  const [tracks, setTracks] = useState<Track[]>([])
  const [err, setErr] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        const all = await loadPericopes()
        const built: Track[] = []
        for (const testament of ['vt', 'nt'] as Testament[]) {
          const ordens = ordensDoTestamento(all, testament)
          const ordem = await getProximaOrdemNaSequencia(ordens)
          const peri = await getPericope(ordem)
          if (!peri) continue
          const done = await countConcluidasNaSequencia(ordens)
          built.push({
            testament,
            peri,
            done,
            total: ordens.length,
            allDone: done >= ordens.length,
          })
        }
        setTracks(built)
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Erro')
      }
    })()
  }, [])

  if (err) return <p className="muted">{err}</p>
  if (!tracks.length) return <p className="muted">Carregando…</p>

  return (
    <section className="home">
      <p className="eyebrow">Estudo de hoje</p>
      <h1>Duas leituras em paralelo</h1>
      <p className="lead">
        Velho e Novo Testamento avançam cada um no seu ritmo. Escolha por onde continuar.
      </p>
      <div className="track-grid">
        {tracks.map((t) => (
          <article key={t.testament} className="track-card">
            <p className="track-label">{testamentLabel(t.testament)}</p>
            <h2>{t.peri.titulo_pericope_pt}</h2>
            <p className="ref">{refLabel(t.peri)}</p>
            <p className="track-progress">
              {t.done} de {t.total}
              {t.allDone ? ' · concluído' : ''}
            </p>
            <Link className="cta" to={`/leitura/${t.peri.ordem}`}>
              {t.allDone ? 'Rever' : 'Continuar'}
            </Link>
          </article>
        ))}
      </div>
    </section>
  )
}
