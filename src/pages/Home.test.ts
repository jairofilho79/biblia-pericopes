import { describe, expect, it } from 'vitest'
import { jornadaDoTestamento, montarTrilhas } from './Home'
import type { PericopeIndex, PosicaoLeitura, Progresso } from '../lib/types'

// Catálogo mínimo em memória — nunca lê public/data/index.json (gitignored,
// ausente nesta worktree e na CI, que roda `npm test` antes de gerar shards).
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

/** 3 de Gênesis (VT), 2 de Mateus (NT). */
const INDICE: PericopeIndex[] = [
  peri(0, 'Gênesis', 'Gn', 1),
  peri(1, 'Gênesis', 'Gn', 2),
  peri(2, 'Gênesis', 'Gn', 3),
  peri(3, 'Mateus', 'Mt', 1),
  peri(4, 'Mateus', 'Mt', 2),
]

function concluida(ordem: number, quando: string): [number, Progresso] {
  return [ordem, { pericopeOrdem: ordem, status: 'concluido', atualizadoEm: quando }]
}

function posicao(ordem: number, ref: string, quando: string): [number, PosicaoLeitura] {
  return [ordem, { pericopeOrdem: ordem, tipo: 'versiculo', ref, tempo: null, atualizadoEm: quando }]
}

describe('jornadaDoTestamento', () => {
  it('monta uma jornada sintética sequencia/vt|nt nunca gravada', () => {
    const j = jornadaDoTestamento('vt', 0)
    expect(j.tipo).toBe('sequencia')
    expect(j.escopo).toBe('vt')
    expect(j.inicioOrdem).toBe(0)
    expect(j.contaDesde).toBeNull()
    // "nunca gravada": id vazio, não um crypto.randomUUID() de verdade —
    // não pode ser confundida com uma jornada real por engano em nenhum
    // comparador por id.
    expect(j.id).toBe('')
  })
})

describe('montarTrilhas', () => {
  it('conta "N de M" nas duas trilhas, sem nada concluído', () => {
    const tracks = montarTrilhas(INDICE, new Map(), new Map())
    expect(tracks).toHaveLength(2)
    const vt = tracks.find((t) => t.testament === 'vt')
    const nt = tracks.find((t) => t.testament === 'nt')
    expect(vt?.prog).toEqual({ total: 3, concluidas: 0, pct: 0, proximaOrdem: 0 })
    expect(vt?.peri.ordem).toBe(0)
    expect(nt?.prog).toEqual({ total: 2, concluidas: 0, pct: 0, proximaOrdem: 3 })
    expect(nt?.peri.ordem).toBe(3)
  })

  it('conta as concluídas de cada trilha independentemente', () => {
    const progressos = new Map([concluida(0, '2026-01-01T00:00:00.000Z'), concluida(1, '2026-01-01T00:00:00.000Z')])
    const tracks = montarTrilhas(INDICE, progressos, new Map())
    const vt = tracks.find((t) => t.testament === 'vt')
    const nt = tracks.find((t) => t.testament === 'nt')
    expect(vt?.prog).toEqual({ total: 3, concluidas: 2, pct: 67, proximaOrdem: 2 })
    // NT não tem nada concluído: as duas trilhas não podem vazar contagem
    // uma para a outra.
    expect(nt?.prog).toEqual({ total: 2, concluidas: 0, pct: 0, proximaOrdem: 3 })
  })

  it('fallback do cursor quando a rota terminou: aponta para a última ordem, não null', () => {
    // Trilha VT inteira concluída → cursorDaJornada devolve null (não há
    // "próxima ordem"); a Home usa então a última ordem da rota para o botão
    // "Rever" — o mesmo destino que a heurística antiga (tudo feito devolvia
    // a última ordem da sequência).
    const quando = '2026-01-01T00:00:00.000Z'
    const progressos = new Map([concluida(0, quando), concluida(1, quando), concluida(2, quando)])
    const tracks = montarTrilhas(INDICE, progressos, new Map())
    const vt = tracks.find((t) => t.testament === 'vt')
    expect(vt?.prog.proximaOrdem).toBeNull()
    expect(vt?.peri.ordem).toBe(2) // última ordem da rota VT, não a primeira
  })

  it('prefere o checkpoint mais recente (posição) à primeira não concluída', () => {
    const posicoes = new Map([posicao(2, '3:16', '2026-01-01T00:00:00.000Z')])
    const tracks = montarTrilhas(INDICE, new Map(), posicoes)
    const vt = tracks.find((t) => t.testament === 'vt')
    expect(vt?.peri.ordem).toBe(2)
  })
})
