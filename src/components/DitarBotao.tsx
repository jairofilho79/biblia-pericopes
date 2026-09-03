import { useCallback, useEffect, useRef, useState } from 'react'
import { authClient } from '../lib/auth-client'
import {
  MAX_SEGUNDOS_DITADO,
  escolherMime,
  formatarContador,
  mensagemEsgotado,
  msAteVolta,
  transcrever,
} from '../lib/ditado'
import { pontuarFrase } from '../lib/pontuar-ditado'
import {
  criarDitadoNativo,
  obterReconhecimento,
  type DitadoNativo,
} from '../lib/reconhecimento-fala'
import { revisarDitado } from '../lib/revisar-ditado'

type Props = {
  /** Recebe o texto transcrito; quem chama decide onde ele entra. */
  onTexto: (trecho: string) => void
  /**
   * A revisão por IA do que foi ditado desde o último toque: `original` é
   * exatamente o que entrou por onTexto (frases juntas por espaço), para quem
   * chama achar e trocar por `revisado`. Só no modo nativo, só com sessão.
   */
  onRevisao?: (original: string, revisado: string) => void
  onAviso: (msg: string) => void
  disabled?: boolean
}

type Fase =
  | { tipo: 'ocioso' }
  /** Modo nativo: ouvindo, com a prévia do que está sendo dito. */
  | { tipo: 'ouvindo'; parcial: string }
  /** Modo nativo: a pessoa parou e o trecho está na revisão por IA. */
  | { tipo: 'revisando' }
  /** Modo fallback (Whisper). */
  | { tipo: 'gravando'; segundos: number }
  | { tipo: 'transcrevendo' }
  | { tipo: 'esgotado'; voltaEm: string }

function temMicrofoneNoNavegador(): boolean {
  return typeof MediaRecorder !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function'
}

/**
 * Microfone do formulário de anotação: toque começa a ouvir, toque de novo
 * para. Dois caminhos:
 *
 * - Nativo (Web Speech API — o ditado da Apple no iPhone, o do Google no
 *   Android/Chrome): sem login, sem cota, sem teto de tempo. Cada frase
 *   fechada passa pela pontuação heurística (pontuar-ditado.ts) e entra no
 *   textarea; o que ainda está sendo dito aparece como prévia ao lado do
 *   botão. Quando a pessoa para, e está logada, o trecho inteiro vai à
 *   revisão por IA (revisar-ditado.ts) e volta por onRevisao — vírgulas e
 *   correções que a heurística não alcança. Se a revisão falhar, fica o que
 *   já está lá, sem aviso.
 * - Fallback (Firefox e afins, sem a API): grava com MediaRecorder e manda
 *   para o Worker transcrever. Só para quem está logado (a rota cobra cota
 *   por usuário) e com teto de 60 s.
 *
 * Nos dois casos só com rede — o nativo do Chrome manda o áudio para o
 * Google — e um botão que só dá erro é pior que nenhum.
 */
export default function DitarBotao({ onTexto, onRevisao, onAviso, disabled }: Props) {
  const { data: session } = authClient.useSession()
  const [online, setOnline] = useState(() => navigator.onLine)
  const [fase, setFase] = useState<Fase>({ tipo: 'ocioso' })
  // Decidido uma vez: a API não aparece nem some no meio da vida do botão.
  const [Reconhecimento] = useState(() => obterReconhecimento())
  const nativo = Reconhecimento !== null

  // A transcrição termina bem depois do render que criou o callback: os refs
  // garantem que o texto chega na versão mais recente de onTexto/onAviso (a
  // que enxerga o rascunho atual), não numa fechada sobre um estado velho.
  const onTextoRef = useRef(onTexto)
  const onRevisaoRef = useRef(onRevisao)
  const onAvisoRef = useRef(onAviso)
  const sessionRef = useRef(session)
  onTextoRef.current = onTexto
  onRevisaoRef.current = onRevisao
  onAvisoRef.current = onAviso
  sessionRef.current = session

  const ditado = useRef<DitadoNativo | null>(null)
  // A intenção da pessoa: o iOS encerra a sessão sozinho depois de uma pausa
  // mesmo com `continuous`; enquanto ela não tocou em parar, o onFim reinicia.
  const querOuvir = useRef(false)
  // Frases (já pontuadas) desde o toque que começou a ouvir: é o que vai à
  // revisão quando a pessoa parar. O reinício automático do iOS não zera.
  const segmentos = useRef<string[]>([])
  const montado = useRef(true)

  const recorder = useRef<MediaRecorder | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const pedacos = useRef<Blob[]>([])
  const inicio = useRef(0)
  const contador = useRef<number | undefined>(undefined)
  const limite = useRef<number | undefined>(undefined)
  const volta = useRef<number | undefined>(undefined)

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  const soltarMicrofone = useCallback(() => {
    window.clearInterval(contador.current)
    window.clearTimeout(limite.current)
    // Sem isto a luzinha do microfone fica acesa até a aba fechar.
    stream.current?.getTracks().forEach((t) => t.stop())
    stream.current = null
    recorder.current = null
  }, [])

  // Desmontar no meio de uma gravação (trocar de perícope, sair) não pode
  // deixar o microfone aberto nem timers pendurados.
  useEffect(
    () => () => {
      montado.current = false
      querOuvir.current = false
      ditado.current?.parar()
      const rec = recorder.current
      if (rec?.state === 'recording') {
        // Descarta em vez de transcrever: não há mais textarea para receber
        // o texto, e gastar cota com áudio que vai pro lixo não faz sentido.
        rec.onstop = null
        rec.stop()
      }
      soltarMicrofone()
      window.clearTimeout(volta.current)
    },
    [soltarMicrofone],
  )

  function entrarEmEsgotado(voltaEm: string) {
    setFase({ tipo: 'esgotado', voltaEm })
    window.clearTimeout(volta.current)
    // Um timeout até a virada basta: não precisa persistir — se a pessoa
    // recarregar, o servidor responde 429 de novo e o estado volta.
    volta.current = window.setTimeout(() => setFase({ tipo: 'ocioso' }), msAteVolta(voltaEm))
  }

  async function terminar(mime: string) {
    const segundos = (Date.now() - inicio.current) / 1000
    const blob = new Blob(pedacos.current, { type: mime })
    pedacos.current = []
    soltarMicrofone()
    setFase({ tipo: 'transcrevendo' })
    const r = await transcrever(blob, mime, segundos)
    if (r.ok) {
      if (r.texto) onTextoRef.current(r.texto)
      else onAvisoRef.current('Não entendi nada. Tente de novo')
      setFase({ tipo: 'ocioso' })
      return
    }
    onAvisoRef.current(r.mensagem)
    if (r.voltaEm) entrarEmEsgotado(r.voltaEm)
    else setFase({ tipo: 'ocioso' })
  }

  async function comecar() {
    let s: MediaStream
    try {
      s = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (err) {
      const nome = (err as { name?: string } | null)?.name
      onAvisoRef.current(
        nome === 'NotAllowedError' || nome === 'SecurityError'
          ? 'Permita o microfone para ditar'
          : nome === 'NotFoundError' || nome === 'OverconstrainedError'
            ? 'Nenhum microfone encontrado'
            : 'Não foi possível usar o microfone',
      )
      return
    }
    // O mime escolhido aqui é o que vai no content-type: o Worker só aceita a
    // lista de escolherMime. Sem nenhum suportado, deixa o navegador decidir e
    // manda o que ele disser — se for exótico, o 415 vira aviso.
    const preferido = escolherMime()
    let rec: MediaRecorder
    try {
      rec = preferido ? new MediaRecorder(s, { mimeType: preferido }) : new MediaRecorder(s)
    } catch {
      s.getTracks().forEach((t) => t.stop())
      onAvisoRef.current('Não foi possível usar o microfone')
      return
    }
    const mime = preferido ?? rec.mimeType
    stream.current = s
    recorder.current = rec
    pedacos.current = []
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) pedacos.current.push(e.data)
    }
    rec.onstop = () => void terminar(mime)
    rec.onerror = () => {
      soltarMicrofone()
      onAvisoRef.current('A gravação falhou')
      setFase({ tipo: 'ocioso' })
    }
    inicio.current = Date.now()
    rec.start()
    setFase({ tipo: 'gravando', segundos: 0 })
    contador.current = window.setInterval(() => {
      setFase({ tipo: 'gravando', segundos: Math.floor((Date.now() - inicio.current) / 1000) })
    }, 250)
    // Para sozinho no teto: o servidor recusaria qualquer coisa acima dele.
    limite.current = window.setTimeout(() => parar(), MAX_SEGUNDOS_DITADO * 1000)
  }

  function parar() {
    const rec = recorder.current
    if (!rec || rec.state !== 'recording') return
    window.clearInterval(contador.current)
    window.clearTimeout(limite.current)
    rec.stop() // onstop → terminar()
  }

  /**
   * A sessão de ditado acabou de vez (a pessoa parou, ou um erro parou por
   * ela). Corre depois do `onend`, quando o último final já chegou: só então
   * o trecho está completo para a revisão. Sem sessão não há rota — e não há
   * aviso: a revisão é um extra.
   */
  async function encerrarNativo() {
    const frases = segmentos.current
    segmentos.current = []
    if (!montado.current) return
    if (!frases.length || !sessionRef.current) {
      setFase({ tipo: 'ocioso' })
      return
    }
    const original = frases.join(' ')
    setFase({ tipo: 'revisando' })
    const revisado = await revisarDitado(original)
    if (!montado.current) return
    if (revisado && revisado !== original) onRevisaoRef.current?.(original, revisado)
    setFase({ tipo: 'ocioso' })
  }

  function comecarNativo() {
    ditado.current ??= criarDitadoNativo(
      {
        onFinal: (texto) => {
          const frase = pontuarFrase(texto)
          if (!frase) return
          segmentos.current.push(frase)
          onTextoRef.current(frase)
        },
        onParcial: (parcial) =>
          setFase((f) => (f.tipo === 'ouvindo' ? { tipo: 'ouvindo', parcial } : f)),
        onErro: (msg) => {
          // Microfone negado, sem rede: reiniciar só repetiria o erro.
          querOuvir.current = false
          onAvisoRef.current(msg)
        },
        onFim: () => {
          if (querOuvir.current) ditado.current?.iniciar()
          else void encerrarNativo()
        },
      },
      Reconhecimento,
    )
    if (!ditado.current) return
    querOuvir.current = true
    segmentos.current = []
    setFase({ tipo: 'ouvindo', parcial: '' })
    ditado.current.iniciar()
  }

  function pararNativo() {
    querOuvir.current = false
    // Ocioso já: o onend pode demorar, e o botão precisa responder na hora.
    // A última frase ainda chega por onFinal, que não depende da fase; a
    // revisão começa no onFim, com ela dentro.
    setFase({ tipo: 'ocioso' })
    ditado.current?.parar()
  }

  if (!online) return null
  if (!nativo && (!session || !temMicrofoneNoNavegador())) return null

  const ouvindo = fase.tipo === 'ouvindo'
  const gravando = ouvindo || fase.tipo === 'gravando'
  const rotulo =
    fase.tipo === 'esgotado'
      ? mensagemEsgotado(fase.voltaEm)
      : ouvindo
        ? 'Parar ditado'
        : gravando
          ? 'Parar e transcrever'
          : 'Ditar anotação'
  const lado =
    fase.tipo === 'ouvindo'
      ? fase.parcial
        ? `${fase.parcial}…`
        : 'Ouvindo…'
      : fase.tipo === 'gravando'
        ? formatarContador(fase.segundos)
        : fase.tipo === 'transcrevendo'
          ? 'Transcrevendo…'
          : fase.tipo === 'revisando'
            ? 'Revisando…'
            : fase.tipo === 'esgotado'
              ? mensagemEsgotado(fase.voltaEm)
              : null

  return (
    <span className="ditar">
      {lado &&
        (ouvindo ? (
          // Prévia muda a cada sílaba: sem aria-live, senão o leitor de tela
          // tagarela; o texto de verdade chega pelo textarea.
          <span
            className={`ditar-status${fase.parcial ? ' ditar-previa' : ''}`}
            title={fase.parcial || undefined}
          >
            {lado}
          </span>
        ) : (
          <span className="ditar-status" role="status" aria-live="polite">
            {lado}
          </span>
        ))}
      <button
        type="button"
        className={`ditar-botao${gravando ? ' gravando' : ''}`}
        aria-label={rotulo}
        title={rotulo}
        aria-pressed={gravando}
        disabled={
          disabled ||
          fase.tipo === 'transcrevendo' ||
          fase.tipo === 'revisando' ||
          fase.tipo === 'esgotado'
        }
        onClick={() =>
          nativo ? (ouvindo ? pararNativo() : comecarNativo()) : gravando ? parar() : void comecar()
        }
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
          <path
            fill="currentColor"
            d="M12 15a4 4 0 0 0 4-4V6a4 4 0 0 0-8 0v5a4 4 0 0 0 4 4Zm6-4a1 1 0 1 1 2 0 8 8 0 0 1-7 7.94V21h2a1 1 0 1 1 0 2H9a1 1 0 1 1 0-2h2v-2.06A8 8 0 0 1 4 11a1 1 0 1 1 2 0 6 6 0 0 0 12 0Z"
          />
        </svg>
      </button>
    </span>
  )
}
