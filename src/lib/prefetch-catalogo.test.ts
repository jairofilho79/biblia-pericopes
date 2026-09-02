// @vitest-environment happy-dom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { filaDePrefetch, iniciarPrefetch, __resetStateForTesting } from './prefetch-catalogo'
import * as contentModule from './content'
import * as shardsModule from './shards'

describe('filaDePrefetch', () => {
  // Todos os textos antes de qualquer estudo: é o que destrava a busca com
  // 4,3 MB em vez de 13,7 MB.
  it('põe todos os textos antes de todos os estudos', () => {
    const fila = filaDePrefetch(['genesis', 'exodo'])
    expect(fila).toEqual([
      { tipo: 'texto', slug: 'genesis' },
      { tipo: 'texto', slug: 'exodo' },
      { tipo: 'estudo', slug: 'genesis' },
      { tipo: 'estudo', slug: 'exodo' },
    ])
  })

  it('lista vazia não gera trabalho', () => {
    expect(filaDePrefetch([])).toEqual([])
  })
})

describe('iniciarPrefetch', () => {
  beforeEach(() => {
    __resetStateForTesting()
    vi.clearAllMocks()
    // Stub requestIdleCallback para rodar callback sincronamente em testes
    vi.stubGlobal('requestIdleCallback', (cb: () => void) => {
      cb()
      return 0 as unknown as number
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    __resetStateForTesting()
  })

  it('segunda chamada durante execução é idempotente', async () => {
    const fakeIndex = [
      { livro: 'Gênesis', capitulos: 50 },
      { livro: 'Êxodo', capitulos: 40 },
    ]

    vi.spyOn(contentModule, 'loadIndex').mockResolvedValue(fakeIndex as any)
    vi.spyOn(shardsModule, 'shardCarregado').mockReturnValue(false)
    vi.spyOn(shardsModule, 'carregarTexto').mockImplementation(async () => {
      // Simular delay para deixar segunda chamada acontecer
      await new Promise((resolve) => setTimeout(resolve, 10))
      return new Map<number, string>()
    })
    vi.spyOn(shardsModule, 'carregarEstudo').mockResolvedValue(new Map())

    iniciarPrefetch()
    iniciarPrefetch() // Segunda chamada enquanto primeira está rodando

    await new Promise((resolve) => setTimeout(resolve, 100))

    // loadIndex deve ser chamado uma só vez
    expect(contentModule.loadIndex).toHaveBeenCalledTimes(1)
  })

  // Sem o service worker no controle, os shards baixados aqui iriam parar só na
  // memória do módulo — nunca no Cache Storage — e o app não abriria offline.
  it('espera o service worker assumir antes de encher a fila', async () => {
    let assumiu: () => void = () => {}
    const pronto = new Promise<void>((resolve) => {
      assumiu = resolve
    })
    vi.stubGlobal('navigator', { serviceWorker: { ready: pronto } })
    vi.spyOn(contentModule, 'loadIndex').mockResolvedValue([{ livro: 'Gênesis' }] as any)
    vi.spyOn(shardsModule, 'shardCarregado').mockReturnValue(true)

    iniciarPrefetch()
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(contentModule.loadIndex).not.toHaveBeenCalled()

    assumiu()
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(contentModule.loadIndex).toHaveBeenCalledTimes(1)
  })

  it('após falha, pode retomar sem re-fazer downloads', async () => {
    const fakeIndex = [
      { livro: 'Gênesis', capitulos: 50 },
      { livro: 'Êxodo', capitulos: 40 },
    ]

    let tentativas = 0
    vi.spyOn(contentModule, 'loadIndex').mockImplementation(async () => {
      tentativas++
      if (tentativas === 1) throw new Error('Rede indisponível')
      return fakeIndex as any
    })
    vi.spyOn(shardsModule, 'shardCarregado').mockReturnValue(false)
    vi.spyOn(shardsModule, 'carregarTexto').mockResolvedValue(new Map<number, string>())
    vi.spyOn(shardsModule, 'carregarEstudo').mockResolvedValue(new Map())

    // Primeira tentativa falha
    iniciarPrefetch()
    await new Promise((resolve) => setTimeout(resolve, 50))

    // Segunda tentativa (após recuperação) começa do índice novamente
    iniciarPrefetch()
    await new Promise((resolve) => setTimeout(resolve, 50))

    // loadIndex foi chamado 2 vezes: primeira falha, segunda sucesso
    expect(contentModule.loadIndex).toHaveBeenCalledTimes(2)
  })
})
