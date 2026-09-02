import { Hono } from 'hono'
import { cabecalhoContentRange, chaveAudio } from './audio'
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

// Linhas como saem do SELECT (camelCase pelos AS). `serverEm` é interno: sai
// da linha em despirServerEm antes de virar JSON.
type LinhaProgresso = {
  pericopeOrdem: number
  status: string
  atualizadoEm: string
  serverEm: string
}
type LinhaAnotacao = {
  id: string
  pericopeOrdem: number
  texto: string
  verseRef: string | null
  criadoEm: string
  atualizadoEm: string
  apagadoEm: string | null
  serverEm: string
}
type LinhaDestaque = {
  id: string
  pericopeOrdem: number
  verseId: string
  cor: string
  criadoEm: string
  atualizadoEm: string
  apagadoEm: string | null
  serverEm: string
}

// A parte comum das duas formas de ler cada entidade: a página (`server_em >
// since`, com LIMIT) e o fechamento de grupo (`server_em = cursor`, sem
// LIMIT). Ficam juntas de propósito — a lista de colunas tem que ser a mesma
// nas duas, senão o fechamento devolveria linhas com formato diferente.
const SELECT_PROGRESSO = `SELECT pericope_ordem AS pericopeOrdem, status, atualizado_em AS atualizadoEm,
          server_em AS serverEm
   FROM progresso WHERE user_id = ?1`
const SELECT_ANOTACOES = `SELECT id, pericope_ordem AS pericopeOrdem, texto, verse_ref AS verseRef,
          criado_em AS criadoEm, atualizado_em AS atualizadoEm, apagado_em AS apagadoEm,
          server_em AS serverEm
   FROM anotacoes WHERE user_id = ?1`
const SELECT_DESTAQUES = `SELECT id, pericope_ordem AS pericopeOrdem, verse_id AS verseId, cor,
          criado_em AS criadoEm, atualizado_em AS atualizadoEm, apagado_em AS apagadoEm,
          server_em AS serverEm
   FROM destaques WHERE user_id = ?1`

/**
 * Busca a página de uma entidade: n+1 linhas, a extra só pra provar que há
 * mais sem uma segunda query. ORDER BY server_em é o que torna o corte de
 * paginarPull válido — ele assume as listas já vêm nessa ordem.
 */
async function buscarPagina<T>(
  db: D1Database,
  select: string,
  userId: string,
  since: string,
): Promise<T[]> {
  const { results } = await db
    .prepare(`${select} AND server_em > ?2 ORDER BY server_em LIMIT ?3`)
    .bind(userId, since, TAMANHO_PAGINA_PULL + 1)
    .all<T>()
  return results
}

/**
 * Fecha um grupo de `server_em` que a página cortou ao meio: busca TODAS as
 * linhas daquele instante, sem LIMIT.
 *
 * Sem isto o cursor avançaria para um `server_em` do qual só a fatia buscada
 * foi entregue, e a próxima página — que consulta `server_em > cursor` —
 * nunca mais visitaria o resto: perda permanente. paginarPull avisa em quais
 * entidades isso pode ter acontecido (`gruposIncompletos`); é sempre o caso
 * raro de um único instante com mais linhas que a página inteira, então esta
 * query extra praticamente nunca roda.
 */
async function fecharGrupo<T>(
  db: D1Database,
  select: string,
  userId: string,
  serverEm: string,
): Promise<T[]> {
  const { results } = await db
    .prepare(`${select} AND server_em = ?2 ORDER BY server_em`)
    .bind(userId, serverEm)
    .all<T>()
  return results
}

app.get('/api/sync', async (c) => {
  const userId = await requireUserId(c)
  if (!userId) return c.json({ error: 'não autenticado' }, 401)
  const since = c.req.query('since') ?? ''
  // `agora` é gerado ANTES dos SELECTs de propósito: uma linha gravada entre
  // este instante e a resposta tem server_em >= agora e entra no próximo pull.
  // Reentregar uma linha é inofensivo — applyRemote* é idempotente via LWW.
  const agora = new Date().toISOString()
  const paginado = paginarPull(
    {
      progresso: await buscarPagina<LinhaProgresso>(c.env.DB, SELECT_PROGRESSO, userId, since),
      anotacoes: await buscarPagina<LinhaAnotacao>(c.env.DB, SELECT_ANOTACOES, userId, since),
      destaques: await buscarPagina<LinhaDestaque>(c.env.DB, SELECT_DESTAQUES, userId, since),
    },
    TAMANHO_PAGINA_PULL,
  )

  // Fechamento dos grupos que a janela pode ter partido ao meio (ver
  // fecharGrupo). Substitui a lista, não concatena: paginarPull só marca a
  // entidade quando TODAS as linhas buscadas dela empatam no cursor, então
  // não há nada abaixo dele para preservar.
  const cortado = paginado.cursor
  let progresso = paginado.progresso
  let anotacoes = paginado.anotacoes
  let destaques = paginado.destaques
  if (cortado !== null) {
    for (const entidade of paginado.gruposIncompletos) {
      if (entidade === 'progresso') {
        progresso = await fecharGrupo<LinhaProgresso>(c.env.DB, SELECT_PROGRESSO, userId, cortado)
      } else if (entidade === 'anotacoes') {
        anotacoes = await fecharGrupo<LinhaAnotacao>(c.env.DB, SELECT_ANOTACOES, userId, cortado)
      } else {
        destaques = await fecharGrupo<LinhaDestaque>(c.env.DB, SELECT_DESTAQUES, userId, cortado)
      }
    }
  }

  return c.json({
    progresso: progresso.map(despirServerEm),
    anotacoes: anotacoes.map(despirServerEm),
    destaques: destaques.map(despirServerEm),
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

// Narração pré-gerada (R2). Pública como o texto que ela narra; imutável por
// chave (regenerar uma voz ganha outro prefixo), então o cache pode ser eterno.
app.on(['GET', 'HEAD'], '/api/audio/*', async (c) => {
  const chave = chaveAudio(c.req.path.replace('/api/audio/', ''))
  if (!chave) return c.json({ error: 'não encontrado' }, 404)
  const cabecalhos = new Headers({
    'accept-ranges': 'bytes',
    'cache-control': 'public, max-age=31536000, immutable',
  })
  if (c.req.method === 'HEAD') {
    const meta = await c.env.AUDIO.head(chave)
    if (!meta) return c.json({ error: 'não encontrado' }, 404)
    meta.writeHttpMetadata(cabecalhos)
    cabecalhos.set('content-length', String(meta.size))
    return new Response(null, { headers: cabecalhos })
  }
  const obj = await c.env.AUDIO.get(chave, { range: c.req.raw.headers })
  if (!obj) return c.json({ error: 'não encontrado' }, 404)
  obj.writeHttpMetadata(cabecalhos)
  const contentRange = cabecalhoContentRange(obj.range, obj.size)
  if (contentRange) cabecalhos.set('content-range', contentRange)
  return new Response(obj.body, { status: contentRange ? 206 : 200, headers: cabecalhos })
})

app.notFound((c) => c.json({ error: 'não encontrado' }, 404))

app.onError((err, c) => {
  console.error(err)
  return c.json({ error: 'erro interno' }, 500)
})

export default app
