// Narração pré-gerada servida do R2: validação da chave e Content-Range.

/** Chave válida: "<voz>/<ordem>.m4a" (ex.: "nt-ml/1600.m4a"); null caso contrário. */
export function chaveAudio(caminho: string): string | null {
  return /^[a-z][a-z0-9-]*\/\d+\.m4a$/.test(caminho) ? caminho : null
}

type FaixaR2 = { offset?: number; length?: number; suffix?: number }

/** Content-Range de uma resposta 206 a partir do range resolvido pelo R2. */
export function cabecalhoContentRange(faixa: FaixaR2 | undefined, tamanho: number): string | null {
  if (!faixa) return null
  const inicio = faixa.suffix !== undefined ? tamanho - faixa.suffix : (faixa.offset ?? 0)
  const comprimento = faixa.suffix ?? faixa.length ?? tamanho - inicio
  return `bytes ${inicio}-${inicio + comprimento - 1}/${tamanho}`
}
