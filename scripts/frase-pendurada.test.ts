import { describe, expect, it } from 'vitest'
import { aplicarVeredito, pendurada } from './frase-pendurada.ts'

describe('pendurada', () => {
  it('acha a frase-molde no fim do campo', () => {
    expect(pendurada('Jacó mora em Canaã.\n\nRepare em qual irmão fala primeiro.')).toBe(
      'Repare em qual irmão fala primeiro.',
    )
  })

  it('ignora a mesma palavra no meio do texto', () => {
    // No meio, a frase costuma estar amarrada ao que vem depois; cortá-la
    // perderia ligação, e foi isso que os leitores recusaram em Dt 1 e 2Sm 1.
    expect(pendurada('Repare que o texto muda. Depois disso, Jacó parte de Berseba.')).toBeNull()
  })

  it('acha a que anuncia e entrega — quem decide é o julgamento, não o regex', () => {
    const boa = 'Guarde isso ao ler: o pai tem só mais um filho daquela mulher.'
    expect(pendurada(`A casa é dividida por mães. ${boa}`)).toBe(boa)
  })
})

describe('aplicarVeredito', () => {
  const ctx = 'A casa é dividida por mães. Repare em quem fala primeiro.'
  const frase = 'Repare em quem fala primeiro.'

  it('entrega não muda nada', () => {
    expect(aplicarVeredito(ctx, frase, { ordem: 1, veredito: 'entrega' })).toBe(ctx)
  })

  it('corta remove a frase e não deixa espaço solto', () => {
    expect(aplicarVeredito(ctx, frase, { ordem: 1, veredito: 'corta' })).toBe(
      'A casa é dividida por mães.',
    )
  })

  it('responde troca a frase pela que entrega o fato', () => {
    const novo = 'Judá é quem fala primeiro, e é ele quem propôs vender José.'
    expect(aplicarVeredito(ctx, frase, { ordem: 1, veredito: 'responde', novo })).toBe(
      `A casa é dividida por mães. ${novo}`,
    )
  })

  it('recusa trocar uma frase pendurada por outra', () => {
    expect(() =>
      aplicarVeredito(ctx, frase, {
        ordem: 1,
        veredito: 'responde',
        novo: 'Repare também em quem cala.',
      }),
    ).toThrow(/também está pendurada/)
  })

  it('recusa quando a frase não está mais no contexto', () => {
    expect(() => aplicarVeredito(ctx, 'frase que não existe', { ordem: 1, veredito: 'corta' })).toThrow(
      /não está mais/,
    )
  })

  it('recusa responde sem a frase nova', () => {
    expect(() => aplicarVeredito(ctx, frase, { ordem: 1, veredito: 'responde' })).toThrow(/sem frase nova/)
  })
})
