import type { Progresso } from './types'

/**
 * Chave de dia 'YYYY-MM-DD' no fuso LOCAL. `toISOString().slice(0, 10)` daria o
 * dia em UTC e mudaria o streak de quem lê de madrugada ou à noite.
 */
export function diaLocal(d: Date): string {
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function diaAnterior(dia: string): string {
  const [ano, mes, d] = dia.split('-').map(Number)
  const data = new Date(ano, mes - 1, d)
  // Aritmética de calendário local: `setDate` atravessa horário de verão sem
  // deslizar uma hora, coisa que subtrair 86 400 000 ms não garante.
  data.setDate(data.getDate() - 1)
  return diaLocal(data)
}

/**
 * Dias (locais) em que alguma perícope foi concluída.
 *
 * Limitação aceita e desejada: `atualizadoEm` é a última escrita do progresso,
 * então reconcluir uma perícope antiga conta para o dia de hoje — que é
 * exatamente o que "li hoje" deve significar.
 */
export function diasComConclusao(progressos: Progresso[]): Set<string> {
  const dias = new Set<string>()
  for (const p of progressos) {
    if (p.status !== 'concluido') continue
    const data = new Date(p.atualizadoEm)
    // Data inválida (registro corrompido, string vazia) não vira dia nenhum.
    if (Number.isNaN(data.getTime())) continue
    dias.add(diaLocal(data))
  }
  return dias
}

export type Streak = {
  /** Dias consecutivos terminando hoje ou ontem; 0 quando o streak quebrou. */
  atual: number
  /** Maior sequência já feita — sempre >= `atual`. */
  recorde: number
}

/**
 * `atual` termina em hoje OU ontem: concluir ainda hoje mantém a sequência, e
 * só um dia inteiro pulado quebra. `recorde` é a maior corrida histórica.
 */
export function computeStreak(dias: Set<string>, hoje: Date): Streak {
  let recorde = 0
  let corrente = 0
  let anterior: string | null = null
  for (const dia of [...dias].sort()) {
    corrente = anterior !== null && diaAnterior(dia) === anterior ? corrente + 1 : 1
    if (corrente > recorde) recorde = corrente
    anterior = dia
  }

  const hojeDia = diaLocal(hoje)
  const ontem = diaAnterior(hojeDia)
  let ponta: string | null = dias.has(hojeDia) ? hojeDia : dias.has(ontem) ? ontem : null
  let atual = 0
  while (ponta !== null && dias.has(ponta)) {
    atual += 1
    ponta = diaAnterior(ponta)
  }

  return { atual, recorde }
}
