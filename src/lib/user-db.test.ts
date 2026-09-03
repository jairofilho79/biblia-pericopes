import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import {
  applyRemoteAnotacoes,
  applyRemoteDestaques,
  applyRemotePosicoes,
  applyRemoteProgresso,
  clearAllUserData,
  clearOutbox,
  clearPosicao,
  deleteAnotacao,
  deleteMeta,
  enqueuePosicao,
  getMeta,
  getPosicao,
  getPosicaoMaisRecente,
  getProgresso,
  listAnotacoes,
  listDestaques,
  listOutbox,
  removeDestaque,
  saveAnotacao,
  setDestaque,
  setMeta,
  setPosicaoLocal,
  setProgresso,
} from './user-db'
import { MAX_TEXTO } from './sync-limits'

const FUTURE = '2099-01-01T00:00:00.000Z'
const FUTURE_2 = '2099-06-01T00:00:00.000Z'
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
    await setDestaque(9013, '1:1', 'verde')
    await setMeta('chave-temp', 'x')

    await clearAllUserData()

    expect(await getProgresso(9011)).toBeUndefined()
    expect(await listAnotacoes(9012)).toEqual([])
    expect(await listDestaques(9013)).toEqual([])
    expect(await listOutbox()).toEqual([])
    // meta sobrevive ao wipe dos dados; só sai por deleteMeta
    expect(await getMeta('chave-temp')).toBe('x')
    await deleteMeta('chave-temp')
    expect(await getMeta('chave-temp')).toBeUndefined()
  })
})

describe('user-db v3 (destaques)', () => {
  it('setDestaque grava o destaque e enfileira o outbox na mesma transação', async () => {
    const d = await setDestaque(9101, '1:3', 'amarelo')
    expect(d?.id).toBe('9101:1:3')
    expect((await listDestaques(9101)).map((x) => x.cor)).toEqual(['amarelo'])

    const outbox = await listOutbox()
    const item = outbox.find((i) => i.kind === 'destaque' && i.destaque.id === '9101:1:3')
    expect(item).toBeDefined()
    if (item?.kind === 'destaque') {
      expect(item.apagadoEm).toBeNull()
      expect(item.destaque.cor).toBe('amarelo')
    }
  })

  it('destacar de novo troca a cor e preserva criadoEm', async () => {
    const primeiro = await setDestaque(9102, '2:7', 'verde')
    const segundo = await setDestaque(9102, '2:7', 'rosa')
    expect(segundo?.id).toBe(primeiro?.id)
    expect(segundo?.criadoEm).toBe(primeiro?.criadoEm)
    expect((await listDestaques(9102)).map((x) => x.cor)).toEqual(['rosa'])
  })

  it('removeDestaque apaga o local e enfileira a lápide', async () => {
    const d = await setDestaque(9103, '1:1', 'azul')
    await removeDestaque(d!.id)

    expect(await listDestaques(9103)).toEqual([])
    const outbox = await listOutbox()
    const lapides = outbox.filter((i) => i.kind === 'destaque' && i.destaque.id === d!.id)
    const ultima = lapides[lapides.length - 1]
    expect(ultima).toBeDefined()
    if (ultima?.kind === 'destaque') {
      expect(ultima.apagadoEm).not.toBeNull()
      expect(ultima.destaque.atualizadoEm).toBe(ultima.apagadoEm)
    }
  })

  // parseTextoNaa emite blocos órfãos com ids fora de "capitulo:versiculo"
  // (ex.: "x:1"); o Worker rejeita o outbox inteiro se um item assim chegar
  // lá, então o guard tem que barrar a escrita ANTES do outbox existir.
  it('setDestaque com verseId inválido não escreve nada (nem linha, nem outbox)', async () => {
    const outboxAntes = await listOutbox()

    const resultado = await setDestaque(1, 'x:1', 'amarelo')

    expect(resultado).toBeNull()
    expect(await listDestaques(1)).toEqual([])
    const outboxDepois = await listOutbox()
    expect(outboxDepois).toEqual(outboxAntes)
  })

  it('applyRemoteDestaques: mais velho é ignorado, mais novo vence, lápide apaga', async () => {
    const local = await setDestaque(9104, '1:2', 'amarelo')

    await applyRemoteDestaques([{ ...local!, cor: 'verde', atualizadoEm: PAST, apagadoEm: null }])
    expect((await listDestaques(9104)).map((x) => x.cor)).toEqual(['amarelo'])

    await applyRemoteDestaques([{ ...local!, cor: 'azul', atualizadoEm: FUTURE, apagadoEm: null }])
    expect((await listDestaques(9104)).map((x) => x.cor)).toEqual(['azul'])

    await applyRemoteDestaques([{ ...local!, cor: 'azul', atualizadoEm: FUTURE_2, apagadoEm: FUTURE_2 }])
    expect(await listDestaques(9104)).toEqual([])
  })
})

describe('anotações com vínculo a versículo', () => {
  it('saveAnotacao grava verseRef e a edição preserva criadoEm e o vínculo', async () => {
    const nova = await saveAnotacao(9105, 'nota vinculada', undefined, '1:3-1:7')
    expect(nova.verseRef).toBe('1:3-1:7')

    const editada = await saveAnotacao(9105, 'nota editada', nova.id)
    expect(editada.id).toBe(nova.id)
    expect(editada.criadoEm).toBe(nova.criadoEm)
    expect(editada.verseRef).toBe('1:3-1:7')

    const semVinculo = await saveAnotacao(9105, 'nota editada', nova.id, null)
    expect(semVinculo.verseRef).toBeNull()
  })

  it('anotação sem vínculo tem verseRef null', async () => {
    const nota = await saveAnotacao(9106, 'nota solta')
    expect(nota.verseRef).toBeNull()
  })

  it('listAnotacoes devolve as notas mais recentes primeiro', async () => {
    await applyRemoteAnotacoes([
      {
        id: 'ord-a',
        pericopeOrdem: 9200,
        texto: 'antiga',
        verseRef: null,
        criadoEm: '2026-01-01T00:00:00.000Z',
        atualizadoEm: FUTURE,
        apagadoEm: null,
      },
      {
        id: 'ord-b',
        pericopeOrdem: 9200,
        texto: 'nova',
        verseRef: null,
        criadoEm: '2026-06-01T00:00:00.000Z',
        atualizadoEm: FUTURE,
        apagadoEm: null,
      },
      {
        id: 'ord-c',
        pericopeOrdem: 9200,
        texto: 'do meio',
        verseRef: null,
        criadoEm: '2026-03-01T00:00:00.000Z',
        atualizadoEm: FUTURE,
        apagadoEm: null,
      },
    ])

    expect((await listAnotacoes(9200)).map((n) => n.id)).toEqual(['ord-b', 'ord-c', 'ord-a'])
  })
})

// O checkpoint de leitura grava fora do padrão "linha + outbox na mesma
// transação" de propósito: os eventos de leitura (seção ativa, versículo
// tocado, item narrado) são frequentes demais para encher o outbox — a linha
// local muda na hora e só o ENQUEUE explícito (ao sair da página) sobe para o
// sync. Perder um enqueue é aceitável; encher o outbox não é.
describe('user-db v4 (posição de leitura)', () => {
  it('setPosicaoLocal grava a linha sem tocar o outbox', async () => {
    const outboxAntes = await listOutbox()

    const pos = await setPosicaoLocal(9301, 'versiculo', '3:16')
    expect(pos?.tipo).toBe('versiculo')
    expect(pos?.ref).toBe('3:16')
    expect(pos?.tempo).toBeNull()

    const salvo = await getPosicao(9301)
    expect(salvo?.ref).toBe('3:16')
    expect(await listOutbox()).toEqual(outboxAntes)
  })

  it('setPosicaoLocal aceita seção, parágrafo em prosa e alvo de narração com tempo', async () => {
    expect((await setPosicaoLocal(9302, 'secao', 'resenha'))?.ref).toBe('resenha')
    expect((await setPosicaoLocal(9302, 'secao', 'contexto-2'))?.ref).toBe('contexto-2')
    const narr = await setPosicaoLocal(9302, 'narracao', 'reflexao-1', 123.4)
    expect(narr?.tempo).toBe(123.4)
  })

  // Mesma lógica do guard de setDestaque: um ref fora do vocabulário no
  // outbox faria o Worker rejeitar o lote inteiro com 400 para sempre.
  it('setPosicaoLocal com ref fora do vocabulário não grava nada', async () => {
    expect(await setPosicaoLocal(9303, 'versiculo', 'x:1')).toBeNull()
    expect(await setPosicaoLocal(9303, 'secao', 'qualquer-coisa')).toBeNull()
    expect(await getPosicao(9303)).toBeUndefined()
  })

  it('enqueuePosicao enfileira o estado atual; sem linha, não enfileira nada', async () => {
    await setPosicaoLocal(9304, 'secao', 'texto')
    await enqueuePosicao(9304)
    const outbox = await listOutbox()
    const item = outbox.find((i) => i.kind === 'posicao' && i.posicao.pericopeOrdem === 9304)
    expect(item).toBeDefined()
    if (item?.kind === 'posicao') {
      expect(item.apagadoEm).toBeNull()
      expect(item.posicao.ref).toBe('texto')
    }

    const antes = (await listOutbox()).length
    await enqueuePosicao(9305)
    expect((await listOutbox()).length).toBe(antes)
  })

  it('clearPosicao apaga a linha e enfileira a lápide', async () => {
    await setPosicaoLocal(9306, 'versiculo', '1:1')
    await clearPosicao(9306)

    expect(await getPosicao(9306)).toBeUndefined()
    const outbox = await listOutbox()
    const lapides = outbox.filter(
      (i) => i.kind === 'posicao' && i.posicao.pericopeOrdem === 9306 && i.apagadoEm !== null,
    )
    const ultima = lapides[lapides.length - 1]
    expect(ultima).toBeDefined()
    if (ultima?.kind === 'posicao') {
      expect(ultima.posicao.atualizadoEm).toBe(ultima.apagadoEm)
    }
  })

  it('clearPosicao sem linha não enfileira nada', async () => {
    const antes = (await listOutbox()).length
    await clearPosicao(9307)
    expect((await listOutbox()).length).toBe(antes)
  })

  it('getPosicaoMaisRecente devolve a mais nova dentro das ordens dadas', async () => {
    await applyRemotePosicoes([
      { pericopeOrdem: 9310, tipo: 'secao', ref: 'texto', tempo: null, atualizadoEm: '2099-01-01T00:00:00.000Z', apagadoEm: null },
      { pericopeOrdem: 9311, tipo: 'versiculo', ref: '2:5', tempo: null, atualizadoEm: '2099-03-01T00:00:00.000Z', apagadoEm: null },
      { pericopeOrdem: 9312, tipo: 'secao', ref: 'resenha', tempo: null, atualizadoEm: '2099-02-01T00:00:00.000Z', apagadoEm: null },
    ])

    expect((await getPosicaoMaisRecente([9310, 9311, 9312]))?.pericopeOrdem).toBe(9311)
    // filtro: fora da lista de ordens, a mais nova é outra
    expect((await getPosicaoMaisRecente([9310, 9312]))?.pericopeOrdem).toBe(9312)
    expect(await getPosicaoMaisRecente([9399])).toBeUndefined()
  })

  it('applyRemotePosicoes: LWW e lápides, contando só o que mudou', async () => {
    await setPosicaoLocal(9320, 'versiculo', '1:2')

    // remoto mais velho perde
    expect(
      await applyRemotePosicoes([
        { pericopeOrdem: 9320, tipo: 'secao', ref: 'texto', tempo: null, atualizadoEm: PAST, apagadoEm: null },
      ]),
    ).toBe(0)
    expect((await getPosicao(9320))?.ref).toBe('1:2')

    // remoto mais novo vence
    expect(
      await applyRemotePosicoes([
        { pericopeOrdem: 9320, tipo: 'narracao', ref: 'resenha-0', tempo: 45, atualizadoEm: FUTURE, apagadoEm: null },
      ]),
    ).toBe(1)
    expect((await getPosicao(9320))?.tempo).toBe(45)

    // lápide apaga; reentrega da lápide não conta
    expect(
      await applyRemotePosicoes([
        { pericopeOrdem: 9320, tipo: 'narracao', ref: 'resenha-0', tempo: 45, atualizadoEm: FUTURE_2, apagadoEm: FUTURE_2 },
      ]),
    ).toBe(1)
    expect(await getPosicao(9320)).toBeUndefined()
    expect(
      await applyRemotePosicoes([
        { pericopeOrdem: 9320, tipo: 'narracao', ref: 'resenha-0', tempo: 45, atualizadoEm: '2099-12-01T00:00:00.000Z', apagadoEm: '2099-12-01T00:00:00.000Z' },
      ]),
    ).toBe(0)
  })

  it('clearAllUserData também apaga as posições', async () => {
    await setPosicaoLocal(9330, 'secao', 'texto')
    await clearAllUserData()
    expect(await getPosicao(9330)).toBeUndefined()
  })
})

// A contagem é o que decide se o pull emite o evento de live refresh: sem ela,
// toda rodada de sync (5 em 5 minutos) recarregaria as telas abertas à toa.
// Só conta mutação de verdade — em particular, a lápide reentregue de uma
// linha que já não existe localmente não conta, e o pull do servidor reentrega
// linhas de propósito (o cursor `agora` é generoso).
describe('applyRemote* — contagem de linhas aplicadas', () => {
  it('progresso: conta só o que o LWW deixou entrar', async () => {
    expect(await applyRemoteProgresso([])).toBe(0)
    expect(
      await applyRemoteProgresso([
        { pericopeOrdem: 9101, status: 'concluido', atualizadoEm: FUTURE },
      ]),
    ).toBe(1)
    // reentrega do mesmo timestamp: LWW é estrito (>), então não muda nada
    expect(
      await applyRemoteProgresso([
        { pericopeOrdem: 9101, status: 'concluido', atualizadoEm: FUTURE },
      ]),
    ).toBe(0)
    await setProgresso(9102, 'concluido')
    expect(
      await applyRemoteProgresso([
        { pericopeOrdem: 9102, status: 'nao_iniciado', atualizadoEm: PAST },
      ]),
    ).toBe(0)
  })

  it('anotações: upsert conta, lápide de linha existente conta, lápide reentregue não', async () => {
    const nota = await saveAnotacao(9103, 'nota local')
    const lapide = {
      id: nota.id,
      pericopeOrdem: 9103,
      texto: 'irrelevante',
      criadoEm: nota.criadoEm,
      atualizadoEm: FUTURE,
      apagadoEm: FUTURE,
    }
    expect(await applyRemoteAnotacoes([lapide])).toBe(1)
    // mesma lápide de novo: a linha já sumiu, deletar não muda nada
    expect(await applyRemoteAnotacoes([{ ...lapide, atualizadoEm: FUTURE_2 }])).toBe(0)
    expect(
      await applyRemoteAnotacoes([
        {
          id: 'remota-9104',
          pericopeOrdem: 9104,
          texto: 'do servidor',
          criadoEm: PAST,
          atualizadoEm: FUTURE,
          apagadoEm: null,
        },
      ]),
    ).toBe(1)
  })

  it('destaques: mesma regra da lápide reentregue', async () => {
    await setDestaque(9105, '1:1', 'amarelo')
    const lapide = {
      id: '9105:1:1',
      pericopeOrdem: 9105,
      verseId: '1:1',
      cor: 'amarelo' as const,
      criadoEm: PAST,
      atualizadoEm: FUTURE,
      apagadoEm: FUTURE,
    }
    expect(await applyRemoteDestaques([lapide])).toBe(1)
    expect(await applyRemoteDestaques([{ ...lapide, atualizadoEm: FUTURE_2 }])).toBe(0)
  })
})
