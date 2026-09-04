import { describe, it, expect } from 'vitest'
import { converterVpl, MAPA_LIVROS } from './blivre-fonte.ts'

const vpl = (...linhas: string[]) => linhas.join('\n') + '\n'

describe('converterVpl', () => {
  it('monta livro, capítulo e versículo a partir do VPL', () => {
    const livros = converterVpl(
      vpl('GEN 1:1 No princípio criou Deus os céus e a terra.', 'GEN 1:2 E a terra estava vazia.', 'GEN 2:1 Assim foram acabados os céus.'),
    )
    expect(livros).toHaveLength(1)
    expect(livros[0].abbrev).toBe('Gn')
    expect(livros[0].name).toBe('Gênesis')
    expect(livros[0].chapters).toHaveLength(2)
    expect(livros[0].chapters[0]).toHaveLength(2)
    expect(livros[0].chapters[0][0]).toEqual({ t: 'No princípio criou Deus os céus e a terra.' })
    expect(livros[0].chapters[1][0]).toEqual({ t: 'Assim foram acabados os céus.' })
  })

  it('engole o BOM e o CRLF', () => {
    const livros = converterVpl('﻿GEN 1:1 No princípio.\r\nGEN 1:2 E a terra.\r\n')
    expect(livros[0].chapters[0].map((v) => v.t)).toEqual(['No princípio.', 'E a terra.'])
  })

  it('separa o sobrescrito do salmo e guarda em `e`', () => {
    // O VPL é denso: para chegar no Salmo 23 é preciso passar pelos 22 antes.
    const ate22 = Array.from({ length: 22 }, (_, i) => `PSA ${i + 1}:1 verso de encher`)
    const livros = converterVpl(vpl(...ate22, 'PSA 23:1 Salmo de Davi:O SENHOR é meu pastor.'))
    expect(livros[0].chapters[22][0]).toEqual({ t: 'O SENHOR é meu pastor.', e: 'Salmo de Davi' })
  })

  it('separa o rótulo estrutural, que vem entre colchetes', () => {
    const livros = converterVpl(
      vpl('SOL 1:1 Cântico dos cânticos, que é de Salomão.', 'SOL 1:2 [Ela] : Beije-me ele com os beijos de sua boca'),
    )
    expect(livros[0].chapters[0][1]).toEqual({
      t: 'Beije-me ele com os beijos de sua boca',
      e: 'Ela',
    })
  })

  it('tira os colchetes do corpo, mas não da epígrafe', () => {
    const livros = converterVpl(
      vpl('SOL 1:1 Cântico dos cânticos.', 'SOL 1:2 [Ela] : Como [tu és] agradável!'),
    )
    expect(livros[0].chapters[0][1]).toEqual({ t: 'Como tu és agradável!', e: 'Ela' })
  })

  it('lança em código de livro desconhecido', () => {
    expect(() => converterVpl(vpl('XYZ 1:1 texto'))).toThrow(/XYZ/)
  })

  it('lança quando falta um versículo no meio do capítulo', () => {
    expect(() => converterVpl(vpl('GEN 1:1 um', 'GEN 1:3 três'))).toThrow(/Gn 1:2/)
  })

  it('lança quando falta um capítulo no meio do livro', () => {
    expect(() => converterVpl(vpl('GEN 1:1 um', 'GEN 3:1 três'))).toThrow(/Gn 2/)
  })

  it('ignora linha em branco', () => {
    const livros = converterVpl(vpl('GEN 1:1 um', '', 'GEN 1:2 dois'))
    expect(livros[0].chapters[0]).toHaveLength(2)
  })
})

describe('MAPA_LIVROS', () => {
  it('cobre os 66 livros', () => {
    expect(Object.keys(MAPA_LIVROS)).toHaveLength(66)
  })

  it('não repete abreviatura', () => {
    const abbrevs = Object.values(MAPA_LIVROS).map((l) => l.abbrev)
    expect(new Set(abbrevs).size).toBe(66)
  })
})
