import { describe, expect, it } from 'vitest'
import { parseSyncPush } from './sync-logic'

const prog = { pericopeOrdem: 1, status: 'concluido', atualizadoEm: '2026-08-31T10:00:00.000Z' }
const nota = {
  id: 'a1',
  pericopeOrdem: 1,
  texto: 'oração',
  verseRef: null,
  criadoEm: '2026-08-31T09:00:00.000Z',
  atualizadoEm: '2026-08-31T10:00:00.000Z',
  apagadoEm: null,
}
const destaque = {
  id: '12:1:3',
  pericopeOrdem: 12,
  verseId: '1:3',
  cor: 'amarelo',
  criadoEm: '2026-08-31T09:00:00.000Z',
  atualizadoEm: '2026-08-31T10:00:00.000Z',
  apagadoEm: null,
}

describe('parseSyncPush', () => {
  it('aceita payload válido', () => {
    expect(parseSyncPush({ progresso: [prog], anotacoes: [nota] })).toEqual({
      progresso: [prog],
      anotacoes: [nota],
      destaques: [],
    })
  })
  it('aceita listas ausentes como vazias', () => {
    expect(parseSyncPush({})).toEqual({ progresso: [], anotacoes: [], destaques: [] })
  })
  it('rejeita status desconhecido, tipos errados e não-objeto', () => {
    expect(parseSyncPush({ progresso: [{ ...prog, status: 'x' }] })).toBeNull()
    expect(parseSyncPush({ anotacoes: [{ ...nota, texto: 5 }] })).toBeNull()
    expect(parseSyncPush(null)).toBeNull()
    expect(parseSyncPush('a')).toBeNull()
  })
  it('rejeita lotes acima de 500 itens e texto acima de 20000 chars', () => {
    expect(parseSyncPush({ progresso: Array(501).fill(prog) })).toBeNull()
    expect(parseSyncPush({ anotacoes: [{ ...nota, texto: 'x'.repeat(20001) }] })).toBeNull()
  })
  it('exige timestamps no formato ISO canônico (toISOString)', () => {
    expect(
      parseSyncPush({ progresso: [{ ...prog, atualizadoEm: '2026-08-31T09:00:00-03:00' }] }),
    ).toBeNull()
    expect(
      parseSyncPush({ progresso: [{ ...prog, atualizadoEm: '2026-08-31T10:00:00Z' }] }),
    ).toBeNull()
    expect(
      parseSyncPush({ progresso: [{ ...prog, atualizadoEm: '2026-08-31T10:00:00.000Z' }] }),
    ).toEqual({
      progresso: [{ ...prog, atualizadoEm: '2026-08-31T10:00:00.000Z' }],
      anotacoes: [],
      destaques: [],
    })
  })
})

describe('parseSyncPush — destaques', () => {
  it('aceita destaque válido', () => {
    expect(parseSyncPush({ destaques: [destaque] })).toEqual({
      progresso: [],
      anotacoes: [],
      destaques: [destaque],
    })
  })
  it('aceita lápide (apagadoEm ISO)', () => {
    const lapide = { ...destaque, apagadoEm: '2026-08-31T11:00:00.000Z' }
    expect(parseSyncPush({ destaques: [lapide] })?.destaques).toEqual([lapide])
  })
  it('rejeita cor fora do enum, verseId malformado, id vazio e datas inválidas', () => {
    expect(parseSyncPush({ destaques: [{ ...destaque, cor: 'roxo' }] })).toBeNull()
    expect(parseSyncPush({ destaques: [{ ...destaque, verseId: '1' }] })).toBeNull()
    expect(parseSyncPush({ destaques: [{ ...destaque, verseId: 'x:1' }] })).toBeNull()
    expect(parseSyncPush({ destaques: [{ ...destaque, id: '' }] })).toBeNull()
    expect(parseSyncPush({ destaques: [{ ...destaque, criadoEm: '2026-08-31' }] })).toBeNull()
    expect(parseSyncPush({ destaques: [{ ...destaque, apagadoEm: 'ontem' }] })).toBeNull()
  })
  it('rejeita lote de destaques acima de 500 itens', () => {
    expect(parseSyncPush({ destaques: Array(501).fill(destaque) })).toBeNull()
  })
})

describe('parseSyncPush — verseRef da anotação', () => {
  it('aceita string, null e ausente (ausente vira null)', () => {
    expect(parseSyncPush({ anotacoes: [{ ...nota, verseRef: '1:3-2:2' }] })?.anotacoes).toEqual([
      { ...nota, verseRef: '1:3-2:2' },
    ])
    expect(parseSyncPush({ anotacoes: [{ ...nota, verseRef: null }] })?.anotacoes).toEqual([nota])
    const semCampo = { ...nota } as Record<string, unknown>
    delete semCampo.verseRef
    expect(parseSyncPush({ anotacoes: [semCampo] })?.anotacoes).toEqual([nota])
  })
  it('rejeita verseRef de tipo errado ou acima de 32 chars', () => {
    expect(parseSyncPush({ anotacoes: [{ ...nota, verseRef: 7 }] })).toBeNull()
    expect(parseSyncPush({ anotacoes: [{ ...nota, verseRef: 'x'.repeat(33) }] })).toBeNull()
  })
})

describe('parseSyncPush — invariante do id do destaque', () => {
  // Um id que não deriva de (pericopeOrdem, verseId) vira destaque indeletável:
  // a Leitura pinta o versículo pelo verseId mas apaga pelo id derivado, então
  // o "remover" não acha a linha e o pull seguinte traz a marca de volta.
  it('rejeita id que não é `${pericopeOrdem}:${verseId}`', () => {
    expect(parseSyncPush({ destaques: [{ ...destaque, id: '99:1:3' }] })).toBeNull()
    expect(parseSyncPush({ destaques: [{ ...destaque, id: '12:9:9' }] })).toBeNull()
    expect(parseSyncPush({ destaques: [{ ...destaque, id: 'qualquer-coisa' }] })).toBeNull()
    expect(parseSyncPush({ destaques: [{ ...destaque, id: ' 12:1:3' }] })).toBeNull()
  })
  it('aceita o id derivado, inclusive na perícope de ordem 0', () => {
    const zero = { ...destaque, id: '0:1:3', pericopeOrdem: 0 }
    expect(parseSyncPush({ destaques: [zero] })?.destaques).toEqual([zero])
  })
})

describe('parseSyncPush — pericopeOrdem', () => {
  it('rejeita fracionário, fora do inteiro seguro, negativo e não-finito', () => {
    for (const ordem of [1.5, 1e308, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(parseSyncPush({ progresso: [{ ...prog, pericopeOrdem: ordem }] })).toBeNull()
      expect(parseSyncPush({ anotacoes: [{ ...nota, pericopeOrdem: ordem }] })).toBeNull()
    }
  })
  it('rejeita destaque fracionário mesmo com id derivado coerente', () => {
    expect(
      parseSyncPush({ destaques: [{ ...destaque, pericopeOrdem: 1.5, id: '1.5:1:3' }] }),
    ).toBeNull()
  })
  it('aceita 0 — é a ordem da primeira perícope de Gênesis', () => {
    expect(parseSyncPush({ progresso: [{ ...prog, pericopeOrdem: 0 }] })?.progresso).toEqual([
      { ...prog, pericopeOrdem: 0 },
    ])
  })
})
