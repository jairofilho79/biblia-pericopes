import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { SkeletonHome } from '../components/Skeleton'
import { loadIndex, ordensDoTestamento, refLabel } from '../lib/content'
import {
  countConcluidasNaSequencia,
  getProximaOrdemNaSequencia,
  listAllProgresso,
} from '../lib/user-db'
import { testamentLabel, type Testament } from '../lib/testament'
import type { PericopeIndex } from '../lib/types'
import { computeStreak, diasComConclusao, type Streak } from '../lib/streak'
import { useSyncRefresh } from '../lib/use-sync-refresh'

type Track = {
  testament: Testament
  peri: PericopeIndex
  done: number
  total: number
  allDone: boolean
  minutos: number
}

export default function Home() {
  const [tracks, setTracks] = useState<Track[]>([])
  const [err, setErr] = useState('')
  const [streak, setStreak] = useState<Streak>({ atual: 0, recorde: 0 })

  // Uma função só para as duas entradas: a montagem e o aviso de sync. O
  // streak sai daqui junto das trilhas porque as duas coisas leem o mesmo
  // progresso — separar faria a tela mostrar dois instantes diferentes.
  const carregar = useCallback(async () => {
    try {
      const all = await loadIndex()
      const built: Track[] = []
      for (const testament of ['vt', 'nt'] as Testament[]) {
        const ordens = ordensDoTestamento(all, testament)
        const ordem = await getProximaOrdemNaSequencia(ordens)
        // Não usar getPericope aqui: puxar a perícope inteira baixaria os
        // dois shards do livro (~1,1 MB) só para escrever um título e uma
        // referência que já estão no índice.
        const peri = all.find((p) => p.ordem === ordem)
        if (!peri) continue
        const done = await countConcluidasNaSequencia(ordens)
        built.push({
          testament,
          peri,
          done,
          total: ordens.length,
          allDone: done >= ordens.length,
          minutos: peri.minutos,
        })
      }
      setTracks(built)
      // Deriva do progresso que já sincroniza entre aparelhos — nenhuma
      // entidade nova, e o streak segue o usuário para o celular novo.
      setStreak(computeStreak(diasComConclusao(await listAllProgresso()), new Date()))
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro')
    }
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])
  useSyncRefresh(() => void carregar())

  if (err) return <p className="muted">{err}</p>
  if (!tracks.length) return <SkeletonHome />

  return (
    <section className="home">
      <p className="eyebrow">Estudo de hoje</p>
      <h1>Duas leituras em paralelo</h1>
      <p className="lead">
        Velho e Novo Testamento avançam cada um no seu ritmo. Escolha por onde continuar.
      </p>
      {streak.atual > 0 && (
        <p className="streak">
          <span aria-hidden>🔥</span>{' '}
          <strong>{streak.atual === 1 ? '1 dia seguido' : `${streak.atual} dias seguidos`}</strong>
          {streak.recorde > streak.atual && (
            <span className="streak-recorde"> · recorde: {streak.recorde}</span>
          )}
        </p>
      )}
      <div className="track-grid">
        {tracks.map((t) => (
          <article key={t.testament} className="track-card">
            <p className="track-label">{testamentLabel(t.testament)}</p>
            <h2>{t.peri.titulo_pericope_pt}</h2>
            <p className="ref">
              {refLabel(t.peri)} · ~{t.minutos} min
            </p>
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
