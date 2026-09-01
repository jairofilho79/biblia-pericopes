import { useEffect, useRef } from 'react'

/** Foco num campo editável: as setas são do cursor de texto, não da navegação. */
export function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  const tag = el.tagName.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
  return el.isContentEditable
}

/**
 * Popover de preferências ou barra de ações de versículo abertos (ambos são
 * `role="dialog"`): eles têm precedência, e o Escape deles é que manda.
 */
export function hasOpenDialog(doc: Document): boolean {
  return doc.querySelector('[role="dialog"]') !== null
}

/** Decisão pura do atalho, sem tocar em nada do DOM além do alvo do evento. */
export function shouldHandleKey(ev: KeyboardEvent): 'prev' | 'next' | null {
  if (ev.altKey || ev.ctrlKey || ev.metaKey || ev.shiftKey) return null
  if (ev.defaultPrevented) return null
  if (isTypingTarget(ev.target)) return null
  if (ev.key === 'ArrowLeft') return 'prev'
  if (ev.key === 'ArrowRight') return 'next'
  return null
}

export type UseKeyboardNavOpts = {
  onPrev: () => void
  onNext: () => void
  enabled: boolean
}

/** ←/→ navegam entre perícopes enquanto a leitura está aberta. */
export function useKeyboardNav({ onPrev, onNext, enabled }: UseKeyboardNavOpts): void {
  const cbs = useRef({ onPrev, onNext })
  useEffect(() => {
    cbs.current = { onPrev, onNext }
  }, [onPrev, onNext])

  useEffect(() => {
    if (!enabled) return
    const onKey = (ev: KeyboardEvent) => {
      if (hasOpenDialog(document)) return
      const acao = shouldHandleKey(ev)
      if (!acao) return
      // Só aqui: a seta virou navegação, então ninguém mais deve reagir a ela.
      ev.preventDefault()
      if (acao === 'prev') cbs.current.onPrev()
      else cbs.current.onNext()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [enabled])
}
