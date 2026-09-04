import { useCallback, useEffect, useRef, useState } from 'react'
import { listLivros, listPericopes, loadIndex, ordensDoTestamento } from '../lib/content'
import { testamentLabel, type Testament } from '../lib/testament'
import { countConcluidasNaSequencia, zerarProgresso } from '../lib/user-db'
import { useSyncRefresh } from '../lib/use-sync-refresh'

type Alvo = { chave: string; rotulo: string; ordens: number[] }
// `ordens` e `contagem` vêm do MESMO clique — o mesmo `a` e o mesmo `n` que
// a linha estava mostrando —, nunca recompostos depois de um re-render.
// É o que faz a caixa de confirmação ser autocontida: uma vez aberta, nada
// que aconteça em `contagens` (trocar de livro, um sync chegando) pode
// fazer a caixa mostrar um número que não é o que `ordens` vai zerar.
type Confirmando = Alvo & { contagem: number }

export default function Ajustes() {
  const [livros, setLivros] = useState<string[]>([])
  const [livro, setLivro] = useState('')
  const [alvos, setAlvos] = useState<Alvo[]>([])
  const [contagens, setContagens] = useState<Map<string, number>>(new Map())
  const [confirmando, setConfirmando] = useState<Confirmando | null>(null)
  const [aviso, setAviso] = useState('')
  const [erro, setErro] = useState('')

  const caixaRef = useRef<HTMLDivElement>(null)

  const carregar = useCallback(async () => {
    try {
      const todas = await loadIndex()
      const ls = await listLivros()
      setLivros(ls)
      const doLivro = livro ? await listPericopes({ livro }) : []
      const lista: Alvo[] = [
        ...(livro
          ? [{ chave: `livro:${livro}`, rotulo: livro, ordens: doLivro.map((p) => p.ordem) }]
          : []),
        ...(['vt', 'nt'] as Testament[]).map((t) => ({
          chave: `t:${t}`,
          rotulo: testamentLabel(t),
          ordens: ordensDoTestamento(todas, t),
        })),
        { chave: 'tudo', rotulo: 'Tudo', ordens: todas.map((p) => p.ordem) },
      ]
      setAlvos(lista)
      const pares = await Promise.all(
        lista.map(async (a) => [a.chave, await countConcluidasNaSequencia(a.ordens)] as const),
      )
      setContagens(new Map(pares))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro')
    }
  }, [livro])

  useEffect(() => {
    void carregar()
  }, [carregar])
  useSyncRefresh(() => void carregar())

  // Escape fecha a confirmação, como em VerseActions.
  useEffect(() => {
    if (!confirmando) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setConfirmando(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [confirmando])

  // Mesmo padrão de VerseActions: foco entra na caixa ao abrir (que tem
  // aria-label, então o leitor de tela anuncia do que se trata antes de
  // chegar nos botões) e volta para o botão "Zerar" que abriu, ao fechar —
  // por confirmação, por cancelamento ou pelo Escape acima.
  useEffect(() => {
    if (!confirmando) return
    const anterior = document.activeElement
    caixaRef.current?.focus()
    return () => {
      if (anterior instanceof HTMLElement && anterior.isConnected) {
        anterior.focus({ preventScroll: true })
      }
    }
  }, [confirmando])

  async function zerar(alvo: Confirmando) {
    setConfirmando(null)
    try {
      await zerarProgresso(alvo.ordens)
      // Sem número aqui: countConcluidasNaSequencia só conta "concluído", mas
      // zerarProgresso também reseta o que estava "em_andamento" — os dois
      // números podem divergir, e um deles mentiria na tela. A confirmação
      // já mostrou a contagem honesta (o que o leitor reconhece como lido).
      setAviso('Progresso zerado.')
      await carregar()
    } catch {
      setAviso('Não foi possível zerar agora.')
    }
  }

  if (erro) return <p className="muted">{erro}</p>

  return (
    <section className="ajustes">
      <h1>Ajustes</h1>
      <h2>Progresso de leitura</h2>
      <p className="lead">
        Zerar tira o ✓ e faz as barras por livro voltarem a zero. Seu streak e seu recorde
        continuam: os dias em que você leu aconteceram.
      </p>

      <label className="ajustes-livro">
        Escolher um livro
        <select
          value={livro}
          disabled={!!confirmando}
          onChange={(e) => setLivro(e.target.value)}
        >
          <option value="">—</option>
          {livros.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </label>

      <ul className="ajustes-alvos">
        {alvos.map((a) => {
          const n = contagens.get(a.chave) ?? 0
          return (
            <li key={a.chave}>
              <span className="ajustes-rotulo">{a.rotulo}</span>
              <span className="ajustes-contagem">{n === 1 ? '1 lida' : `${n} lidas`}</span>
              <button
                type="button"
                className="ghost"
                disabled={n === 0}
                onClick={() => setConfirmando({ ...a, contagem: n })}
              >
                Zerar
              </button>
            </li>
          )
        })}
      </ul>

      {confirmando && (
        <div
          className="ajustes-confirma"
          role="dialog"
          aria-label={`Zerar ${confirmando.rotulo}`}
          ref={caixaRef}
          tabIndex={-1}
        >
          <p>
            <strong>
              Zerar {confirmando.contagem} leituras de {confirmando.rotulo}?
            </strong>
          </p>
          <p className="muted">
            Os ✓ somem e as barras por livro voltam a zero. Seu 🔥 streak e seu recorde continuam.
            Não dá para desfazer.
          </p>
          <div className="ajustes-confirma-acoes">
            <button type="button" className="ghost" onClick={() => setConfirmando(null)}>
              Cancelar
            </button>
            <button type="button" className="cta" onClick={() => void zerar(confirmando)}>
              Zerar
            </button>
          </div>
        </div>
      )}

      <p className="ajustes-aviso" role="status" aria-live="polite">
        {aviso}
      </p>

      {/*
        Crédito da tradução. Não é cortesia: a licença CC BY 3.0 Brasil da
        Bíblia Livre exige a atribuição (§4b) e, quando há adaptação, exige que
        a mudança seja indicada (§3b) — daí a frase sobre os colchetes.
        Ver docs/licencas.md.
      */}
      <h2>Sobre o texto bíblico</h2>
      <p className="muted ajustes-credito">
        Todas as Escrituras em português citadas são da{' '}
        <a href="https://sites.google.com/site/biblialivre/" target="_blank" rel="noreferrer">
          Bíblia Livre (BLIVRE)
        </a>
        , Copyright © Diego Santos, Mario Sérgio e Marco Teles — fevereiro de 2018. Licença{' '}
        <a href="https://creativecommons.org/licenses/by/3.0/br/" target="_blank" rel="noreferrer">
          Creative Commons Atribuição 3.0 Brasil
        </a>
        .
      </p>
      <p className="muted ajustes-credito">
        O texto foi adaptado neste app: a Bíblia Livre marca entre colchetes as
        palavras que o tradutor supriu e o original não traz — as palavras foram
        mantidas e os colchetes, removidos, para a leitura e a narração. Os
        sobrescritos dos Salmos aparecem como epígrafe, acima do texto e fora da
        numeração dos versículos.
      </p>
    </section>
  )
}
