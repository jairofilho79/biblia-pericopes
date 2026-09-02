// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Sessão controlada pelo teste: `sessao` null = anônimo.
let sessao: { user: { id: string } } | null = null
vi.mock('../lib/auth-client', () => ({
  authClient: { useSession: () => ({ data: sessao }) },
}))

import DitarBotao from './DitarBotao'

/**
 * MediaRecorder de mentira: registra start/stop, entrega um chunk no stop e
 * expõe a instância para o teste dirigir.
 */
class FakeRecorder {
  static instancias: FakeRecorder[] = []
  static isTypeSupported = (t: string) => t === 'audio/webm;codecs=opus'
  mimeType: string
  state = 'inactive'
  ondataavailable: ((e: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null
  onerror: (() => void) | null = null
  constructor(_stream: MediaStream, opts?: { mimeType?: string }) {
    this.mimeType = opts?.mimeType ?? 'audio/webm'
    FakeRecorder.instancias.push(this)
  }
  start() {
    this.state = 'recording'
  }
  stop() {
    this.state = 'inactive'
    this.ondataavailable?.({ data: new Blob([new Uint8Array([1, 2, 3])], { type: this.mimeType }) })
    this.onstop?.()
  }
}

const tracks = [{ stop: vi.fn() }]
const getUserMedia = vi.fn(async () => ({ getTracks: () => tracks }) as unknown as MediaStream)

let root: Root
let host: HTMLDivElement
const onTexto = vi.fn()
const onAviso = vi.fn()

function montar(props: { disabled?: boolean } = {}) {
  act(() => {
    root.render(<DitarBotao onTexto={onTexto} onAviso={onAviso} {...props} />)
  })
}
const botao = () => host.querySelector('button')
const status = () => host.querySelector('[role="status"]')?.textContent ?? null

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-02T15:00:00.000Z'))
  sessao = { user: { id: 'u1' } }
  FakeRecorder.instancias = []
  tracks[0].stop.mockClear()
  onTexto.mockClear()
  onAviso.mockClear()
  getUserMedia.mockClear()
  vi.stubGlobal('MediaRecorder', FakeRecorder)
  Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true })
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('DitarBotao — quando aparece', () => {
  it('renderiza o microfone para quem está logado', () => {
    montar()
    expect(botao()?.getAttribute('aria-label')).toBe('Ditar anotação')
  })

  it('não renderiza nada sem sessão', () => {
    sessao = null
    montar()
    expect(host.innerHTML).toBe('')
  })

  it('não renderiza nada offline, e volta ao ficar online', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
    montar()
    expect(host.innerHTML).toBe('')
    act(() => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
      window.dispatchEvent(new Event('online'))
    })
    expect(botao()).not.toBeNull()
  })

  it('não renderiza nada sem MediaRecorder ou sem getUserMedia', () => {
    vi.stubGlobal('MediaRecorder', undefined)
    montar()
    expect(host.innerHTML).toBe('')
    vi.stubGlobal('MediaRecorder', FakeRecorder)
    Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true })
    montar()
    expect(host.innerHTML).toBe('')
  })
})

describe('DitarBotao — fluxo', () => {
  it('toque grava (contador), toque de novo para, transcreve e entrega o texto', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ texto: 'Amém' })),
    )
    montar()
    await act(async () => {
      botao()!.click()
    })
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true })
    expect(FakeRecorder.instancias).toHaveLength(1)
    expect(FakeRecorder.instancias[0].mimeType).toBe('audio/webm;codecs=opus')
    expect(botao()?.getAttribute('aria-label')).toBe('Parar e transcrever')
    expect(botao()?.classList.contains('gravando')).toBe(true)
    expect(status()).toBe('0:00 / 1:00')

    await act(async () => {
      vi.advanceTimersByTime(7_300)
    })
    expect(status()).toBe('0:07 / 1:00')

    await act(async () => {
      botao()!.click()
    })
    // Tracks soltas; enquanto transcreve o botão fica desabilitado.
    expect(tracks[0].stop).toHaveBeenCalled()
    await act(async () => {
      await Promise.resolve()
    })
    expect(onTexto).toHaveBeenCalledWith('Amém')
    expect(onAviso).not.toHaveBeenCalled()
    expect(botao()?.disabled).toBe(false)
    expect(botao()?.getAttribute('aria-label')).toBe('Ditar anotação')

    const [, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ]
    expect((init.headers as Record<string, string>)['X-Duracao-Segundos']).toBe('8')
  })

  it('para sozinho em 60 s', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ texto: 'x' })))
    montar()
    await act(async () => {
      botao()!.click()
    })
    await act(async () => {
      vi.advanceTimersByTime(60_000)
    })
    expect(FakeRecorder.instancias[0].state).toBe('inactive')
    expect(tracks[0].stop).toHaveBeenCalled()
  })

  it('microfone negado e microfone ausente viram avisos', async () => {
    getUserMedia.mockRejectedValueOnce(
      Object.assign(new Error('negado'), { name: 'NotAllowedError' }),
    )
    montar()
    await act(async () => {
      botao()!.click()
    })
    expect(onAviso).toHaveBeenCalledWith('Permita o microfone para ditar')
    expect(botao()?.getAttribute('aria-label')).toBe('Ditar anotação')

    getUserMedia.mockRejectedValueOnce(
      Object.assign(new Error('nenhum'), { name: 'NotFoundError' }),
    )
    await act(async () => {
      botao()!.click()
    })
    expect(onAviso).toHaveBeenCalledWith('Nenhum microfone encontrado')
  })

  it('erro do servidor vai para onAviso', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ erro: 'x' }, { status: 502 })))
    montar()
    await act(async () => {
      botao()!.click()
    })
    await act(async () => {
      botao()!.click()
    })
    await act(async () => {
      await Promise.resolve()
    })
    expect(onAviso).toHaveBeenCalledWith('Não foi possível transcrever')
    expect(onTexto).not.toHaveBeenCalled()
  })

  it('cota esgotada: avisa, desabilita com a hora da volta e reabilita quando ela passa', async () => {
    const voltaEm = '2026-09-03T00:00:00.000Z'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ erro: 'x', voltaEm }, { status: 429 })),
    )
    montar()
    await act(async () => {
      botao()!.click()
    })
    await act(async () => {
      botao()!.click()
    })
    await act(async () => {
      await Promise.resolve()
    })
    const hora = new Date(voltaEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    expect(onAviso).toHaveBeenCalledWith(`Ditado volta às ${hora}`)
    expect(botao()?.disabled).toBe(true)
    expect(botao()?.getAttribute('aria-label')).toBe(`Ditado volta às ${hora}`)
    expect(status()).toBe(`Ditado volta às ${hora}`)

    // 9 horas depois (meia-noite UTC) o botão volta sozinho.
    await act(async () => {
      vi.advanceTimersByTime(9 * 60 * 60 * 1000)
    })
    expect(botao()?.disabled).toBe(false)
    expect(botao()?.getAttribute('aria-label')).toBe('Ditar anotação')
    expect(status()).toBeNull()
  })

  it('desmontar no meio da gravação solta o microfone e descarta o áudio', async () => {
    const fetchMock = vi.fn(async () => Response.json({ texto: 'x' }))
    vi.stubGlobal('fetch', fetchMock)
    montar()
    await act(async () => {
      botao()!.click()
    })
    act(() => root.unmount())
    expect(tracks[0].stop).toHaveBeenCalled()
    await act(async () => {
      await Promise.resolve()
    })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(onTexto).not.toHaveBeenCalled()
    // afterEach desmonta de novo: precisa de um root vivo.
    root = createRoot(host)
  })
})
