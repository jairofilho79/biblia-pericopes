import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { SkeletonHome } from '../components/Skeleton'
import { loadIndex, ordensDoTestamento, refLabel } from '../lib/content'
import {
  countConcluidasNaSequencia,
  doneSet,
  getPosicaoMaisRecente,
  getProximaOrdemNaSequencia,
  listAllProgresso,
} from '../lib/user-db'
import { candidatosReler, type CandidatoReler } from '../lib/releitura'
import { testamentLabel, type Testament } from '../lib/testament'
import type { PericopeIndex } from '../lib/types'
import { streakAtual, type Streak } from '../lib/streak'
import { useSyncRefresh } from '../lib/use-sync-refresh'

type Track = {
  testament: Testament
  peri: PericopeIndex
  done: number
  total: number
  allDone: boolean
  minutos: number
}

// CandidatoReler não traz título nem referência — só o índice tem isso.
type ItemReler = CandidatoReler & { titulo: string; ref: string }

export default function Home() {
  const [tracks, setTracks] = useState<Track[]>([])
  const [err, setErr] = useState('')
  const [streak, setStreak] = useState<Streak>({ atual: 0, recorde: 0 })
  const [candidatos, setCandidatos] = useState<ItemReler[]>([])
  const [todos, setTodos] = useState(false)

  // Uma função só para as duas entradas: a montagem e o aviso de sync. O
  // streak sai daqui junto das trilhas porque as duas coisas leem o mesmo
  // progresso — separar faria a tela mostrar dois instantes diferentes.
  const carregar = useCallback(async () => {
    try {
      const all = await loadIndex()
      const built: Track[] = []
      const concluidas = await doneSet()
      for (const testament of ['vt', 'nt'] as Testament[]) {
        const ordens = ordensDoTestamento(all, testament)
        // "Continuar" prefere onde a pessoa PAROU DE LER (o checkpoint mais
        // recente da trilha) à heurística da primeira não concluída — é o que
        // retoma uma perícope longa deixada no meio. Concluída não conta:
        // o rótulo diz "continuar", não "reler".
        const posicao = await getPosicaoMaisRecente(ordens)
        const ordem =
          posicao && !concluidas.has(posicao.pericopeOrdem)
            ? posicao.pericopeOrdem
            : await getProximaOrdemNaSequencia(ordens)
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
      setStreak(await streakAtual())
      const porOrdem = new Map(all.map((p) => [p.ordem, p]))
      setCandidatos(
        candidatosReler(await listAllProgresso(), new Date()).flatMap((c) => {
          const meta = porOrdem.get(c.ordem)
          // Perícope que saiu do catálogo não vira linha órfã na Home.
          return meta ? [{ ...c, titulo: meta.titulo_pericope_pt, ref: refLabel(meta) }] : []
        }),
      )
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
      {candidatos.length > 0 && (
        <section className="vale-reler">
          <h2>Vale reler</h2>
          <ul>
            {(todos ? candidatos : candidatos.slice(0, 3)).map((c) => (
              <li key={c.ordem}>
                <Link to={`/leitura/${c.ordem}`}>
                  <span aria-hidden>{c.paraReler ? '★' : '●'}</span>
                  <span className="vale-reler-texto">
                    <strong>{c.titulo}</strong>
                    <span>
                      {c.ref} · {c.vezes === 1 ? 'lida 1×' : `lida ${c.vezes}×`}
                      {c.paraReler ? ' · marcada' : ` · há ${Math.floor(c.dias / 30)} meses`}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {!todos && candidatos.length > 3 && (
            <button type="button" className="linkish" onClick={() => setTodos(true)}>
              ver todas ({candidatos.length})
            </button>
          )}
        </section>
      )}
    </section>
  )
}
