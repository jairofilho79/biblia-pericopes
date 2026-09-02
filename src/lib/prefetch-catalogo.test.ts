import { describe, expect, it } from 'vitest'
import { filaDePrefetch } from './prefetch-catalogo'

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
