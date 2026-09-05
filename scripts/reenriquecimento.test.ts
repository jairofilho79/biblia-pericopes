import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  dirs,
  criarDirs,
  montarEntrada,
  referencia,
  pendentes,
  travar,
  destravar,
  soltarTravasOrfas,
  espalharPorLivro,
  montarLote,
  conferirSaidas,
  devolverReprovadas,
  type Dirs,
  type Bruta,
} from './reenriquecimento.ts'

const bruta = (o: Partial<Bruta> = {}): Bruta => ({
  ordem: 1,
  livro: 'Gênesis',
  abbrev: 'Gn',
  capitulo_inicio: 1,
  versiculo_inicio: 1,
  capitulo_fim: 2,
  versiculo_fim: 3,
  texto: 'Capítulo 1\n1 No princípio criou Deus os céus e a terra.',
  titulo_en: 'The Creation',
  ...o,
})

describe('referencia', () => {
  it('versículo único', () => {
    expect(referencia(bruta({ capitulo_fim: 1, versiculo_fim: 1 }))).toBe('Gn 1:1')
  })
  it('dentro de um capítulo', () => {
    expect(referencia(bruta({ capitulo_fim: 1, versiculo_fim: 5 }))).toBe('Gn 1:1-5')
  })
  it('atravessando capítulos', () => {
    expect(referencia(bruta())).toBe('Gn 1:1—2:3')
  })
})

describe('montarEntrada', () => {
  const anterior = {
    titulo_pericope_pt: 'A criação',
    contexto_historico_literario: 'ctx',
    resenha: 'res',
    perguntas_reflexao: ['a', 'b'],
    topicos_pregar: 'top',
  }

  it('a antiga NÃO leva o material anterior — mostrá-lo ancoraria no patamar que estamos trocando', () => {
    const e = montarEntrada(bruta({ ordem: 42 }), anterior)
    expect(e.material_anterior).toBeUndefined()
    expect(e.titulo_provisorio).toBe('The Creation')
  })

  it('a nova leva, porque o trabalho dela é reancorar sem perder o insight', () => {
    const e = montarEntrada(bruta({ ordem: 3000, titulo_provisorio: 'Caim e Abel' }), anterior)
    expect(e.material_anterior).toEqual(anterior)
    expect(e.titulo_provisorio).toBe('Caim e Abel')
  })

  it('carrega o sobrescrito quando existe', () => {
    const e = montarEntrada(bruta({ sobrescrito: 'Salmo de Davi' }))
    expect(e.sobrescrito).toBe('Salmo de Davi')
  })
})

describe('fila em disco', () => {
  let base: string
  let d: Dirs

  const semear = (ordem: number, extra: Partial<Bruta> = {}) => {
    writeFileSync(
      join(d.entrada, `${ordem}.json`),
      JSON.stringify(montarEntrada(bruta({ ordem, ...extra }))),
    )
  }

  beforeEach(() => {
    base = mkdtempSync(join(tmpdir(), 'reenriq-'))
    d = dirs(base)
    criarDirs(d)
  })
  afterEach(() => rmSync(base, { recursive: true, force: true }))

  it('pendente é o que tem entrada, não tem saída e não está travado', () => {
    semear(1)
    semear(2)
    semear(3)
    writeFileSync(join(d.saida, '2.json'), '{}')
    travar(d, 3)
    expect(pendentes(d)).toEqual([1])
  })

  it('travar é atômico: o segundo pedido da mesma ordem recebe false', () => {
    semear(1)
    expect(travar(d, 1)).toBe(true)
    expect(travar(d, 1)).toBe(false)
    destravar(d, 1)
    expect(travar(d, 1)).toBe(true)
  })

  it('solta só as travas órfãs — a que tem saída é trabalho terminado, não abandonado', () => {
    semear(1)
    semear(2)
    travar(d, 1)
    travar(d, 2)
    writeFileSync(join(d.saida, '2.json'), '{}')
    expect(soltarTravasOrfas(d)).toEqual([1])
    expect(existsSync(join(d.travas, '2'))).toBe(true)
    expect(pendentes(d)).toEqual([1])
  })

  it('espalha por livro em vez de pegar as n primeiras', () => {
    for (const o of [1, 2, 3]) semear(o, { abbrev: 'Gn' })
    for (const o of [10, 11]) semear(o, { abbrev: 'Sl' })
    semear(20, { abbrev: 'Rm' })
    expect(espalharPorLivro(d, pendentes(d), 3)).toEqual([1, 10, 20])
  })

  it('espalhar não estoura quando n é maior do que o disponível', () => {
    semear(1, { abbrev: 'Gn' })
    semear(2, { abbrev: 'Sl' })
    expect(espalharPorLivro(d, pendentes(d), 10)).toEqual([1, 2])
  })

  it('montar lote trava as ordens e grava o arquivo que o subagent lê', () => {
    semear(1)
    semear(2)
    const lote = montarLote(d, [1, 2], 'l1')!
    expect(lote.ordens).toEqual([1, 2])
    expect(pendentes(d)).toEqual([])
    const conteudo = JSON.parse(readFileSync(lote.arquivo, 'utf8'))
    expect(conteudo.entradas).toHaveLength(2)
    expect(conteudo.entradas[0].texto).toContain('No princípio')
  })

  it('lote ignora ordem já travada por outro e devolve só o que conseguiu', () => {
    semear(1)
    semear(2)
    travar(d, 1)
    expect(montarLote(d, [1, 2], 'l1')!.ordens).toEqual([2])
  })

  it('lote devolve null quando não sobrou nada para travar', () => {
    semear(1)
    travar(d, 1)
    expect(montarLote(d, [1], 'l1')).toBeNull()
  })
})

describe('portão de qualidade', () => {
  let base: string
  let d: Dirs

  const TEXTO =
    'Capítulo 1\n1 No princípio criou Deus os céus e a terra.\n2 E a terra estava desordenada e vazia, e as trevas estavam sobre a face do abismo.'

  const material = (extra: Record<string, unknown> = {}) => ({
    ordem: 1,
    titulo_pericope_pt: 'A criação',
    contexto_historico_literario:
      'O princípio criou abismo trevas desordenada vazia. '.repeat(6),
    resenha: 'A terra estava desordenada e vazia, e as trevas cobriam o abismo. '.repeat(6),
    perguntas_reflexao: ['p1', 'p2'],
    topicos_pregar:
      'Linha de raciocínio\n- um **a**\n- dois **b**\n- três **c**\n- quatro **d**\n- cinco **e**\n\nMensagens a levar\n- seis **f**\n- sete **g**\n- oito **h**\n- nove **i**',
    ...extra,
  })

  beforeEach(() => {
    base = mkdtempSync(join(tmpdir(), 'reenriq-'))
    d = dirs(base)
    criarDirs(d)
    writeFileSync(
      join(d.entrada, '1.json'),
      JSON.stringify(montarEntrada(bruta({ ordem: 1, texto: TEXTO }))),
    )
  })
  afterEach(() => rmSync(base, { recursive: true, force: true }))

  const julgar = (m: unknown) => {
    writeFileSync(join(d.saida, '1.json'), JSON.stringify(m))
    return conferirSaidas(d, [1])[0]
  }

  it('aprova material bem formado', () => {
    expect(julgar(material()).problemas).toEqual([])
  })

  it('reprova tópicos com bullets de menos', () => {
    const v = julgar(material({ topicos_pregar: 'Linha de raciocínio\n- só um **a**\n\nMensagens a levar\n- outro **b**' }))
    expect(v.ok).toBe(false)
    expect(v.problemas.join(' ')).toMatch(/linha de raciocínio = 1/)
  })

  it('reprova material genérico, que não fala DESTE trecho', () => {
    const v = julgar(
      material({
        contexto_historico_literario: 'Palavras completamente alheias sobre outros assuntos. '.repeat(6),
        resenha: 'Nenhuma relação com aquilo tratado adiante nestas linhas soltas. '.repeat(6),
      }),
    )
    expect(v.problemas.join(' ')).toMatch(/palavras em comum/)
  })

  it('avisa quando a citação não está no texto — é aqui que a NAA sobrevivente aparece', () => {
    const v = julgar(material({ resenha: material().resenha + ' Ele disse: "Haja luz, e houve luz agora".' }))
    expect(v.avisos.join(' ')).toMatch(/citação fora do texto/)
  })

  it('não avisa quando a citação está mesmo no texto', () => {
    const v = julgar(material({ resenha: material().resenha + ' O texto diz "criou Deus os céus e a terra".' }))
    expect(v.avisos).toEqual([])
  })

  it('reprova JSON inválido sem derrubar a rodada', () => {
    writeFileSync(join(d.saida, '1.json'), '{ isto não é json')
    expect(conferirSaidas(d, [1])[0].problemas[0]).toMatch(/JSON inválido/)
  })

  it('reprova quando o subagent simplesmente não escreveu', () => {
    expect(conferirSaidas(d, [1])[0].problemas).toEqual(['sem saída'])
  })

  it('reprovada volta para a fila: saída apagada, trava devolvida, motivo registrado', () => {
    travar(d, 1)
    const v = julgar(material({ perguntas_reflexao: ['só uma'] }))
    expect(devolverReprovadas(d, [v])).toBe(1)
    expect(existsSync(join(d.saida, '1.json'))).toBe(false)
    expect(pendentes(d)).toEqual([1])
    expect(readFileSync(d.rejeitados, 'utf8')).toMatch(/perguntas = 1/)
  })

  it('aprovada não é mexida: nem apaga a saída, nem solta a trava', () => {
    travar(d, 1)
    const v = julgar(material())
    expect(devolverReprovadas(d, [v])).toBe(0)
    expect(existsSync(join(d.saida, '1.json'))).toBe(true)
    expect(existsSync(join(d.travas, '1'))).toBe(true)
  })
})

describe('portão — o sobrescrito é texto bíblico', () => {
  let base: string
  let d: Dirs

  const TEXTO = 'Capítulo 3\n1 SENHOR, como se multiplicam os meus adversários!'
  const SOBRESCRITO = 'Salmo de Davi, quando ele fugia da presença de seu filho Absalão'

  beforeEach(() => {
    base = mkdtempSync(join(tmpdir(), 'reenriq-'))
    d = dirs(base)
    criarDirs(d)
    writeFileSync(
      join(d.entrada, '1.json'),
      JSON.stringify(
        montarEntrada(bruta({ ordem: 1, abbrev: 'Sl', texto: TEXTO, sobrescrito: SOBRESCRITO })),
      ),
    )
  })
  afterEach(() => rmSync(base, { recursive: true, force: true }))

  it('citar a epígrafe do salmo não é citação inventada — ela só é exibida à parte', () => {
    const ctx =
      `A inscrição diz "${SOBRESCRITO}". ` +
      'Multiplicam adversários SENHOR Davi Absalão presença fugia filho. '.repeat(4)
    writeFileSync(
      join(d.saida, '1.json'),
      JSON.stringify({
        ordem: 1,
        titulo_pericope_pt: 'Dormir no meio do golpe',
        contexto_historico_literario: ctx,
        resenha: 'Adversários que se multiplicam contra Davi enquanto ele foge de Absalão. '.repeat(5),
        perguntas_reflexao: ['p1', 'p2'],
        topicos_pregar:
          'Linha de raciocínio\n- a **um**\n- b **dois**\n- c **três**\n- d **quatro**\n- e **cinco**\n\nMensagens a levar\n- f **seis**\n- g **sete**\n- h **oito**\n- i **nove**',
      }),
    )
    const v = conferirSaidas(d, [1])[0]
    expect(v.problemas).toEqual([])
    expect(v.avisos).toEqual([])
  })
})
