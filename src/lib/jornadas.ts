import { abbrevsDoBloco, blocoPorId } from './blocos'
// O predicado vem de conclusao.ts, o seam com a fase de releitura/esquecimento:
// jornadas nunca toca no formato de armazenamento de `progresso`.
import { contaComoLida } from './conclusao'
import { ordensDoTestamento, refLabel } from './content'
import { LIMITE_NOME } from './sync-limits'
import type { Testament } from './testament'
import type { Jornada, JornadaTipo, PericopeIndex, PosicaoLeitura, Progresso } from './types'

/**
 * A rota da jornada: as ordens do escopo, cortadas no ponto de partida.
 *
 * O corte é POSICIONAL (indexOf + slice), não numérico (o >= inicioOrdem):
 * na ordem canônica os dois coincidem, mas na cronológica que virá as ordens
 * não são crescentes e só o posicional está correto.
 *
 * Este switch é o ÚNICO ponto de extensão para 'cronologica'.
 */
export function rotaDaJornada(j: Jornada, indice: PericopeIndex[]): number[] {
  const seq =
    j.tipo === 'livro'
      ? indice.filter((p) => p.livro === j.escopo).map((p) => p.ordem)
      : j.tipo === 'bloco'
        ? ((abbrevs) => indice.filter((p) => abbrevs.has(p.abbrev)).map((p) => p.ordem))(
            abbrevsDoBloco(j.escopo),
          )
        : j.escopo === 'biblia'
          ? indice.map((p) => p.ordem)
          : ordensDoTestamento(indice, j.escopo as Testament)
  const i = seq.indexOf(j.inicioOrdem)
  // -1 só ocorre se o catálogo mudou debaixo de uma jornada antiga. Degrada
  // para o escopo inteiro — nunca para uma jornada vazia.
  return seq.slice(i < 0 ? 0 : i)
}

export type ProgressoJornada = {
  total: number
  concluidas: number
  /** 0–100, arredondado; 0 quando a rota é vazia. */
  pct: number
  /** null quando a rota acabou. */
  proximaOrdem: number | null
}

export function progressoDaJornada(
  rota: number[],
  progressos: Map<number, Progresso>,
  desde: string | null,
): ProgressoJornada {
  let concluidas = 0
  let proximaOrdem: number | null = null
  for (const ordem of rota) {
    if (contaComoLida(progressos.get(ordem), desde)) concluidas++
    else if (proximaOrdem === null) proximaOrdem = ordem
  }
  return {
    total: rota.length,
    concluidas,
    pct: rota.length ? Math.round((concluidas / rota.length) * 100) : 0,
    proximaOrdem,
  }
}

/**
 * Onde o "Continuar" leva.
 *
 * Prefere o checkpoint mais recente dentro da rota à primeira não lida —
 * é o que retoma uma perícope longa deixada no meio, e era a heurística da
 * Home antes das jornadas. Duas guardas:
 * - checkpoint de perícope que já conta como lida não vale (o rótulo diz
 *   "continuar", não "reler");
 * - em modo reler, checkpoint anterior à âncora não vale, senão a jornada
 *   devolveria o leitor no meio da passada anterior.
 */
export function cursorDaJornada(
  rota: number[],
  progressos: Map<number, Progresso>,
  posicoes: Map<number, PosicaoLeitura>,
  desde: string | null,
): number | null {
  const { proximaOrdem } = progressoDaJornada(rota, progressos, desde)
  if (proximaOrdem === null) return null

  let melhor: PosicaoLeitura | undefined
  for (const ordem of rota) {
    const pos = posicoes.get(ordem)
    if (!pos) continue
    if (desde !== null && pos.atualizadoEm < desde) continue
    if (contaComoLida(progressos.get(ordem), desde)) continue
    if (!melhor || pos.atualizadoEm > melhor.atualizadoEm) melhor = pos
  }
  return melhor ? melhor.pericopeOrdem : proximaOrdem
}

const ROTULO_SEQUENCIA: Record<string, string> = {
  biblia: 'A Bíblia toda',
  vt: 'Velho Testamento',
  nt: 'Novo Testamento',
}

/** Nome pré-preenchido no passo de confirmação; o leitor pode trocar. */
export function nomePadrao(
  tipo: JornadaTipo,
  escopo: string,
  inicioOrdem: number,
  indice: PericopeIndex[],
): string {
  const base =
    tipo === 'livro'
      ? escopo
      : tipo === 'bloco'
        ? (blocoPorId(escopo)?.nome ?? escopo)
        : (ROTULO_SEQUENCIA[escopo] ?? escopo)

  const rota = rotaDaJornada(
    {
      id: '',
      nome: '',
      tipo,
      escopo,
      inicioOrdem: -1, // força o degrade: queremos a rota COMPLETA do escopo
      contaDesde: null,
      criadoEm: '',
      atualizadoEm: '',
      arquivadaEm: null,
      concluidaEm: null,
    },
    indice,
  )
  if (rota.length === 0 || rota[0] === inicioOrdem) return base.slice(0, LIMITE_NOME)

  const peri = indice.find((p) => p.ordem === inicioOrdem)
  if (!peri) return base.slice(0, LIMITE_NOME)
  return `${base} a partir de ${refLabel(peri)}`.slice(0, LIMITE_NOME)
}
