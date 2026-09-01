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

const normLang = (lang: string) => (lang ?? '').toLowerCase().replace('_', '-')

/** Vozes que os sistemas rotulam como as de síntese mais natural. */
const QUALIDADE = /google|natural|enhanced|premium|aprimorad/i

type Voz = { lang: string; name: string; voiceURI?: string }

/**
 * A voz preferida do leitor vence tudo (se ainda existir no aparelho); depois
 * o ranking: sotaque certo vale mais que polimento — pt-BR de qualidade,
 * pt-BR comum, qualquer português de qualidade, qualquer português. `null`
 * por último quer dizer "deixa a voz padrão do sistema", que é melhor do que
 * falar português com voz inglesa.
 */
export function escolherVoz<T extends Voz>(vozes: T[], preferida?: string | null): T | null {
  if (preferida) {
    const escolhida = vozes.find((v) => v.voiceURI === preferida)
    if (escolhida) return escolhida
  }
  const nota = (v: T) => {
    const lang = normLang(v.lang)
    if (!lang.startsWith('pt')) return 0
    return (lang === 'pt-br' ? 20 : 10) + (QUALIDADE.test(v.name) ? 5 : 0)
  }
  let melhor: T | null = null
  let melhorNota = 0
  for (const v of vozes) {
    const n = nota(v)
    if (n > melhorNota) {
      melhor = v
      melhorNota = n
    }
  }
  return melhor
}

/** As vozes em português do aparelho, pt-BR antes das demais, para o seletor. */
export function listarVozesPt<T extends Voz>(vozes: T[]): T[] {
  const pt = vozes.filter((v) => normLang(v.lang).startsWith('pt'))
  const br = pt.filter((v) => normLang(v.lang) === 'pt-br')
  return [...br, ...pt.filter((v) => !br.includes(v))]
}

/**
 * Fila de fala de uma seção em prosa (contexto, resenha, reflexão): um item
 * por parágrafo/pergunta. O id carrega o índice ORIGINAL para o realce achar
 * o nó certo mesmo quando um item vazio é descartado.
 */
export function filaDeTextos(prefixo: string, textos: string[]): TtsVerse[] {
  return montarFila(textos.map((text, i) => ({ id: `${prefixo}-${i}`, text })))
}

/** Frase curta e neutra só para o leitor ouvir o timbre da voz. */
const AMOSTRA = 'No princípio era o Verbo, e o Verbo estava com Deus.'

/** Prévia do seletor: interrompe o que estiver falando e diz uma frase só. */
export function falarAmostra(voz: string | null, rate: number): void {
  if (!ttsSupported()) return
  const s = window.speechSynthesis
  s.cancel()
  const u = new window.SpeechSynthesisUtterance(AMOSTRA)
  u.lang = 'pt-BR'
  u.rate = rate
  const escolhida = escolherVoz(s.getVoices(), voz)
  if (escolhida) u.voice = escolhida
  s.speak(u)
}

/** Quanto esperar pelo `voiceschanged` antes de falar com a voz padrão. */
const ESPERA_VOZES_MS = 250

export type TtsPrefs = { voz: string | null; rate: number }

export function createTtsController(opts: {
  onVerse?: (verseId: string | null) => void
  onState?: (s: TtsState) => void
  /** Lidas a cada `play`: mudar a preferência vale já na próxima fala. */
  prefs?: () => TtsPrefs
}): TtsController {
  let fila: TtsVerse[] = []
  // Token monotônico da sessão de fala corrente. `synth.cancel()` dispara
  // `end`/`error` de forma ASSÍNCRONA nas utterances canceladas — com um
  // booleano simples, o callback tardio de uma sessão já cancelada podia
  // matar uma sessão NOVA (⏹ seguido de ▶ no mesmo frame). Cada `play()`
  // grava seu próprio número; todo callback só age se ainda for o corrente.
  let sessao = 0
  // Independente do token: só diz se HÁ sessão ativa agora, para pause/resume.
  let ativo = false
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
    sessao++
    ativo = false
    fila = []
    soltarVozes()
    synth()?.cancel()
    if (avisar) {
      marcar(null)
      emitir('idle')
    }
  }

  function enfileirar(voz: SpeechSynthesisVoice | null, minha: number, rate: number) {
    const s = synth()
    if (!s) return
    const Utterance = window.SpeechSynthesisUtterance
    const total = fila.length
    fila.forEach((v, i) => {
      const u = new Utterance(v.text)
      u.lang = 'pt-BR'
      u.rate = rate
      if (voz) u.voice = voz
      u.onstart = () => {
        if (minha === sessao) marcar(v.id)
      }
      u.onend = () => {
        // Fim da fila: `stop` implícito, sem o leitor precisar apertar nada.
        if (minha === sessao && i === total - 1) encerrar(true)
      }
      u.onerror = () => {
        // Voz que falha no meio (ou aba suspensa) some em silêncio.
        if (minha === sessao) encerrar(true)
      }
      s.speak(u)
    })
  }

  function play(verses: TtsVerse[]) {
    const s = synth()
    if (!s) return
    encerrar(false)
    // Motor pausado (▶ numa seção com outra em pausa) seguraria o `speak`
    // novo indefinidamente — o cancel não limpa o pause.
    if (s.paused) s.resume()
    fila = montarFila(verses)
    if (!fila.length) return
    const minha = ++sessao
    ativo = true
    emitir('playing')

    const { voz, rate } = opts.prefs?.() ?? { voz: null, rate: 1 }
    const vozes = s.getVoices()
    if (vozes.length) {
      enfileirar(escolherVoz(vozes, voz), minha, rate)
      return
    }

    // Quirk conhecido do iOS/Chrome: `getVoices()` volta vazio até o browser
    // resolver a lista. A voz é resolvida AQUI, no play, nunca no mount.
    onVozes = () => {
      soltarVozes()
      if (minha !== sessao) return
      enfileirar(escolherVoz(s.getVoices(), voz), minha, rate)
    }
    s.addEventListener('voiceschanged', onVozes)
    // Rede de segurança: browser que nunca dispara o evento ainda fala, só que
    // com a voz padrão do sistema.
    timerVozes = window.setTimeout(() => {
      if (minha !== sessao || !onVozes) return
      soltarVozes()
      enfileirar(escolherVoz(s.getVoices(), voz), minha, rate)
    }, ESPERA_VOZES_MS)
  }

  return {
    play,
    pause() {
      const s = synth()
      if (!s || !ativo) return
      s.pause()
      emitir('paused')
    },
    resume() {
      const s = synth()
      if (!s || !ativo) return
      s.resume()
      emitir('playing')
    },
    stop() {
      encerrar(true)
    },
  }
}
