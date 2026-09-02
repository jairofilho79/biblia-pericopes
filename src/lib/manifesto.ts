/**
 * Manifesto de sincronização da narração (gerado noutra sessão, servido do R2
 * pelo Worker). `inicio`/`dur` e `palavras[].i`/`.d` são segundos ABSOLUTOS
 * dentro do m4a costurado — é o eixo do `timeupdate`.
 */
export type SecaoManifesto = 'titulo' | 'contexto' | 'texto' | 'resenha' | 'reflexoes'

export type PalavraManifesto = { t: string; i: number; d: number }

export type UnidadeManifesto = {
  i: number
  secao: SecaoManifesto
  texto: string
  inicio: number
  dur: number
  /** Ausente em manifesto anterior ao realinhamento: sem ele, não há realce. */
  palavras?: PalavraManifesto[]
}

export type Manifesto = {
  ordem: number
  dur_total: number
  unidades: UnidadeManifesto[]
}

const SECOES: readonly string[] = ['titulo', 'contexto', 'texto', 'resenha', 'reflexoes']

function num(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

function palavraValida(v: unknown): v is PalavraManifesto {
  const p = v as PalavraManifesto
  return !!p && typeof p === 'object' && typeof p.t === 'string' && num(p.i) && num(p.d)
}

function unidadeValida(v: unknown): v is UnidadeManifesto {
  const u = v as UnidadeManifesto
  if (!u || typeof u !== 'object') return false
  if (typeof u.texto !== 'string' || !SECOES.includes(u.secao)) return false
  if (!num(u.i) || !num(u.inicio) || !num(u.dur)) return false
  if (u.palavras !== undefined) {
    if (!Array.isArray(u.palavras) || !u.palavras.every(palavraValida)) return false
  }
  return true
}

/** Guarda de forma: o manifesto vem da rede, então nada aqui é presumido. */
export function manifestoValido(v: unknown): v is Manifesto {
  const m = v as Manifesto
  if (!m || typeof m !== 'object' || Array.isArray(m)) return false
  if (!num(m.ordem) || !num(m.dur_total)) return false
  return Array.isArray(m.unidades) && m.unidades.every(unidadeValida)
}

/**
 * Busca o manifesto da perícope. Qualquer falha — 404, rede, corpo estranho —
 * devolve `null`: sem manifesto o áudio ainda toca, só que sem realce.
 */
export async function carregarManifesto(
  ordem: number,
  signal?: AbortSignal,
): Promise<Manifesto | null> {
  try {
    // `res.ok`, não `status === 200`: o Worker devolve 206 em GET do R2.
    const res = await fetch(`/api/audio/nt-ml/${ordem}.json`, { signal })
    if (!res.ok) return null
    if (!(res.headers.get('content-type') ?? '').includes('json')) return null
    const corpo: unknown = await res.json()
    return manifestoValido(corpo) ? corpo : null
  } catch {
    return null
  }
}
