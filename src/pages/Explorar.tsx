import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SkeletonIndice } from '../components/Skeleton'
import CatalogoLivros from '../components/CatalogoLivros'
import LivroAberto from '../components/LivroAberto'
import ListaPericopes from '../components/ListaPericopes'
// `itemDeIndice` e `ItemPericope` NÃO moram mais no arquivo do componente:
// exportar função pura ao lado de um componente dispara
// `react(only-export-components)` e quebra o fast refresh. Foram extraídos para
// `src/lib/item-pericope.ts`, seguindo o que o repositório já faz com toda
// lógica pura (mesmo movimento de `src/lib/perfil-secoes.ts`, commit d9ced2e).
import { itemDeIndice, type ItemPericope } from '../lib/item-pericope'
import { bookByName, type BibleBook } from '../lib/bible-books'
import {
  contagemPorLivro,
  filtroDeOrdens,
  findPericopeByRef,
  listPericopes,
  listPericopesByBookChapter,
  loadIndex,
  mesmosStatus,
  progressoPorLivro,
  refLabel,
  statusPorOrdem,
  type FiltroLeitura,
} from '../lib/content'
import { parseConsulta } from '../lib/consulta'
import {
  fatiarResultado,
  indexPronto,
  LIMITE_RESULTADOS,
  marcarTrecho,
  MIN_CHARS,
  progressoDoIndice,
  searchTexto,
} from '../lib/fulltext'
import { listAllProgresso } from '../lib/user-db'
import { useSyncRefresh } from '../lib/use-sync-refresh'
import type { PericopeIndex, ProgressoStatus } from '../lib/types'

const FILTROS: { valor: FiltroLeitura; rotulo: string }[] = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'nao-lidos', rotulo: 'Não lidos' },
  { valor: 'comecei', rotulo: 'Comecei' },
  { valor: 'lidos', rotulo: 'Lidos' },
]

function ehFiltro(v: string | null): v is FiltroLeitura {
  return v === 'nao-lidos' || v === 'comecei' || v === 'lidos'
}

export default function Explorar() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const f = params.get('f')
  const filtro: FiltroLeitura = ehFiltro(f) ? f : 'todos'
  const livroParam = params.get('livro') ?? ''
  // `cap` sem `livro` é ignorado: um capítulo não significa nada sem o livro, e
  // uma URL montada à mão não pode deixar a tela num estado que ela não desenha.
  const livro: BibleBook | undefined = livroParam ? bookByName(livroParam) : undefined
  const capParam = Number(params.get('cap'))
  const cap = livro && Number.isInteger(capParam) && capParam >= 1 ? capParam : null

  const [todas, setTodas] = useState<PericopeIndex[]>([])
  const [status, setStatus] = useState(new Map<number, ProgressoStatus>())
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const consulta = useMemo(() => parseConsulta(q), [q])
  const aceita = useMemo(() => filtroDeOrdens(status, filtro), [status, filtro])
  const concluidas = useMemo(
    () => new Set([...status].filter(([, s]) => s === 'concluido').map(([o]) => o)),
    [status],
  )

  async function carregarProgresso() {
    const proximo = statusPorOrdem(await listAllProgresso())
    // Manter a mesma referência quando o conteúdo não mudou: `status` alimenta
    // `aceita`, que é dependência do efeito de busca no texto — um Map novo a
    // cada sync reiniciaria uma busca em voo sem necessidade.
    setStatus((atual) => (mesmosStatus(atual, proximo) ? atual : proximo))
  }

  useEffect(() => {
    let vivo = true
    Promise.all([loadIndex(), listAllProgresso()])
      .then(([tudo, prog]) => {
        if (!vivo) return
        setTodas(tudo)
        setStatus(statusPorOrdem(prog))
      })
      .catch(() => {
        if (vivo) setErro('Não foi possível carregar o catálogo.')
      })
      .finally(() => {
        if (vivo) setCarregando(false)
      })
    return () => {
      vivo = false
    }
  }, [])

  // Do sync só o progresso muda: o catálogo é estático e recarregá-lo faria a
  // lista piscar por causa de uma conclusão feita em outro aparelho.
  useSyncRefresh(() => {
    void carregarProgresso().catch(() => {})
  })

  function mexerNaUrl(mudar: (p: URLSearchParams) => void, replace: boolean) {
    const proximo = new URLSearchParams(params)
    mudar(proximo)
    setParams(proximo, { replace })
  }

  // Digitar navega com replace: teclar não pode entulhar o histórico.
  const setQ = (valor: string) =>
    mexerNaUrl((p) => {
      if (!valor) {
        p.delete('q')
        return
      }
      p.set('q', valor)
      // Digitar fecha o livro aberto. Com `livro` na URL o render mostra o
      // painel do livro e nenhuma seção de resultado — a caixa ficaria muda.
      p.delete('livro')
      p.delete('cap')
    }, /* replace */ !livro)
  const setFiltro = (valor: FiltroLeitura) =>
    mexerNaUrl((p) => (valor === 'todos' ? p.delete('f') : p.set('f', valor)), false)
  const abrirLivro = (b: BibleBook) =>
    mexerNaUrl((p) => {
      p.set('livro', b.name)
      p.delete('cap')
      // Simétrico ao setQ: abrir um livro fecha a busca.
      p.delete('q')
    }, false)
  const fecharLivro = () =>
    mexerNaUrl((p) => {
      p.delete('livro')
      p.delete('cap')
    }, false)
  const setCap = (valor: number | null) =>
    mexerNaUrl((p) => (valor == null ? p.delete('cap') : p.set('cap', String(valor))), false)

  /**
   * Submeter capítulo+versículo no livro aberto tem que FECHAR o livro, não só
   * setar `q`: o render é `livro ? <LivroAberto/> : …`, então deixar `livro` na
   * URL manteria o painel do livro na tela e a seção "Referência" nunca
   * apareceria — o botão não faria nada visível. Sair do livro é aceitável
   * porque a seção "Livros" logo abaixo do resultado traz ele de volta a um
   * toque (`parseConsulta` de uma referência devolve `livros: [livro]`).
   */
  const irParaReferencia = (abbrev: string, cap: number, ver: number) =>
    mexerNaUrl((p) => {
      p.set('q', `${abbrev} ${cap}:${ver}`)
      p.delete('livro')
      p.delete('cap')
    }, false)

  // ---- Seção Referência ----
  const [refHit, setRefHit] = useState<PericopeIndex | null>(null)
  const [refMiss, setRefMiss] = useState('')
  useEffect(() => {
    const r = consulta.ref
    if (!r) {
      setRefHit(null)
      setRefMiss('')
      return
    }
    let vivo = true
    void findPericopeByRef(r.livro.abbrev, r.cap, r.ver ?? 1)
      .then((achado) => {
        if (!vivo) return
        setRefHit(achado)
        setRefMiss(achado ? '' : `Nenhuma perícope contém ${r.livro.name} ${r.cap}:${r.ver ?? 1}.`)
      })
      .catch(() => {
        if (!vivo) return
        // Sem isto, uma falha depois de um acerto anterior mostrava a
        // perícope velha E a mensagem de erro juntas.
        setRefHit(null)
        setRefMiss('Não foi possível resolver a referência.')
      })
    return () => {
      vivo = false
    }
  }, [consulta.ref])

  // ---- Seção Títulos ----
  const [titulos, setTitulos] = useState<PericopeIndex[]>([])
  useEffect(() => {
    if (!consulta.termo || consulta.ref) {
      setTitulos([])
      return
    }
    let vivo = true
    void listPericopes({ q: consulta.termo })
      .then((r) => {
        if (vivo) setTitulos(r)
      })
      // `loadIndex` pode falhar (offline na primeira visita); o efeito de
      // carregamento principal já mostra o erro na tela, então aqui só evita
      // vazar uma rejeição não tratada no console.
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [consulta.termo, consulta.ref])

  // ---- Seção No texto ----
  const [resultado, setResultado] = useState<{
    termo: string
    hits: Awaited<ReturnType<typeof searchTexto>>
    truncado: boolean
  }>({ termo: '', hits: [], truncado: false })
  const [buscando, setBuscando] = useState(false)
  const [preparando, setPreparando] = useState(false)
  const [erroBusca, setErroBusca] = useState(false)
  const [progressoBusca, setProgressoBusca] = useState({ feitos: 0, total: 0 })

  useEffect(() => {
    if (!consulta.buscarNoTexto) {
      setResultado({ termo: '', hits: [], truncado: false })
      setBuscando(false)
      setPreparando(false)
      setErroBusca(false)
      return
    }
    let vivo = true
    setBuscando(true)
    setErroBusca(false)
    setPreparando(!indexPronto())
    // Zera o progresso velho: sem isto, uma indexação que falhou no meio
    // deixava "Preparando busca…" mostrando o valor anterior ("— 40 de 66
    // livros") até o primeiro tique do intervalo abaixo.
    setProgressoBusca({ feitos: 0, total: 0 })
    const termo = consulta.termo
    // Debounce de 300 ms: digitar não pode disparar uma varredura por tecla.
    const timer = window.setTimeout(() => {
      // `+ 1` de propósito: é o item extra que distingue "achou 50" de "achou
      // 50 e tem mais". fatiarResultado descarta ele da lista.
      searchTexto(termo, LIMITE_RESULTADOS + 1, aceita)
        .then((r) => {
          if (vivo) setResultado({ termo, ...fatiarResultado(r, LIMITE_RESULTADOS) })
        })
        .catch(() => {
          if (vivo) {
            setResultado({ termo, hits: [], truncado: false })
            setErroBusca(true)
          }
        })
        .finally(() => {
          if (!vivo) return
          setBuscando(false)
          setPreparando(false)
        })
    }, 300)
    return () => {
      vivo = false
      window.clearTimeout(timer)
    }
  }, [consulta.buscarNoTexto, consulta.termo, aceita])

  // `progressoDoIndice()` é leitura de módulo, não estado de React: sem
  // amostragem periódica a barra congelaria no primeiro render.
  useEffect(() => {
    if (!preparando) return
    const id = window.setInterval(() => setProgressoBusca(progressoDoIndice()), 300)
    return () => window.clearInterval(id)
  }, [preparando])

  // ---- Livro aberto ----
  const [doLivro, setDoLivro] = useState<PericopeIndex[]>([])
  useEffect(() => {
    if (!livro) {
      setDoLivro([])
      return
    }
    let vivo = true
    void listPericopesByBookChapter(livro.abbrev, cap ?? undefined)
      .then((r) => {
        if (vivo) setDoLivro(r)
      })
      // Mesmo motivo do efeito de Títulos: não vazar rejeição não tratada.
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [livro, cap])

  const progresso = useMemo(() => progressoPorLivro(todas, concluidas), [todas, concluidas])
  const contagem = useMemo(() => contagemPorLivro(todas, aceita), [todas, aceita])

  const itensTitulos: ItemPericope[] = useMemo(
    () => titulos.filter((p) => aceita(p.ordem)).map(itemDeIndice),
    [titulos, aceita],
  )
  const titulos50 = useMemo(
    // Mesmo teto da busca no texto: sem ele, `q="a"` monta 2.600 links de uma
    // vez, e a seção barata custaria mais que a cara.
    () => fatiarResultado(itensTitulos, LIMITE_RESULTADOS),
    [itensTitulos],
  )
  const itensTexto: ItemPericope[] = useMemo(
    () =>
      resultado.hits.map((h) => ({
        ordem: h.ordem,
        titulo: h.titulo,
        ref: h.refLabel,
        verseId: h.verseId || undefined,
        trecho: marcarTrecho(h.snippet, resultado.termo),
      })),
    [resultado],
  )
  const itensLivro: ItemPericope[] = useMemo(
    () => doLivro.filter((p) => aceita(p.ordem)).map(itemDeIndice),
    [doLivro, aceita],
  )

  if (erro) return <p className="muted">{erro}</p>

  const emRepouso = !consulta.termo && !livro

  return (
    <section className="explorar">
      <h1 className="sr-only">Explorar</h1>

      <div className="filters">
        <input
          type="search"
          placeholder="Buscar livro, título, referência ou trecho…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Buscar livro, título, referência ou trecho"
        />
      </div>

      <div className="chips-filtro" role="group" aria-label="Filtrar por leitura">
        {FILTROS.map((f) => (
          <button
            key={f.valor}
            type="button"
            className={`chip-filtro${filtro === f.valor ? ' active' : ''}`}
            aria-pressed={filtro === f.valor}
            onClick={() => setFiltro(f.valor)}
          >
            {f.rotulo}
          </button>
        ))}
      </div>

      {carregando ? (
        <SkeletonIndice />
      ) : livro ? (
        <LivroAberto
          livro={livro}
          prog={progresso.get(livro.name)}
          itens={itensLivro}
          concluidas={concluidas}
          filtro={filtro}
          cap={cap}
          onCap={setCap}
          onTrocar={fecharLivro}
          onIrParaVersiculo={(c, v) => irParaReferencia(livro.abbrev, c, v)}
        />
      ) : emRepouso ? (
        <CatalogoLivros
          progresso={progresso}
          contagem={contagem}
          filtro={filtro}
          onAbrir={abrirLivro}
        />
      ) : (
        <>
          {(consulta.ref || consulta.refForaDeFaixa) && (
            <section className="secao-resultado">
              <h2 className="secao-h">Referência</h2>
              {consulta.refForaDeFaixa && <p className="muted">{consulta.refForaDeFaixa.motivo}</p>}
              {refMiss && <p className="muted">{refMiss}</p>}
              {refHit && (
                <ListaPericopes
                  itens={[
                    {
                      ordem: refHit.ordem,
                      titulo: refHit.titulo_pericope_pt,
                      ref: refLabel(refHit),
                      verseId: consulta.ref
                        ? `${consulta.ref.cap}:${consulta.ref.ver ?? 1}`
                        : undefined,
                    },
                  ]}
                  concluidas={concluidas}
                />
              )}
            </section>
          )}

          {/* `consulta.livros` vem de `filterBooks`, que filtra BIBLE_BOOKS sem
              reordenar. `agruparLivros` monta as seções por TRANSIÇÃO, então
              depende dessa ordem: uma lista reordenada produziria duas seções
              com o mesmo nome. Não ordene isto. */}
          {consulta.livros.length > 0 && (
            <section className="secao-resultado">
              <h2 className="secao-h">
                Livros <span className="secao-n">{consulta.livros.length}</span>
              </h2>
              <CatalogoLivros
                livros={consulta.livros}
                progresso={progresso}
                contagem={contagem}
                filtro={filtro}
                onAbrir={abrirLivro}
              />
            </section>
          )}

          {titulos50.hits.length > 0 && (
            <section className="secao-resultado">
              <h2 className="secao-h">
                Títulos{' '}
                <span className="secao-n">
                  {titulos50.hits.length}
                  {titulos50.truncado ? ' (primeiros)' : ''}
                </span>
              </h2>
              <ListaPericopes itens={titulos50.hits} concluidas={concluidas} />
            </section>
          )}

          {consulta.buscarNoTexto && (
            <section className="secao-resultado">
              <h2 className="secao-h">
                No texto{' '}
                {!buscando && !erroBusca && (
                  <span className="secao-n">
                    {itensTexto.length}
                    {resultado.truncado ? ' (primeiros)' : ''}
                  </span>
                )}
              </h2>
              <div aria-live="polite">
                {preparando && (
                  <p className="muted">
                    Preparando busca
                    {progressoBusca.total > 0 &&
                      ` — ${progressoBusca.feitos} de ${progressoBusca.total} livros`}
                    …
                  </p>
                )}
                {!preparando && buscando && <p className="muted">Buscando…</p>}
                {!buscando && erroBusca && (
                  <p className="muted">
                    Não foi possível buscar agora — verifique a conexão e tente de novo.
                  </p>
                )}
                {!buscando && !erroBusca && itensTexto.length === 0 && (
                  <p className="muted">Nenhum resultado no texto.</p>
                )}
              </div>
              <ListaPericopes itens={itensTexto} concluidas={concluidas} />
            </section>
          )}

          {consulta.termo.length > 0 && consulta.termo.length < MIN_CHARS && (
            <p className="muted">Digite ao menos {MIN_CHARS} letras para buscar no texto.</p>
          )}
        </>
      )}
    </section>
  )
}
