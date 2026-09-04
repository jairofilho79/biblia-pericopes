import { describe, it, expect } from 'vitest'
import {
  corrigirVersiculo,
  DUPLICADAS,
  PARENTESES_ORFAOS,
  CORRECOES,
  SUBSCRICOES,
  OMISSOES,
} from './blivre-correcoes.ts'

describe('corrigirVersiculo — palavra duplicada', () => {
  it('remove a segunda ocorrência e o espaço que sobra', () => {
    expect(corrigirVersiculo('JOB', 13, 11, 'E o temor dele não cairá sobre sobre vós?')).toBe(
      'E o temor dele não cairá sobre vós?',
    )
  })

  it('preserva a caixa da primeira ocorrência', () => {
    expect(corrigirVersiculo('ISA', 1, 25, 'E tornarei minha minha mão contra ti')).toBe(
      'E tornarei minha mão contra ti',
    )
  })

  it('lança quando a duplicata não está mais lá — a fonte mudou', () => {
    expect(() => corrigirVersiculo('JOB', 13, 11, 'E o temor dele não cairá sobre vós?')).toThrow(
      /JOB 13:11/,
    )
  })

  it('não toca em versículo sem correção registrada', () => {
    const t = 'No princípio criou Deus os céus e a terra.'
    expect(corrigirVersiculo('GEN', 1, 1, t)).toBe(t)
  })
})

describe('corrigirVersiculo — parêntese órfão', () => {
  it('remove o fecha-parênteses que não tem abertura', () => {
    expect(
      corrigirVersiculo('NUM', 15, 38, 'dize-lhes que se façam franjas) nos arremates'),
    ).toBe('dize-lhes que se façam franjas nos arremates')
  })

  it('remove também o espaço que sobra antes dele', () => {
    expect(corrigirVersiculo('EZE', 22, 10, 'Descobriram a nudez do pai ) em ti')).toBe(
      'Descobriram a nudez do pai em ti',
    )
  })

  it('lança quando não há parêntese para remover', () => {
    expect(() => corrigirVersiculo('NUM', 15, 38, 'sem parenteses aqui')).toThrow(/NUM 15:38/)
  })
})

describe('corrigirVersiculo — correções conferidas uma a uma', () => {
  it('devolve ao Salmo 125 o sobrescrito que a fonte perdeu', () => {
    const r = corrigirVersiculo('PSA', 125, 1, 'Os que confiam no SENHOR são como o monte de Sião')
    expect(r).toBe('Cântico dos degraus:Os que confiam no SENHOR são como o monte de Sião')
  })

  it('conserta "Samo" para "Salmo" no sobrescrito do Salmo 80', () => {
    const r = corrigirVersiculo('PSA', 80, 1, 'Para o regente. Samo de Asafe:Ó Pastor de Israel')
    expect(r).toBe('Para o regente. Salmo de Asafe:Ó Pastor de Israel')
  })

  it('devolve o "som" do Salmo 150 — a KJV e a Almeida 1911 concordam', () => {
    const r = corrigirVersiculo('PSA', 150, 3, 'Louvai-o com com de trombeta; louvai-o com lira e harpa.')
    expect(r).toBe('Louvai-o com som de trombeta; louvai-o com lira e harpa.')
  })

  it('faz a crase em Êxodo 2:19', () => {
    expect(corrigirVersiculo('EXO', 2, 19, 'e deu de beber as as ovelhas.')).toBe(
      'e deu de beber às ovelhas.',
    )
  })

  it('restaura a frase que falta em 1Sm 20:42', () => {
    const r = corrigirVersiculo(
      '1SA',
      20,
      42,
      'entre minha descendência e a tua descendência para sempre.',
    )
    expect(r).toBe(
      'entre minha descendência e a tua descendência para sempre. Então Davi se levantou e se foi; e Jônatas entrou na cidade.',
    )
  })
})

describe('corrigirVersiculo — subscrição de escriba', () => {
  it('tira a nota de copista colada no fim da carta', () => {
    const r = corrigirVersiculo('EPH', 6, 24, 'A graça [seja] com todos. Amém![Escrita de Roma para os efésios, e enviada por Tíquico]')
    expect(r).toBe('A graça [seja] com todos. Amém!')
  })

  it('funciona com parênteses e com o ponto solto depois do colchete', () => {
    expect(corrigirVersiculo('COL', 4, 18, 'A graça convosco. Amém (Escrita de Roma aos colossenses.)')).toBe(
      'A graça convosco. Amém',
    )
    expect(corrigirVersiculo('1TI', 6, 21, 'A graça contigo. Amém. [A primeira carta a Timóteo foi escrita de Laodiceia] .')).toBe(
      'A graça contigo. Amém.',
    )
  })

  it('não se confunde com parêntese DENTRO da subscrição', () => {
    const r = corrigirVersiculo('2TI', 4, 22, 'A graça convosco. Amém.[A segunda carta a Timóteo (o primeiro bispo) foi escrita em Roma]')
    expect(r).toBe('A graça convosco. Amém.')
  })

  it('preserva os colchetes editoriais do corpo — quem os tira é removerColchetes', () => {
    const r = corrigirVersiculo('PHM', 1, 25, 'A graça [seja] com vosso espírito. Amém! [Escrita em Roma para Filemom]')
    expect(r).toBe('A graça [seja] com vosso espírito. Amém!')
  })

  it('lança se a subscrição não estiver mais lá', () => {
    expect(() => corrigirVersiculo('EPH', 6, 24, 'A graça com todos. Amém!')).toThrow(/EPH 6:24/)
  })
})

describe('corrigirVersiculo — frase omitida, restaurada das testemunhas', () => {
  it('devolve o dízimo de Abraão a Melquisedeque', () => {
    const r = corrigirVersiculo('GEN', 14, 20, 'E bendito seja o Deus altíssimo, que entregou teus inimigos em tua mão.')
    expect(r).toBe(
      'E bendito seja o Deus altíssimo, que entregou teus inimigos em tua mão. E deu-lhe o dízimo de tudo.',
    )
  })

  it('devolve a segunda negação de Pedro', () => {
    const r = corrigirVersiculo('LUK', 22, 58, 'E pouco depois, outro o viu, e disse: Também tu és um deles.')
    expect(r).toBe(
      'E pouco depois, outro o viu, e disse: Também tu és um deles. Porém Pedro disse: Homem, não sou.',
    )
  })

  it('restaura no MEIO do versículo quando é lá que falta', () => {
    const r = corrigirVersiculo('2CH', 12, 1, 'E quando Roboão havia confirmado o reino, deixou a lei do SENHOR, e com ele todo Israel.')
    expect(r).toBe(
      'E quando Roboão havia confirmado o reino, e havendo-se fortalecido, deixou a lei do SENHOR, e com ele todo Israel.',
    )
  })
})

describe('as tabelas', () => {
  it('toda correção manual tem motivo escrito com a testemunha', () => {
    for (const c of CORRECOES) {
      expect(c.motivo.length, c.ref).toBeGreaterThan(50)
      expect(c.motivo, c.ref).toMatch(/KJV|Almeida 1911|a própria fonte/)
    }
  })

  it('nenhuma referência aparece em duas tabelas', () => {
    const todas = [
      ...DUPLICADAS.map(([r]) => r),
      ...PARENTESES_ORFAOS,
      ...CORRECOES.map((c) => c.ref),
    ]
    expect(new Set(todas).size).toBe(todas.length)
  })

  it('o tamanho das tabelas está travado', () => {
    expect(DUPLICADAS).toHaveLength(48)
    expect(PARENTESES_ORFAOS).toHaveLength(11)
    expect(CORRECOES).toHaveLength(6)
    expect(SUBSCRICOES).toHaveLength(14)
    expect(OMISSOES).toHaveLength(28)
  })

  it('toda omissão restaurada diz de onde veio a frase', () => {
    for (const o of OMISSOES) {
      expect(o.motivo.length, o.ref).toBeGreaterThan(30)
      expect(o.para.length, o.ref).toBeGreaterThan(o.de.length)
    }
  })
})
