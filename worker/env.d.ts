export interface Env {
  DB: D1Database
  BETTER_AUTH_SECRET: string
  APP_URL: string
  EMAIL_FROM: string
  RESEND_API_KEY?: string
  ALLOWED_EMAILS?: string
}
