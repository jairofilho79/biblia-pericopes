import { describe, expect, it } from 'vitest'
import {
  cursorDaJornada,
  historicoDeJornadas,
  nomePadrao,
  patchEncerrarJornada,
  patchReiniciarJornada,
  progressoDaJornada,
  reconciliacaoDeConclusao,
  rotaDaJornada,
} from './jornadas'
import type { Jornada, PericopeIndex, PosicaoLeitura, Progresso } from './types'

const ANTES = '2026-01-01T00:00:00.000Z'
const DEPOIS = '2026-06-01T00:00:00.000Z'

function peri(ordem: number, livro: string, abbrev: string, cap = 1): PericopeIndex {
  return {
    ordem,
    livro,
    abbrev,
    capitulo_inicio: cap,
    versiculo_inicio: 1,
    capitulo_fim: cap,
    versiculo_fim: 10,
    titulo_pericope_pt: `${livro} ${cap}`,
    minutos: 3,
  }
}

/** Catálogo mínimo: 2 de Gênesis, 2 de Salmos (VT) e 2 de Mateus (NT). */
const INDICE: PericopeIndex[] = [
  peri(0, 'Gênesis', 'Gn', 1),
  peri(1, 'Gênesis', 'Gn', 2),
  peri(2, 'Salmos', 'Sl', 1),
  peri(3, 'Salmos', 'Sl', 2),
  peri(4, 'Mateus', 'Mt', 1),
  peri(5, 'Mateus', 'Mt', 2),
]

function jornada(over: Partial<Jornada> = {}): Jornada {
  return {
    id: 'j1',
    nome: 'Teste',
    tipo: 'sequencia',
    escopo: 'vt',
    inicioOrdem: 0,
    contaDesde: null,
    criadoEm: ANTES,
    atualizadoEm: ANTES,
    arquivadaEm: null,
    concluidaEm: null,
    ...over,
  }
}

function concluida(ordem: number, quando: string): [number, Progresso] {
  return [ordem, { pericopeOrdem: ordem, status: 'concluido', atualizadoEm: quando }]
}

describe('rotaDaJornada', () => {
  it('sequencia vt pega só o VT', () => {
    expect(rotaDaJornada(jornada({ escopo: 'vt' }), INDICE)).toEqual([0, 1, 2, 3])
  })

  it('sequencia biblia pega tudo', () => {
    expect(rotaDaJornada(jornada({ escopo: 'biblia' }), INDICE)).toEqual([0, 1, 2, 3, 4, 5])
  })

  it('livro pega só o livro', () => {
    expect(rotaDaJornada(jornada({ tipo: 'livro', escopo: 'Salmos' }), INDICE)).toEqual([2, 3])
  })

  it('bloco pega os livros do bloco', () => {
    const j = jornada({ tipo: 'bloco', escopo: 'evangelhos', inicioOrdem: 4 })
    expect(rotaDaJornada(j, INDICE)).toEqual([4, 5])
  })

  it('corta no inicioOrdem, deixando fora o que veio antes', () => {
    expect(rotaDaJornada(jornada({ escopo: 'vt', inicioOrdem: 2 }), INDICE)).toEqual([2, 3])
  })

  it('inicioOrdem fora da rota degrada para o escopo inteiro, nunca para vazio', () => {
    // Acontece se o catálogo mudar debaixo de uma jornada antiga. Uma jornada
    // vazia seria pior: o leitor perderia o percurso sem entender por quê.
    expect(rotaDaJornada(jornada({ escopo: 'vt', inicioOrdem: 999 }), INDICE)).toEqual([0, 1, 2, 3])
  })
})

describe('progressoDaJornada', () => {
  it('conta e aponta a próxima não lida', () => {
    const progressos = new Map([concluida(0, DEPOIS)])
    const r = progressoDaJornada([0, 1, 2, 3], progressos, null)
    expect(r).toEqual({ total: 4, concluidas: 1, pct: 25, proximaOrdem: 1 })
  })

  it('modo reler ignora conclusões anteriores à âncora', () => {
    const progressos = new Map([concluida(0, ANTES), concluida(1, ANTES)])
    const r = progressoDaJornada([0, 1, 2, 3], progressos, DEPOIS)
    expect(r.concluidas).toBe(0)
    // O ponto: barra em 0 E cursor no início. Se divergissem, a jornada se
    // contradiria na mesma tela.
    expect(r.proximaOrdem).toBe(0)
  })

  it('rota inteira lida devolve proximaOrdem null', () => {
    const progressos = new Map([concluida(0, DEPOIS), concluida(1, DEPOIS)])
    const r = progressoDaJornada([0, 1], progressos, null)
    expect(r).toEqual({ total: 2, concluidas: 2, pct: 100, proximaOrdem: null })
  })

  it('rota vazia não divide por zero', () => {
    expect(progressoDaJornada([], new Map(), null)).toEqual({
      total: 0,
      concluidas: 0,
      pct: 0,
      proximaOrdem: null,
    })
  })
})

describe('cursorDaJornada', () => {
  const posicao = (ordem: number, quando: string): [number, PosicaoLeitura] => [
    ordem,
    { pericopeOrdem: ordem, tipo: 'versiculo', ref: '1:1', tempo: null, atualizadoEm: quando },
  ]

  it('prefere o checkpoint mais recente à primeira não concluída', () => {
    // Retoma a perícope longa deixada no meio — é a heurística que a Home
    // já usava antes das jornadas.
    const progressos = new Map([concluida(0, DEPOIS)])
    const posicoes = new Map([posicao(2, DEPOIS)])
    expect(cursorDaJornada([0, 1, 2, 3], progressos, posicoes, null)).toBe(2)
  })

  it('ignora checkpoint de perícope que já conta como lida', () => {
    const progressos = new Map([concluida(0, DEPOIS), concluida(2, DEPOIS)])
    const posicoes = new Map([posicao(2, DEPOIS)])
    expect(cursorDaJornada([0, 1, 2, 3], progressos, posicoes, null)).toBe(1)
  })

  it('em modo reler, ignora checkpoint anterior à âncora', () => {
    // Senão a jornada de releitura devolveria o leitor no meio da passada
    // anterior — exatamente o que ela existe para não fazer.
    const posicoes = new Map([posicao(2, ANTES)])
    expect(cursorDaJornada([0, 1, 2, 3], new Map(), posicoes, DEPOIS)).toBe(0)
  })

  it('devolve null quando a rota acabou', () => {
    const progressos = new Map([concluida(0, DEPOIS), concluida(1, DEPOIS)])
    expect(cursorDaJornada([0, 1], progressos, new Map(), null)).toBeNull()
  })
})

describe('reconciliacaoDeConclusao', () => {
  const AGORA = '2026-07-01T00:00:00.000Z'

  it('rota acabou e concluidaEm era null → grava a conclusão', () => {
    expect(reconciliacaoDeConclusao({ concluidaEm: null }, null, AGORA)).toEqual({
      concluidaEm: AGORA,
    })
  })

  it('rota acabou e já estava concluída → nada a fazer', () => {
    expect(reconciliacaoDeConclusao({ concluidaEm: ANTES }, null, AGORA)).toBeNull()
  })

  it('rota NÃO acabou mas concluidaEm não é null → LIMPA (reabre)', () => {
    // Este é o caso que ficou morto no ciclo 1: getJornadaAtiva() excluía
    // concluidaEm !== null do filtro, então nenhuma jornada chegava aqui
    // com proximaOrdem não-nulo e concluidaEm preenchido ao mesmo tempo.
    // Com getJornadaCorrente() (sem esse filtro), este ramo é alcançável de
    // verdade — outra frente do app desmarcou uma perícope da rota.
    expect(reconciliacaoDeConclusao({ concluidaEm: ANTES }, 3, AGORA)).toEqual({
      concluidaEm: null,
    })
  })

  it('rota não acabou e nunca esteve concluída → nada a fazer', () => {
    expect(reconciliacaoDeConclusao({ concluidaEm: null }, 3, AGORA)).toBeNull()
  })
})

describe('nomePadrao', () => {
  it('usa o nome do livro, do bloco ou do testamento', () => {
    expect(nomePadrao('livro', 'Salmos', 2, INDICE)).toBe('Salmos')
    expect(nomePadrao('bloco', 'evangelhos', 4, INDICE)).toBe('Evangelhos')
    expect(nomePadrao('sequencia', 'nt', 4, INDICE)).toBe('Novo Testamento')
    expect(nomePadrao('sequencia', 'biblia', 0, INDICE)).toBe('A Bíblia toda')
  })

  it('acrescenta "a partir de" quando não começa no início da rota', () => {
    expect(nomePadrao('sequencia', 'vt', 2, INDICE)).toBe('Velho Testamento a partir de Salmos 1:1–1:10')
  })
})

// Task 7: tela de gestão da jornada (/jornada) — patches das duas ações e a
// separação entre a jornada corrente e o histórico.
describe('patchReiniciarJornada', () => {
  it('zera contaDesde a partir de agora e limpa concluidaEm', () => {
    expect(patchReiniciarJornada(DEPOIS)).toEqual({ contaDesde: DEPOIS, concluidaEm: null })
  })
})

describe('patchEncerrarJornada', () => {
  it('arquiva a partir de agora', () => {
    expect(patchEncerrarJornada(DEPOIS)).toEqual({ arquivadaEm: DEPOIS })
  })
})

describe('historicoDeJornadas', () => {
  it('só entram as arquivadas', () => {
    const arquivada = jornada({ id: 'a', arquivadaEm: DEPOIS })
    const corrente = jornada({ id: 'c', arquivadaEm: null })
    expect(historicoDeJornadas([arquivada, corrente])).toEqual([arquivada])
  })

  it('a jornada corrente CONCLUÍDA não entra no histórico', () => {
    // O caso que o texto original do brief ("arquivadaEm || concluidaEm")
    // erraria: a jornada corrente concluída tem concluidaEm preenchido e
    // arquivadaEm === null (ver getJornadaCorrente em user-db.ts) — ela
    // apareceria duplicada, no card principal E na lista quieta.
    const correnteConcluida = jornada({ id: 'c', arquivadaEm: null, concluidaEm: DEPOIS })
    expect(historicoDeJornadas([correnteConcluida])).toEqual([])
  })

  it('rota vazia (nenhuma jornada) devolve histórico vazio', () => {
    expect(historicoDeJornadas([])).toEqual([])
  })
})
