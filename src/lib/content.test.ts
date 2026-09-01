import { describe, expect, it } from 'vitest'
import { anteriorNoTestamento, progressoPorLivro, proximaNoTestamento } from './content'
import type { Pericope } from './types'

function peri(ordem: number, abbrev: string): Pericope {
  return { ordem, abbrev, livro: abbrev, titulo_pericope_pt: `P${ordem}` } as Pericope
}

// Gn (VT) ordens 1-2; Mt (NT) ordens 3-4
const ALL = [peri(1, 'Gn'), peri(2, 'Gn'), peri(3, 'Mt'), peri(4, 'Mt')]

describe('anteriorNoTestamento', () => {
  it('volta uma perícope dentro do testamento', () => {
    expect(anteriorNoTestamento(ALL, 2)).toBe(1)
    expect(anteriorNoTestamento(ALL, 4)).toBe(3)
  })

  it('primeira do testamento não tem anterior (não cruza a fronteira)', () => {
    expect(anteriorNoTestamento(ALL, 1)).toBeNull()
    expect(anteriorNoTestamento(ALL, 3)).toBeNull()
  })

  it('ordem inexistente retorna null', () => {
    expect(anteriorNoTestamento(ALL, 99)).toBeNull()
  })

  it('espelha proximaNoTestamento na outra ponta', () => {
    expect(proximaNoTestamento(ALL, 2)).toBeNull()
    expect(proximaNoTestamento(ALL, 1)).toBe(2)
  })
})

function pl(ordem: number, livro: string): Pericope {
  return { ordem, livro, abbrev: livro.slice(0, 2), titulo_pericope_pt: `P${ordem}` } as Pericope
}

describe('progressoPorLivro', () => {
  const LISTA = [pl(1, 'Gênesis'), pl(2, 'Gênesis'), pl(3, 'Gênesis'), pl(4, 'Êxodo')]

  it('conta total e concluídas por livro, na ordem de aparição', () => {
    const m = progressoPorLivro(LISTA, new Set([1, 3, 4]))
    expect([...m.keys()]).toEqual(['Gênesis', 'Êxodo'])
    expect(m.get('Gênesis')).toEqual({ livro: 'Gênesis', total: 3, concluidas: 2, pct: 67 })
    expect(m.get('Êxodo')).toEqual({ livro: 'Êxodo', total: 1, concluidas: 1, pct: 100 })
  })

  it('livro sem nenhuma concluída fica em 0%', () => {
    const m = progressoPorLivro(LISTA, new Set())
    expect(m.get('Gênesis')?.pct).toBe(0)
    expect(m.get('Êxodo')?.concluidas).toBe(0)
  })

  it('lista vazia devolve mapa vazio', () => {
    expect(progressoPorLivro([], new Set([1]))).toEqual(new Map())
  })
})
