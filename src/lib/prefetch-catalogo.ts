import { loadIndex } from './content'
import { livroSlug } from './livro-slug'
import { carregarEstudo, carregarTexto, shardCarregado } from './shards'

export type ItemDaFila = { tipo: 'texto' | 'estudo'; slug: string }

/**
 * Ordem do preenchimento: todos os textos antes de qualquer estudo. É o que
 * deixa a busca pronta depois de 4,3 MB em vez dos 13,7 MB do catálogo.
 */
export function filaDePrefetch(slugs: string[]): ItemDaFila[] {
  return [
    ...slugs.map((slug) => ({ tipo: 'texto' as const, slug })),
    ...slugs.map((slug) => ({ tipo: 'estudo' as const, slug })),
  ]
}

let rodando = false

/**
 * Baixa o catálogo inteiro em segundo plano, um arquivo por vez, para o app
 * voltar a funcionar offline por completo. Começa no primeiro momento ocioso:
 * a renderização inicial tem prioridade.
 */
export function iniciarPrefetch(): void {
  if (rodando) return
  rodando = true
  const comecar = () => {
    void (async () => {
      const slugs = [...new Set((await loadIndex()).map((p) => livroSlug(p.livro)))]
      for (const { tipo, slug } of filaDePrefetch(slugs)) {
        if (shardCarregado(tipo, slug)) continue
        try {
          if (tipo === 'texto') await carregarTexto(slug)
          else await carregarEstudo(slug)
        } catch {
          // Offline no meio da fila é rotina num PWA: para por aqui e a próxima
          // visita retoma de onde o Cache Storage deixou.
          return
        }
      }
    })()
  }
  if (typeof requestIdleCallback === 'function') requestIdleCallback(comecar, { timeout: 3000 })
  else setTimeout(comecar, 2000)
}
