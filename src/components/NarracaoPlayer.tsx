import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type Ref,
} from 'react'
import { alinhar, type SecaoAlvos } from '../lib/alinhar-narracao'
import { carregarManifesto, type Manifesto } from '../lib/manifesto'
import {
  type SecaoNarrada,
  formatarTempo,
  gravarVelocidade,
  inicioDaSecao,
  lerVelocidade,
  proximaVelocidade,
  rotuloVelocidade,
} from '../lib/narracao-controles'
import { indiceDaPalavra, indiceEm } from '../lib/narracao-timeline'

export type NarracaoPlayerHandle = {
  /**
   * Reposiciona o áudio no cabeçalho falado da seção ("Contexto.", "Texto
   * Bíblico.", …). Tocando, continua tocando de lá; pausado, só reposiciona.
   * Sem áudio ou sem manifesto, não faz nada.
   */
  irParaSecao: (secao: SecaoNarrada) => void
}

type Props = {
  ordem: number
  /** Alvos renderizados, na ordem de leitura. Memoize na Leitura. */
  secoes: SecaoAlvos[]
  /** Chamado só quando o alvo em fala muda. DEVE ser uma referência estável. */
  onAlvo: (id: string | null) => void
  /** Avisa que o usuário reposicionou o áudio. DEVE ser referência estável. */
  onSeek?: () => void
  ref?: Ref<NarracaoPlayerHandle>
}

/** Salto dos botões e das setas: curto o bastante para reouvir um versículo. */
const SALTO = 10

/**
 * Narração pré-gerada (voz clonada, servida do R2 via /api/audio). Só aparece
 * quando o áudio da perícope existe — um HEAD barato decide. O manifesto,
 * quando existe e casa com a tela, transforma o `timeupdate` em realce do
 * alvo e da palavra em fala.
 *
 * O `<audio>` fica sem `controls`: a UI é do app, para caber no tema e para
 * os chips de seção poderem mandar o áudio para o cabeçalho de cada uma.
 */
export default function NarracaoPlayer({ ordem, secoes, onAlvo, onSeek, ref }: Props) {
  const [src, setSrc] = useState<string | null>(null)
  const [manifesto, setManifesto] = useState<Manifesto | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  const [tocando, setTocando] = useState(false)
  const [tempo, setTempo] = useState(0)
  const [duracao, setDuracao] = useState(Number.NaN)
  const [velocidade, setVelocidade] = useState(() => lerVelocidade())
  const [erro, setErro] = useState(false)

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
    setTocando(false)
    setTempo(0)
    setDuracao(Number.NaN)
    setErro(false)
    // Serializado: cobertura de narração é parcial, então buscar o manifesto
    // incondicionalmente seria um GET garantidamente 404 em quase toda
    // perícope aberta. Só vale a pena depois de o HEAD confirmar o áudio.
    fetch(url, { method: 'HEAD', signal: ac.signal })
      .then((r) => {
        if (!vivo || !r.ok) return
        setSrc(url)
        return carregarManifesto(ordem, ac.signal).then((m) => {
          if (vivo) setManifesto(m)
        })
      })
      .catch(() => {})
    return () => {
      vivo = false
      ac.abort()
    }
  }, [ordem])

  // A velocidade é do elemento, e o elemento nasce de novo a cada perícope
  // (`src` volta a null no meio): reaplicar quando qualquer um dos dois muda.
  useEffect(() => {
    const a = audioRef.current
    if (a) a.playbackRate = velocidade
  }, [velocidade, src])

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

  function alternar() {
    const a = audioRef.current
    if (!a) return
    // `play()` rejeita quando o áudio não carregou; `onError` já mostra o
    // aviso, então aqui basta não deixar a rejeição virar erro não tratado.
    if (a.paused) a.play().catch(() => {})
    else a.pause()
  }

  /** Reposiciona por `currentTime`: o `seeked` que resulta avisa a Leitura. */
  function irPara(segundos: number) {
    const a = audioRef.current
    if (!a) return
    const fim = Number.isFinite(a.duration) ? a.duration : Number.POSITIVE_INFINITY
    a.currentTime = Math.min(Math.max(0, segundos), fim)
    setTempo(a.currentTime)
  }

  function saltar(delta: number) {
    const a = audioRef.current
    if (a) irPara(a.currentTime + delta)
  }

  function mudarVelocidade() {
    const v = proximaVelocidade(velocidade)
    setVelocidade(v)
    gravarVelocidade(v)
  }

  useImperativeHandle(
    ref,
    () => ({
      irParaSecao(secao) {
        const inicio = inicioDaSecao(manifesto, secao)
        if (inicio === null || !audioRef.current) return
        irPara(inicio)
      },
    }),
    [manifesto],
  )

  // ←/→ em qualquer controle do player saltam ±10 s, o mesmo dos botões. A
  // alternativa — deixar o passo nativo do range — daria uma resposta às
  // setas com foco na barra e nenhuma com foco nos botões; um salto só, igual
  // em todo o player, é mais fácil de aprender. O `preventDefault` também é o
  // que impede o passo nativo do range de somar ao nosso. A navegação entre
  // perícopes já ignora setas vindas de `.narracao` (ver use-keyboard-nav).
  function aoTeclar(e: KeyboardEvent<HTMLDivElement>) {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    saltar(e.key === 'ArrowLeft' ? -SALTO : SALTO)
  }

  if (!src) return null

  const temDuracao = Number.isFinite(duracao) && duracao > 0
  const pct = temDuracao ? Math.min(100, (tempo / duracao) * 100) : 0
  const tempoTexto = formatarTempo(tempo)
  const duracaoTexto = formatarTempo(duracao)

  return (
    <div className="narracao" onKeyDown={aoTeclar}>
      <audio
        ref={audioRef}
        preload="metadata"
        src={src}
        hidden
        onTimeUpdate={() => {
          const a = audioRef.current
          if (a) setTempo(a.currentTime)
          aoTempo()
        }}
        onSeeked={() => {
          // A tela precisa estar liberada antes de calcular o novo alvo,
          // senão o realce salta para o lugar certo mas fora da tela.
          onSeek?.()
          aoTempo()
        }}
        onEnded={() => {
          limparPalavra()
          trocarAlvo(null)
        }}
        onPlay={() => setTocando(true)}
        onPause={() => setTocando(false)}
        onLoadedMetadata={() => {
          const a = audioRef.current
          if (!a) return
          setDuracao(a.duration)
          a.playbackRate = velocidade
        }}
        onDurationChange={() => {
          const a = audioRef.current
          if (a) setDuracao(a.duration)
        }}
        onError={() => setErro(true)}
      />

      <span className="narracao-rotulo">Narração</span>

      <div className="narracao-controles">
        <button
          type="button"
          className="narracao-btn narracao-salto"
          aria-label={`Voltar ${SALTO} segundos`}
          title={`Voltar ${SALTO} s`}
          disabled={erro}
          onClick={() => saltar(-SALTO)}
        >
          <IconeSalto direcao="tras" />
        </button>
        <button
          type="button"
          className="narracao-btn narracao-play"
          aria-label={tocando ? 'Pausar narração' : 'Tocar narração'}
          title={tocando ? 'Pausar' : 'Tocar'}
          disabled={erro}
          onClick={alternar}
        >
          {tocando ? <IconePausa /> : <IconePlay />}
        </button>
        <button
          type="button"
          className="narracao-btn narracao-salto"
          aria-label={`Avançar ${SALTO} segundos`}
          title={`Avançar ${SALTO} s`}
          disabled={erro}
          onClick={() => saltar(SALTO)}
        >
          <IconeSalto direcao="frente" />
        </button>
      </div>

      <input
        type="range"
        className="narracao-barra"
        aria-label="Posição na narração"
        aria-valuetext={`${tempoTexto} de ${duracaoTexto}`}
        min={0}
        max={temDuracao ? duracao : 0}
        // Passo fino para o arrasto; as setas não passam por ele (ver aoTeclar).
        step={0.1}
        value={temDuracao ? tempo : 0}
        disabled={!temDuracao || erro}
        style={{ '--pct': `${pct}%` } as CSSProperties}
        onInput={(e) => irPara(Number(e.currentTarget.value))}
      />

      <span className="narracao-tempo" aria-hidden>
        <span>{tempoTexto}</span>
        <span className="narracao-tempo-sep">/</span>
        <span>{duracaoTexto}</span>
      </span>

      <button
        type="button"
        className="narracao-btn narracao-velocidade"
        aria-label={`Velocidade ${rotuloVelocidade(velocidade)}. Mudar velocidade`}
        title="Velocidade"
        onClick={mudarVelocidade}
      >
        {rotuloVelocidade(velocidade)}
      </button>

      {erro && (
        <p className="narracao-erro" role="status">
          Não foi possível carregar o áudio da narração.
        </p>
      )}
    </div>
  )
}

function IconePlay() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden focusable="false">
      <path d="M8 5.5v13l10-6.5z" fill="currentColor" />
    </svg>
  )
}

function IconePausa() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden focusable="false">
      <path d="M7 5.5h3.5v13H7zM13.5 5.5H17v13h-3.5z" fill="currentColor" />
    </svg>
  )
}

/** Seta em arco com o "10" dentro — a convenção que todo player já usa. */
function IconeSalto({ direcao }: { direcao: 'tras' | 'frente' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      aria-hidden
      focusable="false"
      style={direcao === 'frente' ? { transform: 'scaleX(-1)' } : undefined}
    >
      <path
        d="M12 5a8 8 0 1 1-7.2 4.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M4 3.5v5h5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <text
        x="12"
        y="15.6"
        textAnchor="middle"
        fontSize="7.5"
        fontWeight="700"
        fontFamily="var(--font-ui)"
        fill="currentColor"
        // O texto vira junto com o arco no botão de avançar; desfaz o espelho.
        transform={direcao === 'frente' ? 'scale(-1 1) translate(-24 0)' : undefined}
      >
        10
      </text>
    </svg>
  )
}
