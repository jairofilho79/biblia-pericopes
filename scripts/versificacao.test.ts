import { describe, it, expect } from 'vitest'
import { ajustarVersificacao, AJUSTES } from './versificacao.ts'

const ref = (livroEn: string, capitulo: number, versiculo: number) => ({
  livroEn,
  capitulo,
  versiculo,
})

describe('ajustarVersificacao', () => {
  it('estende o fim quando a NAA tem um versículo a mais', () => {
    const r = ajustarVersificacao(544, ref('1 Samuel', 20, 30), ref('1 Samuel', 20, 42))
    expect(r.ajustado).toBe(true)
    expect(r.end.versiculo).toBe(43)
    expect(r.start.versiculo).toBe(30)
  })

  it('move o início, sem tocar no fim, quando o versículo abre a cena seguinte', () => {
    const r = ajustarVersificacao(2613, ref('Revelation', 13, 1), ref('Revelation', 13, 10))
    expect(r.start).toEqual({ livroEn: 'Revelation', capitulo: 12, versiculo: 18 })
    expect(r.end).toEqual({ livroEn: 'Revelation', capitulo: 13, versiculo: 10 })
  })

  it('encolhe o fim quando a faixa declarada passa do que a NAA tem', () => {
    const r = ajustarVersificacao(2316, ref('2 Corinthians', 13, 11), ref('2 Corinthians', 13, 14))
    expect(r.end.versiculo).toBe(13)
  })

  it('devolve intacto quando a ordem não tem ajuste', () => {
    const s = ref('Genesis', 1, 1)
    const e = ref('Genesis', 2, 3)
    const r = ajustarVersificacao(0, s, e)
    expect(r).toEqual({ start: s, end: e, ajustado: false })
  })

  it('lança quando o livro não bate — o dataset mudou de ordem', () => {
    expect(() => ajustarVersificacao(544, ref('Judges', 20, 30), ref('Judges', 20, 42))).toThrow(
      /espera 1 Samuel/,
    )
  })

  it('a tabela cobre exatamente os cinco casos conhecidos, com motivo escrito', () => {
    expect(AJUSTES).toHaveLength(5)
    expect(AJUSTES.map((a) => a.ordem).sort((x, y) => x - y)).toEqual([544, 707, 2316, 2542, 2613])
    for (const a of AJUSTES) {
      expect(a.motivo.length).toBeGreaterThan(40)
      expect(a.inicio ?? a.fim).toBeDefined()
    }
  })
})
