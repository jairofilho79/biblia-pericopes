import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearAllUserData,
  deleteMeta,
  getMeta,
  getProgresso,
  listAnotacoes,
  listDestaques,
  listOutbox,
  saveAnotacao,
  setDestaque,
  setMeta,
  setProgresso,
} from './user-db'
import { MAX_ITENS_POR_LOTE } from './sync-limits'

vi.mock('./auth-client', () => ({
  authClient: { getSession: vi.fn(), signOut: vi.fn() },
}))

// Imported after the mock so the mocked module is what sync.ts resolves.
import { authClient } from './auth-client'
import { signOutLocal, syncNow } from './sync'

const FAKE_SESSION = { data: { user: { id: 'u1', email: 'user@example.com' } } }
const NO_SESSION = { data: null }
// Must postdate whatever the real clock stamps local writes with in this test run, so that
// applyRemoteProgresso/applyRemoteAnotacoes treat these fixtures as the newer, winning side.
const FUTURE = '2099-01-01T00:00:00.000Z'

function jsonResponse(body: unknown, init?: { status?: number; ok?: boolean }) {
  const status = init?.status ?? 200
  return {
    ok: init?.ok ?? (status >= 200 && status < 300),
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response
}

/** Zera o estado local compartilhado por estes testes (fake-indexeddb é um singleton). */
async function resetLocal() {
  await clearAllUserData()
  await deleteMeta('sync-cursor')
  await deleteMeta('sync-user')
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubGlobal('navigator', { onLine: true })
  // resetAllMocks zera a implementação; signOut precisa devolver uma promise
  // porque sync.ts encadeia .catch() nela.
  vi.mocked(authClient.signOut).mockResolvedValue(undefined as never)
})

describe('syncNow', () => {
  it('no session → no fetch calls', async () => {
    vi.mocked(authClient.getSession).mockResolvedValue(NO_SESSION as never)
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await syncNow()

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('offline → no fetch calls (session not even checked)', async () => {
    vi.stubGlobal('navigator', { onLine: false })
    const getSessionMock = vi.mocked(authClient.getSession).mockResolvedValue(FAKE_SESSION as never)
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await syncNow()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(getSessionMock).not.toHaveBeenCalled()
  })

  it('session + non-empty outbox → POST deduped payload, clears outbox, GET pulls and stores cursor', async () => {
    vi.mocked(authClient.getSession).mockResolvedValue(FAKE_SESSION as never)

    // ordem 20001 written twice: dedupe must keep only the LAST state ("em_andamento" then
    // "concluido" wins), proving toPush() collapses by key instead of pushing every outbox row.
    await setProgresso(20001, 'em_andamento')
    await setProgresso(20001, 'concluido')
    const nota = await saveAnotacao(20002, 'primeira anotação')

    const remoteAgora = '2026-08-31T12:00:00.000Z'
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        const body = JSON.parse(init.body as string)
        expect(body.progresso).toEqual([
          { pericopeOrdem: 20001, status: 'concluido', atualizadoEm: expect.any(String) },
        ])
        expect(body.anotacoes).toEqual([
          {
            id: nota.id,
            pericopeOrdem: 20002,
            texto: 'primeira anotação',
            verseRef: null,
            criadoEm: nota.criadoEm,
            atualizadoEm: nota.atualizadoEm,
            apagadoEm: null,
          },
        ])
        return jsonResponse({ ok: true, agora: remoteAgora })
      }
      expect(url).toBe(`/api/sync?since=${encodeURIComponent('')}`)
      return jsonResponse({
        progresso: [{ pericopeOrdem: 30001, status: 'concluido', atualizadoEm: remoteAgora }],
        anotacoes: [],
        agora: remoteAgora,
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    await syncNow()

    expect(fetchMock).toHaveBeenCalledTimes(2)

    const outboxAfter = await listOutbox()
    expect(outboxAfter.some((i) => i.kind === 'progresso' && i.ordem === 20001)).toBe(false)
    expect(outboxAfter.some((i) => i.kind === 'anotacao' && i.nota.id === nota.id)).toBe(false)

    const pulled = await getProgresso(30001)
    expect(pulled?.status).toBe('concluido')

    expect(await getMeta('sync-cursor')).toBe(remoteAgora)
  })

  it('POST returning 401 → outbox NOT cleared, no pull attempted', async () => {
    vi.mocked(authClient.getSession).mockResolvedValue(FAKE_SESSION as never)
    await setProgresso(20003, 'concluido')

    const fetchMock = vi.fn(async () => jsonResponse({ error: 'não autenticado' }, { status: 401, ok: false }))
    vi.stubGlobal('fetch', fetchMock)

    await syncNow()

    expect(fetchMock).toHaveBeenCalledTimes(1) // only the POST — no GET pull after a 401
    const outboxAfter = await listOutbox()
    expect(outboxAfter.some((i) => i.kind === 'progresso' && i.ordem === 20003)).toBe(true)
    // contrato do 401: derruba a sessão do cliente para o header voltar a "Entrar"
    expect(authClient.signOut).toHaveBeenCalled()
  })

  it('GET returning 401 → signOut, cursor e dados locais intactos', async () => {
    await resetLocal()
    vi.mocked(authClient.getSession).mockResolvedValue(FAKE_SESSION as never)
    await setMeta('sync-cursor', '2026-01-01T00:00:00.000Z')

    // outbox vazio → syncNow vai direto para o pull
    const fetchMock = vi.fn(async () => jsonResponse({ error: 'não autenticado' }, { status: 401, ok: false }))
    vi.stubGlobal('fetch', fetchMock)

    await syncNow()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(authClient.signOut).toHaveBeenCalled()
    expect(await getMeta('sync-cursor')).toBe('2026-01-01T00:00:00.000Z')
  })

  it('re-entrancy guard: a second syncNow() while one is running makes no extra request', async () => {
    // Deliberately NOT asserting an absolute call count: earlier tests may leave items in the
    // shared fake-indexeddb outbox (e.g. the 401 test's uncleared item), so a fresh syncNow()
    // here may issue a push + a pull. What matters for this guard is that the concurrent second
    // call contributes zero additional requests beyond what a single completed run would make.
    vi.mocked(authClient.getSession).mockResolvedValue(FAKE_SESSION as never)
    const fetchMock = vi.fn(async () =>
      jsonResponse({ progresso: [], anotacoes: [], agora: '2026-08-31T12:00:00.000Z' }),
    )
    vi.stubGlobal('fetch', fetchMock)

    // `running` is set synchronously before the first `await`, so calling syncNow() again
    // before awaiting the first call must short-circuit on the guard.
    const first = syncNow()
    const second = syncNow()
    await first
    const callsAfterFirst = fetchMock.mock.calls.length
    expect(callsAfterFirst).toBeGreaterThan(0)
    await second
    expect(fetchMock.mock.calls.length).toBe(callsAfterFirst)
  })

  it('remote tombstone from pull removes the local note', async () => {
    vi.mocked(authClient.getSession).mockResolvedValue(FAKE_SESSION as never)
    const local = await saveAnotacao(20004, 'nota a ser apagada remotamente')

    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === 'POST') return jsonResponse({ ok: true, agora: FUTURE })
      return jsonResponse({
        progresso: [],
        anotacoes: [
          {
            id: local.id,
            pericopeOrdem: 20004,
            texto: local.texto,
            verseRef: local.verseRef,
            criadoEm: local.criadoEm,
            atualizadoEm: FUTURE,
            apagadoEm: FUTURE,
          },
        ],
        agora: FUTURE,
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    await syncNow()

    expect((await listAnotacoes(20004)).find((n) => n.id === local.id)).toBeUndefined()
  })
})

// O servidor rejeita (400) qualquer lista com mais de MAX_ITENS_POR_LOTE itens.
// Sem fatiar, um outbox grande travava o sync para sempre: o POST voltava 400,
// o cliente não limpava nada e reenviava o mesmo lote inválido a cada rodada.
describe('syncNow — push em lotes', () => {
  const TOTAL = MAX_ITENS_POR_LOTE * 2 + 1 // 1001 → 3 lotes (500 + 500 + 1)

  async function encherOutbox() {
    for (let i = 0; i < TOTAL; i++) await setProgresso(40000 + i, 'concluido')
  }

  it('outbox acima do limite → vários POSTs, nenhuma lista acima de 500, outbox limpo no fim', async () => {
    await resetLocal()
    vi.mocked(authClient.getSession).mockResolvedValue(FAKE_SESSION as never)
    await encherOutbox()

    const posts: { progresso: unknown[]; anotacoes: unknown[] }[] = []
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        posts.push(JSON.parse(init.body as string))
        return jsonResponse({ ok: true, agora: FUTURE })
      }
      return jsonResponse({ progresso: [], anotacoes: [], agora: FUTURE })
    })
    vi.stubGlobal('fetch', fetchMock)

    await syncNow()

    expect(posts.length).toBe(3)
    for (const p of posts) {
      expect(p.progresso.length).toBeLessThanOrEqual(MAX_ITENS_POR_LOTE)
      expect(p.anotacoes.length).toBeLessThanOrEqual(MAX_ITENS_POR_LOTE)
    }
    // nada se perde no caminho: a soma dos lotes é o outbox deduplicado inteiro
    expect(posts.reduce((n, p) => n + p.progresso.length, 0)).toBe(TOTAL)
    expect(await listOutbox()).toEqual([])
  })

  it('lote do meio falhando → outbox NÃO é limpo e o pull nem acontece', async () => {
    await resetLocal()
    vi.mocked(authClient.getSession).mockResolvedValue(FAKE_SESSION as never)
    await encherOutbox()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    let posts = 0
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        posts += 1
        if (posts === 2) return jsonResponse({ error: 'boom' }, { status: 500, ok: false })
        return jsonResponse({ ok: true, agora: FUTURE })
      }
      return jsonResponse({ progresso: [], anotacoes: [], agora: FUTURE })
    })
    vi.stubGlobal('fetch', fetchMock)

    await syncNow()

    expect(fetchMock).toHaveBeenCalledTimes(2) // parou no lote que falhou, sem GET
    expect(await listOutbox()).toHaveLength(TOTAL) // at-least-once: nada é descartado
    expect(warn).toHaveBeenCalledWith('[sync] push falhou', 500)
    warn.mockRestore()
  })
})

// 400 é validação determinística: reenviar o mesmo lote nunca muda o
// resultado. Sem esse escape, o outbox nunca esvaziava e travava o pull (e
// todas as outras entidades) para sempre atrás de um único item ruim.
describe('syncNow — push rejeitado com 400', () => {
  it('POST retornando 400 → outbox é limpo e o pull acontece mesmo assim', async () => {
    await resetLocal()
    vi.mocked(authClient.getSession).mockResolvedValue(FAKE_SESSION as never)
    await setProgresso(80001, 'concluido')
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    let getUrl = ''
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return jsonResponse({ error: 'payload inválido' }, { status: 400, ok: false })
      }
      getUrl = url
      return jsonResponse({ progresso: [], anotacoes: [], agora: FUTURE })
    })
    vi.stubGlobal('fetch', fetchMock)

    await syncNow()

    expect(fetchMock).toHaveBeenCalledTimes(2) // POST rejeitado + GET do pull
    expect(await listOutbox()).toEqual([])
    expect(getUrl).toBe('/api/sync?since=')
    expect(await getMeta('sync-cursor')).toBe(FUTURE) // cursor avançou: o pull rodou de verdade
    expect(errorSpy).toHaveBeenCalledWith('[sync] push rejeitado (400)', expect.any(String))
    errorSpy.mockRestore()
  })
})

describe('troca de conta e logout', () => {
  it('sessão de outro usuário → apaga os dados locais antes de aplicar os dele', async () => {
    await resetLocal()
    // dados do usuário A neste dispositivo
    await setProgresso(50001, 'concluido')
    const notaA = await saveAnotacao(50002, 'nota do usuário A')
    await setMeta('sync-user', 'usuario-A')
    await setMeta('sync-cursor', '2020-01-01T00:00:00.000Z')

    // agora quem está logado é u1 (FAKE_SESSION)
    vi.mocked(authClient.getSession).mockResolvedValue(FAKE_SESSION as never)
    let posts = 0
    let getUrl = ''
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        posts += 1
        return jsonResponse({ ok: true, agora: FUTURE })
      }
      getUrl = url
      return jsonResponse({
        progresso: [{ pericopeOrdem: 50003, status: 'concluido', atualizadoEm: FUTURE }],
        anotacoes: [],
        agora: FUTURE,
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    await syncNow()

    // o outbox de A foi descartado junto: nada dele sobe para a conta de u1
    expect(posts).toBe(0)
    expect(await getProgresso(50001)).toBeUndefined()
    expect((await listAnotacoes(50002)).find((n) => n.id === notaA.id)).toBeUndefined()
    // cursor zerado → pull completo da conta nova
    expect(getUrl).toBe('/api/sync?since=')
    expect((await getProgresso(50003))?.status).toBe('concluido')
    expect(await getMeta('sync-user')).toBe('u1')
  })

  it('mesma conta de novo → nada é apagado', async () => {
    await resetLocal()
    await setMeta('sync-user', 'u1')
    await setProgresso(50004, 'concluido')
    vi.mocked(authClient.getSession).mockResolvedValue(FAKE_SESSION as never)
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) =>
        init?.method === 'POST'
          ? jsonResponse({ ok: true, agora: FUTURE })
          : jsonResponse({ progresso: [], anotacoes: [], agora: FUTURE }),
      ),
    )

    await syncNow()

    expect((await getProgresso(50004))?.status).toBe('concluido')
  })

  it('signOutLocal: esvazia o outbox, zera o cursor e desloga — mantendo a marca do dono', async () => {
    await resetLocal()
    await setProgresso(60001, 'concluido')
    await setMeta('sync-cursor', '2026-01-01T00:00:00.000Z')
    await setMeta('sync-user', 'u1')

    await signOutLocal()

    expect(await listOutbox()).toEqual([])
    expect(await getMeta('sync-cursor')).toBeUndefined()
    // a marca do dono fica: é ela que dispara o wipe se outra conta entrar aqui
    expect(await getMeta('sync-user')).toBe('u1')
    // sair não apaga o que já está lido/anotado neste dispositivo
    expect((await getProgresso(60001))?.status).toBe('concluido')
    expect(authClient.signOut).toHaveBeenCalled()
  })

  it('signOutLocal: se o signOut falhar, o outbox e o cursor ficam intactos', async () => {
    await resetLocal()
    await setProgresso(60002, 'concluido')
    await setMeta('sync-cursor', '2026-01-01T00:00:00.000Z')
    vi.mocked(authClient.signOut).mockRejectedValue(new Error('offline') as never)

    await expect(signOutLocal()).rejects.toThrow('offline')

    // nada de dado local jogado fora por um logout que nem aconteceu
    expect((await listOutbox()).some((i) => i.kind === 'progresso' && i.ordem === 60002)).toBe(true)
    expect(await getMeta('sync-cursor')).toBe('2026-01-01T00:00:00.000Z')
  })
})

describe('syncNow — destaques', () => {
  it('push envia destaques deduplicados por id e o pull aplica os remotos', async () => {
    await resetLocal()
    vi.mocked(authClient.getSession).mockResolvedValue(FAKE_SESSION as never)

    // mesmo versículo destacado duas vezes: só a última cor sobe
    await setDestaque(70001, '1:3', 'amarelo')
    await setDestaque(70001, '1:3', 'verde')

    const posts: { destaques: unknown[] }[] = []
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        posts.push(JSON.parse(init.body as string))
        return jsonResponse({ ok: true, agora: FUTURE })
      }
      return jsonResponse({
        progresso: [],
        anotacoes: [],
        destaques: [
          {
            id: '70002:2:5',
            pericopeOrdem: 70002,
            verseId: '2:5',
            cor: 'azul',
            criadoEm: FUTURE,
            atualizadoEm: FUTURE,
            apagadoEm: null,
          },
        ],
        agora: FUTURE,
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    await syncNow()

    expect(posts).toHaveLength(1)
    expect(posts[0].destaques).toEqual([
      {
        id: '70001:1:3',
        pericopeOrdem: 70001,
        verseId: '1:3',
        cor: 'verde',
        criadoEm: expect.any(String),
        atualizadoEm: expect.any(String),
        apagadoEm: null,
      },
    ])
    expect((await listDestaques(70002)).map((d) => d.cor)).toEqual(['azul'])
    expect(await listOutbox()).toEqual([])
  })

  it('resposta de pull sem a lista destaques não quebra o sync', async () => {
    await resetLocal()
    vi.mocked(authClient.getSession).mockResolvedValue(FAKE_SESSION as never)
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ progresso: [], anotacoes: [], agora: FUTURE })),
    )

    await syncNow()

    expect(await getMeta('sync-cursor')).toBe(FUTURE)
  })
})
