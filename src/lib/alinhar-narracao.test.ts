import { describe, expect, it } from 'vitest'
import { alinhar, tokens, type SecaoAlvos } from './alinhar-narracao'
import type { Manifesto } from './manifesto'
import fixture from './__fixtures__/manifesto-1600.json'

const real = fixture as unknown as Manifesto

/** Reconstrói os alvos da tela a partir do próprio manifesto: é o caso feliz
    (a tela mostra exatamente o que foi narrado, sem cabeçalho nem prefixo). */
function alvosDoManifesto(m: Manifesto, secao: 'contexto' | 'texto' | 'resenha' | 'reflexoes') {
  return m.unidades
    .filter((u) => u.secao === secao)
    .slice(1)
    .map((u, k) => ({
      id: `${secao}-${k}`,
      texto: u.texto.replace(/^(?:Capítulo|Reflexão)\s+\d+\.\s+/, ''),
    }))
}

describe('tokens', () => {
  it('é split(" ") puro — sem trim, sem filtro', () => {
    expect(tokens('a  b')).toEqual(['a', '', 'b'])
    expect(tokens('a b')).toEqual(['a', 'b'])
  })
})

describe('alinhar — manifesto real 1600', () => {
  it('alinha o texto bíblico versículo a versículo', () => {
    const alvos = alvosDoManifesto(real, 'texto')
    const r = alinhar(real, [{ secao: 'texto', alvos }])
    expect(r).toHaveLength(17)
    expect(r[0]!.id).toBe('texto-0')
    // "Capítulo 1." saiu: a 1ª palavra do 1º versículo é "Livro".
    expect(r[0]!.palavras).toHaveLength(tokens(alvos[0]!.texto).length)
    expect(r[0]!.inicio).toBeGreaterThan(42) // depois de "Capítulo 1."
  })

  it('alinha contexto com 1 unidade e 2 parágrafos na tela', () => {
    const uni = real.unidades.filter((u) => u.secao === 'contexto')[1]!
    const tk = tokens(uni.texto)
    const corte = 30
    const alvos = [
      { id: 'contexto-0', texto: tk.slice(0, corte).join(' ') },
      { id: 'contexto-1', texto: tk.slice(corte).join(' ') },
    ]
    const r = alinhar(real, [{ secao: 'contexto', alvos }])
    expect(r.map((a) => a.id)).toEqual(['contexto-0', 'contexto-1'])
    expect(r[0]!.palavras).toHaveLength(corte)
    expect(r[1]!.palavras).toHaveLength(tk.length - corte)
    // contíguo: o fim do primeiro é o início do segundo.
    expect(r[0]!.fim).toBe(r[1]!.inicio)
  })

  it('descarta o prefixo "Reflexão N."', () => {
    const alvos = alvosDoManifesto(real, 'reflexoes')
    const r = alinhar(real, [{ secao: 'reflexoes', alvos }])
    expect(r).toHaveLength(2)
    expect(r[0]!.palavras).toHaveLength(tokens(alvos[0]!.texto).length)
  })

  it('as janelas de palavra são contíguas e cobrem o alvo inteiro', () => {
    const alvos = alvosDoManifesto(real, 'resenha')
    const r = alinhar(real, [{ secao: 'resenha', alvos }])
    for (const a of r) {
      for (let k = 1; k < a.palavras.length; k++) {
        expect(a.palavras[k]!.inicio).toBe(a.palavras[k - 1]!.fim)
      }
      expect(a.palavras[0]!.inicio).toBe(a.inicio)
      expect(a.palavras[a.palavras.length - 1]!.fim).toBe(a.fim)
    }
  })

  it('as quatro seções juntas saem ordenadas por início, sem sobreposição', () => {
    const secoes: SecaoAlvos[] = (['contexto', 'texto', 'resenha', 'reflexoes'] as const).map(
      (s) => ({ secao: s, alvos: alvosDoManifesto(real, s) }),
    )
    // o contexto real tem 1 unidade só; aqui isso vira 1 alvo, e alinha igual.
    const r = alinhar(real, secoes)
    expect(r.length).toBe(1 + 17 + 2 + 2)
    for (let k = 1; k < r.length; k++) expect(r[k]!.inicio).toBeGreaterThanOrEqual(r[k - 1]!.fim)
  })

  it('ignora a seção titulo (não tem alvo na tela)', () => {
    const r = alinhar(real, [])
    expect(r).toEqual([])
  })
})

describe('alinhar — recusas', () => {
  const uma = (u: Partial<Manifesto['unidades'][number]>): Manifesto => ({
    ordem: 1,
    dur_total: 10,
    unidades: [
      { i: 0, secao: 'resenha', texto: 'Resenha.', inicio: 0, dur: 1, palavras: [{ t: 'Resenha.', i: 0, d: 1 }] },
      {
        i: 1,
        secao: 'resenha',
        texto: 'um dois',
        inicio: 2,
        dur: 2,
        palavras: [{ t: 'um', i: 2, d: 1 }, { t: 'dois', i: 3, d: 1 }],
        ...u,
      },
    ],
  })

  it('texto da tela diferente do narrado derruba a seção', () => {
    const r = alinhar(uma({}), [{ secao: 'resenha', alvos: [{ id: 'r-0', texto: 'um tres' }] }])
    expect(r).toEqual([])
  })

  it('contagem diferente derruba a seção', () => {
    const r = alinhar(uma({}), [{ secao: 'resenha', alvos: [{ id: 'r-0', texto: 'um' }] }])
    expect(r).toEqual([])
  })

  it('unidade sem palavras derruba a seção', () => {
    const r = alinhar(uma({ palavras: undefined }), [
      { secao: 'resenha', alvos: [{ id: 'r-0', texto: 'um dois' }] },
    ])
    expect(r).toEqual([])
  })

  it('palavras que não reproduzem o texto derrubam a seção', () => {
    const m = uma({ palavras: [{ t: 'um', i: 2, d: 1 }, { t: 'DOIS', i: 3, d: 1 }] })
    const r = alinhar(m, [{ secao: 'resenha', alvos: [{ id: 'r-0', texto: 'um dois' }] }])
    expect(r).toEqual([])
  })

  it('uma seção quebrada não derruba as outras', () => {
    const secoes: SecaoAlvos[] = [
      { secao: 'texto', alvos: [{ id: 'v', texto: 'nao bate' }] },
      { secao: 'resenha', alvos: alvosDoManifesto(real, 'resenha') },
    ]
    const r = alinhar(real, secoes)
    expect(r.map((a) => a.id)).toEqual(alvosDoManifesto(real, 'resenha').map((a) => a.id))
  })

  it('seção ausente do manifesto sai vazia, sem lançar', () => {
    const r = alinhar(uma({}), [{ secao: 'contexto', alvos: [{ id: 'c-0', texto: 'oi' }] }])
    expect(r).toEqual([])
  })

  it('prefixo que NÃO é prefixo é preservado', () => {
    // A tela diz literalmente "Capítulo 3. começa aqui" — não é o marcador
    // fundido, é o texto. Descartar mutilaria o alinhamento.
    const m: Manifesto = {
      ordem: 1,
      dur_total: 10,
      unidades: [
        { i: 0, secao: 'texto', texto: 'Texto Bíblico.', inicio: 0, dur: 1, palavras: [{ t: 'Texto', i: 0, d: 0.5 }, { t: 'Bíblico.', i: 0.5, d: 0.5 }] },
        {
          i: 1,
          secao: 'texto',
          texto: 'Capítulo 3. começa aqui',
          inicio: 2,
          dur: 4,
          palavras: [
            { t: 'Capítulo', i: 2, d: 1 },
            { t: '3.', i: 3, d: 1 },
            { t: 'começa', i: 4, d: 1 },
            { t: 'aqui', i: 5, d: 1 },
          ],
        },
      ],
    }
    const r = alinhar(m, [{ secao: 'texto', alvos: [{ id: 'v', texto: 'Capítulo 3. começa aqui' }] }])
    expect(r).toHaveLength(1)
    expect(r[0]!.palavras).toHaveLength(4)
  })
})
