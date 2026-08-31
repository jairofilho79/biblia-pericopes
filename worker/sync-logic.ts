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
const MAX_ITENS = 500
const MAX_TEXTO = 20_000

function isIso(v: unknown): v is string {
  return typeof v === 'string' && !Number.isNaN(Date.parse(v))
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
