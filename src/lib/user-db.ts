import { openDB, type IDBPDatabase } from 'idb'
import { remoteWinsLocal } from './sync-merge'
import { LIMITE_NOME, MAX_TEXTO } from './sync-limits'
import type {
  Anotacao,
  Destaque,
  DestaqueCor,
  Jornada,
  JornadaTipo,
  PosicaoLeitura,
  PosicaoTipo,
  Progresso,
  ProgressoStatus,
} from './types'

const DB_NAME = 'biblia-pericopes'
const DB_VERSION = 5

export type OutboxItem =
  | { seq?: number; kind: 'progresso'; ordem: number; status: ProgressoStatus; atualizadoEm: string }
  | { seq?: number; kind: 'anotacao'; nota: Anotacao; apagadoEm: string | null }
  | { seq?: number; kind: 'destaque'; destaque: Destaque; apagadoEm: string | null }
  | { seq?: number; kind: 'posicao'; posicao: PosicaoLeitura; apagadoEm: string | null }
  | { seq?: number; kind: 'jornada'; jornada: Jornada; apagadoEm: string | null }

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
  posicoes: {
    key: number
    value: PosicaoLeitura
  }
  jornadas: {
    key: string
    value: Jornada
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
        if (oldVersion < 4) {
          database.createObjectStore('posicoes', { keyPath: 'pericopeOrdem' })
        }
        if (oldVersion < 5) {
          database.createObjectStore('jornadas', { keyPath: 'id' })
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

/**
 * Vocabulário completo do `ref` de uma posição de leitura — os mesmos ids que
 * a Leitura põe no DOM (id de seção, data-verse-id, data-fala-id). O Worker
 * mantém uma cópia (POSICAO_REF em worker/sync-logic.ts, mesmo motivo dos
 * limites em sync-limits.ts): um ref fora disso no outbox faria o servidor
 * rejeitar o lote inteiro com 400, travando o sync — daí o guard na escrita,
 * como o VERSE_ID_RE de setDestaque.
 */
const POSICAO_REF_RE =
  /^(?:\d+:\d+|(?:contexto|resenha|reflexao)-\d+|contexto|texto|resenha|reflexao|titulo|referencia|cabecalho-(?:contexto|texto|resenha|reflexoes)|cap-\d+)$/

export async function getPosicao(ordem: number): Promise<PosicaoLeitura | undefined> {
  return (await db()).get('posicoes', ordem)
}

/**
 * Grava o checkpoint local SEM enfileirar no outbox — exceção deliberada ao
 * padrão "linha + outbox na mesma transação" das outras entidades. Os eventos
 * de leitura (seção ativa, versículo tocado, item narrado) acontecem o tempo
 * todo; quem sobe para o sync é só o estado final, via enqueuePosicao() ao
 * sair da página. Perder um enqueue custa um checkpoint; encher o outbox
 * custaria um lote por scroll.
 */
export async function setPosicaoLocal(
  pericopeOrdem: number,
  tipo: PosicaoTipo,
  ref: string,
  tempo: number | null = null,
): Promise<PosicaoLeitura | null> {
  if (!POSICAO_REF_RE.test(ref)) return null
  const posicao: PosicaoLeitura = {
    pericopeOrdem,
    tipo,
    ref,
    tempo: tipo === 'narracao' && tempo !== null && Number.isFinite(tempo) ? Math.max(0, tempo) : null,
    atualizadoEm: new Date().toISOString(),
  }
  await (await db()).put('posicoes', posicao)
  return posicao
}

/** Sobe o checkpoint atual para o outbox (chamado ao sair da leitura). */
export async function enqueuePosicao(ordem: number): Promise<void> {
  const d = await db()
  const tx = d.transaction(['posicoes', 'outbox'], 'readwrite')
  const posicao = await tx.objectStore('posicoes').get(ordem)
  if (posicao) {
    await tx.objectStore('outbox').put({ kind: 'posicao', posicao, apagadoEm: null } as OutboxItem)
  }
  await tx.done
}

/** Concluir a perícope apaga o checkpoint — com lápide, senão o pull o ressuscita. */
export async function clearPosicao(ordem: number): Promise<void> {
  const d = await db()
  const tx = d.transaction(['posicoes', 'outbox'], 'readwrite')
  const store = tx.objectStore('posicoes')
  const existing = await store.get(ordem)
  await store.delete(ordem)
  if (existing) {
    const now = new Date().toISOString()
    await tx.objectStore('outbox').put({
      kind: 'posicao',
      posicao: { ...existing, atualizadoEm: now },
      apagadoEm: now,
    } as OutboxItem)
  }
  await tx.done
}

/** Todas as posições, sem filtro — acessor cru do store, consumido pelo cursor da jornada (Task 6). */
export async function listAllPosicoes(): Promise<PosicaoLeitura[]> {
  return (await db()).getAll('posicoes')
}

/** A posição mais nova dentro de um conjunto de ordens (a trilha de um testamento). */
export async function getPosicaoMaisRecente(ordens: number[]): Promise<PosicaoLeitura | undefined> {
  const conjunto = new Set(ordens)
  const todas = await (await db()).getAll('posicoes')
  let melhor: PosicaoLeitura | undefined
  for (const p of todas) {
    if (!conjunto.has(p.pericopeOrdem)) continue
    if (!melhor || p.atualizadoEm > melhor.atualizadoEm) melhor = p
  }
  return melhor
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
  const tx = d.transaction(
    ['progresso', 'anotacoes', 'destaques', 'posicoes', 'jornadas', 'outbox'],
    'readwrite',
  )
  await Promise.all([
    tx.objectStore('progresso').clear(),
    tx.objectStore('anotacoes').clear(),
    tx.objectStore('destaques').clear(),
    tx.objectStore('posicoes').clear(),
    tx.objectStore('jornadas').clear(),
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

export async function applyRemotePosicoes(
  items: {
    pericopeOrdem: number
    tipo: PosicaoTipo
    ref: string
    tempo: number | null
    atualizadoEm: string
    apagadoEm: string | null
  }[],
): Promise<number> {
  const d = await db()
  let aplicadas = 0
  for (const item of items) {
    const local = await d.get('posicoes', item.pericopeOrdem)
    if (!remoteWinsLocal(item.atualizadoEm, local?.atualizadoEm)) continue
    if (item.apagadoEm) {
      if (!local) continue
      await d.delete('posicoes', item.pericopeOrdem)
      aplicadas++
    } else {
      const { apagadoEm: _apagadoEm, ...posicao } = item
      await d.put('posicoes', posicao)
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

export async function listJornadas(): Promise<Jornada[]> {
  const todas = await (await db()).getAll('jornadas')
  // Mais recente primeiro: a ativa (se houver) tende ao topo, e o histórico
  // desce em ordem de uso.
  return todas.sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : a.criadoEm > b.criadoEm ? -1 : 0))
}

/**
 * A jornada corrente — a única não arquivada, concluída ou não — ou
 * undefined. Ver criarJornada para a invariante.
 *
 * Deliberadamente NÃO filtra por concluidaEm: uma jornada concluída segue
 * corrente (e visível na Home, com o rótulo "· concluída") até o leitor
 * arquivá-la abrindo outra. Existiu antes um `getJornadaAtiva()` que também
 * exigia `concluidaEm === null` — sutil e errado, porque tornava a
 * reconciliação reversa da Home (reabrir uma jornada concluída cuja
 * perícope foi desmarcada) inalcançável: assim que a jornada era marcada
 * concluída, essa função parava de devolvê-la, e ninguém a examinava de
 * novo. Duas seleções quase iguais convivendo é como esse bug nasceu — por
 * isso só existe esta.
 *
 * Desempate por `atualizadoEm` (spec): a invariante "no máximo uma corrente"
 * é de escrita (criarJornada/atualizarJornada), mas se o pull trouxer duas
 * não arquivadas de aparelhos diferentes antes de convergirem, a LEITURA
 * resolve pela mais recente por `atualizadoEm` — não por `criadoEm`, que é a
 * ordem de listJornadas() e divergia da spec em silêncio. Isto só resolve o
 * lado da leitura: a perdedora aqui segue sem `arquivadaEm` (arquivar é
 * escrita, decisão de produto fora deste caminho) até `criarJornada` limpar
 * na próxima criação.
 */
export async function getJornadaCorrente(): Promise<Jornada | undefined> {
  const correntes = (await listJornadas()).filter((j) => j.arquivadaEm === null)
  return correntes.reduce<Jornada | undefined>(
    (melhor, j) => (!melhor || j.atualizadoEm > melhor.atualizadoEm ? j : melhor),
    undefined,
  )
}

/**
 * Cria uma jornada e arquiva a corrente anterior NA MESMA TRANSAÇÃO.
 *
 * A atomicidade é a invariante "no máximo uma corrente": duas abas criando
 * ao mesmo tempo não podem produzir duas correntes. Se ainda assim o pull
 * trouxer duas de aparelhos diferentes, quem resolve é a reconciliação da
 * carga (a mais recente por atualizadoEm vence).
 */
export async function criarJornada(input: {
  nome: string
  tipo: JornadaTipo
  escopo: string
  inicioOrdem: number
  contaDesde: string | null
}): Promise<Jornada> {
  const now = new Date().toISOString()
  const nova: Jornada = {
    id: crypto.randomUUID(),
    // Trunca no ponto de escrita: o Worker rejeita o lote inteiro acima do
    // teto, e um item ruim travaria o outbox para sempre.
    nome: input.nome.slice(0, LIMITE_NOME),
    tipo: input.tipo,
    escopo: input.escopo,
    inicioOrdem: input.inicioOrdem,
    contaDesde: input.contaDesde,
    criadoEm: now,
    atualizadoEm: now,
    arquivadaEm: null,
    concluidaEm: null,
  }

  const d = await db()
  const tx = d.transaction(['jornadas', 'outbox'], 'readwrite')
  const store = tx.objectStore('jornadas')
  const outbox = tx.objectStore('outbox')

  for (const j of await store.getAll()) {
    // Arquiva QUALQUER jornada corrente, concluída ou não — senão uma
    // concluída ficaria pendurada para sempre (nem arquivada, nem visível,
    // já que a próxima getJornadaCorrente() teria que escolher entre duas).
    if (j.arquivadaEm !== null) continue
    const arquivada: Jornada = { ...j, arquivadaEm: now, atualizadoEm: now }
    await store.put(arquivada)
    await outbox.put({ kind: 'jornada', jornada: arquivada, apagadoEm: null } as OutboxItem)
  }

  await store.put(nova)
  await outbox.put({ kind: 'jornada', jornada: nova, apagadoEm: null } as OutboxItem)
  await tx.done
  return nova
}

export async function atualizarJornada(
  id: string,
  patch: Partial<Pick<Jornada, 'nome' | 'contaDesde' | 'arquivadaEm' | 'concluidaEm'>>,
): Promise<Jornada | undefined> {
  const d = await db()
  const tx = d.transaction(['jornadas', 'outbox'], 'readwrite')
  const store = tx.objectStore('jornadas')
  const atual = await store.get(id)
  if (!atual) {
    await tx.done
    return undefined
  }
  const nova: Jornada = {
    ...atual,
    ...patch,
    nome: (patch.nome ?? atual.nome).slice(0, LIMITE_NOME),
    atualizadoEm: new Date().toISOString(),
  }
  await store.put(nova)
  await tx.objectStore('outbox').put({
    kind: 'jornada',
    jornada: nova,
    apagadoEm: null,
  } as OutboxItem)
  await tx.done
  return nova
}

export async function applyRemoteJornadas(
  items: (Jornada & { apagadoEm: string | null })[],
): Promise<number> {
  const d = await db()
  let aplicadas = 0
  for (const item of items) {
    const local = await d.get('jornadas', item.id)
    if (!remoteWinsLocal(item.atualizadoEm, local?.atualizadoEm)) continue
    if (item.apagadoEm) {
      // Lápide de linha que já não existe aqui não muda nada, e reentrega de
      // lápide é rotina no pull — contar isso acordaria as telas por nada.
      if (!local) continue
      await d.delete('jornadas', item.id)
      aplicadas++
    } else {
      const { apagadoEm: _apagadoEm, ...jornada } = item
      await d.put('jornadas', jornada)
      aplicadas++
    }
  }
  return aplicadas
}
