import { Hono } from 'hono'
import { createAuth } from './auth'
import type { Env } from './env.d'

const app = new Hono<{ Bindings: Env }>()

app.on(['GET', 'POST'], '/api/auth/*', (c) => createAuth(c.env).handler(c.req.raw))

app.notFound((c) => c.json({ error: 'não encontrado' }, 404))

export default app
