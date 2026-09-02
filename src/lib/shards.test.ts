import { beforeEach, describe, expect, it, vi } from 'vitest'
import { carregarEstudo, carregarTexto, shardCarregado } from './shards'

function respostaJson(body: unknown): Response {
  return { ok: true, json: async () => body } as Response
}

beforeEach(() => {
  vi.unstubAllGlobals()
})

describe('carregarTexto', () => {
  it('mapeia ordem → texto e busca o arquivo do livro', async () => {
    const fetchMock = vi.fn(async () =>
      respostaJson([{ ordem: 7, texto_naa: 'No princípio' }]),
    )
    vi.stubGlobal('fetch', fetchMock)

    const mapa = await carregarTexto('genesis')

    expect(mapa.get(7)).toBe('No princípio')
    expect((fetchMock.mock.calls[0] as unknown[])[0]).toContain('data/texto/genesis.json')
  })

  it('não busca o mesmo livro duas vezes', async () => {
    const fetchMock = vi.fn(async () => respostaJson([{ ordem: 1, texto_naa: 'a' }]))
    vi.stubGlobal('fetch', fetchMock)

    await carregarTexto('exodo')
    await carregarTexto('exodo')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(shardCarregado('texto', 'exodo')).toBe(true)
  })

  it('uma falha não fica grudada: a próxima tentativa busca de novo', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(respostaJson([{ ordem: 2, texto_naa: 'b' }]))
    vi.stubGlobal('fetch', fetchMock)

    await expect(carregarTexto('levitico')).rejects.toThrow('offline')
    expect(shardCarregado('texto', 'levitico')).toBe(false)
    expect((await carregarTexto('levitico')).get(2)).toBe('b')
  })
})

describe('carregarEstudo', () => {
  it('mapeia ordem → bloco de estudo', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        respostaJson([
          {
            ordem: 3,
            contexto_historico_literario: 'ctx',
            resenha: 'res',
            perguntas_reflexao: ['q1'],
          },
        ]),
      ),
    )

    const mapa = await carregarEstudo('numeros')

    expect(mapa.get(3)?.resenha).toBe('res')
    expect(mapa.get(3)?.perguntas_reflexao).toEqual(['q1'])
  })
})
