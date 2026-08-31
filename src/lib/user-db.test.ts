import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import {
  applyRemoteAnotacoes,
  applyRemoteProgresso,
  clearAllUserData,
  clearOutbox,
  deleteAnotacao,
  deleteMeta,
  getMeta,
  getProgresso,
  listAnotacoes,
  listOutbox,
  saveAnotacao,
  setMeta,
  setProgresso,
} from './user-db'
import { MAX_TEXTO } from './sync-limits'

const FUTURE = '2099-01-01T00:00:00.000Z'
const PAST = '2000-01-01T00:00:00.000Z'

// NOTE: vitest runs this file in isolation, but the tests below share the
// module-level dbPromise/singleton IndexedDB connection. Each test uses its
// own `ordem`/id range to avoid interference, and outbox-related assertions
// look for the specific item they expect rather than assuming a fresh store.

describe('user-db v2 (outbox/meta)', () => {
  it('upgrade to v2 creates outbox and meta stores on a fresh DB', async () => {
    await setProgresso(9001, 'em_andamento')
    const outbox = await listOutbox()
    expect(outbox.some((i) => i.kind === 'progresso' && i.ordem === 9001)).toBe(true)
  })

  it('setProgresso writes the progresso row and enqueues a matching outbox item', async () => {
    await setProgresso(9002, 'concluido')
    const progresso = await getProgresso(9002)
    expect(progresso).toBeDefined()
    expect(progresso?.status).toBe('concluido')

    const outbox = await listOutbox()
    const item = outbox.find((i) => i.kind === 'progresso' && i.ordem === 9002)
    expect(item).toBeDefined()
    if (item?.kind === 'progresso') {
      expect(item.status).toBe(progresso?.status)
      expect(item.atualizadoEm).toBe(progresso?.atualizadoEm)
    }
  })

  it('saveAnotacao enqueues a non-tombstone outbox item', async () => {
    const note = await saveAnotacao(9003, 'texto original')
    const outbox = await listOutbox()
    const item = outbox.find((i) => i.kind === 'anotacao' && i.nota.id === note.id)
    expect(item).toBeDefined()
    if (item?.kind === 'anotacao') {
      expect(item.apagadoEm).toBeNull()
      expect(item.nota.texto).toBe('texto original')
    }
  })

  it('deleteAnotacao removes the local note and enqueues a tombstone', async () => {
    const note = await saveAnotacao(9004, 'para apagar')
    await deleteAnotacao(note.id)

    const remaining = await listAnotacoes(9004)
    expect(remaining.find((n) => n.id === note.id)).toBeUndefined()

    const outbox = await listOutbox()
    const tombstones = outbox.filter((i) => i.kind === 'anotacao' && i.nota.id === note.id)
    const tombstone = tombstones[tombstones.length - 1]
    expect(tombstone).toBeDefined()
    if (tombstone?.kind === 'anotacao') {
      expect(tombstone.apagadoEm).not.toBeNull()
      // deleteAnotacao stamps both apagadoEm and nota.atualizadoEm from the same "now"
      expect(tombstone.nota.atualizadoEm).toBe(tombstone.apagadoEm)
    }
  })

  it('clearOutbox(upToSeq) removes entries up to seq', async () => {
    const before = await listOutbox()
    expect(before.length).toBeGreaterThan(0)
    const seqs = before.map((i) => i.seq).filter((s): s is number => typeof s === 'number')
    seqs.sort((a, b) => a - b)
    const cutoff = seqs[Math.floor(seqs.length / 2)]

    await clearOutbox(cutoff)

    const after = await listOutbox()
    expect(after.every((i) => (i.seq ?? 0) > cutoff)).toBe(true)
    expect(after.some((i) => (i.seq ?? 0) > cutoff)).toBe(true)
  })

  it('getMeta/setMeta roundtrip', async () => {
    expect(await getMeta('lastSyncSeq')).toBeUndefined()
    await setMeta('lastSyncSeq', '42')
    expect(await getMeta('lastSyncSeq')).toBe('42')
    await setMeta('lastSyncSeq', '43')
    expect(await getMeta('lastSyncSeq')).toBe('43')
  })

  it('applyRemoteProgresso: remote newer wins, local newer survives, outbox untouched', async () => {
    const outboxBefore = await listOutbox()

    await setProgresso(9005, 'nao_iniciado')
    // remote newer wins
    await applyRemoteProgresso([{ pericopeOrdem: 9005, status: 'concluido', atualizadoEm: FUTURE }])
    const afterNewer = await getProgresso(9005)
    expect(afterNewer?.status).toBe('concluido')
    expect(afterNewer?.atualizadoEm).toBe(FUTURE)

    // local newer survives
    await setProgresso(9006, 'concluido')
    const localBefore = await getProgresso(9006)
    await applyRemoteProgresso([{ pericopeOrdem: 9006, status: 'nao_iniciado', atualizadoEm: PAST }])
    const afterOlder = await getProgresso(9006)
    expect(afterOlder?.status).toBe('concluido')
    expect(afterOlder?.atualizadoEm).toBe(localBefore?.atualizadoEm)

    const outboxAfter = await listOutbox()
    // applyRemoteProgresso must not enqueue anything (2 setProgresso calls above did enqueue,
    // so compare growth against what those writes alone would produce).
    const progressoOutboxBefore = outboxBefore.filter((i) => i.kind === 'progresso').length
    const progressoOutboxAfter = outboxAfter.filter((i) => i.kind === 'progresso').length
    expect(progressoOutboxAfter).toBe(progressoOutboxBefore + 2)
  })

  it('applyRemoteAnotacoes: tombstone deletes, non-tombstone upserts, older remote ignored, outbox untouched', async () => {
    const outboxBefore = await listOutbox()

    // tombstone deletes local
    const note = await saveAnotacao(9007, 'nota original')
    await applyRemoteAnotacoes([
      {
        id: note.id,
        pericopeOrdem: 9007,
        texto: 'irrelevante',
        criadoEm: note.criadoEm,
        atualizadoEm: FUTURE,
        apagadoEm: FUTURE,
      },
    ])
    expect((await listAnotacoes(9007)).find((n) => n.id === note.id)).toBeUndefined()

    // non-tombstone upserts (no local note yet)
    await applyRemoteAnotacoes([
      {
        id: 'remote-9008',
        pericopeOrdem: 9008,
        texto: 'vindo do servidor',
        criadoEm: PAST,
        atualizadoEm: FUTURE,
        apagadoEm: null,
      },
    ])
    const upserted = (await listAnotacoes(9008)).find((n) => n.id === 'remote-9008')
    expect(upserted).toBeDefined()
    expect(upserted?.texto).toBe('vindo do servidor')

    // older remote ignored
    const local = await saveAnotacao(9009, 'texto local mais novo')
    await applyRemoteAnotacoes([
      {
        id: local.id,
        pericopeOrdem: 9009,
        texto: 'texto remoto antigo',
        criadoEm: local.criadoEm,
        atualizadoEm: PAST,
        apagadoEm: null,
      },
    ])
    const stillLocal = (await listAnotacoes(9009)).find((n) => n.id === local.id)
    expect(stillLocal?.texto).toBe('texto local mais novo')

    const outboxAfter = await listOutbox()
    // saveAnotacao was called twice above (9007's note already counted before this block's
    // saveAnotacao calls for 9007/9009); applyRemoteAnotacoes itself must add nothing.
    const anotacaoOutboxBefore = outboxBefore.filter((i) => i.kind === 'anotacao').length
    const anotacaoOutboxAfter = outboxAfter.filter((i) => i.kind === 'anotacao').length
    expect(anotacaoOutboxAfter).toBe(anotacaoOutboxBefore + 2)
  })

  // Sem o corte na escrita, uma nota acima do limite envenenaria o lote inteiro:
  // o servidor rejeita o POST com 400 e o outbox nunca mais é esvaziado.
  it('saveAnotacao corta o texto em MAX_TEXTO (local e no outbox)', async () => {
    const gigante = 'a'.repeat(MAX_TEXTO + 500)
    const note = await saveAnotacao(9010, gigante)

    expect(note.texto).toHaveLength(MAX_TEXTO)
    const salva = (await listAnotacoes(9010)).find((n) => n.id === note.id)
    expect(salva?.texto).toHaveLength(MAX_TEXTO)

    const outbox = await listOutbox()
    const item = outbox.find((i) => i.kind === 'anotacao' && i.nota.id === note.id)
    if (item?.kind === 'anotacao') expect(item.nota.texto).toHaveLength(MAX_TEXTO)
  })

  it('clearAllUserData apaga progresso, anotações e outbox; deleteMeta remove a chave', async () => {
    await setProgresso(9011, 'concluido')
    await saveAnotacao(9012, 'some junto')
    await setMeta('chave-temp', 'x')

    await clearAllUserData()

    expect(await getProgresso(9011)).toBeUndefined()
    expect(await listAnotacoes(9012)).toEqual([])
    expect(await listOutbox()).toEqual([])
    // meta sobrevive ao wipe dos dados; só sai por deleteMeta
    expect(await getMeta('chave-temp')).toBe('x')
    await deleteMeta('chave-temp')
    expect(await getMeta('chave-temp')).toBeUndefined()
  })
})
