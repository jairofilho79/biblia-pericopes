import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadIndex } from '../lib/content'
import { atualizarJornada, getJornadaCorrente, listAllProgresso, listJornadas } from '../lib/user-db'
import {
  historicoDeJornadas,
  patchEncerrarJornada,
  patchReiniciarJornada,
  progressoDaJornada,
  rotaDaJornada,
  type ProgressoJornada,
} from '../lib/jornadas'
import type { Jornada as JornadaType } from '../lib/types'
import { useSyncRefresh } from '../lib/use-sync-refresh'
import { authClient } from '../lib/auth-client'

type ItemHistorico = { jornada: JornadaType; prog: ProgressoJornada }

type Estado = {
  corrente: JornadaType | null
  progCorrente: ProgressoJornada | null
  historico: ItemHistorico[]
}

/** Qual das duas ações pede confirmação inline agora — nunca as duas ao mesmo tempo. */
type Confirmando = 'reiniciar' | 'encerrar' | null

export default function Jornada() {
  const { data: session } = authClient.useSession()
  const [estado, setEstado] = useState<Estado | null>(null)
  const [erro, setErro] = useState('')
  const [confirmando, setConfirmando] = useState<Confirmando>(null)
  const [aplicando, setAplicando] = useState(false)
  // Só um placeholder até a Task 8 trazer o catálogo de escopos de verdade —
  // aqui o "link para o passo 1" vira um estado local que troca o botão por
  // um aviso, sem prometer nada que a tela ainda não faz.
  const [criando, setCriando] = useState(false)

  const carregar = useCallback(async () => {
    try {
      const all = await loadIndex()
      // Uma varredura só do progresso: tanto a jornada corrente quanto cada
      // item do histórico calculam o progresso final sobre o mesmo Map —
      // mesma economia que Home.tsx já faz.
      const progressos = new Map((await listAllProgresso()).map((p) => [p.pericopeOrdem, p]))
      const [corrente, todas] = await Promise.all([getJornadaCorrente(), listJornadas()])
      const progCorrente = corrente
        ? progressoDaJornada(rotaDaJornada(corrente, all), progressos, corrente.contaDesde)
        : null
      const historico = historicoDeJornadas(todas).map((j) => ({
        jornada: j,
        prog: progressoDaJornada(rotaDaJornada(j, all), progressos, j.contaDesde),
      }))
      setEstado({ corrente: corrente ?? null, progCorrente, historico })
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro')
    }
  }, [])

  useEffect(() => {
    if (session) void carregar()
  }, [session, carregar])
  // Uma jornada criada ou mudada em outro aparelho precisa aparecer aqui sem
  // que o leitor precise navegar para fora e voltar (mesmo padrão de Home e
  // Índice).
  useSyncRefresh(() => {
    if (session) void carregar()
  })

  async function aplicar(patch: Partial<Pick<JornadaType, 'contaDesde' | 'concluidaEm' | 'arquivadaEm'>>) {
    if (!estado?.corrente || aplicando) return
    setAplicando(true)
    try {
      await atualizarJornada(estado.corrente.id, patch)
      setConfirmando(null)
      await carregar()
    } finally {
      setAplicando(false)
    }
  }

  if (!session) {
    return (
      <section className="jornada">
        <h1>Jornada</h1>
        <p className="lead">
          <Link to="/entrar">Entre</Link> para criar e acompanhar suas jornadas de leitura.
        </p>
      </section>
    )
  }

  if (erro) return <p className="muted">{erro}</p>
  if (!estado) return <p className="muted">Carregando…</p>

  return (
    <section className="jornada">
      <h1>Jornada</h1>

      {estado.corrente && estado.progCorrente ? (
        <article className="jornada-card">
          <h2>{estado.corrente.nome}</h2>
          <p className="track-progress">
            {estado.progCorrente.concluidas} de {estado.progCorrente.total}
            {estado.progCorrente.proximaOrdem === null ? ' · concluída' : ''}
          </p>
          {/* a barra é decoração: quem lê com leitor de tela recebe o "N de M" no parágrafo acima */}
          <span className="book-progress" aria-hidden>
            <span className="book-progress-fill" style={{ width: `${estado.progCorrente.pct}%` }} />
          </span>
          {confirmando ? (
            <p className="jornada-confirmar">
              <span className="muted">
                {confirmando === 'reiniciar'
                  ? 'Reiniciar esta jornada do zero?'
                  : 'Encerrar esta jornada?'}
              </span>
              <button
                type="button"
                className="linkish"
                disabled={aplicando}
                onClick={() =>
                  void aplicar(
                    confirmando === 'reiniciar' ? patchReiniciarJornada() : patchEncerrarJornada(),
                  )
                }
              >
                Sim
              </button>
              <button type="button" className="linkish" onClick={() => setConfirmando(null)}>
                Cancelar
              </button>
            </p>
          ) : (
            <p className="jornada-acoes">
              <button type="button" className="ghost" onClick={() => setConfirmando('reiniciar')}>
                Reiniciar
              </button>
              <button type="button" className="ghost" onClick={() => setConfirmando('encerrar')}>
                Encerrar
              </button>
            </p>
          )}
        </article>
      ) : (
        <>
          <p className="muted">Nenhuma jornada ainda.</p>
          <p className="jornada-convite">
            {criando ? (
              <span className="muted">O catálogo de escopos chega na próxima etapa.</span>
            ) : (
              <button type="button" className="ghost" onClick={() => setCriando(true)}>
                Comece uma jornada
              </button>
            )}
          </p>
        </>
      )}

      {estado.historico.length > 0 && (
        <>
          <h2 className="jornada-historico-titulo">Anteriores</h2>
          <ul className="jornada-historico">
            {estado.historico.map(({ jornada, prog }) => (
              <li key={jornada.id}>
                <span className="jornada-historico-nome">{jornada.nome}</span>
                <span className="track-progress">
                  {prog.concluidas} de {prog.total}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
