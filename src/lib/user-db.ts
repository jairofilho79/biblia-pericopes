import { openDB, type IDBPDatabase } from 'idb'
import { remoteWinsLocal } from './sync-merge'
import { MAX_TEXTO } from './sync-limits'
import type { Anotacao, Progresso, ProgressoStatus } from './types'

const DB_NAME = 'biblia-pericopes'
const DB_VERSION = 2

export type OutboxItem =
  | { seq?: number; kind: 'progresso'; ordem: number; status: ProgressoStatus; atualizadoEm: string }
  | { seq?: number; kind: 'anotacao'; nota: Anotacao; apagadoEm: string | null }

type Schema = {
  progresso: {
    key: number
    value: Progresso
  }
  anotacoes: {
    key: string
    value: Anotacao
    indexes: { 'by-pericope': number }
  }
  outbox: {
    key: number
    value: OutboxItem
  }
  meta: {
    key: string
    value: { key: string; value: string }
  }
}

let dbPromise: Promise<IDBPDatabase<Schema>> | null = null

function db() {
  if (!dbPromise) {
    dbPromise = openDB<Schema>(DB_NAME, DB_VERSION, {
      upgrade(database, oldVersion) {
        if (oldVersion < 1) {
          database.createObjectStore('progresso', { keyPath: 'pericopeOrdem' })
          const notes = database.createObjectStore('anotacoes', { keyPath: 'id' })
          notes.createIndex('by-pericope', 'pericopeOrdem')
        }
        if (oldVersion < 2) {
          database.createObjectStore('outbox', { keyPath: 'seq', autoIncrement: true })
          database.createObjectStore('meta', { keyPath: 'key' })
        }
      },
    })
  }
  return dbPromise
}

export async function getProgresso(ordem: number): Promise<Progresso | undefined> {
  return (await db()).get('progresso', ordem)
}

export async function setProgresso(ordem: number, status: ProgressoStatus): Promise<void> {
  const atualizadoEm = new Date().toISOString()
  const d = await db()
  // Uma única transação sobre os dois stores: uma aba morta no meio não pode
  // gravar o progresso local sem enfileirar o item correspondente do outbox.
  const tx = d.transaction(['progresso', 'outbox'], 'readwrite')
  await tx.objectStore('progresso').put({ pericopeOrdem: ordem, status, atualizadoEm })
  await tx.objectStore('outbox').put({ kind: 'progresso', ordem, status, atualizadoEm } as OutboxItem)
  await tx.done
}

export async function listAllProgresso(): Promise<Progresso[]> {
  return (await db()).getAll('progresso')
}

export async function doneSet(): Promise<Set<number>> {
  const all = await listAllProgresso()
  return new Set(all.filter((p) => p.status === 'concluido').map((p) => p.pericopeOrdem))
}

/** First non-completed ordem within the given sequence; if all done, last. */
export async function getProximaOrdemNaSequencia(ordens: number[]): Promise<number> {
  if (ordens.length === 0) return 0
  const done = await doneSet()
  for (const o of ordens) {
    if (!done.has(o)) return o
  }
  return ordens[ordens.length - 1]
}

export async function countConcluidasNaSequencia(ordens: number[]): Promise<number> {
  const done = await doneSet()
  return ordens.filter((o) => done.has(o)).length
}

export async function listAnotacoes(ordem: number): Promise<Anotacao[]> {
  return (await db()).getAllFromIndex('anotacoes', 'by-pericope', ordem)
}

export async function saveAnotacao(pericopeOrdem: number, texto: string, id?: string): Promise<Anotacao> {
  const now = new Date().toISOString()
  const d = await db()
  const tx = d.transaction(['anotacoes', 'outbox'], 'readwrite')
  const notas = tx.objectStore('anotacoes')
  const existing = id ? await notas.get(id) : undefined
  const note: Anotacao = {
    id: existing?.id ?? crypto.randomUUID(),
    pericopeOrdem,
    // Trunca no ponto de escrita: o servidor rejeita o lote inteiro acima de
    // MAX_TEXTO, e uma nota grande demais travaria o outbox para sempre.
    texto: texto.slice(0, MAX_TEXTO),
    criadoEm: existing?.criadoEm ?? now,
    atualizadoEm: now,
  }
  await notas.put(note)
  await tx.objectStore('outbox').put({ kind: 'anotacao', nota: note, apagadoEm: null } as OutboxItem)
  await tx.done
  return note
}

export async function deleteAnotacao(id: string): Promise<void> {
  const d = await db()
  const tx = d.transaction(['anotacoes', 'outbox'], 'readwrite')
  const notas = tx.objectStore('anotacoes')
  const existing = await notas.get(id)
  await notas.delete(id)
  if (existing) {
    const now = new Date().toISOString()
    await tx.objectStore('outbox').put({
      kind: 'anotacao',
      nota: { ...existing, atualizadoEm: now },
      apagadoEm: now,
    } as OutboxItem)
  }
  await tx.done
}

export async function listOutbox(): Promise<OutboxItem[]> {
  return (await db()).getAll('outbox')
}

export async function clearOutbox(upToSeq: number): Promise<void> {
  await (await db()).delete('outbox', IDBKeyRange.upperBound(upToSeq))
}

/** Esvazia o outbox inteiro (logout / troca de conta). */
export async function clearOutboxAll(): Promise<void> {
  await (await db()).clear('outbox')
}

export async function getMeta(key: string): Promise<string | undefined> {
  return (await (await db()).get('meta', key))?.value
}

export async function setMeta(key: string, value: string): Promise<void> {
  await (await db()).put('meta', { key, value })
}

export async function deleteMeta(key: string): Promise<void> {
  await (await db()).delete('meta', key)
}

/**
 * Apaga todo o dado de usuário local (progresso, anotações e outbox) numa
 * transação só. Usado quando a sessão pertence a outra conta que não a dona
 * dos dados gravados neste dispositivo.
 */
export async function clearAllUserData(): Promise<void> {
  const d = await db()
  const tx = d.transaction(['progresso', 'anotacoes', 'outbox'], 'readwrite')
  await Promise.all([
    tx.objectStore('progresso').clear(),
    tx.objectStore('anotacoes').clear(),
    tx.objectStore('outbox').clear(),
    tx.done,
  ])
}

export async function applyRemoteProgresso(
  items: { pericopeOrdem: number; status: ProgressoStatus; atualizadoEm: string }[],
): Promise<void> {
  const d = await db()
  for (const item of items) {
    const local = await d.get('progresso', item.pericopeOrdem)
    if (remoteWinsLocal(item.atualizadoEm, local?.atualizadoEm)) {
      await d.put('progresso', item)
    }
  }
}

export async function applyRemoteAnotacoes(
  items: {
    id: string
    pericopeOrdem: number
    texto: string
    criadoEm: string
    atualizadoEm: string
    apagadoEm: string | null
  }[],
): Promise<void> {
  const d = await db()
  for (const item of items) {
    const local = await d.get('anotacoes', item.id)
    if (!remoteWinsLocal(item.atualizadoEm, local?.atualizadoEm)) continue
    if (item.apagadoEm) {
      await d.delete('anotacoes', item.id)
    } else {
      const { apagadoEm: _apagadoEm, ...nota } = item
      await d.put('anotacoes', nota)
    }
  }
}
