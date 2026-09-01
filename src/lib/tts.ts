export type TtsState = 'idle' | 'playing' | 'paused'

export type TtsVerse = { id: string; text: string }

export type TtsController = {
  play(verses: TtsVerse[]): void
  pause(): void
  resume(): void
  stop(): void
}

/** Sem `speechSynthesis` os controles nem aparecem — nunca um erro visível. */
export function ttsSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.speechSynthesis !== 'undefined' &&
    typeof window.SpeechSynthesisUtterance === 'function'
  )
}

/** Fila de fala: um item por versículo com texto, na ordem da página. */
export function montarFila(verses: TtsVerse[]): TtsVerse[] {
  const fila: TtsVerse[] = []
  for (const v of verses) {
    const text = v.text.trim()
    if (!v.id || !text) continue
    fila.push({ id: v.id, text })
  }
  return fila
}

/**
 * pt-BR primeiro, qualquer português depois, `null` por último — `null` quer
 * dizer "deixa a voz padrão do sistema", que é melhor do que falar português
 * com voz inglesa.
 */
export function escolherVoz<T extends { lang: string }>(vozes: T[]): T | null {
  const norm = (lang: string) => (lang ?? '').toLowerCase().replace('_', '-')
  return (
    vozes.find((v) => norm(v.lang) === 'pt-br') ??
    vozes.find((v) => norm(v.lang).startsWith('pt')) ??
    null
  )
}

/** Quanto esperar pelo `voiceschanged` antes de falar com a voz padrão. */
const ESPERA_VOZES_MS = 250

export function createTtsController(opts: {
  onVerse?: (verseId: string | null) => void
  onState?: (s: TtsState) => void
}): TtsController {
  let fila: TtsVerse[] = []
  // Sessão de fala corrente: callbacks de utterances já canceladas conferem
  // este sinalizador antes de mexer na UI.
  let vivo = false
  let onVozes: (() => void) | null = null
  let timerVozes = 0

  const synth = () => (ttsSupported() ? window.speechSynthesis : null)
  const marcar = (id: string | null) => opts.onVerse?.(id)
  const emitir = (s: TtsState) => opts.onState?.(s)

  function soltarVozes() {
    const s = synth()
    if (onVozes && s) s.removeEventListener('voiceschanged', onVozes)
    onVozes = null
    if (timerVozes) {
      window.clearTimeout(timerVozes)
      timerVozes = 0
    }
  }

  function encerrar(avisar: boolean) {
    vivo = false
    fila = []
    soltarVozes()
    synth()?.cancel()
    if (avisar) {
      marcar(null)
      emitir('idle')
    }
  }

  function enfileirar(voz: SpeechSynthesisVoice | null) {
    const s = synth()
    if (!s) return
    const Utterance = window.SpeechSynthesisUtterance
    const total = fila.length
    fila.forEach((v, i) => {
      const u = new Utterance(v.text)
      u.lang = 'pt-BR'
      if (voz) u.voice = voz
      u.onstart = () => {
        if (vivo) marcar(v.id)
      }
      u.onend = () => {
        // Fim da fila: `stop` implícito, sem o leitor precisar apertar nada.
        if (vivo && i === total - 1) encerrar(true)
      }
      u.onerror = () => {
        // Voz que falha no meio (ou aba suspensa) some em silêncio.
        if (vivo) encerrar(true)
      }
      s.speak(u)
    })
  }

  function play(verses: TtsVerse[]) {
    const s = synth()
    if (!s) return
    encerrar(false)
    fila = montarFila(verses)
    if (!fila.length) return
    vivo = true
    emitir('playing')

    const vozes = s.getVoices()
    if (vozes.length) {
      enfileirar(escolherVoz(vozes))
      return
    }

    // Quirk conhecido do iOS/Chrome: `getVoices()` volta vazio até o browser
    // resolver a lista. A voz é resolvida AQUI, no play, nunca no mount.
    onVozes = () => {
      soltarVozes()
      if (!vivo) return
      enfileirar(escolherVoz(s.getVoices()))
    }
    s.addEventListener('voiceschanged', onVozes)
    // Rede de segurança: browser que nunca dispara o evento ainda fala, só que
    // com a voz padrão do sistema.
    timerVozes = window.setTimeout(() => {
      if (!vivo || !onVozes) return
      soltarVozes()
      enfileirar(escolherVoz(s.getVoices()))
    }, ESPERA_VOZES_MS)
  }

  return {
    play,
    pause() {
      const s = synth()
      if (!s || !vivo) return
      s.pause()
      emitir('paused')
    },
    resume() {
      const s = synth()
      if (!s || !vivo) return
      s.resume()
      emitir('playing')
    },
    stop() {
      encerrar(true)
    },
  }
}
