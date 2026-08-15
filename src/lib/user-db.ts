import { openDB, type IDBPDatabase } from 'idb'
import type { Anotacao, Progresso, ProgressoStatus } from './types'

const DB_NAME = 'biblia-pericopes'
const DB_VERSION = 1

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
}

let dbPromise: Promise<IDBPDatabase<Schema>> | null = null

function db() {
  if (!dbPromise) {
    dbPromise = openDB<Schema>(DB_NAME, DB_VERSION, {
      upgrade(database) {
        database.createObjectStore('progresso', { keyPath: 'pericopeOrdem' })
        const notes = database.createObjectStore('anotacoes', { keyPath: 'id' })
        notes.createIndex('by-pericope', 'pericopeOrdem')
      },
    })
  }
  return dbPromise
}

export async function getProgresso(ordem: number): Promise<Progresso | undefined> {
  return (await db()).get('progresso', ordem)
}

export async function setProgresso(ordem: number, status: ProgressoStatus): Promise<void> {
  await (
    await db()
  ).put('progresso', {
    pericopeOrdem: ordem,
    status,
    atualizadoEm: new Date().toISOString(),
  })
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
  const existing = id ? await (await db()).get('anotacoes', id) : undefined
  const note: Anotacao = {
    id: existing?.id ?? crypto.randomUUID(),
    pericopeOrdem,
    texto,
    criadoEm: existing?.criadoEm ?? now,
    atualizadoEm: now,
  }
  await (await db()).put('anotacoes', note)
  return note
}

export async function deleteAnotacao(id: string): Promise<void> {
  await (await db()).delete('anotacoes', id)
}
