import { useEffect, useState } from 'react'

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
}

export default function SectionChips({ ordem, abbrev }: Props) {
  const [ativo, setAtivo] = useState<string>(SECTIONS[0].id)
  const [refViva, setRefViva] = useState<string | null>(null)

  // O header é sticky e some ao rolar: os chips precisam saber a altura dele
  // para encostar embaixo sem sobrepor. O CSS zera esse offset quando o header
  // está escondido (`.shell:has(.top-hidden)`).
  useEffect(() => {
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
  useEffect(() => {
    if (ativo !== 'texto') {
      setRefViva(null)
      return
    }
    if (typeof IntersectionObserver === 'undefined') return
    const alvos = Array.from(document.querySelectorAll<HTMLElement>('[data-verse-id]'))
    if (!alvos.length) return
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
  }, [ativo, abbrev, ordem])

  function irPara(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: rolagemSuave(), block: 'start' })
  }

  return (
    <nav className="section-chips" aria-label="Seções da perícope">
      <div className="section-chips-row">
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
