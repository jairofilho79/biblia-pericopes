/**
 * Extrai a faixa de uma perícope da fonte bíblica, no formato que o app lê:
 * `Capítulo N` como cabeçalho e `V texto` por versículo (ver
 * `src/lib/parse-texto.ts`).
 *
 * Vive num módulo próprio porque o ETL e o gerador das perícopes novas
 * precisam do MESMO recorte. Enquanto cada um tinha a sua cópia, a do
 * `gerar-novas` lançava onde a do ETL avisava, e as duas tratavam epígrafe de
 * jeito nenhum.
 *
 * Duas decisões estão aqui:
 *
 * - A **epígrafe de abertura** (o sobrescrito do salmo, quando a faixa começa
 *   no versículo que o traz) sai como campo `sobrescrito`, para a tela mostrar
 *   como epígrafe acima do texto e fora da numeração.
 * - A **epígrafe interna** (a letra do acróstico no Sl 119, o marcador de
 *   locutor em Cânticos) volta para a linha do versículo como `Rótulo: texto`,
 *   que é como um narrador leria. São 7 perícopes no catálogo inteiro — não
 *   valem um tipo de bloco novo atravessando parse-texto, player e realce.
 */
import type { LivroBlivre } from './blivre-fonte.ts'

export type Extracao = {
  texto: string
  /** Epígrafe do versículo que abre a faixa, quando existe. */
  sobrescrito?: string
  versiculos: number
  avisos: string[]
}

export function extrairTexto(
  livro: LivroBlivre,
  capInicio: number,
  verInicio: number,
  capFim: number,
  verFim: number,
): Extracao {
  const avisos: string[] = []
  const linhas: string[] = []
  let versiculos = 0
  let sobrescrito: string | undefined

  for (let c = capInicio; c <= capFim; c++) {
    const capitulo = livro.chapters[c - 1]
    if (!capitulo) {
      avisos.push(`capítulo ${c} ausente em ${livro.name}`)
      continue
    }

    const de = c === capInicio ? verInicio : 1
    const ate = c === capFim ? verFim : capitulo.length

    // Sem este aviso a faixa some em silêncio: o laço abaixo simplesmente não
    // roda, e nada denuncia que a perícope pedia um versículo inexistente.
    if (de > ate) {
      avisos.push(
        `${livro.name} ${c}:${de} — início além do fim do capítulo, que tem ${capitulo.length} versículos`,
      )
      continue
    }

    linhas.push(`Capítulo ${c}`)
    for (let v = de; v <= ate; v++) {
      const verso = capitulo[v - 1]
      if (verso == null) {
        avisos.push(`${livro.name} ${c}:${v} ausente na fonte`)
        continue
      }
      const abertura = c === capInicio && v === verInicio
      if (abertura && verso.e) {
        sobrescrito = verso.e
        linhas.push(`${v} ${verso.t}`)
      } else {
        linhas.push(verso.e ? `${v} ${verso.e}: ${verso.t}` : `${v} ${verso.t}`)
      }
      versiculos++
    }
  }

  return { texto: linhas.join('\n'), sobrescrito, versiculos, avisos }
}
