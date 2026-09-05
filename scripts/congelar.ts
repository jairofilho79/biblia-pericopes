/**
 * Diz à Sessão 4 o que ela pode narrar sem risco.
 *
 * **Por que isto existe.** Narrar custa dinheiro e é irreversível: uma perícope
 * gravada cujo material vai mudar é dinheiro jogado fora. Três coisas ainda
 * podem mudar material já escrito e aprovado:
 *
 * 1. os defeitos da Bíblia Livre (`scripts/defeitos-blivre.ts`), que quando
 *    aplicados mudam o TEXTO e obrigam a reescrever quem o cita;
 * 2. as quedas de registro (`scripts/varrer-registro.ts`), que o portão não
 *    alcança e voltam para a fila;
 * 3. as colisões de título (`scripts/titulos-colididos.ts`), que só existem
 *    quando os 2.823 títulos existem — dessas, muda só o título, e o custo de
 *    regravar é a seção `titulo`, ~2% do áudio da perícope.
 *
 * O cruzamento dos defeitos contra o congelamento é o ponto: um defeito novo
 * pode cair numa perícope já congelada, e é por isso que este script roda de
 * novo a cada rodada em vez de a lista ser mantida à mão.
 *
 * Usage: npx tsx scripts/congelar.ts
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { CODIGOS_VPL, DEFEITOS, TODAS_AS_REFS, pericopesAfetadas, type Faixa } from './defeitos-blivre.ts'
import { colisoes } from './titulos-colididos.ts'
import { dirs, conferirSaidas } from './reenriquecimento.ts'
import { varrer } from './varrer-registro.ts'

const root = join(import.meta.dirname, '..')

function main() {
  const raw = readFileSync(join(root, 'data/raw-pericopes.jsonl'), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l) as Faixa & { seq: number })
    .sort((a, b) => a.seq - b.seq)

  // A correspondência código VPL → abreviação PT é posicional, pela ordem
  // canônica dos livros. É a mesma que `blivre-fonte.ts` usa.
  const naOrdem: string[] = []
  for (const r of raw) if (!naOrdem.includes(r.abbrev)) naOrdem.push(r.abbrev)
  const abbrevPorCodigo = new Map(CODIGOS_VPL.map((c, i) => [c as string, naOrdem[i]]))

  const dirSaida = join(root, 'data/reenriquecimento/saida')
  const prontas = readdirSync(dirSaida)
    .filter((f) => f.endsWith('.json'))
    .map((f) => Number(f.slice(0, -5)))
  const mats = prontas.map((o) => JSON.parse(readFileSync(join(dirSaida, `${o}.json`), 'utf8')))

  // O que o portão reprova ainda vai ser reescrito, então não pode ser narrado.
  // Antes isto não entrava na conta porque nada reprovava; entrou no dia em que
  // uma regra nova reprovou material já escrito e já congelado.
  const reprovadasPeloPortao = new Set(
    conferirSaidas(dirs(join(root, 'data/reenriquecimento')))
      .filter((v) => !v.ok)
      .map((v) => v.ordem),
  )

  const porTexto = pericopesAfetadas(raw, abbrevPorCodigo)
  const porRegistro = new Set(mats.flatMap((m) => varrer(m)).map((s) => s.ordem))
  const porTitulo = new Set(
    colisoes(mats.map((m) => ({ ordem: m.ordem, titulo: m.titulo_pericope_pt })))
      .filter((c) => c.forca >= 0.5)
      .flatMap((c) => [c.a.ordem, c.b.ordem]),
  )

  const anterior = (() => {
    try {
      return JSON.parse(readFileSync(join(root, 'data/reenriquecimento/congeladas.json'), 'utf8'))
    } catch {
      return null
    }
  })()
  const congeladasAntes: number[] = anterior?.congeladas ?? []
  const aguardando: number[] = anterior?.aguardando_decisao_do_dono ?? []

  const risco = (o: number) =>
    porTexto.has(o) || porRegistro.has(o) || reprovadasPeloPortao.has(o) || aguardando.includes(o)
  const reescrita = prontas
    .filter((o) => porTexto.has(o) || porRegistro.has(o) || reprovadasPeloPortao.has(o))
    .sort((a, b) => a - b)
  const soTitulo = prontas.filter((o) => porTitulo.has(o) && !risco(o)).sort((a, b) => a - b)
  const congeladas = prontas.filter((o) => !risco(o) && !porTitulo.has(o)).sort((a, b) => a - b)

  // O que ESTAVA congelado e deixou de estar: é o aviso que a Sessão 4 precisa
  // receber antes de gravar, porque ela pode já ter narrado.
  const descongeladas = congeladasAntes.filter((o) => !congeladas.includes(o))

  writeFileSync(
    join(root, 'data/reenriquecimento/congeladas.json'),
    JSON.stringify(
      {
        gerado: new Date().toISOString(),
        total_prontas: prontas.length,
        congeladas,
        reescrita_certa: reescrita,
        so_titulo_pode_mudar: soTitulo,
        aguardando_decisao_do_dono: aguardando,
        nota_aguardando: anterior?.nota_aguardando,
        descongeladas_nesta_rodada: descongeladas,
      },
      null,
      2,
    ),
  )

  console.log(`prontas ${prontas.length}`)
  console.log(`  congeladas            ${congeladas.length}`)
  console.log(
    `  reescrita certa       ${reescrita.length}  (texto ${[...porTexto].filter((o) => prontas.includes(o)).length} · registro ${porRegistro.size} · portão ${reprovadasPeloPortao.size})`,
  )
  console.log(`  só título pode mudar  ${soTitulo.length}`)
  console.log(`  aguardando o dono     ${aguardando.length}`)
  console.log(`\ndefeitos catalogados: ${TODAS_AS_REFS.length} em ${DEFEITOS.length} classes`)
  if (descongeladas.length) {
    console.log(`\n⚠️  DESCONGELADAS nesta rodada (avisar a Sessão 4): ${descongeladas.join(', ')}`)
  } else {
    console.log('\n✅ nenhuma perícope saiu do congelamento')
  }
}

main()
