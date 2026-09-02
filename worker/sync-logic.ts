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

/**
 * Teto do corpo bruto do POST /api/sync, em bytes.
 *
 * Não é o limite apertado — o aperto de verdade são MAX_ITENS e MAX_TEXTO,
 * checados depois do parse. O papel deste teto é barrar o absurdo (um corpo
 * de centenas de MB) antes de gastar CPU desserializando, e ele NUNCA pode
 * rejeitar um payload legal: o cliente trata a rejeição como determinística e
 * abandona o lote (src/lib/sync.ts), então um teto apertado demais viraria
 * perda silenciosa de anotação.
 *
 * Pior caso legal: 500 anotações × 20.000 unidades UTF-16 de texto, cada
 * unidade custando até 3 bytes em UTF-8 (~30 MB), mais ~0,3 MB de ids,
 * timestamps e nomes de campo das três listas. 32 MiB cobre isso com folga e
 * ainda corta bem abaixo do teto de corpo do próprio Workers.
 */
export const MAX_CORPO = 32 * 1024 * 1024

/**
 * Teto do corpo em dois estágios: `contentLength` é o header (quando presente,
 * barra antes de bufferizar) e `tamanho` é o comprimento do corpo já lido —
 * rede de segurança para o corpo chunked, que chega sem o header.
 *
 * `tamanho` vem em unidades UTF-16 e MAX_CORPO em bytes: como um caractere
 * nunca ocupa menos bytes em UTF-8 do que unidades em UTF-16, a comparação erra
 * sempre para o lado permissivo — que é o lado certo aqui.
 */
export function corpoExcedeLimite(
  contentLength: string | null | undefined,
  tamanho?: number,
): boolean {
  const declarado = contentLength == null ? Number.NaN : Number(contentLength)
  if (Number.isFinite(declarado) && declarado > MAX_CORPO) return true
  return tamanho !== undefined && tamanho > MAX_CORPO
}

const ISO_CANONICAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
// "c:v" ou "c:v-c:v" cabem folgado; o limite existe só para barrar abuso.
const MAX_VERSE_REF = 32

// Ordem da perícope: inteiro seguro e não-negativo (o dado real vai de 0 a
// 2646). Sem isto passavam `1.5` e `1e308`, que viram linha inalcançável pelo
// cliente — ele só consulta por ordens inteiras vindas do pericopes.json.
function isOrdem(v: unknown): v is number {
  return typeof v === 'number' && Number.isSafeInteger(v) && v >= 0
}

function isIso(v: unknown): v is string {
  return typeof v === 'string' && ISO_CANONICAL.test(v) && !Number.isNaN(Date.parse(v))
}

function validProgresso(v: unknown): v is PushProgresso {
  if (typeof v !== 'object' || v === null) return false
  const p = v as Record<string, unknown>
  return (
    isOrdem(p.pericopeOrdem) &&
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
    isOrdem(a.pericopeOrdem) &&
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
    d.id.length <= 64 &&
    isOrdem(d.pericopeOrdem) &&
    typeof d.verseId === 'string' &&
    VERSE_ID.test(d.verseId) &&
    typeof d.cor === 'string' &&
    CORES.has(d.cor) &&
    isIso(d.criadoEm) &&
    isIso(d.atualizadoEm) &&
    (d.apagadoEm === null || isIso(d.apagadoEm)) &&
    // Por último, com as partes já validadas: o id TEM que ser o derivado de
    // (pericopeOrdem, verseId) — o mesmo que destaqueId() monta no cliente.
    // A Leitura pinta o versículo pelo verseId mas remove pelo id derivado;
    // um id divergente vira destaque que o usuário não consegue apagar, e que
    // o pull seguinte traz de volta.
    d.id === `${d.pericopeOrdem}:${d.verseId}`
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
