import { describe, expect, it } from 'vitest'
import { parseSyncPush } from './sync-logic'

const prog = { pericopeOrdem: 1, status: 'concluido', atualizadoEm: '2026-08-31T10:00:00.000Z' }
const nota = {
  id: 'a1',
  pericopeOrdem: 1,
  texto: 'oração',
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
