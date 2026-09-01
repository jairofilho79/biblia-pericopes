// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createTtsController,
  escolherVoz,
  falarAmostra,
  filaDeTextos,
  listarVozesPt,
  montarFila,
  ttsSupported,
  type TtsState,
} from './tts'

type VozFalsa = { lang: string; name: string; voiceURI?: string }

class FakeUtterance {
  text: string
  lang = ''
  rate = 1
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
  // A utterance "em fala" no momento: como o browser real fala uma de cada
  // vez, é a primeira enfileirada depois do cancel anterior.
  atual: FakeUtterance | null = null
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
    if (!this.atual) this.atual = u
  }

  /** Espelha o browser real: `cancel()` dispara `end` de forma ASSÍNCRONA na
   *  utterance que estava em fala — nunca na hora. */
  cancel() {
    this.cancelou += 1
    this.fila = []
    const emFala = this.atual
    this.atual = null
    if (emFala) {
      setTimeout(() => emFala.onend?.(), 0)
    }
  }

  // Como no browser real: `paused` sobrevive ao `cancel()` — só `resume` limpa.
  paused = false

  pause() {
    this.pausou += 1
    this.paused = true
  }

  resume() {
    this.retomou += 1
    this.paused = false
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

  it('entre as pt-BR, prefere a de melhor qualidade (Google/Natural/Enhanced/Premium)', () => {
    const voz = escolherVoz([
      { lang: 'pt-BR', name: 'Luciana' },
      { lang: 'pt-BR', name: 'Google português do Brasil' },
    ])
    expect(voz?.name).toBe('Google português do Brasil')
  })

  it('"Enhanced" e "Premium" no nome também contam como qualidade alta', () => {
    expect(
      escolherVoz([
        { lang: 'pt-BR', name: 'Luciana' },
        { lang: 'pt-BR', name: 'Luciana (Enhanced)' },
      ])?.name,
    ).toBe('Luciana (Enhanced)')
    expect(
      escolherVoz([
        { lang: 'pt-BR', name: 'Luciana' },
        { lang: 'pt-BR', name: 'Luciana (Premium)' },
      ])?.name,
    ).toBe('Luciana (Premium)')
  })

  it('sotaque certo vale mais que polimento: pt-BR comum ganha de pt-PT premium', () => {
    const voz = escolherVoz([
      { lang: 'pt-PT', name: 'Joana (Premium)' },
      { lang: 'pt-BR', name: 'Luciana' },
    ])
    expect(voz?.name).toBe('Luciana')
  })

  it('a voz preferida do leitor vence o ranking', () => {
    const voz = escolherVoz(
      [
        { lang: 'pt-BR', name: 'Google português do Brasil', voiceURI: 'google-pt-br' },
        { lang: 'pt-BR', name: 'Felipe', voiceURI: 'felipe' },
      ],
      'felipe',
    )
    expect(voz?.name).toBe('Felipe')
  })

  it('preferida que sumiu do aparelho cai de volta no ranking', () => {
    const voz = escolherVoz(
      [
        { lang: 'pt-BR', name: 'Luciana', voiceURI: 'luciana' },
        { lang: 'pt-BR', name: 'Google português do Brasil', voiceURI: 'google-pt-br' },
      ],
      'voz-desinstalada',
    )
    expect(voz?.name).toBe('Google português do Brasil')
  })
})

describe('listarVozesPt', () => {
  it('devolve só as vozes em português, pt-BR antes das demais', () => {
    const vozes = listarVozesPt([
      { lang: 'en-US', name: 'Alex' },
      { lang: 'pt-PT', name: 'Joana' },
      { lang: 'pt_BR', name: 'Felipe' },
      { lang: 'pt-BR', name: 'Luciana' },
    ])
    expect(vozes.map((v) => v.name)).toEqual(['Felipe', 'Luciana', 'Joana'])
  })

  it('sem voz portuguesa devolve lista vazia', () => {
    expect(listarVozesPt([{ lang: 'en-US', name: 'Alex' }])).toEqual([])
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

describe('filaDeTextos', () => {
  it('vira um item de fala por texto, com ids previsíveis da seção', () => {
    expect(filaDeTextos('contexto', ['Primeiro parágrafo.', 'Segundo.'])).toEqual([
      { id: 'contexto-0', text: 'Primeiro parágrafo.' },
      { id: 'contexto-1', text: 'Segundo.' },
    ])
  })

  it('apara o texto e descarta itens vazios sem furar a numeração original', () => {
    expect(filaDeTextos('reflexao', ['  Uma pergunta?  ', '   ', 'Outra?'])).toEqual([
      { id: 'reflexao-0', text: 'Uma pergunta?' },
      { id: 'reflexao-2', text: 'Outra?' },
    ])
  })

  it('lista vazia devolve fila vazia', () => {
    expect(filaDeTextos('resenha', [])).toEqual([])
  })
})

describe('falarAmostra', () => {
  let synth: FakeSynth

  beforeEach(() => {
    synth = new FakeSynth()
    vi.stubGlobal('speechSynthesis', synth)
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
  })

  it('fala uma frase curta com a voz e a velocidade pedidas', () => {
    synth.vozes = [
      { lang: 'pt-BR', name: 'Luciana', voiceURI: 'luciana' },
      { lang: 'pt-BR', name: 'Felipe', voiceURI: 'felipe' },
    ]
    falarAmostra('felipe', 1.15)
    expect(synth.fila).toHaveLength(1)
    expect(synth.fila[0].voice?.name).toBe('Felipe')
    expect(synth.fila[0].rate).toBe(1.15)
    expect(synth.fila[0].lang).toBe('pt-BR')
    expect(synth.fila[0].text.length).toBeGreaterThan(0)
  })

  it('cancela o que estivesse falando antes da amostra', () => {
    synth.vozes = [{ lang: 'pt-BR', name: 'Luciana', voiceURI: 'luciana' }]
    falarAmostra(null, 1)
    expect(synth.cancelou).toBe(1)
  })

  it('voz automática (null) usa a melhor voz do ranking', () => {
    synth.vozes = [
      { lang: 'pt-BR', name: 'Luciana', voiceURI: 'luciana' },
      { lang: 'pt-BR', name: 'Google português do Brasil', voiceURI: 'google' },
    ]
    falarAmostra(null, 1)
    expect(synth.fila[0].voice?.name).toBe('Google português do Brasil')
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

  it('as preferências valem no play: rate em cada fala e a voz preferida', () => {
    synth.vozes = [
      { lang: 'pt-BR', name: 'Google português do Brasil', voiceURI: 'google-pt-br' },
      { lang: 'pt-BR', name: 'Felipe', voiceURI: 'felipe' },
    ]
    const ctrl = createTtsController({
      onVerse: (id) => versiculos.push(id),
      onState: (s) => estados.push(s),
      prefs: () => ({ voz: 'felipe', rate: 0.85 }),
    })
    ctrl.play([
      { id: '1:1', text: 'No princípio…' },
      { id: '1:2', text: 'A terra…' },
    ])
    expect(synth.fila.map((u) => u.rate)).toEqual([0.85, 0.85])
    expect(synth.fila[0].voice?.name).toBe('Felipe')
    ctrl.stop()
  })

  it('sem prefs, a fala sai na velocidade normal com a voz do ranking', () => {
    synth.vozes = [
      { lang: 'pt-BR', name: 'Luciana' },
      { lang: 'pt-BR', name: 'Google português do Brasil' },
    ]
    const ctrl = controlador()
    ctrl.play([{ id: '1:1', text: 'No princípio…' }])
    expect(synth.fila[0].rate).toBe(1)
    expect(synth.fila[0].voice?.name).toBe('Google português do Brasil')
    ctrl.stop()
  })

  it('mudar a preferência entre um play e outro vale já no play seguinte', () => {
    synth.vozes = [{ lang: 'pt-BR', name: 'Luciana' }]
    let rate = 1
    const ctrl = createTtsController({ prefs: () => ({ voz: null, rate }) })
    ctrl.play([{ id: '1:1', text: 'No princípio…' }])
    expect(synth.fila[0].rate).toBe(1)
    ctrl.stop()
    rate = 1.15
    ctrl.play([{ id: '1:1', text: 'No princípio…' }])
    expect(synth.fila.at(-1)?.rate).toBe(1.15)
    ctrl.stop()
  })

  it('play com o motor pausado destrava o pause antes de falar a fila nova', () => {
    // Agora há uma fila por seção: dá para apertar ▶ na Resenha com o Texto
    // pausado. O synth pausado segura o `speak` novo até alguém dar resume.
    synth.vozes = [{ lang: 'pt-BR', name: 'Luciana' }]
    const ctrl = controlador()
    ctrl.play([{ id: '1:1', text: 'Texto' }])
    ctrl.pause()
    ctrl.play([{ id: 'resenha-0', text: 'Resenha' }])
    expect(synth.retomou).toBe(1)
    expect(estados.at(-1)).toBe('playing')
    ctrl.stop()
  })

  it('parar e tocar de novo no mesmo instante não mata a sessão nova', () => {
    // Regressão: um booleano único de "sessão viva" deixava o `end`
    // assíncrono da utterance CANCELADA (disparado pelo `synth.cancel()` do
    // stop) derrubar a sessão NOVA, iniciada antes desse callback chegar.
    synth.vozes = [{ lang: 'pt-BR', name: 'Luciana' }]
    const ctrl = controlador()
    ctrl.play([{ id: '1:1', text: 'Primeira sessão' }])
    expect(estados.at(-1)).toBe('playing')

    ctrl.stop()
    expect(estados.at(-1)).toBe('idle')

    // ▶ de novo antes do `end` assíncrono da sessão anterior chegar.
    ctrl.play([{ id: '2:1', text: 'Segunda sessão' }])
    expect(estados.at(-1)).toBe('playing')

    // O `end` tardio da PRIMEIRA sessão finalmente chega...
    vi.runOnlyPendingTimers()

    // ...mas a sessão nova segue tocando, intacta.
    expect(estados.at(-1)).toBe('playing')
    synth.fila[0].onstart?.()
    expect(versiculos.at(-1)).toBe('2:1')

    ctrl.stop()
  })
})
