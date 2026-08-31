import { APIError, betterAuth } from 'better-auth'
import { emailOTP } from 'better-auth/plugins'
import { D1Dialect } from 'kysely-d1'
import { isEmailAllowed } from './allowlist'
import { sendOtpEmail } from './email'
import type { Env } from './env.d'

// Origens de desenvolvimento local só são confiáveis quando o próprio
// APP_URL configurado é local — em produção (APP_URL real) elas nunca
// entram na lista.
const LOCAL_DEV_ORIGINS = ['http://localhost:8787', 'http://localhost:5173']

/** `ja…@exemplo.com` — o suficiente para depurar sem logar o e-mail inteiro. */
function mascararEmail(email: string): string {
  const at = email.indexOf('@')
  if (at < 0) return `${email.slice(0, 2)}…`
  return `${email.slice(0, 2)}…${email.slice(at)}`
}

export function createAuth(env: Env) {
  return betterAuth({
    baseURL: env.APP_URL,
    secret: env.BETTER_AUTH_SECRET,
    basePath: '/api/auth',
    trustedOrigins: env.APP_URL.startsWith('http://localhost')
      ? [env.APP_URL, ...LOCAL_DEV_ORIGINS]
      : [env.APP_URL],
    database: {
      dialect: new D1Dialect({ database: env.DB }),
      type: 'sqlite',
    },
    session: {
      expiresIn: 60 * 60 * 24 * 90, // 90 dias (spec)
      updateAge: 60 * 60 * 24, // renovação rolante diária
    },
    // Sem isto o better-auth não resolve o IP do cliente atrás da Cloudflare e
    // cai num único balde compartilhado por rota — o rate limit vira global.
    advanced: {
      ipAddress: {
        ipAddressHeaders: ['cf-connecting-ip', 'x-forwarded-for'],
      },
    },
    rateLimit: {
      enabled: true,
      storage: 'database',
      modelName: 'rateLimit',
      // Chave do customRules é o path já normalizado contra o basePath
      // (ver api/rate-limiter: normalizePathname(req.url, basePath)), ou seja
      // sem o prefixo /api/auth. Envio de OTP custa e-mail: aperta a mão.
      customRules: {
        '/email-otp/send-verification-otp': { window: 600, max: 5 },
      },
    },
    // Segundo gate autoritativo: o OTP é gravado (e pode ser verificado)
    // antes de sendVerificationOTP rodar, então um e-mail bloqueado ainda
    // teria um código válido em circulação caso alguém o obtivesse. Este
    // hook impede a criação da conta na hora, independente do gate de
    // envio abaixo.
    databaseHooks: {
      user: {
        create: {
          async before(user) {
            if (!isEmailAllowed(user.email, env.ALLOWED_EMAILS)) {
              throw new APIError('FORBIDDEN', {
                message: 'e-mail não permitido',
                code: 'EMAIL_NOT_ALLOWED',
              })
            }
          },
        },
      },
    },
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 600,
        allowedAttempts: 3,
        async sendVerificationOTP({ email, otp }) {
          if (!isEmailAllowed(email, env.ALLOWED_EMAILS)) {
            console.log(`allowlist: bloqueado envio para ${mascararEmail(email)}`)
            return // resposta genérica de sucesso, sem enviar
          }
          await sendOtpEmail(env, email, otp)
        },
      }),
    ],
  })
}
