/**
 * Procura queda de registro no material editorial — gíria, apelido, ironia,
 * familiaridade com o sagrado.
 *
 * **Por que isto é relatório e não portão.** A regra do dono é "simplicidade
 * não é coloquialismo", e coloquialismo não cabe numa lista fechada: um
 * subagent pegou sozinho "bicho do mato", "não maquia o custo", "chutar um
 * culpado" e "descontou a mão" — quatro construções que nenhuma lista de
 * palavras teria previsto. Então isto NÃO reprova nada; junta suspeitas para
 * um humano olhar, e a lista cresce com o que a produção for revelando.
 *
 * As entradas vêm de casos reais, não de imaginação: "somos bicho, e somos
 * mais que bicho" (Gn 1), "põe a mão na cabeça do bicho" para o animal do
 * sacrifício (Lv 1), "não se meter em encrenca, quando calar a boca" (Pv 1),
 * "chegava com cara de evidência" (Sl 3).
 *
 * Usage: npx tsx scripts/varrer-registro.ts [--dir=data/enriched]
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/** Cada padrão vem com o motivo, porque suspeita sem motivo ninguém julga. */
export const PADROES: { re: RegExp; motivo: string }[] = [
  { re: /\bbicho\b/gi, motivo: 'animal do texto reduzido a "bicho"' },
  { re: /\b(fulano|beltrano|ciclano|sicrano)\b/gi, motivo: 'nome próprio substituído por apelido genérico' },
  { re: /\b(galera|treta|rolê|zoar|zoeira|na moral|tipo assim|sacou)\b/gi, motivo: 'gíria' },
  // "de boa" só é gíria quando fecha a oração. Sem isto, ele casava dentro de
  // "três medidas de boa farinha" (citação de Gn 18) e de "boa velhice" —
  // duas expressões do próprio texto bíblico.
  { re: /\bde boa(?=\s*[,.;:!?]|\s*$)/gi, motivo: 'gíria' },
  { re: /\b(encrenca|bagunça|confusão armada|barraco)\b/gi, motivo: 'informalidade' },
  { re: /\bcalar a boca\b/gi, motivo: 'expressão grosseira' },
  { re: /\bcara de\b/gi, motivo: '"cara de" — construção coloquial' },
  { re: /\b(maquia|maquiar|maquiando)\b/gi, motivo: 'metáfora de marketing' },
  { re: /\bchutar\b/gi, motivo: '"chutar" no sentido de arriscar/descartar' },
  { re: /\bdescont(ou|ar|ava) a mão\b/gi, motivo: 'expressão de briga de rua' },
  { re: /\bse safou\b/gi, motivo: 'informalidade sobre pessoa do texto' },
  { re: /\b(dar|deu|deram|dando|dá) um jeito\b/gi, motivo: 'informalidade' },
  { re: /\bpiada\b/gi, motivo: 'tom de humor onde não cabe' },
  { re: /\b(enjoad[oa]|de saco cheio|puto|irritadinho)\b/gi, motivo: 'familiaridade com Deus ou com o texto' },
  { re: /\bDeus (surta|pira|perde a cabeça|se estressa)\b/gi, motivo: 'familiaridade com Deus' },
  { re: /\b(maluc\w+|doid\w+|louquinho)\b/gi, motivo: 'informalidade' },
  { re: /\bpapo (furado|reto)\b/gi, motivo: 'gíria' },
  { re: /\bpuxar o tapete\b/gi, motivo: 'expressão coloquial' },
  // Rodada 3: um subagent trocou estas quatro sozinho, depois do portão.
  // A lista cresce com o que a produção revela — é o desenho, não remendo.
  { re: /\bpass(ar|ou|a) batido\b/gi, motivo: 'expressão coloquial' },
  { re: /\bfala do bolso\b/gi, motivo: 'metáfora coloquial' },
  { re: /\bsem graça\b/gi, motivo: '"sem graça" — informalidade' },
  { re: /\bfalh(ado|ou) feio\b/gi, motivo: 'informalidade' },
  // Rodada 4: mais duas, também trocadas por um subagent depois do portão.
  { re: /\ba gente\b/gi, motivo: '"a gente" no lugar de "nós"' },
  { re: /\btem (essa|aquela) cara\b/gi, motivo: 'construção coloquial' },
]

export type Suspeita = { ordem: number; campo: string; trecho: string; motivo: string }

const CAMPOS = [
  'titulo_pericope_pt',
  'contexto_historico_literario',
  'resenha',
  'topicos_pregar',
] as const

export function varrer(material: Record<string, unknown>): Suspeita[] {
  const ordem = Number(material.ordem)
  const achadas: Suspeita[] = []
  const alvos: [string, string][] = [
    ...CAMPOS.map((c) => [c, String(material[c] ?? '')] as [string, string]),
    ['perguntas_reflexao', (material.perguntas_reflexao as string[] | undefined)?.join(' ') ?? ''],
  ]
  for (const [campo, texto] of alvos) {
    for (const { re, motivo } of PADROES) {
      for (const m of texto.matchAll(new RegExp(re.source, re.flags))) {
        const i = m.index ?? 0
        achadas.push({
          ordem,
          campo,
          motivo,
          trecho: texto.slice(Math.max(0, i - 45), i + m[0].length + 45).replace(/\s+/g, ' '),
        })
      }
    }
  }
  return achadas
}

function main() {
  const dir =
    process.argv.find((a) => a.startsWith('--dir='))?.split('=')[1] ?? 'data/enriched'
  const arquivos = readdirSync(dir).filter((f) => f.endsWith('.json'))
  const todas = arquivos.flatMap((f) => varrer(JSON.parse(readFileSync(join(dir, f), 'utf8'))))
  console.log(`${arquivos.length} perícopes · ${todas.length} suspeita(s) de registro`)
  for (const s of todas.sort((a, b) => a.ordem - b.ordem)) {
    console.log(`  ${s.ordem} [${s.campo}] ${s.motivo}`)
    console.log(`     …${s.trecho}…`)
  }
  if (!todas.length) console.log('nenhuma — mas a lista é incompleta por natureza; leia por amostragem')
}

if (process.argv[1]?.endsWith('varrer-registro.ts')) main()
