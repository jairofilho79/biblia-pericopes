import { BIBLE_BOOKS, type BibleBook } from '../lib/bible-books'
import { testamentLabel } from '../lib/testament'
import type { FiltroLeitura, LivroProgresso } from '../lib/content'
import { agruparLivros, rotuloContagem } from '../lib/catalogo'

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
