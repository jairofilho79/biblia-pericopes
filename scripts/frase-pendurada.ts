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
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { criarDirs, dirs, montarLote, pendentes } from './reenriquecimento.ts'

const root = join(import.meta.dirname, '..')
export const BASE = join(root, 'data/pendurada')
export const BASE_RESENHA = join(root, 'data/pendurada-resenha')

/**
 * `\s+` e não `\s`: a quebra de parágrafo é DOIS `\n`, e com um só a frase que
 * abre parágrafo próprio escapava — que é justamente a forma mais comum do tique.
 *
 * Só casa no FIM do campo: a mesma palavra no meio de um parágrafo costuma
 * estar amarrada ao que vem depois, e cortá-la perderia ligação. Foi o que os
 * leitores recusaram cortar em Dt 1, 2Sm 1 e 1Sm 1.
 */
const IMPERATIVO =
  '(?:Ao ler,?\\s|Enquanto l[êe],?\\s)?(?:Repare|Note|Observe|Acompanhe|Preste aten|Fique de olho|Leia reparando|Leia prestando|Guarde|Vale olhar|N[ãa]o pule)'
/**
 * O anúncio impessoal — "Duas coisas ajudam aqui", "Uma informação muda o
 * tamanho do que vem". Não manda reparar em nada, e por isso escapou da
 * primeira versão; promete e às vezes não paga. São 23, e várias PAGAM
 * ("Uma informação ajuda a entender por que isso era urgente: naquele mundo, a
 * família do morto tinha o dever de cobrar a morte"), então entram como
 * candidatas e quem separa é o julgamento, como no resto.
 */
const ANUNCIO =
  '(?:Duas|Tr[êe]s|Uma|Dois)\\s+(?:coisas?|informa[çc][õo]es?|informa[çc][ãa]o|detalhes?|dados?)'
export const MOLDE = new RegExp(`(?:^|[.!?]\\s+)((?:${IMPERATIVO}|${ANUNCIO})[^.!?]*[.!?])\\s*$`, 'i')

/**
 * No `contexto` o tique mora no fim do campo; na `resenha` ele aparece no meio
 * do parágrafo, e por isso precisa de uma versão sem âncora. São 281
 * ocorrências em 276 perícopes, e o primeiro regex nem olhava para o campo.
 */
export const MOLDE_QUALQUER = new RegExp(
  `(?:^|[.!?]\\s+)((?:${IMPERATIVO}|${ANUNCIO})[^.!?]*[.!?])`,
  'gi',
)

export function todasPenduradas(texto: string): string[] {
  return [...texto.matchAll(MOLDE_QUALQUER)].map((m) => m[1])
}

/**
 * Começos que se apoiam na frase anterior. Cortar o antecedente deixa o texto
 * gramatical e sem sentido — e ninguém relê para descobrir.
 */
const ANAFORA =
  /^(?:Ela|Ele|Elas|Eles|Essa|Esse|Essas|Esses|Esta|Este|Isso|Isto|Ambos|Ambas|Nela|Nele|Dela|Dele|A primeira|O primeiro|A segunda|O segundo|As duas|Os dois)\b/

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
  const depois = contexto.slice(contexto.indexOf(frase) + frase.length).trimStart()
  if (ANAFORA.test(depois))
    // Achado num lote da resenha: cortar "Guarde essa palavra, tremendo." deixa
    // a frase seguinte — "Ela explica o que Saul vai fazer" — sem antecedente.
    // O texto continua gramatical e fica sem sentido, que é o pior dos dois.
    throw new Error(
      `${v.ordem}: a frase seguinte se apoia nesta — "${depois.slice(0, 55)}…"; responda em vez de cortar`,
    )
  // A limpeza importa porque na resenha o corte é no MEIO do parágrafo: tirar a
  // frase deixa dois espaços entre as vizinhas, e um parágrafo que era só ela
  // deixa três quebras de linha. Nenhum dos dois quebra o sentido, mas os dois
  // vão para a tela e para o áudio.
  return contexto
    .replace(frase, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function main() {
  // Duas filas, e não uma com um campo a mais: 672 contextos já estavam em voo
  // quando a resenha apareceu, e mudar a forma da entrada no meio quebraria o
  // que os agentes estão gravando agora.
  const naResenha = process.argv.includes('--campo=resenha')
  const campo = naResenha ? 'resenha' : 'contexto_historico_literario'
  const d = dirs(naResenha ? BASE_RESENHA : BASE)
  const cmd = process.argv[2]

  if (cmd === 'preparar') {
    criarDirs(d)
    const arr = JSON.parse(readFileSync(join(root, 'data/pericopes.json'), 'utf8')) as Record<
      string,
      unknown
    >[]
    let n = 0
    let reabertas = 0
    for (const p of arr) {
      const contexto = String(p[campo] ?? '')
      // Na resenha pode haver mais de uma; o agente julga a lista inteira, e a
      // reabertura por mudança de frase cuida do resto na passada seguinte.
      const achadas = naResenha ? todasPenduradas(contexto) : [pendurada(contexto)].filter(Boolean)
      const frase = achadas[0] as string | undefined
      if (!frase) continue
      const alvo = join(d.entrada, `${p.ordem}.json`)
      // Um parágrafo pode ter DUAS penduradas seguidas, e o regex só vê a
      // última — consertada ela, a de trás vira a nova última. Por isso
      // `preparar` reabre a perícope quando a frase mudou, em vez de pular:
      // a campanha roda até o ponto fixo, e não até a primeira passada.
      if (existsSync(alvo)) {
        const antes = JSON.parse(readFileSync(alvo, 'utf8')) as { frase: string }
        if (antes.frase === frase) continue
        rmSync(join(d.saida, `${p.ordem}.json`), { force: true })
        rmSync(join(d.travas, String(p.ordem)), { force: true, recursive: true })
        reabertas++
      }
      writeFileSync(
        alvo,
        JSON.stringify(
          {
            ordem: p.ordem,
            abbrev: p.abbrev,
            ref: `${p.livro} ${p.capitulo_inicio}:${p.versiculo_inicio}`,
            campo,
            frase,
            outras: achadas.slice(1),
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
    console.log(`entrada: ${n} candidatas${reabertas ? ` · ${reabertas} reabertas (a frase mudou)` : ''}`)
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
        p[entrada.campo ?? campo] = aplicarVeredito(
          String(p[entrada.campo ?? campo]),
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
