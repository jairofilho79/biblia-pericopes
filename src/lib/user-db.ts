import { openDB, type IDBPDatabase } from 'idb'
import { remoteWinsLocal } from './sync-merge'
import { MAX_TEXTO } from './sync-limits'
import type { Anotacao, Destaque, DestaqueCor, Progresso, ProgressoStatus } from './types'

const DB_NAME = 'biblia-pericopes'
const DB_VERSION = 3

export type OutboxItem =
  | { seq?: number; kind: 'progresso'; ordem: number; status: ProgressoStatus; atualizadoEm: string }
  | { seq?: number; kind: 'anotacao'; nota: Anotacao; apagadoEm: string | null }
  | { seq?: number; kind: 'destaque'; destaque: Destaque; apagadoEm: string | null }

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
  destaques: {
    key: string
    value: Destaque
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
        if (oldVersion < 3) {
          const hl = database.createObjectStore('destaques', { keyPath: 'id' })
          hl.createIndex('by-pericope', 'pericopeOrdem')
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
  const notas = await (await db()).getAllFromIndex('anotacoes', 'by-pericope', ordem)
  // Mais recentes primeiro: a última anotação escrita fica no topo da lista.
  return notas.sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : a.criadoEm > b.criadoEm ? -1 : 0))
}

export async function saveAnotacao(
  pericopeOrdem: number,
  texto: string,
  id?: string,
  verseRef?: string | null,
): Promise<Anotacao> {
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
    // Parâmetro ausente numa edição preserva o vínculo; `null` explícito remove.
    verseRef: verseRef !== undefined ? verseRef : (existing?.verseRef ?? null),
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

/** Id determinístico do destaque: um por versículo por perícope. */
export function destaqueId(pericopeOrdem: number, verseId: string): string {
  return `${pericopeOrdem}:${verseId}`
}

/** "capitulo:versiculo" — mesmo formato aceito pelo Worker em VERSE_ID. */
const VERSE_ID_RE = /^\d+:\d+$/

export async function listDestaques(ordem: number): Promise<Destaque[]> {
  return (await db()).getAllFromIndex('destaques', 'by-pericope', ordem)
}

export async function setDestaque(
  pericopeOrdem: number,
  verseId: string,
  cor: DestaqueCor,
): Promise<Destaque | null> {
  // Recusa no ponto de escrita: parseTextoNaa emite blocos órfãos com ids como
  // "x:1", e o Worker rejeita qualquer verseId fora de "capitulo:versiculo" —
  // um único item assim no outbox travaria o sync inteiro para sempre (mesma
  // lógica do corte em MAX_TEXTO em saveAnotacao).
  if (!VERSE_ID_RE.test(verseId)) return null
  const now = new Date().toISOString()
  const d = await db()
  const tx = d.transaction(['destaques', 'outbox'], 'readwrite')
  const store = tx.objectStore('destaques')
  const id = destaqueId(pericopeOrdem, verseId)
  const existing = await store.get(id)
  const destaque: Destaque = {
    id,
    pericopeOrdem,
    verseId,
    cor,
    criadoEm: existing?.criadoEm ?? now,
    atualizadoEm: now,
  }
  await store.put(destaque)
  await tx.objectStore('outbox').put({ kind: 'destaque', destaque, apagadoEm: null } as OutboxItem)
  await tx.done
  return destaque
}

export async function removeDestaque(id: string): Promise<void> {
  const d = await db()
  const tx = d.transaction(['destaques', 'outbox'], 'readwrite')
  const store = tx.objectStore('destaques')
  const existing = await store.get(id)
  await store.delete(id)
  if (existing) {
    // Soft delete: a linha some daqui, mas sobe como lápide para o servidor
    // tombar a dele — senão o próximo pull ressuscitaria o destaque.
    const now = new Date().toISOString()
    await tx.objectStore('outbox').put({
      kind: 'destaque',
      destaque: { ...existing, atualizadoEm: now },
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
  const tx = d.transaction(['progresso', 'anotacoes', 'destaques', 'outbox'], 'readwrite')
  await Promise.all([
    tx.objectStore('progresso').clear(),
    tx.objectStore('anotacoes').clear(),
    tx.objectStore('destaques').clear(),
    tx.objectStore('outbox').clear(),
    tx.done,
  ])
}

/**
 * Aplica o progresso vindo do pull e devolve quantas linhas mudaram de fato.
 *
 * A contagem alimenta o evento de live refresh (src/lib/sync-event.ts): o pull
 * reentrega linhas de propósito, então "veio no payload" não é o mesmo que
 * "mudou aqui" — só o que o LWW deixou entrar conta.
 */
export async function applyRemoteProgresso(
  items: { pericopeOrdem: number; status: ProgressoStatus; atualizadoEm: string }[],
): Promise<number> {
  const d = await db()
  let aplicadas = 0
  for (const item of items) {
    const local = await d.get('progresso', item.pericopeOrdem)
    if (remoteWinsLocal(item.atualizadoEm, local?.atualizadoEm)) {
      await d.put('progresso', item)
      aplicadas++
    }
  }
  return aplicadas
}

export async function applyRemoteAnotacoes(
  items: {
    id: string
    pericopeOrdem: number
    texto: string
    verseRef?: string | null
    criadoEm: string
    atualizadoEm: string
    apagadoEm: string | null
  }[],
): Promise<number> {
  const d = await db()
  let aplicadas = 0
  for (const item of items) {
    const local = await d.get('anotacoes', item.id)
    if (!remoteWinsLocal(item.atualizadoEm, local?.atualizadoEm)) continue
    if (item.apagadoEm) {
      // Lápide de linha que já não existe aqui: deletar não muda nada, e
      // reentrega de lápide é rotina no pull — contar isso acordaria as telas
      // por nada.
      if (!local) continue
      await d.delete('anotacoes', item.id)
      aplicadas++
    } else {
      const { apagadoEm: _apagadoEm, ...nota } = item
      // Linha vinda de servidor sem a coluna (ou de antes da migration) entra
      // como null: o tipo local exige o campo presente.
      await d.put('anotacoes', { ...nota, verseRef: nota.verseRef ?? null })
      aplicadas++
    }
  }
  return aplicadas
}

export async function applyRemoteDestaques(
  items: {
    id: string
    pericopeOrdem: number
    verseId: string
    cor: DestaqueCor
    criadoEm: string
    atualizadoEm: string
    apagadoEm: string | null
  }[],
): Promise<number> {
  const d = await db()
  let aplicadas = 0
  for (const item of items) {
    const local = await d.get('destaques', item.id)
    if (!remoteWinsLocal(item.atualizadoEm, local?.atualizadoEm)) continue
    if (item.apagadoEm) {
      if (!local) continue
      await d.delete('destaques', item.id)
      aplicadas++
    } else {
      const { apagadoEm: _apagadoEm, ...destaque } = item
      await d.put('destaques', destaque)
      aplicadas++
    }
  }
  return aplicadas
}
