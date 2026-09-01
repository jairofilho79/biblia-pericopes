import { describe, expect, it } from 'vitest'
import { anteriorNoTestamento, proximaNoTestamento } from './content'
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
