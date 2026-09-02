import { Hono } from 'hono'
import { createAuth } from './auth'
import { corpoExcedeLimite, parseSyncPush } from './sync-logic'
import type { Env } from './env.d'

const app = new Hono<{ Bindings: Env }>()

app.on(['GET', 'POST'], '/api/auth/*', (c) => createAuth(c.env).handler(c.req.raw))

async function requireUserId(c: { env: Env; req: { raw: Request } }): Promise<string | null> {
  const auth = createAuth(c.env)
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  return session?.user.id ?? null
}

function parseJson(bruto: string): unknown {
  try {
    return JSON.parse(bruto)
  } catch {
    return null
  }
}

app.get('/api/sync', async (c) => {
  const userId = await requireUserId(c)
  if (!userId) return c.json({ error: 'não autenticado' }, 401)
  const since = c.req.query('since') ?? ''
  // `agora` é gerado ANTES dos SELECTs de propósito: uma linha gravada entre
  // este instante e a resposta tem server_em >= agora e entra no próximo pull.
  // Reentregar uma linha é inofensivo — applyRemote* é idempotente via LWW.
  const agora = new Date().toISOString()
  const prog = await c.env.DB.prepare(
    `SELECT pericope_ordem AS pericopeOrdem, status, atualizado_em AS atualizadoEm
     FROM progresso WHERE user_id = ?1 AND server_em > ?2`,
  )
    .bind(userId, since)
    .all()
  const notas = await c.env.DB.prepare(
    `SELECT id, pericope_ordem AS pericopeOrdem, texto, verse_ref AS verseRef,
            criado_em AS criadoEm, atualizado_em AS atualizadoEm, apagado_em AS apagadoEm
     FROM anotacoes WHERE user_id = ?1 AND server_em > ?2`,
  )
    .bind(userId, since)
    .all()
  const marcas = await c.env.DB.prepare(
    `SELECT id, pericope_ordem AS pericopeOrdem, verse_id AS verseId, cor,
            criado_em AS criadoEm, atualizado_em AS atualizadoEm, apagado_em AS apagadoEm
     FROM destaques WHERE user_id = ?1 AND server_em > ?2`,
  )
    .bind(userId, since)
    .all()
  // server_em não volta para o cliente: o cursor dele é o `agora` opaco.
  return c.json({
    progresso: prog.results,
    anotacoes: notas.results,
    destaques: marcas.results,
    agora,
  })
})

app.post('/api/sync', async (c) => {
  const userId = await requireUserId(c)
  if (!userId) return c.json({ error: 'não autenticado' }, 401)
  if (corpoExcedeLimite(c.req.header('content-length'))) {
    return c.json({ error: 'corpo grande demais' }, 413)
  }
  // Lê como texto para medir o corpo antes de desserializar: um corpo chunked
  // chega sem Content-Length e escaparia do estágio acima. Falha de leitura
  // vira string vazia, que o JSON.parse rejeita e cai no 400 de sempre.
  const bruto = await c.req.text().catch(() => '')
  if (corpoExcedeLimite(null, bruto.length)) {
    return c.json({ error: 'corpo grande demais' }, 413)
  }
  const parsed = parseSyncPush(parseJson(bruto))
  if (!parsed) return c.json({ error: 'payload inválido' }, 400)

  // Um único carimbo de servidor para o lote inteiro: é o que alimenta o
  // cursor do pull (server_em), enquanto atualizado_em (relógio do cliente)
  // segue sendo a chave do LWW.
  const serverEm = new Date().toISOString()
  const stmts = [
    ...parsed.progresso.map((p) =>
      c.env.DB.prepare(
        `INSERT INTO progresso (user_id, pericope_ordem, status, atualizado_em, server_em)
         VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT(user_id, pericope_ordem) DO UPDATE SET
           status = excluded.status, atualizado_em = excluded.atualizado_em,
           server_em = excluded.server_em
         WHERE excluded.atualizado_em > progresso.atualizado_em`,
      ).bind(userId, p.pericopeOrdem, p.status, p.atualizadoEm, serverEm),
    ),
    ...parsed.anotacoes.map((a) =>
      c.env.DB.prepare(
        `INSERT INTO anotacoes (id, user_id, pericope_ordem, texto, verse_ref, criado_em, atualizado_em, apagado_em, server_em)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
         ON CONFLICT(user_id, id) DO UPDATE SET
           texto = excluded.texto, verse_ref = excluded.verse_ref,
           atualizado_em = excluded.atualizado_em,
           apagado_em = excluded.apagado_em, server_em = excluded.server_em
         WHERE excluded.atualizado_em > anotacoes.atualizado_em`,
      ).bind(
        a.id,
        userId,
        a.pericopeOrdem,
        a.texto,
        a.verseRef,
        a.criadoEm,
        a.atualizadoEm,
        a.apagadoEm,
        serverEm,
      ),
    ),
    ...parsed.destaques.map((d) =>
      c.env.DB.prepare(
        `INSERT INTO destaques (user_id, id, pericope_ordem, verse_id, cor, criado_em, atualizado_em, apagado_em, server_em)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
         ON CONFLICT(user_id, id) DO UPDATE SET
           cor = excluded.cor, atualizado_em = excluded.atualizado_em,
           apagado_em = excluded.apagado_em, server_em = excluded.server_em
         WHERE excluded.atualizado_em > destaques.atualizado_em`,
      ).bind(
        userId,
        d.id,
        d.pericopeOrdem,
        d.verseId,
        d.cor,
        d.criadoEm,
        d.atualizadoEm,
        d.apagadoEm,
        serverEm,
      ),
    ),
  ]
  if (stmts.length) await c.env.DB.batch(stmts)
  return c.json({ ok: true, agora: serverEm })
})

app.notFound((c) => c.json({ error: 'não encontrado' }, 404))

app.onError((err, c) => {
  console.error(err)
  return c.json({ error: 'erro interno' }, 500)
})

export default app
