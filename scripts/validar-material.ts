/**
 * Confere o material editorial produzido para as perícopes novas, antes de
 * qualquer merge no cache ou geração de áudio.
 *
 * Checa forma (campos, contagem de bullets, JSON limpo) e algumas armadilhas
 * de conteúdo que já apareceram na prática: título repetindo o provisório sem
 * pensar, resenha que virou lista de versículos, e material que não menciona
 * nada do próprio trecho.
 *
 * Usage: npx tsx scripts/validar-material.ts <dir-entrada> <dir-saida>
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const CAMPOS = [
  'ordem',
  'titulo_pericope_pt',
  'contexto_historico_literario',
  'resenha',
  'perguntas_reflexao',
  'topicos_pregar',
] as const

type Material = {
  ordem: number
  titulo_pericope_pt: string
  contexto_historico_literario: string
  resenha: string
  perguntas_reflexao: string[]
  topicos_pregar: string
}

function bullets(topicos: string, secao: 'raciocinio' | 'mensagens'): number {
  const [antes, depois] = topicos.split('Mensagens a levar')
  const alvo = secao === 'raciocinio' ? antes : (depois ?? '')
  return alvo.split('\n').filter((l) => l.trimStart().startsWith('- ')).length
}

/** Palavras de conteúdo do texto bíblico, para ver se o material fala DELE. */
function palavrasDoTexto(texto: string): Set<string> {
  return new Set(
    texto
      .toLowerCase()
      .replace(/^capítulo \d+$/gm, '')
      .replace(/[^\p{L}\s]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 5),
  )
}

function main() {
  const [dirEntrada, dirSaida] = process.argv.slice(2)
  if (!dirEntrada || !dirSaida) {
    console.error('uso: validar-material.ts <dir-entrada> <dir-saida>')
    process.exit(2)
  }

  const esperados = readdirSync(dirEntrada)
    .filter((f) => f.endsWith('.json'))
    .map((f) => Number(f.replace('.json', '')))
    .sort((a, b) => a - b)

  const problemas: string[] = []
  let ok = 0
  let faltando = 0

  for (const ordem of esperados) {
    const f = join(dirSaida, `${ordem}.json`)
    if (!existsSync(f)) {
      faltando++
      continue
    }
    let m: Material
    const bruto = readFileSync(f, 'utf8')
    try {
      m = JSON.parse(bruto) as Material
    } catch (e) {
      problemas.push(`${ordem}: JSON inválido (${(e as Error).message})`)
      continue
    }
    const entrada = JSON.parse(readFileSync(join(dirEntrada, `${ordem}.json`), 'utf8')) as {
      texto_naa: string
      titulo_provisorio: string
      livro: string
    }
    const p: string[] = []

    for (const c of CAMPOS) if (!(c in m)) p.push(`falta ${c}`)
    if (m.ordem !== ordem) p.push(`ordem ${m.ordem} != ${ordem}`)
    if (!Array.isArray(m.perguntas_reflexao) || m.perguntas_reflexao.length !== 2) {
      p.push(`perguntas = ${m.perguntas_reflexao?.length}`)
    }
    if (/```/.test(bruto)) p.push('cerca de código no JSON')

    const t = m.topicos_pregar ?? ''
    if (!t.includes('Linha de raciocínio') || !t.includes('Mensagens a levar')) {
      p.push('tópicos sem as duas seções')
    } else {
      const lr = bullets(t, 'raciocinio')
      const mg = bullets(t, 'mensagens')
      if (lr < 5 || lr > 7) p.push(`linha de raciocínio = ${lr} bullets`)
      if (mg < 4 || mg > 6) p.push(`mensagens = ${mg} bullets`)
      if (!t.includes('**')) p.push('tópicos sem negrito')
    }

    // Resenha que virou passeio versículo a versículo é o modo de falha do prompt.
    const refs = (m.resenha ?? '').match(/\bv\.?\s?\d+|\bversículo \d+/gi)?.length ?? 0
    if (refs >= 5) p.push(`resenha cita ${refs} versículos — virou tour`)

    // O material tem de falar DESTE trecho: pelo menos algumas palavras de
    // conteúdo em comum com o texto bíblico.
    const doTexto = palavrasDoTexto(entrada.texto_naa)
    const doMaterial = palavrasDoTexto(`${m.contexto_historico_literario} ${m.resenha}`)
    const comuns = [...doMaterial].filter((w) => doTexto.has(w)).length
    if (comuns < 5) p.push(`só ${comuns} palavras em comum com o texto — material genérico?`)

    for (const campo of ['contexto_historico_literario', 'resenha'] as const) {
      const v = m[campo] ?? ''
      if (v.length < 200) p.push(`${campo} curto demais (${v.length})`)
      if (v.length > 3000) p.push(`${campo} longo demais (${v.length})`)
    }
    if (!m.titulo_pericope_pt?.trim()) p.push('sem título')

    if (p.length) problemas.push(`${ordem} (${entrada.livro}): ${p.join(' | ')}`)
    else ok++
  }

  console.log(`esperadas ${esperados.length} · válidas ${ok} · com problema ${problemas.length} · ausentes ${faltando}`)
  if (problemas.length) {
    console.log('\n❌ problemas:')
    for (const x of problemas) console.log(`  ${x}`)
    process.exitCode = 1
  } else if (faltando === 0) {
    console.log('✅ todas válidas')
  }
}

main()
