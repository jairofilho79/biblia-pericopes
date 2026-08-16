/** Abreviações PT comuns — evita cortar em `ex. Algo`. */
const ABBREV_END =
  /(?:^|[\s(])(?:ex|p\.?\s?ex|etc|cf|dr|dra|sr|sra|prof|a\.C|d\.C|n|v|vs|vv|cap)\.$/i

/**
 * Quebra texto longo em parágrafos legíveis.
 * Prefer `\n\n` existentes; senão agrupa ~N frases por parágrafo.
 */
export function paragraphize(
  text: string,
  { sentencesPerPara = 2, maxParas = 3 }: { sentencesPerPara?: number; maxParas?: number } = {},
): string[] {
  const trimmed = text.replace(/\r\n/g, '\n').trim()
  if (!trimmed) return []

  if (/\n\s*\n/.test(trimmed)) {
    return trimmed
      .split(/\n\s*\n+/)
      .map((p) => p.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .slice(0, maxParas)
  }

  const sentences = splitSentences(trimmed)
  if (sentences.length <= sentencesPerPara) return [trimmed]

  const paras: string[] = []
  for (let i = 0; i < sentences.length && paras.length < maxParas; i += sentencesPerPara) {
    const last = paras.length === maxParas - 1
    const chunk = last ? sentences.slice(i) : sentences.slice(i, i + sentencesPerPara)
    paras.push(chunk.join(' '))
    if (last) break
  }
  return paras
}

function splitSentences(text: string): string[] {
  const out: string[] = []
  let start = 0
  // Só corta se a próxima frase começa com maiúscula (ou fim do texto).
  const re = /[.!?…]["»”']?(?=\s+[A-ZÀ-ÚÁÉÍÓÚÂÊÔÃÕÇ"“«]|$)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const end = m.index + m[0].length
    const piece = text.slice(start, end).trim()
    if (!piece) continue
    if (/\d\.$/.test(piece) && end < text.length) continue
    if (ABBREV_END.test(piece) && end < text.length) continue
    out.push(piece)
    start = end
    while (start < text.length && /\s/.test(text[start]!)) start++
  }
  const tail = text.slice(start).trim()
  if (tail) out.push(tail)
  return out.length ? out : [text]
}
