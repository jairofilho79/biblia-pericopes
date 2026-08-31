import { APIError } from 'better-auth'
import { describe, expect, it } from 'vitest'
import { createAuth } from './auth'
import type { Env } from './env.d'

function fakeEnv(overrides: Partial<Env> = {}): Env {
  return {
    // Nunca usado nestes testes: nenhum deles chega a executar uma query.
    DB: {} as Env['DB'],
    BETTER_AUTH_SECRET: 'test-secret',
    APP_URL: 'http://localhost:8787',
    EMAIL_FROM: 'Perícopes <onboarding@resend.dev>',
    ...overrides,
  }
}

describe('createAuth — databaseHooks.user.create.before (gate de criação de conta)', () => {
  it('bloqueia a criação quando o e-mail não está na allowlist', async () => {
    const auth = createAuth(fakeEnv({ ALLOWED_EMAILS: 'permitido@x.com' }))
    const before = auth.options.databaseHooks?.user?.create?.before
    expect(before).toBeTypeOf('function')

    await expect(before!({ email: 'intruso@x.com' } as never)).rejects.toBeInstanceOf(APIError)
  })

  it('permite a criação quando o e-mail está na allowlist', async () => {
    const auth = createAuth(fakeEnv({ ALLOWED_EMAILS: 'permitido@x.com' }))
    const before = auth.options.databaseHooks?.user?.create?.before

    await expect(before!({ email: 'permitido@x.com' } as never)).resolves.toBeUndefined()
  })

  it('permite qualquer e-mail quando ALLOWED_EMAILS não está definido (cadastro aberto)', async () => {
    const auth = createAuth(fakeEnv())
    const before = auth.options.databaseHooks?.user?.create?.before

    await expect(before!({ email: 'qualquer@x.com' } as never)).resolves.toBeUndefined()
  })
})

describe('createAuth — rate limit / IP', () => {
  it('resolve o IP do cliente pelos headers da Cloudflare (senão o balde vira global)', () => {
    const auth = createAuth(fakeEnv())
    expect(auth.options.advanced?.ipAddress?.ipAddressHeaders).toEqual([
      'cf-connecting-ip',
      'x-forwarded-for',
    ])
  })

  it('aperta o envio de OTP com uma regra por rota', () => {
    const auth = createAuth(fakeEnv())
    // A chave é o path normalizado contra o basePath (sem o prefixo /api/auth).
    expect(auth.options.rateLimit?.customRules?.['/email-otp/send-verification-otp']).toEqual({
      window: 600,
      max: 5,
    })
  })

  it('mantém o rate limit ligado e persistido no D1', () => {
    const auth = createAuth(fakeEnv())
    expect(auth.options.rateLimit?.enabled).toBe(true)
    expect(auth.options.rateLimit?.storage).toBe('database')
  })
})

describe('createAuth — trustedOrigins', () => {
  it('inclui os localhost de dev quando APP_URL é local', () => {
    const auth = createAuth(fakeEnv({ APP_URL: 'http://localhost:8787' }))
    expect(auth.options.trustedOrigins).toEqual([
      'http://localhost:8787',
      'http://localhost:8787',
      'http://localhost:5173',
    ])
  })

  it('não inclui localhost quando APP_URL é de produção', () => {
    const auth = createAuth(fakeEnv({ APP_URL: 'https://biblia-pericopes.workers.dev' }))
    expect(auth.options.trustedOrigins).toEqual(['https://biblia-pericopes.workers.dev'])
  })
})
