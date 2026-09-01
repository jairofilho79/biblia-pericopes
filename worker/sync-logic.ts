export type PushProgresso = {
  pericopeOrdem: number
  status: 'nao_iniciado' | 'em_andamento' | 'concluido'
  atualizadoEm: string
}

export type PushAnotacao = {
  id: string
  pericopeOrdem: number
  texto: string
  verseRef: string | null
  criadoEm: string
  atualizadoEm: string
  apagadoEm: string | null
}

export type PushDestaque = {
  id: string
  pericopeOrdem: number
  verseId: string
  cor: 'amarelo' | 'verde' | 'azul' | 'rosa'
  criadoEm: string
  atualizadoEm: string
  apagadoEm: string | null
}

const STATUS = new Set(['nao_iniciado', 'em_andamento', 'concluido'])
const CORES = new Set(['amarelo', 'verde', 'azul', 'rosa'])
// "capitulo:versiculo" — o mesmo formato do TextoBlock.id no cliente.
const VERSE_ID = /^\d+:\d+$/
// Cópia deliberada dos limites de src/lib/sync-limits.ts: o Worker não pode
// importar de src/ (tsconfig/bundle separados). Mantenha os dois em sincronia.
// MAX_ITENS vale para as três listas (progresso/anotacoes/destaques).
const MAX_ITENS = 500
const MAX_TEXTO = 20_000

const ISO_CANONICAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
// "c:v" ou "c:v-c:v" cabem folgado; o limite existe só para barrar abuso.
const MAX_VERSE_REF = 32

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

function validAnotacao(v: unknown): v is Omit<PushAnotacao, 'verseRef'> & { verseRef?: unknown } {
  if (typeof v !== 'object' || v === null) return false
  const a = v as Record<string, unknown>
  return (
    typeof a.id === 'string' &&
    a.id.length > 0 &&
    a.id.length <= 64 &&
    typeof a.pericopeOrdem === 'number' &&
    typeof a.texto === 'string' &&
    a.texto.length <= MAX_TEXTO &&
    (a.verseRef === undefined ||
      a.verseRef === null ||
      (typeof a.verseRef === 'string' && a.verseRef.length <= MAX_VERSE_REF)) &&
    isIso(a.criadoEm) &&
    isIso(a.atualizadoEm) &&
    (a.apagadoEm === null || isIso(a.apagadoEm))
  )
}

function validDestaque(v: unknown): v is PushDestaque {
  if (typeof v !== 'object' || v === null) return false
  const d = v as Record<string, unknown>
  return (
    typeof d.id === 'string' &&
    d.id.length > 0 &&
    d.id.length <= 64 &&
    typeof d.pericopeOrdem === 'number' &&
    typeof d.verseId === 'string' &&
    VERSE_ID.test(d.verseId) &&
    typeof d.cor === 'string' &&
    CORES.has(d.cor) &&
    isIso(d.criadoEm) &&
    isIso(d.atualizadoEm) &&
    (d.apagadoEm === null || isIso(d.apagadoEm))
  )
}

export function parseSyncPush(
  body: unknown,
): { progresso: PushProgresso[]; anotacoes: PushAnotacao[]; destaques: PushDestaque[] } | null {
  if (typeof body !== 'object' || body === null) return null
  const b = body as Record<string, unknown>
  const progresso = b.progresso ?? []
  const anotacoes = b.anotacoes ?? []
  // Corpo sem `destaques` é aceito como lista vazia: um cliente ainda não
  // atualizado continua sincronizando progresso e anotações normalmente.
  const destaques = b.destaques ?? []
  if (!Array.isArray(progresso) || !Array.isArray(anotacoes) || !Array.isArray(destaques)) return null
  if (progresso.length > MAX_ITENS || anotacoes.length > MAX_ITENS || destaques.length > MAX_ITENS) {
    return null
  }
  if (
    !progresso.every(validProgresso) ||
    !anotacoes.every(validAnotacao) ||
    !destaques.every(validDestaque)
  ) {
    return null
  }
  return {
    progresso,
    anotacoes: anotacoes.map((a) => ({
      ...a,
      verseRef: typeof a.verseRef === 'string' ? a.verseRef : null,
    })),
    destaques,
  }
}
