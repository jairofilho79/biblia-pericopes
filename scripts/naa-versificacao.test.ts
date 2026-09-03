import { describe, it, expect } from 'vitest'
import { aplicarConserto, CONSERTOS, type Chapters } from './naa-versificacao.ts'

/** Miniatura do padrão real: cap 3 truncado, cap 4 com dois intrusos. */
function fixture(): Chapters {
  return [
    ['1-1'],
    ['2-1'],
    ['3-1', '3-2', '3-3'],
    ['4-1', '4-2', '4-3', 'INTRUSO A resto', '4-4', 'INTRUSO B resto', '4-5'],
  ]
}

const conserto = {
  abbrev: 'Os',
  origem: 3,
  destino: 4,
  posicoes: [4, 6],
  comeca: ['INTRUSO A', 'INTRUSO B'],
}

describe('aplicarConserto', () => {
  it('move os intrusos para o fim do capítulo de origem', () => {
    const chapters = fixture()
    expect(aplicarConserto(chapters, conserto)).toEqual({ aplicado: true })
    expect(chapters[2]).toEqual(['3-1', '3-2', '3-3', 'INTRUSO A resto', 'INTRUSO B resto'])
    expect(chapters[3]).toEqual(['4-1', '4-2', '4-3', '4-4', '4-5'])
  })

  it('é idempotente: rodar de novo não faz nada', () => {
    const chapters = fixture()
    aplicarConserto(chapters, conserto)
    const depois = JSON.parse(JSON.stringify(chapters))
    const r = aplicarConserto(chapters, conserto)
    expect(r.aplicado).toBe(false)
    expect(r.motivo).toContain('já consertado')
    expect(chapters).toEqual(depois)
  })

  it('recusa quando o texto não é o esperado, sem mutar nada', () => {
    const chapters = fixture()
    chapters[3][3] = 'outra coisa qualquer'
    const antes = JSON.parse(JSON.stringify(chapters))
    const r = aplicarConserto(chapters, conserto)
    expect(r.aplicado).toBe(false)
    expect(r.motivo).toContain('texto inesperado')
    expect(chapters).toEqual(antes)
  })

  it('não conserta pela metade quando só um guard casa', () => {
    const chapters = fixture()
    chapters[3][5] = 'nao e o intruso B'
    const antes = JSON.parse(JSON.stringify(chapters))
    aplicarConserto(chapters, conserto)
    expect(chapters).toEqual(antes)
  })

  it('a tabela de consertos tem um prefixo por posição', () => {
    for (const c of CONSERTOS) {
      expect(c.comeca).toHaveLength(c.posicoes.length)
      expect(c.origem).toBeLessThan(c.destino)
    }
  })
})
