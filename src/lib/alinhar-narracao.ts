import type { Manifesto, SecaoManifesto, UnidadeManifesto } from './manifesto'

/** Um elemento da tela que pode ser realçado (`data-verse-id` é o `id`). */
export type Alvo = { id: string; texto: string }

/** Os alvos de uma seção, na ordem de leitura. `titulo` não tem alvo na tela. */
export type SecaoAlvos = { secao: Exclude<SecaoManifesto, 'titulo'>; alvos: Alvo[] }

export type AlvoAlinhado = {
  id: string
  inicio: number
  fim: number
  /** Uma janela por token de `alvo.texto.split(' ')`, na mesma ordem. */
  palavras: { inicio: number; fim: number }[]
}

/** Ordenado por `inicio`, sem sobreposição. Vazio significa "sem realce". */
export type Alinhamento = AlvoAlinhado[]

/**
 * O tokenizador do contrato: `palavras` traz um item por token de
 * `texto.split(' ')`. Filtrar vazios ou aparar desalinharia os índices.
 */
export function tokens(texto: string): string[] {
  return texto.split(' ')
}

const PREFIXO = /^(?:Capítulo|Reflexão)\s+\d+\.\s+/

type TokenManifesto = { tok: string; inicio: number }

/**
 * Achata as unidades de conteúdo num fluxo de tokens com tempo. Devolve `null`
 * ao primeiro sinal de que o manifesto não honra o contrato de `palavras`.
 *
 * `telaTok` entra só para decidir o descarte de prefixo: `"Capítulo 3."` é
 * marcador fundido quando descartá-lo faz o token seguinte casar com o que a
 * tela espera, e é texto de verdade quando não faz.
 */
function fluxoDoManifesto(unidades: UnidadeManifesto[], telaTok: string[]): TokenManifesto[] | null {
  const fluxo: TokenManifesto[] = []
  for (const u of unidades) {
    const tk = tokens(u.texto)
    const pal = u.palavras
    if (!pal || pal.length !== tk.length) return null
    for (let k = 0; k < tk.length; k++) if (pal[k]!.t !== tk[k]) return null

    let ini = 0
    const m = PREFIXO.exec(u.texto)
    if (m) {
      const n = tokens(m[0].trimEnd()).length
      if (n < tk.length && telaTok[fluxo.length] === tk[n]) ini = n
    }
    for (let k = ini; k < tk.length; k++) fluxo.push({ tok: tk[k]!, inicio: pal[k]!.i })
  }
  return fluxo
}

/** Alinha uma seção. Devolve `[]` — sem realce — a qualquer divergência. */
function alinharSecao(unidadesDaSecao: UnidadeManifesto[], alvos: Alvo[]): AlvoAlinhado[] {
  // A primeira unidade de toda seção de conteúdo é o cabeçalho falado
  // ("Contexto.", "Texto Bíblico.", …), que não existe na tela.
  const conteudo = unidadesDaSecao.slice(1)
  if (!conteudo.length || !alvos.length) return []

  const telaTok: string[] = []
  const donoDoToken: number[] = []
  alvos.forEach((a, ia) => {
    for (const tok of tokens(a.texto)) {
      telaTok.push(tok)
      donoDoToken.push(ia)
    }
  })

  const fluxo = fluxoDoManifesto(conteudo, telaTok)
  if (!fluxo || fluxo.length !== telaTok.length) return []
  for (let k = 0; k < fluxo.length; k++) if (fluxo[k]!.tok !== telaTok[k]) return []

  const ultima = conteudo[conteudo.length - 1]!
  const fimSecao = ultima.inicio + ultima.dur

  const saida: AlvoAlinhado[] = alvos.map((a) => ({
    id: a.id,
    inicio: 0,
    fim: 0,
    palavras: [],
  }))
  fluxo.forEach((t, k) => {
    saida[donoDoToken[k]!]!.palavras.push({ inicio: t.inicio, fim: 0 })
  })

  // Janelas contíguas: cada uma vai até o começo da seguinte. Sem isso, o
  // silêncio entre palavras apagaria o realce e produziria uma piscada.
  for (let ia = 0; ia < saida.length; ia++) {
    const a = saida[ia]!
    a.inicio = a.palavras[0]!.inicio
    a.fim = ia + 1 < saida.length ? saida[ia + 1]!.palavras[0]!.inicio : fimSecao
  }
  for (const a of saida) {
    for (let k = 0; k < a.palavras.length; k++) {
      a.palavras[k]!.fim = k + 1 < a.palavras.length ? a.palavras[k + 1]!.inicio : a.fim
    }
  }
  return saida
}

/**
 * Casa o manifesto com o que a tela renderizou, token a token. Uma seção cujo
 * fluxo não bata exatamente fica de fora: toca sem realce, e as outras seguem.
 */
export function alinhar(manifesto: Manifesto, secoes: SecaoAlvos[]): Alinhamento {
  const saida: AlvoAlinhado[] = []
  for (const { secao, alvos } of secoes) {
    const daSecao = manifesto.unidades.filter((u) => u.secao === secao)
    saida.push(...alinharSecao(daSecao, alvos))
  }
  return saida.sort((a, b) => a.inicio - b.inicio)
}
