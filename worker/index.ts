import { Hono } from 'hono'
import { createAuth } from './auth'
import { parseSyncPush } from './sync-logic'
import type { Env } from './env.d'

const app = new Hono<{ Bindings: Env }>()

app.on(['GET', 'POST'], '/api/auth/*', (c) => createAuth(c.env).handler(c.req.raw))

async function requireUserId(c: { env: Env; req: { raw: Request } }): Promise<string | null> {
  const auth = createAuth(c.env)
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  return session?.user.id ?? null
}

app.get('/api/sync', async (c) => {
  const userId = await requireUserId(c)
  if (!userId) return c.json({ error: 'não autenticado' }, 401)
  const since = c.req.query('since') ?? ''
  const prog = await c.env.DB.prepare(
    `SELECT pericope_ordem AS pericopeOrdem, status, atualizado_em AS atualizadoEm
     FROM progresso WHERE user_id = ?1 AND atualizado_em > ?2`,
  )
    .bind(userId, since)
    .all()
  const notas = await c.env.DB.prepare(
    `SELECT id, pericope_ordem AS pericopeOrdem, texto, criado_em AS criadoEm,
            atualizado_em AS atualizadoEm, apagado_em AS apagadoEm
     FROM anotacoes WHERE user_id = ?1 AND atualizado_em > ?2`,
  )
    .bind(userId, since)
    .all()
  return c.json({
    progresso: prog.results,
    anotacoes: notas.results,
    agora: new Date().toISOString(),
  })
})

app.post('/api/sync', async (c) => {
  const userId = await requireUserId(c)
  if (!userId) return c.json({ error: 'não autenticado' }, 401)
  const parsed = parseSyncPush(await c.req.json().catch(() => null))
  if (!parsed) return c.json({ error: 'payload inválido' }, 400)

  const stmts = [
    ...parsed.progresso.map((p) =>
      c.env.DB.prepare(
        `INSERT INTO progresso (user_id, pericope_ordem, status, atualizado_em)
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(user_id, pericope_ordem) DO UPDATE SET
           status = excluded.status, atualizado_em = excluded.atualizado_em
         WHERE excluded.atualizado_em > progresso.atualizado_em`,
      ).bind(userId, p.pericopeOrdem, p.status, p.atualizadoEm),
    ),
    ...parsed.anotacoes.map((a) =>
      c.env.DB.prepare(
        `INSERT INTO anotacoes (id, user_id, pericope_ordem, texto, criado_em, atualizado_em, apagado_em)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
         ON CONFLICT(user_id, id) DO UPDATE SET
           texto = excluded.texto, atualizado_em = excluded.atualizado_em,
           apagado_em = excluded.apagado_em
         WHERE excluded.atualizado_em > anotacoes.atualizado_em`,
      ).bind(a.id, userId, a.pericopeOrdem, a.texto, a.criadoEm, a.atualizadoEm, a.apagadoEm),
    ),
  ]
  if (stmts.length) await c.env.DB.batch(stmts)
  return c.json({ ok: true, agora: new Date().toISOString() })
})

app.notFound((c) => c.json({ error: 'não encontrado' }, 404))

export default app
