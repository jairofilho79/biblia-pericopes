/**
 * Normalização do texto da Bíblia Livre (BLIVRE) para leitura e narração.
 *
 * A BLIVRE marca entre colchetes a palavra que o tradutor supriu e o original
 * não traz — "Deus [é] nosso refúgio". São 4.838 versículos, 1 em cada 6. Na
 * tela isso vira ruído, e o TTS lê o colchete de forma imprevisível, então o
 * app remove os delimitadores e mantém as palavras.
 *
 * Isso é uma ADAPTAÇÃO no sentido da CC BY 3.0 Brasil, que a permite exigindo
 * que a mudança seja indicada — o crédito no rodapé do app declara.
 *
 * Cuidado com a diagramação da fonte: ela escreve `Salva [-nos] ,SENHOR!`, com
 * o sufixo hifenizado solto e o espaço do lado errado da vírgula. Tirar só os
 * colchetes deixaria `Salva -nos ,SENHOR!`.
 */

/** Sufixo hifenizado entre colchetes: `Salva [-nos]` → `Salva-nos`. */
const HIFEN_SOLTO = /\s*\[-/g
/** Espaço antes de pontuação, que sobra quando o colchete some. */
const ESPACO_ANTES_DE_PONTUACAO = /\s+([,;.!?:])/g
/**
 * Pontuação colada na palavra seguinte, que a fonte produz junto com o espaço
 * errado. Fora os dois-pontos: eles separam o sobrescrito do versículo e quem
 * cuida disso é `blivre-epigrafes`, que roda ANTES desta função.
 */
const PONTUACAO_SEM_ESPACO = /([,;!?])(?=[A-Za-zÀ-ÖØ-öø-ÿ])/g

/**
 * Tira os colchetes editoriais mantendo as palavras, e arruma o espaçamento que
 * a remoção deixa torto. Versículo sem colchete volta sem nenhuma alteração.
 */
/**
 * Colchete de abertura colado na palavra anterior — `conseguiam[apenas]`.
 *
 * Tirar os colchetes sem mais nada gruda as duas palavras
 * (`conseguiamapenas`), e o defeito é mudo: o versículo continua parecendo
 * texto. São 19 ocorrências no corpus, e elas se dividem em dois casos que
 * pedem tratamento OPOSTO — por isso a condição olha o que vem depois do
 * colchete. `mataram[-no]` tem de virar `mataram-no`, colado; só se abre
 * espaço quando o colchete começa em letra.
 */
const COLCHETE_COLADO = /(\p{L})\[(?=\p{L})/gu

export function removerColchetes(texto: string): string {
  return texto
    .replace(COLCHETE_COLADO, '$1 [')
    .replace(HIFEN_SOLTO, '-')
    .replace(/[[\]]/g, '')
    .replace(ESPACO_ANTES_DE_PONTUACAO, '$1')
    .replace(PONTUACAO_SEM_ESPACO, '$1 ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}
