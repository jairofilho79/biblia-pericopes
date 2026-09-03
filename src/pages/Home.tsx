import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { SkeletonHome } from '../components/Skeleton'
import { loadIndex, ordensDoTestamento, refLabel } from '../lib/content'
import { atualizarJornada, getJornadaAtiva, listAllPosicoes, listAllProgresso } from '../lib/user-db'
import { cursorDaJornada, progressoDaJornada, rotaDaJornada, type ProgressoJornada } from '../lib/jornadas'
import { testamentLabel, type Testament } from '../lib/testament'
import type { Jornada, PericopeIndex, PosicaoLeitura, Progresso } from '../lib/types'
import { computeStreak, diasComConclusao, type Streak } from '../lib/streak'
import { useSyncRefresh } from '../lib/use-sync-refresh'
import { authClient } from '../lib/auth-client'

type Track = {
  testament: Testament
  peri: PericopeIndex
  prog: ProgressoJornada
}

type Estado =
  | {
      tipo: 'jornada'
      jornada: Jornada
      prog: ProgressoJornada
      cursor: number | null
      peri: PericopeIndex | undefined
    }
  | { tipo: 'trilhas'; tracks: Track[] }

/**
 * Jornada sintética por testamento: nunca gravada, existe só para que
 * rotaDaJornada/progressoDaJornada/cursorDaJornada (Task 2) calculem a
 * trilha VT/NT com EXATAMENTE a mesma regra de uma jornada de verdade. Duas
 * implementações separadas do "onde estou / o que falta" é o jeito garantido
 * de os dois estados da Home um dia divergirem.
 */
function jornadaDoTestamento(testament: Testament, inicioOrdem: number): Jornada {
  return {
    id: '',
    nome: '',
    tipo: 'sequencia',
    escopo: testament,
    inicioOrdem,
    contaDesde: null,
    criadoEm: '',
    atualizadoEm: '',
    arquivadaEm: null,
    concluidaEm: null,
  }
}

/**
 * A lógica das trilhas de hoje, extraída para função pura sobre os `Map`s já
 * carregados — nada aqui consulta o IndexedDB, então o mesmo cálculo serve
 * tanto para montar a tela quanto (mais tarde) para testar sem fake IDB.
 */
function montarTrilhas(
  all: PericopeIndex[],
  progressos: Map<number, Progresso>,
  posicoes: Map<number, PosicaoLeitura>,
): Track[] {
  const tracks: Track[] = []
  for (const testament of ['vt', 'nt'] as Testament[]) {
    const ordens = ordensDoTestamento(all, testament)
    if (ordens.length === 0) continue
    const sintetica = jornadaDoTestamento(testament, ordens[0])
    const rota = rotaDaJornada(sintetica, all)
    const prog = progressoDaJornada(rota, progressos, null)
    const cursor = cursorDaJornada(rota, progressos, posicoes, null)
    // Trilha inteira concluída: cursorDaJornada devolve null (não há "próxima
    // ordem" a apontar), então o botão "Rever" cai na última perícope da
    // rota — o mesmo destino que a heurística antiga (getProximaOrdemNaSequencia
    // com tudo feito devolvia a última ordem da sequência).
    const ordem = cursor ?? rota[rota.length - 1]
    const peri = all.find((p) => p.ordem === ordem)
    if (!peri) continue
    tracks.push({ testament, peri, prog })
  }
  return tracks
}

export default function Home() {
  const [estado, setEstado] = useState<Estado | null>(null)
  const [err, setErr] = useState('')
  const [streak, setStreak] = useState<Streak>({ atual: 0, recorde: 0 })
  const { data: session } = authClient.useSession()

  // Uma função só para as duas entradas: a montagem e o aviso de sync. O
  // streak sai daqui junto do resto porque as duas coisas leem o mesmo
  // progresso — separar faria a tela mostrar dois instantes diferentes.
  const carregar = useCallback(async () => {
    try {
      const all = await loadIndex()
      // UMA varredura do progresso e das posições, viradas em Map: a Home
      // antiga chamava doneSet() dentro do laço dos testamentos (quatro
      // varreduras completas por render). O mesmo vale para as posições.
      const progressos = new Map((await listAllProgresso()).map((p) => [p.pericopeOrdem, p]))
      const posicoes = new Map((await listAllPosicoes()).map((p) => [p.pericopeOrdem, p]))

      const ativa = await getJornadaAtiva()
      if (ativa) {
        const rota = rotaDaJornada(ativa, all)
        const prog = progressoDaJornada(rota, progressos, ativa.contaDesde)
        // Reconciliação nos DOIS sentidos: a jornada fecha quando a rota
        // acaba, e REABRE se uma perícope da rota for desmarcada depois —
        // caso real quando outra frente do app desfaz uma conclusão de uma
        // jornada já terminada.
        if (prog.proximaOrdem === null && ativa.concluidaEm === null) {
          await atualizarJornada(ativa.id, { concluidaEm: new Date().toISOString() })
        } else if (prog.proximaOrdem !== null && ativa.concluidaEm !== null) {
          await atualizarJornada(ativa.id, { concluidaEm: null })
        }
        const cursor = cursorDaJornada(rota, progressos, posicoes, ativa.contaDesde)
        setEstado({
          tipo: 'jornada',
          jornada: ativa,
          prog,
          cursor,
          peri: cursor === null ? undefined : all.find((p) => p.ordem === cursor),
        })
      } else {
        setEstado({ tipo: 'trilhas', tracks: montarTrilhas(all, progressos, posicoes) })
      }
      // Deriva do progresso que já sincroniza entre aparelhos — nenhuma
      // entidade nova, e o streak segue o usuário para o celular novo.
      setStreak(computeStreak(diasComConclusao([...progressos.values()]), new Date()))
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro')
    }
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])
  useSyncRefresh(() => void carregar())

  if (err) return <p className="muted">{err}</p>
  if (!estado) return <SkeletonHome />

  return (
    <section className="home">
      {estado.tipo === 'jornada' ? (
        <>
          <p className="eyebrow">Estudo de hoje</p>
          <h1>Continue de onde parou</h1>
          {streak.atual > 0 && (
            <p className="streak">
              <span aria-hidden>🔥</span>{' '}
              <strong>
                {streak.atual === 1 ? '1 dia seguido' : `${streak.atual} dias seguidos`}
              </strong>
              {streak.recorde > streak.atual && (
                <span className="streak-recorde"> · recorde: {streak.recorde}</span>
              )}
            </p>
          )}
          <article className="jornada-card">
            <p className="track-label">Sua jornada</p>
            <h2>{estado.jornada.nome}</h2>
            <p className="track-progress">
              {estado.prog.concluidas} de {estado.prog.total}
              {estado.prog.proximaOrdem === null ? ' · concluída' : ''}
            </p>
            {/* a barra é decoração: quem lê com leitor de tela recebe o "N de M" no parágrafo acima */}
            <span className="book-progress" aria-hidden>
              <span className="book-progress-fill" style={{ width: `${estado.prog.pct}%` }} />
            </span>
            {estado.peri ? (
              <>
                <p className="ref">
                  {refLabel(estado.peri)} · ~{estado.peri.minutos} min
                </p>
                <Link className="cta" to={`/leitura/${estado.peri.ordem}`}>
                  Continuar
                </Link>
              </>
            ) : (
              <Link className="cta" to="/jornada">
                Ver jornada
              </Link>
            )}
          </article>
        </>
      ) : (
        <>
          <p className="eyebrow">Estudo de hoje</p>
          <h1>Duas leituras em paralelo</h1>
          <p className="lead">
            Velho e Novo Testamento avançam cada um no seu ritmo. Escolha por onde continuar.
          </p>
          {streak.atual > 0 && (
            <p className="streak">
              <span aria-hidden>🔥</span>{' '}
              <strong>
                {streak.atual === 1 ? '1 dia seguido' : `${streak.atual} dias seguidos`}
              </strong>
              {streak.recorde > streak.atual && (
                <span className="streak-recorde"> · recorde: {streak.recorde}</span>
              )}
            </p>
          )}
          <div className="track-grid">
            {estado.tracks.map((t) => (
              <article key={t.testament} className="track-card">
                <p className="track-label">{testamentLabel(t.testament)}</p>
                <h2>{t.peri.titulo_pericope_pt}</h2>
                <p className="ref">
                  {refLabel(t.peri)} · ~{t.peri.minutos} min
                </p>
                <p className="track-progress">
                  {t.prog.concluidas} de {t.prog.total}
                  {t.prog.proximaOrdem === null ? ' · concluído' : ''}
                </p>
                <Link className="cta" to={`/leitura/${t.peri.ordem}`}>
                  {t.prog.proximaOrdem === null ? 'Rever' : 'Continuar'}
                </Link>
              </article>
            ))}
          </div>
          <p className="jornada-convite">
            {session ? (
              <Link className="ghost" to="/jornada">
                Comece uma jornada
              </Link>
            ) : (
              <Link className="ghost" to="/entrar">
                Entre para criar jornadas
              </Link>
            )}
          </p>
        </>
      )}
      {/* A fase de releitura/esquecimento monta aqui o bloco "Vale reler" (top 3
          + "ver todas"), oculto quando vazio. Abaixo e não acima porque a Home
          responde primeiro "para onde eu vou agora" — releitura é oferta, não
          instrução. Combinado com a sessão biblia-pericopes-a4 em 2026-09-03. */}
    </section>
  )
}
