import type { Manifesto, SecaoManifesto } from './manifesto'

/**
 * Lógica pura dos controles do player de narração — o que dá para testar sem
 * um `<audio>` de verdade: mostrador de tempo, ciclo de velocidade e o salto
 * para o cabeçalho falado de uma seção.
 */

const KEY = 'pericopes-narracao-rate'

/** Rápido o bastante para reouvir, devagar o bastante para acompanhar. */
export const VELOCIDADES: readonly number[] = [1, 1.25, 1.5]

/**
 * `m:ss`, e `h:mm:ss` só se passar de uma hora — nenhuma narração chega lá,
 * mas o mostrador não pode virar "75:00" se chegar. Duração desconhecida
 * (metadados ainda carregando dão `NaN`; stream dá `Infinity`) vira o traço,
 * para o mostrador não anunciar "0:00" como se a faixa fosse vazia.
 */
export function formatarTempo(segundos: number): string {
  if (!Number.isFinite(segundos) || segundos < 0) return '–:––'
  const total = Math.floor(segundos)
  const s = total % 60
  const m = Math.floor(total / 60) % 60
  const h = Math.floor(total / 3600)
  const ss = String(s).padStart(2, '0')
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${ss}`
  return `${m}:${ss}`
}

/** O passo seguinte do ciclo; qualquer valor estranho volta ao normal. */
export function proximaVelocidade(atual: number): number {
  const i = VELOCIDADES.indexOf(atual)
  if (i < 0) return VELOCIDADES[0]!
  return VELOCIDADES[(i + 1) % VELOCIDADES.length]!
}

/** "1,25×" — vírgula decimal e sinal de vezes, como se escreve em pt-BR. */
export function rotuloVelocidade(v: number): string {
  return `${String(v).replace('.', ',')}×`
}

export function lerVelocidade(): number {
  try {
    const v = Number(localStorage.getItem(KEY))
    return VELOCIDADES.includes(v) ? v : VELOCIDADES[0]!
  } catch {
    return VELOCIDADES[0]!
  }
}

export function gravarVelocidade(v: number): void {
  try {
    localStorage.setItem(KEY, String(v))
  } catch {
    // modo privado ou cota cheia: a velocidade vale só nesta sessão
  }
}

/**
 * Onde começa o cabeçalho falado de uma seção ("Contexto.", "Texto
 * Bíblico.", …): é a PRIMEIRA unidade da seção no manifesto. Saltar para lá,
 * e não para o primeiro alvo alinhado, faz o ouvinte escutar o nome da seção
 * antes do conteúdo — o mesmo que ouviria se a narração chegasse ali sozinha.
 */
export function inicioDaSecao(manifesto: Manifesto | null, secao: SecaoManifesto): number | null {
  if (!manifesto) return null
  const u = manifesto.unidades.find((u) => u.secao === secao)
  return u ? u.inicio : null
}

/** Seções com cabeçalho falado no manifesto — `titulo` não tem. */
export type SecaoNarrada = Exclude<SecaoManifesto, 'titulo'>

const SECAO_DO_CHIP: Record<string, SecaoNarrada> = {
  contexto: 'contexto',
  texto: 'texto',
  resenha: 'resenha',
  // A tela chama a seção de "reflexao" (id do elemento); o manifesto, de
  // "reflexoes". Só aqui os dois vocabulários se encontram.
  reflexao: 'reflexoes',
}

/** Traduz o id de um chip de seção para a seção do manifesto; null se não há. */
export function secaoDoChip(id: string): SecaoNarrada | null {
  return Object.hasOwn(SECAO_DO_CHIP, id) ? SECAO_DO_CHIP[id]! : null
}
