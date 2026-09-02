import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReadingLayout } from '../lib/reading-prefs'

/** Ordem canônica das seções — é ela que decide qual chip fica ativo quando
 * mais de uma seção cruza a faixa de leitura ao mesmo tempo. */
const SECTIONS: { id: string; label: string }[] = [
  { id: 'contexto', label: 'Contexto' },
  { id: 'texto', label: 'Texto' },
  { id: 'resenha', label: 'Resenha' },
  { id: 'reflexao', label: 'Reflexão' },
]

const VERSE_ID = /^\d+:\d+$/

function rolagemSuave(): ScrollBehavior {
  // Guard: matchMedia falta em ambiente sem DOM completo.
  const reduzido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  return reduzido ? 'auto' : 'smooth'
}

type Props = {
  /** Muda a cada perícope: força re-observar o DOM novo. */
  ordem: number
  abbrev: string
  /** Corrido↔Blocos troca a subárvore de versículos: precisa re-observar. */
  layout: ReadingLayout
  /** Avisa a página ANTES de rolar — é assim que o chip Contexto expande a
   * seção colapsada em vez de parar num título mudo. */
  onIr?: (id: string) => void
}

export default function SectionChips({ ordem, abbrev, layout, onIr }: Props) {
  const [ativo, setAtivo] = useState<string>(SECTIONS[0].id)
  const [refViva, setRefViva] = useState<string | null>(null)
  const rowRef = useRef<HTMLDivElement>(null)

  // O header é sticky e some ao rolar: os chips precisam saber a altura dele
  // para encostar embaixo sem sobrepor. O CSS zera esse offset quando o header
  // está escondido (`.shell:has(.top-hidden)`).
  // useLayoutEffect (não useEffect): mede e aplica `--top-h` antes do browser
  // pintar o frame, senão os chips desenham um frame no offset errado (0px)
  // até a medição rodar — o flash que este efeito existe para evitar.
  useLayoutEffect(() => {
    const top = document.querySelector<HTMLElement>('.top')
    const raiz = document.documentElement
    if (!top) return
    const aplicar = () => raiz.style.setProperty('--top-h', `${top.offsetHeight}px`)
    aplicar()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', aplicar)
      return () => {
        window.removeEventListener('resize', aplicar)
        raiz.style.removeProperty('--top-h')
      }
    }
    const ro = new ResizeObserver(aplicar)
    ro.observe(top)
    return () => {
      ro.disconnect()
      raiz.style.removeProperty('--top-h')
    }
  }, [])

  // Chip ativo: um único observer sobre as quatro seções.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const alvos = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => el !== null,
    )
    if (!alvos.length) return
    const visiveis = new Set<string>()
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visiveis.add(e.target.id)
          else visiveis.delete(e.target.id)
        }
        const primeira = SECTIONS.find((s) => visiveis.has(s.id))
        if (primeira) setAtivo(primeira.id)
      },
      // Faixa fina no primeiro terço da viewport: o que está ali é o que o
      // leitor está lendo agora.
      { rootMargin: '-15% 0px -67% 0px', threshold: 0 },
    )
    for (const el of alvos) obs.observe(el)
    return () => obs.disconnect()
  }, [ordem])

  // Referência viva: segundo observer, só enquanto o Texto está ativo.
  // `layout` entra nas deps porque Corrido↔Blocos troca a subárvore de
  // versículos: sem isso o observer continuaria vigiando nós já removidos.
  useEffect(() => {
    if (ativo !== 'texto') {
      setRefViva(null)
      return
    }
    if (typeof IntersectionObserver === 'undefined') return
    const alvos = Array.from(document.querySelectorAll<HTMLElement>('[data-verse-id]'))
    if (!alvos.length) return
    // Novo Set a cada (re)execução: nada de estado "visível" sobrevivendo à
    // troca de layout.
    const visiveis = new Set<HTMLElement>()
    let raf = 0
    const atualizar = () => {
      raf = 0
      const primeiro = alvos.find((el) => visiveis.has(el))
      const id = primeiro?.dataset.verseId ?? ''
      // Versículos órfãos do parser ("x:N") não viram referência.
      setRefViva(VERSE_ID.test(id) ? `${abbrev} ${id}` : null)
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const el = e.target as HTMLElement
          if (e.isIntersecting) visiveis.add(el)
          else visiveis.delete(el)
        }
        // rAF: uma rolagem rápida dispara dezenas de callbacks; só a última pinta.
        if (!raf) raf = requestAnimationFrame(atualizar)
      },
      { rootMargin: '-10% 0px -55% 0px', threshold: 0 },
    )
    for (const el of alvos) obs.observe(el)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      obs.disconnect()
    }
  }, [ativo, abbrev, ordem, layout])

  // Chip ativo pode ficar fora da faixa visível da barra (ela rola de lado):
  // traz ele pra dentro sem mexer na rolagem da página.
  useEffect(() => {
    const row = rowRef.current
    if (!row) return
    const chipEl = row.querySelector<HTMLElement>('.section-chip.active')
    chipEl?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'auto' })
  }, [ativo])

  function irPara(id: string) {
    onIr?.(id)
    const alvo = document.getElementById(id)
    // Expandir o Contexto não move o topo dele — é a primeira seção da página
    // —, então rolar na mesma volta do evento já chega no lugar certo.
    alvo?.scrollIntoView({ behavior: rolagemSuave(), block: 'start' })
    // O foco tem que acompanhar a rolagem: sem isso, quem navega por teclado
    // ou leitor de tela continua lá atrás, e o próximo Tab volta para o começo
    // da página em vez de seguir dentro da seção. `preventScroll` porque a
    // rolagem já foi feita acima, suave — deixar o foco rolar de novo daria um
    // salto seco por cima dela. As seções levam tabindex="-1" para poder
    // receber foco sem entrar na ordem de tabulação.
    alvo?.focus({ preventScroll: true })
  }

  return (
    <nav className="section-chips" aria-label="Seções da perícope">
      <div className="section-chips-row" ref={rowRef}>
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`section-chip${ativo === s.id ? ' active' : ''}`}
            aria-current={ativo === s.id ? 'true' : undefined}
            onClick={() => irPara(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>
      {/* Sem aria-live de propósito: o rótulo muda a cada rolagem e viraria
          tagarelice para o leitor de tela. */}
      <span className="section-ref">{refViva ?? ''}</span>
    </nav>
  )
}
