import { authClient } from './auth-client'
import {
  applyRemoteAnotacoes,
  applyRemoteProgresso,
  clearOutbox,
  getMeta,
  listOutbox,
  setMeta,
  type OutboxItem,
} from './user-db'

const CURSOR_KEY = 'sync-cursor'
let running = false

function toPush(items: OutboxItem[]) {
  const progresso = new Map<number, { pericopeOrdem: number; status: string; atualizadoEm: string }>()
  const anotacoes = new Map<
    string,
    { id: string; pericopeOrdem: number; texto: string; criadoEm: string; atualizadoEm: string; apagadoEm: string | null }
  >()
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

export async function syncNow(): Promise<void> {
  if (running || !navigator.onLine) return
  running = true
  try {
    const { data: session } = await authClient.getSession()
    if (!session) return

    // push: outbox → servidor (dedupe por chave, último estado vence)
    const outbox = await listOutbox()
    if (outbox.length) {
      const lastSeq = outbox[outbox.length - 1].seq ?? 0
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(toPush(outbox)),
      })
      if (res.status === 401) return
      if (!res.ok) return // fica no outbox para a próxima tentativa
      await clearOutbox(lastSeq)
    }

    // pull incremental
    const since = (await getMeta(CURSOR_KEY)) ?? ''
    const res = await fetch(`/api/sync?since=${encodeURIComponent(since)}`, {
      credentials: 'include',
    })
    if (!res.ok) return
    const data = (await res.json()) as {
      progresso: Parameters<typeof applyRemoteProgresso>[0]
      anotacoes: Parameters<typeof applyRemoteAnotacoes>[0]
      agora: string
    }
    await applyRemoteProgresso(data.progresso)
    await applyRemoteAnotacoes(data.anotacoes)
    await setMeta(CURSOR_KEY, data.agora)
  } catch {
    // offline/erro transitório: outbox preservado, próxima chance sincroniza
  } finally {
    running = false
  }
}

export function initSyncTriggers(): void {
  syncNow()
  window.addEventListener('online', () => syncNow())
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') syncNow()
  })
  window.setInterval(() => syncNow(), 5 * 60 * 1000)
}
