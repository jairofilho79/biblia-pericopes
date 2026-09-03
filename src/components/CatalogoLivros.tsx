import { BIBLE_BOOKS, type BibleBook } from '../lib/bible-books'
import { testamentLabel, type Testament } from '../lib/testament'
import type { FiltroLeitura, LivroProgresso } from '../lib/content'

export type Grupo = {
  testament: Testament
  secoes: { secao: string; livros: BibleBook[] }[]
}

/** Agrupa mantendo a ordem canônica recebida: seções nascem por transição,
 *  não por ordenação, então a lista nunca é reordenada por baixo do leitor. */
export function agruparLivros(livros: BibleBook[]): Grupo[] {
  const out: Grupo[] = []
  for (const t of ['vt', 'nt'] as const) {
    const doTestamento = livros.filter((b) => b.testament === t)
    if (!doTestamento.length) continue
    const secoes: Grupo['secoes'] = []
    for (const b of doTestamento) {
      const ultima = secoes[secoes.length - 1]
      if (ultima && ultima.secao === b.section) ultima.livros.push(b)
      else secoes.push({ secao: b.section, livros: [b] })
    }
    out.push({ testament: t, secoes })
  }
  return out
}

/** O número à direita da linha. Zero é informação boa ("terminei"), então o
 *  livro fica com "0" em vez de sumir da lista. */
export function rotuloContagem(
  filtro: FiltroLeitura,
  prog: LivroProgresso | undefined,
  noRecorte: number,
): string {
  if (filtro === 'todos') return `${prog?.concluidas ?? 0} de ${prog?.total ?? 0}`
  if (noRecorte === 0) return '0'
  return filtro === 'nao-lidos' ? `restam ${noRecorte}` : String(noRecorte)
}

export default function CatalogoLivros({
  livros = BIBLE_BOOKS,
  progresso,
  contagem,
  filtro,
  onAbrir,
}: {
  livros?: BibleBook[]
  /** Progresso REAL do livro — nunca obedece ao filtro. */
  progresso: Map<string, LivroProgresso>
  /** Quantas perícopes do livro sobrevivem ao recorte ativo. */
  contagem: Map<string, number>
  filtro: FiltroLeitura
  onAbrir: (livro: BibleBook) => void
}) {
  return (
    <div className="catalogo">
      {agruparLivros(livros).map((g) => (
        <div key={g.testament} className="testament-block">
          <h2 className="testament-h">{testamentLabel(g.testament)}</h2>
          {g.secoes.map((s) => (
            <div key={s.secao} className="section-block">
              <h3 className="section-h">{s.secao}</h3>
              <ul className="livro-list">
                {s.livros.map((b) => {
                  const prog = progresso.get(b.name)
                  const noRecorte = contagem.get(b.name) ?? 0
                  const vazio = filtro !== 'todos' && noRecorte === 0
                  return (
                    <li key={b.abbrev}>
                      <button
                        type="button"
                        className={`livro-row${vazio ? ' livro-vazio' : ''}`}
                        onClick={() => onAbrir(b)}
                      >
                        <span className="livro-nome">{b.name}</span>
                        <span className="livro-abbrev">{b.abbrev}</span>
                        {/* A barra é decoração: quem usa leitor de tela recebe o rótulo. */}
                        <span className="book-progress" aria-hidden>
                          <span
                            className="book-progress-fill"
                            style={{ width: `${prog?.pct ?? 0}%` }}
                          />
                        </span>
                        <span className="book-progress-label">
                          {rotuloContagem(filtro, prog, noRecorte)}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
