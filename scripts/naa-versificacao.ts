/**
 * Conserta capítulos embaralhados em data/NAA.json.
 *
 * Em 5 pontos o arquivo colocou os últimos versículos de um capítulo DENTRO do
 * capítulo seguinte, no meio dele. Efeito duplo: o capítulo de origem fica
 * truncado (Sl 110 com 5 versículos) e o de destino mostra texto que não é dele
 * e engole o próprio final (Is 5 exibe Is 4:5-6 e perde Is 5:29-30).
 *
 * Cada conserto é declarado como: no capítulo `destino`, as posições `posicoes`
 * (1-based) na verdade são a continuação de `origem`. O guard `comeca` casa o
 * início do texto para o script se recusar a rodar num arquivo diferente do
 * esperado, e torna a operação idempotente: se o texto já não está lá, no-op.
 */

export type Conserto = {
  abbrev: string
  /** Capítulo 1-based que perdeu versículos. */
  origem: number
  /** Capítulo 1-based que recebeu os intrusos. */
  destino: number
  /** Posições 1-based dos intrusos em `destino`, em ordem crescente. */
  posicoes: number[]
  /** Primeiras palavras de cada intruso, para conferência. */
  comeca: string[]
}

export const CONSERTOS: Conserto[] = [
  {
    abbrev: '2Sm',
    origem: 22,
    destino: 23,
    posicoes: [40],
    comeca: ['É ele quem dá grandes vitórias ao seu rei'],
  },
  {
    abbrev: 'Sl',
    origem: 110,
    destino: 111,
    posicoes: [6, 8],
    comeca: ['Ele julgará entre as nações', 'No caminho, beberá água na torrente'],
  },
  {
    abbrev: 'Is',
    origem: 4,
    destino: 5,
    posicoes: [5, 7],
    comeca: ['Sobre todos os lugares do monte Sião', 'E haverá um tabernáculo para sombra'],
  },
  {
    abbrev: 'Is',
    origem: 12,
    destino: 13,
    posicoes: [5, 7],
    comeca: ['Cantem louvores ao SENHOR', 'Exultem e gritem de alegria'],
  },
  {
    abbrev: 'Os',
    origem: 3,
    destino: 4,
    posicoes: [4, 6],
    comeca: ['Porque os filhos de Israel ficarão por muito tempo sem rei', 'Depois, os filhos de Israel voltarão'],
  },
]

export type Chapters = string[][]

export type ResultadoConserto = {
  aplicado: boolean
  /** Motivo quando não aplicado (já consertado, ou texto inesperado). */
  motivo?: string
}

/**
 * Move os intrusos de `destino` para o fim de `origem`. Muta `chapters`.
 * Só aplica se TODOS os guards casarem — nunca conserta pela metade.
 */
export function aplicarConserto(chapters: Chapters, c: Conserto): ResultadoConserto {
  const origem = chapters[c.origem - 1]
  const destino = chapters[c.destino - 1]
  if (!origem || !destino) {
    return { aplicado: false, motivo: `capítulo ausente em ${c.abbrev}` }
  }

  const casaTudo = c.posicoes.every((pos, i) =>
    destino[pos - 1]?.startsWith(c.comeca[i]),
  )
  if (!casaTudo) {
    // Já consertado? Então os intrusos estão no fim da origem.
    const jaNaOrigem = c.comeca.every((prefixo) =>
      origem.some((t) => t.startsWith(prefixo)),
    )
    return {
      aplicado: false,
      motivo: jaNaOrigem
        ? `já consertado: ${c.abbrev} ${c.origem}`
        : `texto inesperado em ${c.abbrev} ${c.destino}`,
    }
  }

  const movidos = c.posicoes.map((pos) => destino[pos - 1])
  // Remove de trás pra frente para os índices não escorregarem.
  for (const pos of [...c.posicoes].sort((a, b) => b - a)) {
    destino.splice(pos - 1, 1)
  }
  origem.push(...movidos)
  return { aplicado: true }
}
