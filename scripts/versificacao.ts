/**
 * Ajustes de faixa por diferença de versificação KJV × NAA.
 *
 * O dataset de perícopes é KJV. A NAA tem quatro versículos que a KJV não tem
 * — todos finais de capítulo, todos a segunda metade de um versículo que a KJV
 * manteve junto — e por isso nenhuma perícope os reivindica. E tem o caso
 * inverso: uma perícope cuja faixa termina num versículo que a NAA não tem.
 *
 * Cada ajuste é uma decisão editorial, não um conserto mecânico: por isso o
 * motivo fica escrito aqui e não num commit que ninguém relê.
 */
import type { ParsedRef } from './book-map.ts'

export type Ajuste = {
  /** Índice da linha no dataset bruto (= `ordem` da perícope). */
  ordem: number
  /** Livro em inglês, conferido antes de aplicar — guard contra o dataset mudar. */
  livroEn: string
  /** Novo início, quando o ajuste move a abertura. */
  inicio?: { capitulo: number; versiculo: number }
  /** Novo fim, quando o ajuste estende ou encolhe o fecho. */
  fim?: { capitulo: number; versiculo: number }
  motivo: string
}

export const AJUSTES: Ajuste[] = [
  {
    ordem: 544,
    livroEn: '1 Samuel',
    fim: { capitulo: 20, versiculo: 43 },
    motivo:
      '1Sm 20:43 ("Davi se levantou e foi embora; Jônatas voltou para a cidade") ' +
      'é a segunda metade do que a KJV numera como 20:42. Fecha a despedida.',
  },
  {
    ordem: 707,
    livroEn: '1 Kings',
    fim: { capitulo: 22, versiculo: 54 },
    motivo:
      '1Rs 22:54 ("serviu a Baal e o adorou") é o veredito do resumo do reinado ' +
      'de Acazias, que a KJV fecha em 22:53.',
  },
  {
    ordem: 2542,
    livroEn: '3 John',
    fim: { capitulo: 1, versiculo: 15 },
    motivo:
      '3Jo 1:15 ("A paz esteja com você…") é a saudação final da carta; a KJV ' +
      'a mantém dentro de 1:14.',
  },
  {
    ordem: 2613,
    livroEn: 'Revelation',
    inicio: { capitulo: 12, versiculo: 18 },
    motivo:
      'Ap 12:18 ("o dragão se pôs em pé sobre a areia do mar") ABRE a perícope ' +
      'da besta que sai do mar, não fecha a da perseguição à mulher: é a ' +
      'montagem da cena seguinte. A KJV lê a frase como 13:1a. Único dos ' +
      'quatro em que a escolha é discutível, e a decisão é deliberada.',
  },
  {
    ordem: 2316,
    livroEn: '2 Corinthians',
    fim: { capitulo: 13, versiculo: 13 },
    motivo:
      'Caso inverso: a perícope declara terminar em 2Co 13:14, versículo que a ' +
      'NAA não tem — ela fecha a carta em 13:13. Encolhe o fim para o que existe.',
  },
]

const porOrdem = new Map(AJUSTES.map((a) => [a.ordem, a]))

/**
 * Aplica o ajuste da `ordem`, se houver. Devolve os limites inalterados quando
 * não há ajuste, e lança quando o livro não bate — sinal de que o dataset
 * mudou de ordem e a tabela precisa ser revista, nunca ignorada em silêncio.
 */
export function ajustarVersificacao(
  ordem: number,
  start: ParsedRef,
  end: ParsedRef,
): { start: ParsedRef; end: ParsedRef; ajustado: boolean } {
  const a = porOrdem.get(ordem)
  if (!a) return { start, end, ajustado: false }
  if (start.livroEn !== a.livroEn) {
    throw new Error(
      `ajuste de versificação da ordem ${ordem} espera ${a.livroEn}, mas o dataset traz ${start.livroEn}`,
    )
  }
  return {
    start: a.inicio ? { ...start, ...a.inicio } : start,
    end: a.fim ? { ...end, ...a.fim } : end,
    ajustado: true,
  }
}
