// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createTtsController,
  escolherVoz,
  montarFila,
  ttsSupported,
  type TtsState,
} from './tts'

type VozFalsa = { lang: string; name: string }

class FakeUtterance {
  text: string
  lang = ''
  voice: VozFalsa | null = null
  onstart: (() => void) | null = null
  onend: (() => void) | null = null
  onerror: (() => void) | null = null

  constructor(text: string) {
    this.text = text
  }
}

class FakeSynth {
  fila: FakeUtterance[] = []
  cancelou = 0
  pausou = 0
  retomou = 0
  vozes: VozFalsa[] = []
  ouvintes: (() => void)[] = []

  getVoices() {
    return this.vozes
  }

  speak(u: FakeUtterance) {
    this.fila.push(u)
  }

  cancel() {
    this.cancelou += 1
    this.fila = []
  }

  pause() {
    this.pausou += 1
  }

  resume() {
    this.retomou += 1
  }

  addEventListener(tipo: string, fn: () => void) {
    if (tipo === 'voiceschanged') this.ouvintes.push(fn)
  }

  removeEventListener(tipo: string, fn: () => void) {
    if (tipo === 'voiceschanged') this.ouvintes = this.ouvintes.filter((f) => f !== fn)
  }

  /** Simula o browser resolvendo as vozes tarde (quirk conhecido do iOS). */
  emitirVoiceschanged() {
    for (const fn of [...this.ouvintes]) fn()
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ttsSupported', () => {
  it('sem speechSynthesis no ambiente, não há TTS', () => {
    vi.stubGlobal('speechSynthesis', undefined)
    vi.stubGlobal('SpeechSynthesisUtterance', undefined)
    expect(ttsSupported()).toBe(false)
  })

  it('com speechSynthesis e utterance, há TTS', () => {
    vi.stubGlobal('speechSynthesis', new FakeSynth())
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
    expect(ttsSupported()).toBe(true)
  })
})

describe('escolherVoz', () => {
  it('prefere pt-BR quando existe', () => {
    const voz = escolherVoz([
      { lang: 'en-US', name: 'Alex' },
      { lang: 'pt-PT', name: 'Joana' },
      { lang: 'pt-BR', name: 'Luciana' },
    ])
    expect(voz?.name).toBe('Luciana')
  })

  it('cai em qualquer português quando não há pt-BR', () => {
    const voz = escolherVoz([
      { lang: 'en-US', name: 'Alex' },
      { lang: 'pt-PT', name: 'Joana' },
    ])
    expect(voz?.name).toBe('Joana')
  })

  it('sem voz portuguesa devolve null (deixa a padrão do sistema)', () => {
    expect(escolherVoz([{ lang: 'en-US', name: 'Alex' }])).toBeNull()
  })

  it('lista vazia devolve null', () => {
    expect(escolherVoz([])).toBeNull()
  })
})

describe('montarFila', () => {
  it('mantém a ordem da página e apara o texto', () => {
    expect(
      montarFila([
        { id: '1:1', text: '  No princípio…  ' },
        { id: '1:2', text: 'A terra…' },
      ]),
    ).toEqual([
      { id: '1:1', text: 'No princípio…' },
      { id: '1:2', text: 'A terra…' },
    ])
  })

  it('descarta versículos sem texto ou sem id', () => {
    expect(
      montarFila([
        { id: '1:1', text: '   ' },
        { id: '', text: 'órfão' },
        { id: '1:2', text: 'A terra…' },
      ]),
    ).toEqual([{ id: '1:2', text: 'A terra…' }])
  })

  it('lista vazia devolve fila vazia', () => {
    expect(montarFila([])).toEqual([])
  })
})

describe('createTtsController', () => {
  let synth: FakeSynth
  let estados: TtsState[]
  let versiculos: (string | null)[]

  beforeEach(() => {
    vi.useFakeTimers()
    synth = new FakeSynth()
    estados = []
    versiculos = []
    vi.stubGlobal('speechSynthesis', synth)
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function controlador() {
    return createTtsController({
      onVerse: (id) => versiculos.push(id),
      onState: (s) => estados.push(s),
    })
  }

  it('play enfileira uma fala por versículo com a voz pt-BR', () => {
    synth.vozes = [
      { lang: 'en-US', name: 'Alex' },
      { lang: 'pt-BR', name: 'Luciana' },
    ]
    const ctrl = controlador()
    ctrl.play([
      { id: '1:1', text: 'No princípio…' },
      { id: '1:2', text: 'A terra…' },
    ])
    expect(synth.fila.map((u) => u.text)).toEqual(['No princípio…', 'A terra…'])
    expect(synth.fila[0].lang).toBe('pt-BR')
    expect(synth.fila[0].voice?.name).toBe('Luciana')
    expect(estados).toEqual(['playing'])
    ctrl.stop()
  })

  it('onstart marca o versículo e o fim da fila volta para idle', () => {
    synth.vozes = [{ lang: 'pt-BR', name: 'Luciana' }]
    const ctrl = controlador()
    ctrl.play([
      { id: '1:1', text: 'No princípio…' },
      { id: '1:2', text: 'A terra…' },
    ])
    const [u1, u2] = synth.fila
    u1.onstart?.()
    u2.onstart?.()
    u2.onend?.()
    expect(versiculos).toEqual(['1:1', '1:2', null])
    expect(estados).toEqual(['playing', 'idle'])
  })

  it('sem vozes no play, enfileira quando o browser avisa voiceschanged', () => {
    synth.vozes = []
    const ctrl = controlador()
    ctrl.play([{ id: '1:1', text: 'No princípio…' }])
    expect(synth.fila).toHaveLength(0)
    synth.vozes = [{ lang: 'pt-BR', name: 'Luciana' }]
    synth.emitirVoiceschanged()
    expect(synth.fila).toHaveLength(1)
    expect(synth.fila[0].voice?.name).toBe('Luciana')
    expect(synth.ouvintes).toHaveLength(0)
    ctrl.stop()
  })

  it('sem voiceschanged, o timeout de segurança fala com a voz padrão', () => {
    synth.vozes = []
    const ctrl = controlador()
    ctrl.play([{ id: '1:1', text: 'No princípio…' }])
    expect(synth.fila).toHaveLength(0)
    vi.advanceTimersByTime(250)
    expect(synth.fila).toHaveLength(1)
    expect(synth.fila[0].voice).toBeNull()
    expect(synth.fila[0].lang).toBe('pt-BR')
    ctrl.stop()
  })

  it('stop cancela a fila e limpa o realce', () => {
    synth.vozes = [{ lang: 'pt-BR', name: 'Luciana' }]
    const ctrl = controlador()
    ctrl.play([{ id: '1:1', text: 'No princípio…' }])
    synth.fila[0].onstart?.()
    // O próprio play já cancela o que houvesse antes: zera para medir o stop.
    synth.cancelou = 0
    ctrl.stop()
    expect(synth.cancelou).toBe(1)
    expect(versiculos.at(-1)).toBeNull()
    expect(estados.at(-1)).toBe('idle')
  })

  it('pause e resume trocam o estado e mandam no synth', () => {
    synth.vozes = [{ lang: 'pt-BR', name: 'Luciana' }]
    const ctrl = controlador()
    ctrl.play([{ id: '1:1', text: 'No princípio…' }])
    ctrl.pause()
    expect(synth.pausou).toBe(1)
    expect(estados.at(-1)).toBe('paused')
    ctrl.resume()
    expect(synth.retomou).toBe(1)
    expect(estados.at(-1)).toBe('playing')
    ctrl.stop()
  })
})
