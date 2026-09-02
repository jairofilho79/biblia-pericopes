export interface Env {
  DB: D1Database
  AUDIO: R2Bucket
  /** Workers AI: só o ditado (whisper) usa. */
  AI: Ai
  BETTER_AUTH_SECRET: string
  APP_URL: string
  EMAIL_FROM: string
  RESEND_API_KEY?: string
  ALLOWED_EMAILS?: string
}
