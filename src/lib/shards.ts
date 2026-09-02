export type EstudoShard = {
  contexto_historico_literario: string
  resenha: string
  perguntas_reflexao: string[]
  topicos_pregar?: string
}

type Tipo = 'texto' | 'estudo'

// Cache de módulo por (tipo, slug). O Cache Storage do service worker já evita
// a rede na segunda vez; este mapa evita também o parse do JSON.
const prontos = new Map<string, Map<number, unknown>>()
const emVoo = new Map<string, Promise<Map<number, unknown>>>()

function chave(tipo: Tipo, slug: string): string {
  return `${tipo}/${slug}`
}

export function shardCarregado(tipo: Tipo, slug: string): boolean {
  return prontos.has(chave(tipo, slug))
}

async function carregar(tipo: Tipo, slug: string): Promise<Map<number, unknown>> {
  const k = chave(tipo, slug)
  const pronto = prontos.get(k)
  if (pronto) return pronto
  const voando = emVoo.get(k)
  if (voando) return voando

  const p = (async () => {
    const res = await fetch(`${import.meta.env.BASE_URL}data/${tipo}/${slug}.json`)
    if (!res.ok) throw new Error(`Falha ao carregar ${tipo} de ${slug}`)
    const linhas = (await res.json()) as { ordem: number }[]
    const mapa = new Map<number, unknown>()
    for (const linha of linhas) {
      const { ordem, ...resto } = linha
      mapa.set(ordem, tipo === 'texto' ? (resto as { texto_naa: string }).texto_naa : resto)
    }
    prontos.set(k, mapa)
    emVoo.delete(k)
    return mapa
  })().catch((err: unknown) => {
    // Falha transitória (é um PWA: offline acontece) não pode reservar a
    // rejeição para sempre — a próxima chamada tenta de novo.
    emVoo.delete(k)
    throw err
  })
  emVoo.set(k, p)
  return p
}

export async function carregarTexto(slug: string): Promise<Map<number, string>> {
  return (await carregar('texto', slug)) as Map<number, string>
}

export async function carregarEstudo(slug: string): Promise<Map<number, EstudoShard>> {
  return (await carregar('estudo', slug)) as Map<number, EstudoShard>
}
