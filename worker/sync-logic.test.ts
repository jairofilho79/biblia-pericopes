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

describe('parseSyncPush', () => {
  it('aceita payload válido', () => {
    expect(parseSyncPush({ progresso: [prog], anotacoes: [nota] })).toEqual({
      progresso: [prog],
      anotacoes: [nota],
    })
  })
  it('aceita listas ausentes como vazias', () => {
    expect(parseSyncPush({})).toEqual({ progresso: [], anotacoes: [] })
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
    ).toEqual({ progresso: [{ ...prog, atualizadoEm: '2026-08-31T10:00:00.000Z' }], anotacoes: [] })
  })
})
