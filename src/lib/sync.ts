import { authClient } from './auth-client'
import { MAX_ITENS_POR_LOTE } from './sync-limits'
import {
  applyRemoteAnotacoes,
  applyRemoteProgresso,
  clearAllUserData,
  clearOutbox,
  clearOutboxAll,
  deleteMeta,
  getMeta,
  listOutbox,
  setMeta,
  type OutboxItem,
} from './user-db'

const CURSOR_KEY = 'sync-cursor'
const USER_KEY = 'sync-user'
let running = false

type PushProgresso = { pericopeOrdem: number; status: string; atualizadoEm: string }
type PushAnotacao = {
  id: string
  pericopeOrdem: number
  texto: string
  criadoEm: string
  atualizadoEm: string
  apagadoEm: string | null
}

function toPush(items: OutboxItem[]) {
  const progresso = new Map<number, PushProgresso>()
  const anotacoes = new Map<string, PushAnotacao>()
  for (const item of items) {
    if (item.kind === 'progresso') {
      progresso.set(item.ordem, {
        pericopeOrdem: item.ordem,
        status: item.status,
        atualizadoEm: item.atualizadoEm,
      })
    } else {
      anotacoes.set(item.nota.id, { ...item.nota, apagadoEm: item.apagadoEm })
    }
  }
  return { progresso: [...progresso.values()], anotacoes: [...anotacoes.values()] }
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

/** A sessão morreu no servidor: derruba a do cliente para o header voltar a "Entrar". */
function derrubarSessao() {
  authClient.signOut().catch(() => {})
}

/**
 * Envia o outbox em lotes de no máximo MAX_ITENS_POR_LOTE itens por lista.
 * Deduplica antes de fatiar (último estado de cada chave vence) e só devolve
 * `true` quando TODOS os lotes passaram — o outbox só é limpo nesse caso.
 * Reenviar um lote já aceito é inofensivo: o upsert no servidor é idempotente.
 */
async function pushOutbox(outbox: OutboxItem[]): Promise<boolean> {
  const { progresso, anotacoes } = toPush(outbox)
  const lotesProgresso = chunk(progresso, MAX_ITENS_POR_LOTE)
  const lotesAnotacoes = chunk(anotacoes, MAX_ITENS_POR_LOTE)
  const total = Math.max(lotesProgresso.length, lotesAnotacoes.length)

  for (let i = 0; i < total; i++) {
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        progresso: lotesProgresso[i] ?? [],
        anotacoes: lotesAnotacoes[i] ?? [],
      }),
    })
    if (res.status === 401) {
      derrubarSessao()
      return false
    }
    if (!res.ok) {
      // fica no outbox para a próxima tentativa — mas agora com rastro no console
      console.warn('[sync] push falhou', res.status)
      return false
    }
  }
  return true
}

export async function syncNow(): Promise<void> {
  if (running || !navigator.onLine) return
  running = true
  try {
    const { data: session } = await authClient.getSession()
    if (!session) return

    // Troca de conta no mesmo dispositivo: os stores locais são do usuário
    // anterior. Apaga tudo ANTES de sincronizar para não vazar dado de um
    // usuário para a conta do outro.
    const donoLocal = await getMeta(USER_KEY)
    if (donoLocal && donoLocal !== session.user.id) {
      await clearAllUserData()
      await deleteMeta(CURSOR_KEY)
    }
    // Carimba o dono antes do tráfego: se o push/pull falhar, o dispositivo já
    // está corretamente marcado e uma escrita local feita nesse meio-tempo não
    // será apagada por um segundo wipe na próxima rodada.
    if (donoLocal !== session.user.id) await setMeta(USER_KEY, session.user.id)

    // push: outbox → servidor (dedupe por chave, último estado vence)
    const outbox = await listOutbox()
    if (outbox.length) {
      const lastSeq = outbox[outbox.length - 1].seq ?? 0
      if (!(await pushOutbox(outbox))) return
      await clearOutbox(lastSeq)
    }

    // pull incremental
    const since = (await getMeta(CURSOR_KEY)) ?? ''
    const res = await fetch(`/api/sync?since=${encodeURIComponent(since)}`, {
      credentials: 'include',
    })
    if (res.status === 401) {
      derrubarSessao()
      return
    }
    if (!res.ok) {
      console.warn('[sync] pull falhou', res.status)
      return
    }
    const data = (await res.json()) as {
      progresso: Parameters<typeof applyRemoteProgresso>[0]
      anotacoes: Parameters<typeof applyRemoteAnotacoes>[0]
      agora: string
    }
    await applyRemoteProgresso(data.progresso)
    await applyRemoteAnotacoes(data.anotacoes)
    await setMeta(CURSOR_KEY, data.agora)
  } catch (err) {
    // offline/erro transitório: outbox preservado, próxima chance sincroniza
    console.warn('[sync] erro', err)
  } finally {
    running = false
  }
}

/**
 * Logout que não deixa rastro sincronizável do usuário anterior: esvazia o
 * outbox (senão o próximo login herdaria escritas alheias) e zera o cursor
 * (senão o próximo login pularia o histórico dele). A marca `sync-user`
 * permanece de propósito: é ela que dispara o wipe se outra conta entrar aqui.
 */
export async function signOutLocal(): Promise<void> {
  await clearOutboxAll()
  await deleteMeta(CURSOR_KEY)
  await authClient.signOut()
}

export function initSyncTriggers(): void {
  syncNow()
  window.addEventListener('online', () => syncNow())
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') syncNow()
  })
  window.setInterval(() => syncNow(), 5 * 60 * 1000)
}
