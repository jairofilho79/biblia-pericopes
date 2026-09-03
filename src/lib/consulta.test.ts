import { describe, expect, it } from 'vitest'
import { parseConsulta } from './consulta'
import { BIBLE_BOOKS } from './bible-books'

describe('parseConsulta — referência', () => {
  it('abbrev + capítulo + versículo', () => {
    const c = parseConsulta('Jo 3:16')
    expect(c.ref?.livro.name).toBe('João')
    expect(c.ref?.cap).toBe(3)
    expect(c.ref?.ver).toBe(16)
  })

  it('não busca no texto quando é referência — "jo 3:16" não é um trecho', () => {
    expect(parseConsulta('Jo 3:16').buscarNoTexto).toBe(false)
  })

  it('a seção Livros mostra o livro da referência', () => {
    expect(parseConsulta('Jo 3:16').livros.map((b) => b.name)).toEqual(['João'])
  })

  it('só capítulo, sem versículo', () => {
    const c = parseConsulta('Salmos 23')
    expect(c.ref?.livro.name).toBe('Salmos')
    expect(c.ref?.cap).toBe(23)
    expect(c.ref?.ver).toBeNull()
  })

  it('aceita ponto e vírgula como separador de versículo', () => {
    expect(parseConsulta('Jo 3.16').ref?.ver).toBe(16)
    expect(parseConsulta('Jo 3,16').ref?.ver).toBe(16)
  })

  it('o espaço do ordinal não conta: "1 co 13" é 1 Coríntios 13', () => {
    const c = parseConsulta('1 co 13')
    expect(c.ref?.livro.name).toBe('1 Coríntios')
    expect(c.ref?.cap).toBe(13)
  })

  it('nome completo com ordinal', () => {
    expect(parseConsulta('1 Samuel 3').ref?.livro.name).toBe('1 Samuel')
  })
})

describe('parseConsulta — a colisão jo/jó', () => {
  it('abbrev é sensível a acento: "jo 3:16" é João', () => {
    expect(parseConsulta('jo 3:16').ref?.livro.name).toBe('João')
  })

  it('abbrev é sensível a acento: "jó 3:16" é Jó', () => {
    expect(parseConsulta('jó 3:16').ref?.livro.name).toBe('Jó')
  })

  it('"jo" sozinho não é referência e lista os cinco livros que começam com jo', () => {
    const c = parseConsulta('jo')
    expect(c.ref).toBeNull()
    expect(c.livros.map((b) => b.name)).toEqual(['Josué', 'Jó', 'Joel', 'Jonas', 'João'])
  })

  it('fronteira de palavra: "josue 3" é Josué, não João seguido de "sue 3"', () => {
    expect(parseConsulta('josue 3').ref?.livro.name).toBe('Josué')
  })
})

describe('parseConsulta — fora de faixa', () => {
  it('capítulo alto demais explica em vez de sumir', () => {
    const c = parseConsulta('João 99')
    expect(c.ref).toBeNull()
    expect(c.refForaDeFaixa?.motivo).toBe('João tem 21 capítulos.')
    expect(c.buscarNoTexto).toBe(false)
    expect(c.livros.map((b) => b.name)).toEqual(['João'])
  })

  it('versículo alto demais explica', () => {
    const c = parseConsulta('João 3:99')
    expect(c.refForaDeFaixa?.motivo).toBe('João 3 tem 36 versículos.')
  })
})

describe('parseConsulta — texto livre', () => {
  it('sem token de livro, busca no texto', () => {
    const c = parseConsulta('amor de Deus')
    expect(c.ref).toBeNull()
    expect(c.livros).toEqual([])
    expect(c.buscarNoTexto).toBe(true)
  })

  it('nome de livro sozinho é ambíguo: livro E busca no texto', () => {
    const c = parseConsulta('josué')
    expect(c.ref).toBeNull()
    expect(c.livros.map((b) => b.name)).toEqual(['Josué'])
    expect(c.buscarNoTexto).toBe(true)
  })

  it('abaixo de MIN_CHARS não busca no texto', () => {
    expect(parseConsulta('am').buscarNoTexto).toBe(false)
  })

  it('vazio é vazio', () => {
    const c = parseConsulta('   ')
    expect(c.termo).toBe('')
    expect(c.livros).toEqual([])
    expect(c.buscarNoTexto).toBe(false)
  })

  it('referência sem livro cai no texto — "3:16" sozinho tem 66 respostas', () => {
    const c = parseConsulta('3:16')
    expect(c.ref).toBeNull()
    expect(c.buscarNoTexto).toBe(true)
  })
})

describe('parseConsulta — cobertura dos 66', () => {
  it('todo nome de livro + capítulo 1 vira referência para o livro certo', () => {
    for (const b of BIBLE_BOOKS) {
      expect(parseConsulta(`${b.name} 1`).ref?.livro.name).toBe(b.name)
    }
  })

  it('todo abbrev + capítulo 1 vira referência para o livro certo', () => {
    for (const b of BIBLE_BOOKS) {
      expect(parseConsulta(`${b.abbrev} 1`).ref?.livro.name).toBe(b.name)
    }
  })
})
