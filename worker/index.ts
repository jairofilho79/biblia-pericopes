import { Hono } from 'hono'
import { createAuth } from './auth'
import { TAMANHO_PAGINA_PULL, corpoExcedeLimite, paginarPull, parseSyncPush } from './sync-logic'
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

/** Remove `serverEm` de uma linha antes dela ir pro cliente: o cursor dele é o `agora`/boundary opaco. */
function despirServerEm<T extends { serverEm: string }>(linha: T): Omit<T, 'serverEm'> {
  const { serverEm: _serverEm, ...resto } = linha
  return resto
}

app.get('/api/sync', async (c) => {
  const userId = await requireUserId(c)
  if (!userId) return c.json({ error: 'não autenticado' }, 401)
  const since = c.req.query('since') ?? ''
  // `agora` é gerado ANTES dos SELECTs de propósito: uma linha gravada entre
  // este instante e a resposta tem server_em >= agora e entra no próximo pull.
  // Reentregar uma linha é inofensiva — applyRemote* é idempotente via LWW.
  const agora = new Date().toISOString()
  // Busca n+1 por entidade: a linha extra só serve pra provar que há mais sem
  // uma segunda query. ORDER BY server_em é o que torna o corte de
  // paginarPull válido — ele assume as listas já vêm nessa ordem.
  const limite = TAMANHO_PAGINA_PULL + 1
  const prog = await c.env.DB.prepare(
    `SELECT pericope_ordem AS pericopeOrdem, status, atualizado_em AS atualizadoEm,
            server_em AS serverEm
     FROM progresso WHERE user_id = ?1 AND server_em > ?2
     ORDER BY server_em LIMIT ?3`,
  )
    .bind(userId, since, limite)
    .all()
  const notas = await c.env.DB.prepare(
    `SELECT id, pericope_ordem AS pericopeOrdem, texto, verse_ref AS verseRef,
            criado_em AS criadoEm, atualizado_em AS atualizadoEm, apagado_em AS apagadoEm,
            server_em AS serverEm
     FROM anotacoes WHERE user_id = ?1 AND server_em > ?2
     ORDER BY server_em LIMIT ?3`,
  )
    .bind(userId, since, limite)
    .all()
  const marcas = await c.env.DB.prepare(
    `SELECT id, pericope_ordem AS pericopeOrdem, verse_id AS verseId, cor,
            criado_em AS criadoEm, atualizado_em AS atualizadoEm, apagado_em AS apagadoEm,
            server_em AS serverEm
     FROM destaques WHERE user_id = ?1 AND server_em > ?2
     ORDER BY server_em LIMIT ?3`,
  )
    .bind(userId, since, limite)
    .all()

  const paginado = paginarPull(
    {
      progresso: prog.results as { serverEm: string }[],
      anotacoes: notas.results as { serverEm: string }[],
      destaques: marcas.results as { serverEm: string }[],
    },
    TAMANHO_PAGINA_PULL,
  )

  return c.json({
    progresso: paginado.progresso.map(despirServerEm),
    anotacoes: paginado.anotacoes.map(despirServerEm),
    destaques: paginado.destaques.map(despirServerEm),
    // Sem truncamento (o caminho de longe mais comum): cursor é `agora`,
    // exatamente como antes desta funcionalidade existir. Com truncamento, o
    // cursor é a fronteira computada por paginarPull — nunca `agora`, porque
    // linhas gravadas depois do corte ainda não foram nem buscadas.
    agora: paginado.cursor ?? agora,
    ...(paginado.maisDados ? { maisDados: true } : {}),
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
