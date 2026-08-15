/**
 * Enrich raw pericopes → public/data/pericopes.json
 *
 * Modes:
 *   --local          heuristic PT titles + didactic templates (default, no API)
 *   --openai         call OpenAI (needs OPENAI_API_KEY)
 *   --livro=Gênesis  filter by book
 *   --limit=N        process at most N items
 *
 * Usage: npx tsx scripts/enrich-pericopes.ts --local
 *        npx tsx scripts/enrich-pericopes.ts --openai --livro=Gênesis
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Pericope, RawPericope } from '../src/lib/types.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const rawPath = join(root, 'data/raw-pericopes.jsonl')
const enrichedDir = join(root, 'data/enriched')
const statePath = join(root, 'data/enrich-state.json')
const outPath = join(root, 'public/data/pericopes.json')

const SYSTEM_PROMPT = `Você escreve como um teólogo especialista que ama a Escritura e respeita o tempo do leitor — com a clareza de Carl Sagan, mas falando com jovens e adolescentes.

PÚBLICO: pessoas lendo a Bíblia pela segunda vez. Já conhecem um pouco, querem se aprofundar, mas NÃO têm vocabulário grande. Escreva para eles: inteligente, sem infantilizar; simples, sem empobrecer.

Missão: embasar na Palavra com insights de especialista; traduzir o essencial em português fácil e direto; e — só quando o texto abrir espaço com honestidade — ajudar a conhecer melhor a Deus e a Jesus.

Recebe o título da perícope em inglês e o texto bíblico na versão NAA.
Não altere nem “corrija” o texto bíblico.
Não invente citações literais fora do trecho dado.
Evite jargão denso, polêmica denominacional e frases feitas piedosas.

VOZ E LINGUAGEM (obrigatório):
- Frases curtas ou médias. Ordem natural: sujeito → verbo → complemento.
- Prefira palavras do dia a dia. Em vez de “cosmovisão”, diga “jeito de ver o mundo”; em vez de “antropológica”, diga o que isso muda na prática.
- Densidade alta, extensão baixa: cada frase traz insight ou dado útil.
- Se uma palavra incomum for MESMO necessária (hebraico, termo técnico, nome histórico), use-a e explique na hora, entre parênteses ou numa oração curta logo em seguida. Ex.: “a mulher é chamada ‘ezer kenegdo (uma ajuda à altura, alguém do mesmo nível — não uma empregada)”.
- Nunca deixe termo difícil solto. Nunca acumule três termos difíceis no mesmo parágrafo.
- Proibido: latinismos, academicês, adjetivos pomposos, “é interessante notar que…”.

PROFUNDIDADE (sem aleatoriedade):
- Inclua 1–2 insights de especialista que a maioria não perceberia sozinha — só se iluminarem ESTE trecho.
- Fontes legítimas (escolha o que couber): detalhe literário; dado histórico/cultural que muda o sentido; nuance hebraica/grega (sempre traduzida e explicada); eco claro dentro da Bíblia.
- Proibido: trivia, nomes de autores só para impressionar, digressões.
- Teste: “um especialista que ama o texto, fala com um adolescente inteligente e odeia perder o tempo dele manteria esta frase?” Se não, corte.

Responda APENAS com um JSON válido (sem markdown):
{
  "titulo_pericope_pt": "string curta",
  "contexto_historico_literario": "...",
  "resenha": "...",
  "perguntas_reflexao": ["pergunta 1", "pergunta 2"]
}

CAMPOS:

1) contexto_historico_literario (ANTES da leitura):
- A chave de entrada: o mínimo para chegar preparado, com 1 insight que prepara a leitura (não resumo do enredo).
- 1 parágrafo denso e claro (2 só se indispensável).

2) resenha (DEPOIS da leitura):
- O que aconteceu e por quê, em palavras simples e precisas — e o que o texto realmente afirma.
- Integre o insight à história; não jogue “curiosidades” à parte.
- Sobre Deus: o que o próprio trecho mostra do caráter dEle, se estiver lá.
- Sobre Jesus: SOMENTE com abertura real. Sem abertura, silêncio. Prefira omissão a ligação artificial.
- 2 parágrafos curtos e densos (3 só se o trecho for muito rico). Sem tour versículo a versículo.

3) titulo_pericope_pt: natural, não palavra a palavra.
4) perguntas_reflexao: 2 perguntas afiadas, em linguagem jovem (não sim/não). Deus/Jesus só se couber ao trecho.

Português brasileiro. Profundo na ideia, fácil na frase. Surpreenda pelo acerto, não pelo vocabulário.`

const PHRASE_TITLES: Record<string, string> = {
  'The Creation of the Heavens and the Earth': 'A criação dos céus e da terra',
  'Adam and Eve in the Garden of Eden': 'Adão e Eva no jardim do Éden',
  'The Fall of Man': 'A queda do homem',
  'The Descendants of Adam': 'Os descendentes de Adão',
  'Corruption on the Earth': 'A corrupção na terra',
  'The Call of Noah': 'O chamado de Noé',
  'The Flood': 'O dilúvio',
  'The Noahic Covenant': 'A aliança noética',
  'The Descendants of Noah': 'Os descendentes de Noé',
  'The Table of Nations': 'A tábua das nações',
  'The Tower of Babel': 'A torre de Babel',
  'The Genealogy of Abram': 'A genealogia de Abrão',
  'The Call of Abram': 'O chamado de Abrão',
  'Abram and Sarai in Egypt': 'Abrão e Sarai no Egito',
  'Abram and Lot': 'Abrão e Ló',
  'War of the Four Kings vs. the Five Kings': 'Guerra dos quatro reis contra os cinco',
  'Melchizedek Blesses Abram': 'Melquisedeque abençoa Abrão',
  'The Covenant Between the Parts': 'A aliança entre as partes',
  'Hagar and Ishmael': 'Hagar e Ismael',
  'The Covenant of Circumcision': 'A aliança da circuncisão',
  'The Three Visitors': 'Os três visitantes',
  'Sodom and Gomorrah': 'Sodoma e Gomorra',
  'Abraham, Sarah, and Abimelech': 'Abraão, Sara e Abimeleque',
  'The Birth of Isaac': 'O nascimento de Isaque',
  'The Casting Out of Hagar and Ishmael': 'A expulsão de Hagar e Ismael',
  'The Covenant at Beersheba': 'A aliança em Berseba',
  'The Binding of Isaac': 'A ligação de Isaque',
  'Joseph\'s Dreams': 'Os sonhos de José',
  'Joseph Sold into Egypt': 'José vendido ao Egito',
  'The Resurrection of Jesus': 'A ressurreição de Jesus',
  'The Birth of Jesus': 'O nascimento de Jesus',
}

const WORD_MAP: Record<string, string> = {
  creation: 'criação',
  heavens: 'céus',
  heaven: 'céu',
  earth: 'terra',
  fall: 'queda',
  man: 'homem',
  men: 'homens',
  woman: 'mulher',
  women: 'mulheres',
  call: 'chamado',
  covenant: 'aliança',
  flood: 'dilúvio',
  tower: 'torre',
  birth: 'nascimento',
  death: 'morte',
  burial: 'sepultamento',
  descendants: 'descendentes',
  genealogy: 'genealogia',
  dreams: 'sonhos',
  dream: 'sonho',
  prayer: 'oração',
  song: 'cântico',
  songs: 'cânticos',
  blessing: 'bênção',
  blessings: 'bênçãos',
  curse: 'maldição',
  judgment: 'juízo',
  judgments: 'juízos',
  promise: 'promessa',
  promises: 'promessas',
  vision: 'visão',
  visions: 'visões',
  prophecy: 'profecia',
  prophet: 'profeta',
  prophets: 'profetas',
  king: 'rei',
  kings: 'reis',
  queen: 'rainha',
  priest: 'sacerdote',
  priests: 'sacerdotes',
  temple: 'templo',
  tabernacle: 'tabernáculo',
  law: 'lei',
  laws: 'leis',
  commandments: 'mandamentos',
  commandment: 'mandamento',
  journey: 'jornada',
  return: 'retorno',
  exile: 'exílio',
  restoration: 'restauração',
  gospel: 'evangelho',
  parable: 'parábola',
  parables: 'parábolas',
  miracle: 'milagre',
  miracles: 'milagres',
  crucifixion: 'crucificação',
  resurrection: 'ressurreição',
  ascension: 'ascensão',
  church: 'igreja',
  apostles: 'apóstolos',
  apostle: 'apóstolo',
  letter: 'carta',
  epistle: 'epístola',
  faith: 'fé',
  love: 'amor',
  hope: 'esperança',
  wisdom: 'sabedoria',
  praise: 'louvor',
  lament: 'lamento',
  war: 'guerra',
  peace: 'paz',
  garden: 'jardim',
  binding: 'sacrifício',
  sold: 'vendido',
  into: 'a',
  against: 'contra',
  between: 'entre',
  parts: 'partes',
  table: 'tábua',
  nations: 'nações',
  corruption: 'corrupção',
  visitors: 'visitantes',
  casting: 'expulsão',
  out: '',
  of: 'de',
  and: 'e',
  in: 'em',
  on: 'sobre',
  for: 'para',
  to: 'a',
  from: 'de',
  with: 'com',
  his: 'seu',
  her: 'sua',
  their: 'seus',
  vs: 'vs.',
  four: 'quatro',
  five: 'cinco',
  three: 'três',
  two: 'dois',
  first: 'primeiro',
  second: 'segundo',
  third: 'terceiro',
  last: 'último',
  new: 'nova',
  old: 'antiga',
  great: 'grande',
  little: 'pequeno',
  true: 'verdadeiro',
  false: 'falso',
  holy: 'santo',
  spirit: 'Espírito',
  god: 'Deus',
  lord: 'Senhor',
  jesus: 'Jesus',
  christ: 'Cristo',
  israel: 'Israel',
  egypt: 'Egito',
  jerusalem: 'Jerusalém',
  babylon: 'Babilônia',
  canaan: 'Canaã',
  sinai: 'Sinai',
  passover: 'Páscoa',
  sabbath: 'sábado',
  adam: 'Adão',
  eve: 'Eva',
  noah: 'Noé',
  abraham: 'Abraão',
  abram: 'Abrão',
  sarah: 'Sara',
  sarai: 'Sarai',
  isaac: 'Isaque',
  jacob: 'Jacó',
  esau: 'Esaú',
  joseph: 'José',
  moses: 'Moisés',
  aaron: 'Arão',
  joshua: 'Josué',
  david: 'Davi',
  solomon: 'Salomão',
  saul: 'Saul',
  elijah: 'Elias',
  elisha: 'Eliseu',
  isaiah: 'Isaías',
  jeremiah: 'Jeremias',
  ezekiel: 'Ezequiel',
  daniel: 'Daniel',
  peter: 'Pedro',
  paul: 'Paulo',
  john: 'João',
  mary: 'Maria',
  edens: 'Éden',
  eden: 'Éden',
}

function translateTitle(en: string): string {
  if (PHRASE_TITLES[en]) return PHRASE_TITLES[en]
  // strip leading articles; translate content words; skip empty
  const tokens = en.replace(/^((The|A|An)\s+)/i, '').split(/(\s+|[,—-])/)
  const out: string[] = []
  for (const t of tokens) {
    if (/^\s+$/.test(t) || t === '-' || t === '—' || t === ',') {
      out.push(t === ',' ? ',' : t)
      continue
    }
    const bare = t.replace(/[.'']$/g, '')
    const lower = bare.toLowerCase()
    if (lower === 'the' || lower === 'a' || lower === 'an') continue
    const mapped = WORD_MAP[lower]
    if (mapped === '') continue
    if (mapped) out.push(mapped)
    else out.push(bare)
  }
  let s = out.join('').replace(/\s+/g, ' ').replace(/\s+,/g, ',').trim()
  if (!s) s = en
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function localEnrich(raw: RawPericope): Omit<
  Pericope,
  | 'ordem'
  | 'livro'
  | 'abbrev'
  | 'capitulo_inicio'
  | 'versiculo_inicio'
  | 'capitulo_fim'
  | 'versiculo_fim'
  | 'texto_naa'
> {
  const ref =
    raw.capitulo_inicio === raw.capitulo_fim && raw.versiculo_inicio === raw.versiculo_fim
      ? `${raw.livro} ${raw.capitulo_inicio}:${raw.versiculo_inicio}`
      : `${raw.livro} ${raw.capitulo_inicio}:${raw.versiculo_inicio}–${raw.capitulo_fim}:${raw.versiculo_fim}`

  const titulo = translateTitle(raw.titulo_en)
  const preview = raw.texto_naa.split('\n').filter((l) => !l.startsWith('Capítulo')).slice(0, 3).join(' ')

  return {
    titulo_pericope_pt: titulo,
    contexto_historico_literario: `Antes de ler ${ref}: estamos no livro de ${raw.livro}. Esta perícope (“${titulo}”) é uma unidade com começo e fim próprios. Observe o cenário e os personagens — o detalhe do que acontece virá na leitura e na resenha.`,
    resenha: `Neste trecho, a narrativa trata de: ${titulo.toLowerCase()}.\n\nResuma mentalmente o que ocorreu e por quê. Se o texto falar de Deus, note o que revela do seu caráter; só faça ponte com Jesus quando o próprio texto ou a trama bíblica abrirem espaço com naturalidade.\n\nTrecho inicial: ${preview.slice(0, 220)}${preview.length > 220 ? '…' : ''}`,
    perguntas_reflexao: [
      `O que mais importa reter de ${ref} depois desta leitura?`,
      'Que atitude concreta este trecho convida você a viver nesta semana?',
    ],
  }
}

type AiPartial = ReturnType<typeof localEnrich>

function parseAiJson(text: string): AiPartial {
  const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
  const obj = JSON.parse(cleaned) as AiPartial
  const resenha =
    typeof (obj as { resenha?: string }).resenha === 'string'
      ? (obj as { resenha: string }).resenha
      : typeof (obj as { comentario_narrador?: string }).comentario_narrador === 'string'
        ? (obj as { comentario_narrador: string }).comentario_narrador
        : null
  if (
    typeof obj.titulo_pericope_pt !== 'string' ||
    typeof obj.contexto_historico_literario !== 'string' ||
    !resenha ||
    !Array.isArray(obj.perguntas_reflexao) ||
    obj.perguntas_reflexao.length < 2
  ) {
    throw new Error('JSON da IA incompleto')
  }
  return {
    titulo_pericope_pt: obj.titulo_pericope_pt,
    contexto_historico_literario: obj.contexto_historico_literario,
    resenha,
    perguntas_reflexao: obj.perguntas_reflexao.slice(0, 2).map(String),
  }
}

async function openRouterEnrich(
  raw: RawPericope,
): Promise<{ ai: AiPartial; usage: Usage }> {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) throw new Error('OPENROUTER_API_KEY ausente')
  const model = process.env.OPENROUTER_MODEL || 'google/gemini-3.7-flash'
  const user = `Título (EN): ${raw.titulo_en}
Referência: ${raw.livro} ${raw.capitulo_inicio}:${raw.versiculo_inicio}–${raw.capitulo_fim}:${raw.versiculo_fim}
Texto NAA:
${raw.texto_naa}`

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/local/biblia-pericopes',
      'X-Title': 'biblia-pericopes-enrich',
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: user },
      ],
    }),
  })
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`)
  const data = (await res.json()) as {
    id?: string
    choices: { message: { content: string } }[]
    usage?: {
      prompt_tokens?: number
      completion_tokens?: number
      total_tokens?: number
      cost?: number
      native_tokens_prompt?: number
      native_tokens_completion?: number
    }
  }
  const u = data.usage ?? {}
  return {
    ai: parseAiJson(data.choices[0].message.content),
    usage: {
      prompt_tokens: u.prompt_tokens ?? u.native_tokens_prompt ?? 0,
      completion_tokens: u.completion_tokens ?? u.native_tokens_completion ?? 0,
      total_tokens: u.total_tokens ?? 0,
      cost_usd: typeof u.cost === 'number' ? u.cost : 0,
      generation_id: data.id,
    },
  }
}

type Usage = {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  cost_usd: number
  generation_id?: string
}

function merge(raw: RawPericope, ai: AiPartial): Pericope {
  return {
    ordem: raw.ordem,
    livro: raw.livro,
    abbrev: raw.abbrev,
    capitulo_inicio: raw.capitulo_inicio,
    versiculo_inicio: raw.versiculo_inicio,
    capitulo_fim: raw.capitulo_fim,
    versiculo_fim: raw.versiculo_fim,
    titulo_pericope_pt: ai.titulo_pericope_pt,
    texto_naa: raw.texto_naa,
    contexto_historico_literario: ai.contexto_historico_literario,
    resenha: ai.resenha,
    perguntas_reflexao: ai.perguntas_reflexao,
  }
}

function parseArgs(argv: string[]) {
  const opts = {
    mode: 'local' as 'local' | 'openrouter',
    livro: '' as string,
    limit: Infinity,
    force: false,
  }
  for (const a of argv) {
    if (a === '--openrouter' || a === '--openai') opts.mode = 'openrouter'
    if (a === '--local') opts.mode = 'local'
    if (a === '--force') opts.force = true
    if (a.startsWith('--livro=')) opts.livro = a.slice('--livro='.length)
    if (a.startsWith('--limit=')) opts.limit = Number(a.slice('--limit='.length))
  }
  return opts
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  mkdirSync(enrichedDir, { recursive: true })
  mkdirSync(dirname(outPath), { recursive: true })

  const rawLines = readFileSync(rawPath, 'utf8').trim().split('\n')
  let raws = rawLines.map((l) => JSON.parse(l) as RawPericope)
  if (opts.livro) raws = raws.filter((r) => r.livro === opts.livro)
  if (Number.isFinite(opts.limit)) raws = raws.slice(0, opts.limit)

  const state: { done: number[]; mode: string } = existsSync(statePath)
    ? JSON.parse(readFileSync(statePath, 'utf8'))
    : { done: [], mode: opts.mode }

  const costLog: Array<{
    ordem: number
    titulo_en: string
    chars_texto: number
    usage: Usage
  }> = []

  let processed = 0
  for (const raw of raws) {
    const cacheFile = join(enrichedDir, `${raw.ordem}.json`)
    if (existsSync(cacheFile) && !opts.force) {
      processed++
      continue
    }
    let ai: AiPartial
    if (opts.mode === 'openrouter') {
      try {
        const r = await openRouterEnrich(raw)
        ai = r.ai
        costLog.push({
          ordem: raw.ordem,
          titulo_en: raw.titulo_en,
          chars_texto: raw.texto_naa.length,
          usage: r.usage,
        })
        console.log(
          `ordem ${raw.ordem}: $${r.usage.cost_usd.toFixed(6)} · in ${r.usage.prompt_tokens} out ${r.usage.completion_tokens}`,
        )
      } catch (e) {
        console.warn(`ordem ${raw.ordem} falhou, retry…`, e)
        const r = await openRouterEnrich(raw)
        ai = r.ai
        costLog.push({
          ordem: raw.ordem,
          titulo_en: raw.titulo_en,
          chars_texto: raw.texto_naa.length,
          usage: r.usage,
        })
      }
    } else {
      ai = localEnrich(raw)
    }
    const full = merge(raw, ai)
    writeFileSync(cacheFile, JSON.stringify(full, null, 2))
    state.done.push(raw.ordem)
    state.mode = opts.mode
    writeFileSync(statePath, JSON.stringify(state))
    processed++
    if (processed % 50 === 0) console.log(`… ${processed}/${raws.length}`)
  }

  // Assemble full catalog from all enriched + fill missing from raw with local
  const allRaw = rawLines.map((l) => JSON.parse(l) as RawPericope)
  const catalog: Pericope[] = []
  for (const raw of allRaw) {
    const cacheFile = join(enrichedDir, `${raw.ordem}.json`)
    if (existsSync(cacheFile)) {
      const cached = JSON.parse(readFileSync(cacheFile, 'utf8')) as Pericope & {
        comentario_narrador?: string
      }
      if (!cached.resenha && cached.comentario_narrador) {
        cached.resenha = cached.comentario_narrador
        delete cached.comentario_narrador
      }
      catalog.push(cached)
    } else {
      catalog.push(merge(raw, localEnrich(raw)))
    }
  }
  catalog.sort((a, b) => a.ordem - b.ordem)
  writeFileSync(outPath, JSON.stringify(catalog))

  if (costLog.length) {
    const totalCost = costLog.reduce((s, x) => s + x.usage.cost_usd, 0)
    const totalIn = costLog.reduce((s, x) => s + x.usage.prompt_tokens, 0)
    const totalOut = costLog.reduce((s, x) => s + x.usage.completion_tokens, 0)
    const n = costLog.length
    const avg = totalCost / n
    const estimate = {
      model: process.env.OPENROUTER_MODEL || 'google/gemini-3.7-flash',
      sample_n: n,
      sample_cost_usd: totalCost,
      avg_cost_usd: avg,
      total_prompt_tokens: totalIn,
      total_completion_tokens: totalOut,
      avg_prompt_tokens: totalIn / n,
      avg_completion_tokens: totalOut / n,
      catalog_total: allRaw.length,
      estimate_full_usd: avg * allRaw.length,
      estimate_full_brl_approx: avg * allRaw.length * 5.5,
      items: costLog,
    }
    const costPath = join(root, 'data/cost-sample.json')
    writeFileSync(costPath, JSON.stringify(estimate, null, 2))
    console.log('\n--- Custo amostra ---')
    console.log(`n=${n}  total=$${totalCost.toFixed(6)}  média=$${avg.toFixed(6)}`)
    console.log(
      `Estimativa ${allRaw.length} perícopes: $${estimate.estimate_full_usd.toFixed(2)} (~R$${estimate.estimate_full_brl_approx.toFixed(2)} @5.5)`,
    )
    console.log(`Relatório → ${costPath}`)
  }

  console.log(`OK: ${catalog.length} perícopes → ${outPath} (processados nesta run: ${processed}, modo=${opts.mode})`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
