/**
 * Correções de defeito da fonte na Bíblia Livre.
 *
 * **Método.** Nenhuma correção entrou aqui por julgamento meu. Cada uma foi
 * conferida contra duas testemunhas independentes:
 *
 * - a **KJV** (`data/raw/PericopeGroupedKJVVerses.json`, o mesmo dataset de onde
 *   vêm os limites das perícopes) — inglês, mas da mesma linhagem textual
 *   Textus Receptus da BLIVRE;
 * - a **Almeida de 1911**, domínio público, que é a *ancestral* da Bíblia Livre
 *   — a BLIVRE é uma modernização da Almeida de 1819.
 *
 * Onde as duas concordam contra a BLIVRE, é defeito da BLIVRE. Onde alguma
 * discorda, não se mexe. A comparação já derrubou dois candidatos: `cada um um
 * cordeiro` (Êx 12:3) e `cada um um bolo` (1Cr 16:3) parecem duplicata e são
 * português correto — a Almeida 1911 traz igual.
 *
 * **Nada aparece na tela.** Não há marcação de "aqui foi corrigido": o leitor
 * fica com a história, não com o aparato crítico.
 *
 * Toda correção é verificada antes de aplicar. Se a fonte mudar e o defeito não
 * estiver mais lá, isto LANÇA em vez de aplicar às cegas.
 */

/**
 * Palavra repetida por engano de digitação: `sobre sobre vós`. A segunda sai.
 *
 * O pronome enclítico NÃO entra aqui — `tirou-o o SENHOR`, `traga-a a ti`,
 * `puseram-no no cárcere` são português correto, e são 66 casos. Nem `se se`
 * (condicional + reflexivo: "se se circuncidar").
 */
export const DUPLICADAS: [string, string][] = [
  ['NUM 16:33', 'a'],
  ['JDG 6:34', 'a'],
  ['1KI 1:51', 'que'],
  ['1KI 3:21', 'que'],
  ['1KI 11:31', 'que'],
  ['1KI 13:3', 'que'],
  ['1CH 5:1', 'de'],
  ['2CH 9:6', 'que'],
  ['2CH 22:9', 'para'],
  ['EZR 2:34', 'de'],
  ['EZR 6:10', 'ao'],
  ['NEH 2:12', 'o'],
  ['JOB 2:1', 'e'],
  ['JOB 13:11', 'sobre'],
  ['JOB 20:2', 'meus'],
  ['PRO 22:1', 'o'],
  ['PRO 23:25', 'te'],
  ['ISA 1:25', 'minha'],
  ['ISA 8:5', 'a'],
  ['ISA 43:9', 'isto'],
  ['ISA 53:12', 'e'],
  ['ISA 58:4', 'vossa'],
  ['ISA 65:5', 'de'],
  ['ISA 66:14', 'do'],
  ['JER 6:10', 'que'],
  ['JER 7:20', 'que'],
  ['JER 9:7', 'que'],
  ['JER 14:9', 'nós'],
  ['JER 17:16', 'ser'],
  ['EZE 8:4', 'a'],
  ['EZE 17:18', 'todas'],
  ['EZE 28:2', 'de'],
  ['EZE 47:9', 'este'],
  ['DAN 5:16', 'puderes'],
  ['DAN 8:27', 'do'],
  ['JOE 2:14', 'de'],
  ['AMO 1:5', 'de'],
  ['AMO 6:10', 'da'],
  ['HAB 1:14', 'como'],
  ['LUK 11:8', 'seu'],
  ['LUK 23:47', 'o'],
  ['JOH 10:15', 'também'],
  ['ACT 14:16', 'os'],
  ['ACT 21:27', 'quase'],
  ['GAL 2:2', 'eu'],
  ['2PE 1:14', 'meu'],
  ['REV 2:8', 'o'],
  ['REV 21:1', 'e'],
]

/**
 * Fecha-parênteses sem abertura em lugar nenhum do capítulo: `que se façam
 * franjas) nos arremates`. Nem a KJV nem a Almeida 1911 têm parêntese nesses
 * pontos — é sujeira de diagramação. Some o caractere; nenhuma palavra muda.
 */
export const PARENTESES_ORFAOS: string[] = [
  'LEV 8:13',
  'NUM 15:38',
  'JER 17:5',
  'JER 17:23',
  'LAM 1:19',
  'LAM 3:36',
  'EZE 22:10',
  'MAT 23:5',
  'JOH 2:6',
  'HEB 10:29',
  'REV 17:14',
]

export type Correcao = {
  ref: string
  /** Trecho exato a encontrar. Guard: se não casar, a fonte mudou. */
  de: string
  para: string
  motivo: string
}

/** As que não cabem numa regra — cada uma conferida à mão. */
export const CORRECOES: Correcao[] = [
  {
    ref: 'PSA 125:1',
    de: 'Os que confiam no SENHOR',
    para: 'Cântico dos degraus:Os que confiam no SENHOR',
    motivo:
      'É o único dos quinze Cânticos dos Degraus (Sl 120–134) sem o sobrescrito. ' +
      'A KJV traz "A Song of degrees." e a própria fonte escreve "Cântico dos degraus" ' +
      'nos outros catorze — a string vem dela, não de mim.',
  },
  {
    ref: 'PSA 80:1',
    de: 'Samo de Asafe',
    para: 'Salmo de Asafe',
    motivo:
      'Erro de digitação no sobrescrito: "Samo". A própria fonte escreve "Salmo" ' +
      'em 75 dos outros sobrescritos, e a KJV traz "A Psalm of Asaph".',
  },
  {
    ref: 'PSA 75:1',
    de: 'conforme “altachete”',
    para: 'conforme “Altachete”',
    motivo:
      'Nome próprio da melodia, que a própria fonte capitaliza como "Altachete" ' +
      'nos Salmos 57, 58 e 59. Só aqui saiu em minúscula.',
  },
  {
    ref: 'PSA 150:3',
    de: 'com com de trombeta',
    para: 'com som de trombeta',
    motivo:
      'Não é duplicata, é uma letra corrompida: a KJV traz "with the sound of the ' +
      'trumpet" e a Almeida 1911 "com o som de trombeta". O paralelismo do próprio ' +
      'versículo confirma ("louvai-o com lira e harpa").',
  },
  {
    ref: 'EXO 2:19',
    de: 'deu de beber as as ovelhas',
    para: 'deu de beber às ovelhas',
    motivo:
      'A duplicata pede crase, não simples remoção: "beber as ovelhas" ficaria ' +
      'agramatical. A KJV traz "watered the flock" e a Almeida 1911 "abeberou o rebanho".',
  },
  {
    ref: '1SA 20:42',
    de: 'para sempre.',
    para: 'para sempre. Então Davi se levantou e se foi; e Jônatas entrou na cidade.',
    motivo:
      'A BLIVRE perdeu o fecho da cena, que as duas testemunhas trazem: a KJV, ' +
      '"And he arose and departed: and Jonathan went into the city."; a Almeida 1911, ' +
      '"Então se levantou David, e se foi; e Jonathan entrou na cidade." A frase aqui é ' +
      'essa da Almeida 1911 com a ortografia e os nomes atualizados — não é tradução minha.',
  },
]

const porRef = new Map<string, { dup?: string; paren?: boolean; manual?: Correcao }>()
for (const [ref, palavra] of DUPLICADAS) porRef.set(ref, { ...porRef.get(ref), dup: palavra })
for (const ref of PARENTESES_ORFAOS) porRef.set(ref, { ...porRef.get(ref), paren: true })
for (const c of CORRECOES) porRef.set(c.ref, { ...porRef.get(c.ref), manual: c })

/**
 * Aplica as correções registradas para o versículo. Devolve o texto intacto
 * quando não há nenhuma — o caso dos outros 31.037.
 */
export function corrigirVersiculo(
  cod: string,
  capitulo: number,
  versiculo: number,
  texto: string,
): string {
  const ref = `${cod} ${capitulo}:${versiculo}`
  const alvo = porRef.get(ref)
  if (!alvo) return texto

  let saida = texto

  if (alvo.dup) {
    const p = alvo.dup.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`((?<![\\p{L}])${p})(\\s+)${p}(?![\\p{L}])`, 'iu')
    if (!re.test(saida)) {
      throw new Error(
        `Correção de duplicata em ${ref} não encontrou "${alvo.dup} ${alvo.dup}". A fonte mudou — reveja a tabela.`,
      )
    }
    saida = saida.replace(re, '$1')
  }

  if (alvo.paren) {
    if (!saida.includes(')')) {
      throw new Error(
        `Correção de parêntese órfão em ${ref} não encontrou ")". A fonte mudou — reveja a tabela.`,
      )
    }
    saida = saida.replace(/\s*\)/, '')
  }

  if (alvo.manual) {
    if (!saida.includes(alvo.manual.de)) {
      throw new Error(
        `Correção em ${ref} não encontrou "${alvo.manual.de}". A fonte mudou — reveja a tabela.`,
      )
    }
    saida = saida.replace(alvo.manual.de, alvo.manual.para)
  }

  return saida
}
