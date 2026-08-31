export type PushProgresso = {
  pericopeOrdem: number
  status: 'nao_iniciado' | 'em_andamento' | 'concluido'
  atualizadoEm: string
}

export type PushAnotacao = {
  id: string
  pericopeOrdem: number
  texto: string
  criadoEm: string
  atualizadoEm: string
  apagadoEm: string | null
}

const STATUS = new Set(['nao_iniciado', 'em_andamento', 'concluido'])
// Cópia deliberada dos limites de src/lib/sync-limits.ts: o Worker não pode
// importar de src/ (tsconfig/bundle separados). Mantenha os dois em sincronia.
const MAX_ITENS = 500
const MAX_TEXTO = 20_000

const ISO_CANONICAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

function isIso(v: unknown): v is string {
  return typeof v === 'string' && ISO_CANONICAL.test(v) && !Number.isNaN(Date.parse(v))
}

function validProgresso(v: unknown): v is PushProgresso {
  if (typeof v !== 'object' || v === null) return false
  const p = v as Record<string, unknown>
  return (
    typeof p.pericopeOrdem === 'number' &&
    typeof p.status === 'string' &&
    STATUS.has(p.status) &&
    isIso(p.atualizadoEm)
  )
}

function validAnotacao(v: unknown): v is PushAnotacao {
  if (typeof v !== 'object' || v === null) return false
  const a = v as Record<string, unknown>
  return (
    typeof a.id === 'string' &&
    a.id.length > 0 &&
    a.id.length <= 64 &&
    typeof a.pericopeOrdem === 'number' &&
    typeof a.texto === 'string' &&
    a.texto.length <= MAX_TEXTO &&
    isIso(a.criadoEm) &&
    isIso(a.atualizadoEm) &&
    (a.apagadoEm === null || isIso(a.apagadoEm))
  )
}

export function parseSyncPush(
  body: unknown,
): { progresso: PushProgresso[]; anotacoes: PushAnotacao[] } | null {
  if (typeof body !== 'object' || body === null) return null
  const b = body as Record<string, unknown>
  const progresso = b.progresso ?? []
  const anotacoes = b.anotacoes ?? []
  if (!Array.isArray(progresso) || !Array.isArray(anotacoes)) return null
  if (progresso.length > MAX_ITENS || anotacoes.length > MAX_ITENS) return null
  if (!progresso.every(validProgresso) || !anotacoes.every(validAnotacao)) return null
  return { progresso, anotacoes }
}
