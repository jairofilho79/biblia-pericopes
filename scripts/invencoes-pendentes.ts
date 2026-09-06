/**
 * Junta as acusações da varredura e diz quais ainda valem.
 *
 * Três coisas separam a lista bruta da lista acionável, e cada uma já mordeu:
 *
 * 1. **A entrada é uma fotografia.** `invencao-fila.ts preparar` copiou o
 *    material como ele estava; quando eu conserto algo no meio da varredura, os
 *    auditores seguintes ainda auditam a versão velha. Então a frase acusada
 *    tem de ser reconferida contra `data/pericopes.json` AGORA, não contra a
 *    entrada.
 * 2. **A mesma perícope pode ter sido auditada duas vezes** — lotes se
 *    sobrepuseram quando um agente se dividiu em forks. Acusação repetida conta
 *    uma vez.
 * 3. **Uma glosa errada costuma estar em várias perícopes.** Agrupar por frase
 *    quase idêntica mostra a família, e foi assim que "ungir em público"
 *    apareceu em sete lugares em vez de nos três que os auditores viram.
 *
 * Usage: npx tsx scripts/invencoes-pendentes.ts [--familia]
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { textoDoCampo, type Dossie } from './leitura-fila.ts'
import type { Achado, Invencao } from './invencao-fila.ts'

const root = join(import.meta.dirname, '..')

export type Pendente = Invencao & { ordem: number; ref: string }

/** Radical de comparação: minúsculas, sem acento, só as palavras de conteúdo. */
export function assinatura(frase: string): string {
  return frase
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .match(/[a-z]{4,}/g)
    ?.slice(0, 12)
    .join(' ') ?? frase.toLowerCase()
}

export function pendentes(
  arr: Record<string, unknown>[],
  achados: Achado[],
): { vivas: Pendente[]; jaConsertadas: number; repetidas: number } {
  const porOrdem = new Map(arr.map((p) => [p.ordem as number, p]))
  const vistas = new Set<string>()
  const vivas: Pendente[] = []
  let jaConsertadas = 0
  let repetidas = 0
  for (const a of achados) {
    const p = porOrdem.get(a.ordem)
    if (!p) continue
    for (const i of a.invencoes ?? []) {
      const chave = `${a.ordem}|${assinatura(i.afirma)}`
      if (vistas.has(chave)) {
        repetidas++
        continue
      }
      vistas.add(chave)
      const campo = textoDoCampo(p as unknown as Dossie, i.campo)
      // A frase sumiu do material: ou eu já consertei, ou o campo mudou.
      if (campo === null || !campo.includes(i.afirma)) {
        jaConsertadas++
        continue
      }
      vivas.push({
        ...i,
        ordem: a.ordem,
        ref: `${p.abbrev} ${p.capitulo_inicio}:${p.versiculo_inicio}`,
      })
    }
  }
  return { vivas, jaConsertadas, repetidas }
}

function main() {
  const arr = JSON.parse(readFileSync(join(root, 'data/pericopes.json'), 'utf8')) as Record<
    string,
    unknown
  >[]
  const dir = join(root, 'data/invencao/saida')
  const achados = existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => f.endsWith('.json'))
        .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as Achado)
    : []
  const { vivas, jaConsertadas, repetidas } = pendentes(arr, achados)
  console.log(
    `acusações vivas ${vivas.length} · já consertadas ${jaConsertadas} · repetidas ${repetidas}`,
  )
  const porForma: Record<string, number> = {}
  for (const v of vivas) porForma[v.forma ?? '?'] = (porForma[v.forma ?? '?'] ?? 0) + 1
  for (const [k, n] of Object.entries(porForma).sort((a, b) => b[1] - a[1]))
    console.log(`  ${k}: ${n}`)

  if (process.argv.includes('--familia')) {
    const fam = new Map<string, Pendente[]>()
    for (const v of vivas) {
      const k = assinatura(v.afirma).split(' ').slice(0, 5).join(' ')
      fam.set(k, [...(fam.get(k) ?? []), v])
    }
    const repetidasFam = [...fam.values()].filter((g) => g.length > 1)
    console.log(`\nfamílias com mais de uma perícope: ${repetidasFam.length}`)
    for (const g of repetidasFam)
      console.log(`  ${g.length}× ${g.map((x) => x.ref).join(', ')} — "${g[0].afirma.slice(0, 70)}…"`)
  }
}

if (process.argv[1]?.endsWith('invencoes-pendentes.ts')) main()
