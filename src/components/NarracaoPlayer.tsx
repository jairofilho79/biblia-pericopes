import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { alinhar, type SecaoAlvos } from '../lib/alinhar-narracao'
import { carregarManifesto, type Manifesto } from '../lib/manifesto'
import { indiceDaPalavra, indiceEm } from '../lib/narracao-timeline'

type Props = {
  ordem: number
  /** Alvos renderizados, na ordem de leitura. Memoize na Leitura. */
  secoes: SecaoAlvos[]
  /** Chamado só quando o alvo em fala muda. DEVE ser uma referência estável. */
  onAlvo: (id: string | null) => void
}

/**
 * Narração pré-gerada (voz clonada, servida do R2 via /api/audio). Só aparece
 * quando o áudio da perícope existe — um HEAD barato decide. O manifesto,
 * quando existe e casa com a tela, transforma o `timeupdate` em realce do
 * alvo e da palavra em fala.
 */
export default function NarracaoPlayer({ ordem, secoes, onAlvo }: Props) {
  const [src, setSrc] = useState<string | null>(null)
  const [manifesto, setManifesto] = useState<Manifesto | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Índices da última busca: o timeupdate anda para frente quase sempre.
  const iAlvo = useRef(0)
  const iPalavra = useRef(0)
  const alvoAtual = useRef<string | null>(null)
  const spanAtual = useRef<HTMLElement | null>(null)

  const alinhamento = useMemo(
    () => (manifesto ? alinhar(manifesto, secoes) : []),
    [manifesto, secoes],
  )

  useEffect(() => {
    const url = `/api/audio/nt-ml/${ordem}.m4a`
    const ac = new AbortController()
    let vivo = true
    setSrc(null)
    setManifesto(null)
    fetch(url, { method: 'HEAD', signal: ac.signal })
      .then((r) => {
        if (vivo && r.ok) setSrc(url)
      })
      .catch(() => {})
    carregarManifesto(ordem, ac.signal).then((m) => {
      if (vivo) setManifesto(m)
    })
    return () => {
      vivo = false
      ac.abort()
    }
  }, [ordem])

  const limparPalavra = useCallback(() => {
    spanAtual.current?.classList.remove('word-speaking')
    spanAtual.current = null
  }, [])

  const trocarAlvo = useCallback(
    (id: string | null) => {
      if (id === alvoAtual.current) return
      alvoAtual.current = id
      iPalavra.current = 0
      limparPalavra()
      onAlvo(id)
    },
    [limparPalavra, onAlvo],
  )

  // Sair da perícope (ou perder o alinhamento) devolve a tela ao normal.
  useEffect(() => {
    return () => {
      limparPalavra()
      alvoAtual.current = null
      onAlvo(null)
    }
  }, [ordem, limparPalavra, onAlvo])

  function aoTempo() {
    const a = audioRef.current
    if (!a || !alinhamento.length) return
    const t = a.currentTime

    const i = indiceEm(alinhamento, t, iAlvo.current)
    if (i >= 0) iAlvo.current = i
    const alvo = i >= 0 ? alinhamento[i]! : null

    if ((alvo?.id ?? null) !== alvoAtual.current) {
      trocarAlvo(alvo?.id ?? null)
      // Os spans do alvo novo só existem depois do render — o próximo
      // timeupdate marca a palavra.
      return
    }
    if (!alvo) return

    const w = indiceDaPalavra(alvo, t, iPalavra.current)
    if (w < 0) return
    // Sai antes de tocar no DOM quando a palavra não mudou: o timeupdate
    // dispara ~4x/s e a palavra troca ~2,5x/s, então boa parte dos ticks não
    // tem nada a fazer. `spanAtual` cobre o caso de o span ainda não existir.
    if (w === iPalavra.current && spanAtual.current) return
    iPalavra.current = w
    const el = document.querySelector<HTMLElement>(`[data-verse-id="${alvo.id}"] [data-w="${w}"]`)
    if (!el || el === spanAtual.current) return
    limparPalavra()
    el.classList.add('word-speaking')
    spanAtual.current = el
  }

  if (!src) return null
  return (
    <div className="narracao">
      <span className="narracao-rotulo">🎙️ Narração</span>
      <audio
        ref={audioRef}
        controls
        preload="metadata"
        src={src}
        aria-label="Narração da perícope"
        onTimeUpdate={aoTempo}
        onSeeked={aoTempo}
        onEnded={() => {
          limparPalavra()
          trocarAlvo(null)
        }}
      />
    </div>
  )
}
