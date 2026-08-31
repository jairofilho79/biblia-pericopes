import { betterAuth } from 'better-auth'
import { emailOTP } from 'better-auth/plugins'
import { D1Dialect } from 'kysely-d1'
import { isEmailAllowed } from './allowlist'
import { sendOtpEmail } from './email'
import type { Env } from './env.d'

export function createAuth(env: Env) {
  return betterAuth({
    baseURL: env.APP_URL,
    secret: env.BETTER_AUTH_SECRET,
    basePath: '/api/auth',
    trustedOrigins: [env.APP_URL, 'http://localhost:8787', 'http://localhost:5173'],
    database: {
      dialect: new D1Dialect({ database: env.DB }),
      type: 'sqlite',
    },
    session: {
      expiresIn: 60 * 60 * 24 * 90, // 90 dias (spec)
      updateAge: 60 * 60 * 24, // renovação rolante diária
    },
    rateLimit: {
      enabled: true,
      storage: 'database',
      modelName: 'rateLimit',
    },
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 600,
        allowedAttempts: 3,
        async sendVerificationOTP({ email, otp }) {
          if (!isEmailAllowed(email, env.ALLOWED_EMAILS)) {
            console.log(`allowlist: bloqueado envio para ${email}`)
            return // resposta genérica de sucesso, sem enviar
          }
          await sendOtpEmail(env, email, otp)
        },
      }),
    ],
  })
}
