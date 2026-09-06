/**
 * A frase-molde no fim do `contexto_historico_literario`.
 *
 * O dono leu o material e disse: *"Se algo que era para explicar, não explica
 * nada, isso está errado demais. Ou tira, ou de fato faz uma explicação."*
 * 642 contextos (23% do acervo) fecham com uma frase que manda o leitor reparar
 * em algo — e a maioria nunca diz no quê. Isso é um tique do gerador, não um
 * defeito perícope a perícope, e por isso se acha por regex em vez de leitura:
 * achar custa zero, e o gasto fica todo no julgamento.
 *
 * **O regex acha o candidato, e não decide.** A mesma forma serve para a frase
 * que ENTREGA — "Guarde isso ao ler: o pai tem só mais um filho daquela mulher,
 * e esse ainda é criança" carrega o fato e não se corta. A diferença entre as
 * duas é a única coisa que o julgamento precisa resolver.
 *
 * Usage:
 *   npx tsx scripts/frase-pendurada.ts preparar
 *   npx tsx scripts/frase-pendurada.ts claim --tamanho=40
 *   npx tsx scripts/frase-pendurada.ts aplicar
 *   npx tsx scripts/frase-pendurada.ts status
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { criarDirs, dirs, montarLote, pendentes } from './reenriquecimento.ts'

const root = join(import.meta.dirname, '..')
export const BASE = join(root, 'data/pendurada')

/**
 * `\s+` e não `\s`: a quebra de parágrafo é DOIS `\n`, e com um só a frase que
 * abre parágrafo próprio escapava — que é justamente a forma mais comum do tique.
 *
 * Só casa no FIM do campo: a mesma palavra no meio de um parágrafo costuma
 * estar amarrada ao que vem depois, e cortá-la perderia ligação. Foi o que os
 * leitores recusaram cortar em Dt 1, 2Sm 1 e 1Sm 1.
 */
export const MOLDE =
  /(?:^|[.!?]\s+)((?:Ao ler,?\s|Enquanto l[êe],?\s)?(?:Repare|Note|Observe|Acompanhe|Preste aten|Fique de olho|Leia reparando|Leia prestando|Guarde|Vale olhar|N[ãa]o pule)[^.!?]*[.!?])\s*$/i

export function pendurada(contexto: string): string | null {
  return contexto.trim().match(MOLDE)?.[1] ?? null
}

export type Veredito = {
  ordem: number
  /** `entrega` mantém; `corta` remove a frase; `responde` troca por `novo`. */
  veredito: 'entrega' | 'corta' | 'responde'
  novo?: string
}

/** Devolve o contexto novo, ou lança se a frase não estiver mais lá. */
export function aplicarVeredito(contexto: string, frase: string, v: Veredito): string {
  if (v.veredito === 'entrega') return contexto
  if (!contexto.includes(frase))
    throw new Error(`${v.ordem}: a frase não está mais no contexto — "${frase.slice(0, 50)}…"`)
  if (v.veredito === 'responde') {
    if (!v.novo?.trim()) throw new Error(`${v.ordem}: veredito "responde" sem frase nova`)
    if (pendurada(contexto.replace(frase, v.novo).trim()))
      // Trocar uma frase pendurada por outra é o modo de falha mais fácil aqui.
      throw new Error(`${v.ordem}: a frase nova também está pendurada — "${v.novo.slice(0, 50)}…"`)
    return contexto.replace(frase, v.novo)
  }
  return contexto.replace(frase, '').replace(/[ \t]+\n/g, '\n').trimEnd()
}

function main() {
  const d = dirs(BASE)
  const cmd = process.argv[2]

  if (cmd === 'preparar') {
    criarDirs(d)
    const arr = JSON.parse(readFileSync(join(root, 'data/pericopes.json'), 'utf8')) as Record<
      string,
      unknown
    >[]
    let n = 0
    for (const p of arr) {
      const contexto = String(p.contexto_historico_literario ?? '')
      const frase = pendurada(contexto)
      if (!frase) continue
      const alvo = join(d.entrada, `${p.ordem}.json`)
      if (existsSync(alvo)) continue
      writeFileSync(
        alvo,
        JSON.stringify(
          {
            ordem: p.ordem,
            abbrev: p.abbrev,
            ref: `${p.livro} ${p.capitulo_inicio}:${p.versiculo_inicio}`,
            frase,
            contexto,
            resenha: p.resenha,
            texto: p.texto,
          },
          null,
          2,
        ),
      )
      n++
    }
    console.log(`entrada: ${n} candidatas`)
    return
  }

  if (cmd === 'claim') {
    criarDirs(d)
    const tamanho = Number(
      process.argv.find((a) => a.startsWith('--tamanho='))?.split('=')[1] ?? 40,
    )
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
    const lote = montarLote(d, pendentes(d).slice(0, tamanho), id)
    if (!lote) return console.log('nada pendente')
    console.log(lote.arquivo)
    console.log(`lote ${lote.id}: ${lote.ordens.length}`)
    return
  }

  if (cmd === 'aplicar') {
    const arr = JSON.parse(readFileSync(join(root, 'data/pericopes.json'), 'utf8')) as Record<
      string,
      unknown
    >[]
    const porOrdem = new Map(arr.map((p) => [p.ordem as number, p]))
    const conta = { entrega: 0, corta: 0, responde: 0 }
    const erros: string[] = []
    for (const f of readdirSync(d.saida).filter((x) => x.endsWith('.json'))) {
      const v = JSON.parse(readFileSync(join(d.saida, f), 'utf8')) as Veredito
      const entrada = JSON.parse(readFileSync(join(d.entrada, `${v.ordem}.json`), 'utf8'))
      const p = porOrdem.get(v.ordem)
      if (!p) {
        erros.push(`${v.ordem}: não existe`)
        continue
      }
      try {
        p.contexto_historico_literario = aplicarVeredito(
          String(p.contexto_historico_literario),
          entrada.frase,
          v,
        )
        conta[v.veredito]++
      } catch (e) {
        erros.push((e as Error).message)
      }
    }
    if (erros.length) {
      console.log(`RECUSADAS ${erros.length} — nada foi gravado`)
      for (const e of erros.slice(0, 15)) console.log(`  ✗ ${e}`)
      process.exit(1)
    }
    writeFileSync(join(root, 'data/pericopes.json'), JSON.stringify(arr, null, 2))
    console.log(`entrega ${conta.entrega} · responde ${conta.responde} · corta ${conta.corta}`)
    return
  }

  if (cmd === 'status') {
    criarDirs(d)
    console.log(
      `entrada ${readdirSync(d.entrada).length} · saída ${readdirSync(d.saida).length} · pendentes ${pendentes(d).length}`,
    )
    return
  }
  console.error('uso: frase-pendurada.ts preparar|claim|aplicar|status')
  process.exit(1)
}

if (process.argv[1]?.endsWith('frase-pendurada.ts')) main()
