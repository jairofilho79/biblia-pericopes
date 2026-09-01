import { useEffect, useRef, useState } from 'react'
import {
  bumpReadingLeading,
  bumpReadingSize,
  FONT_OPTIONS,
  LEADING_STEPS,
  MEASURE_OPTIONS,
  setReadingFont,
  setReadingLayout,
  setReadingMeasure,
  SIZE_STEPS,
  type ReadingLayout,
  type ReadingPrefs,
} from '../lib/reading-prefs'
import { getThemePref, setThemePref, type ThemePref } from '../lib/theme'

type Props = {
  prefs: ReadingPrefs
  onPrefs: (p: ReadingPrefs) => void
}

const LAYOUTS: { id: ReadingLayout; label: string }[] = [
  { id: 'corrido', label: 'Corrido' },
  { id: 'blocos', label: 'Blocos' },
]

const TEMAS: { id: ThemePref; label: string }[] = [
  { id: 'light', label: 'Claro' },
  { id: 'sepia', label: 'Sépia' },
  { id: 'dark', label: 'Escuro' },
  { id: 'system', label: 'Sistema' },
]

export default function ReadingMenu({ prefs, onPrefs }: Props) {
  const [open, setOpen] = useState(false)
  const [themePref, setPref] = useState<ThemePref>(() => getThemePref())
  const rootRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onTheme = () => setPref(getThemePref())
    window.addEventListener('pericopes-theme', onTheme)
    return () => window.removeEventListener('pericopes-theme', onTheme)
  }, [])

  useEffect(() => {
    if (!open) return
    const pop = popRef.current
    pop?.querySelector<HTMLElement>('button:not([disabled])')?.focus()

    function fechar() {
      setOpen(false)
      // foco volta ao gatilho também quando o fechamento vem de toque fora
      btnRef.current?.focus()
    }
    function onDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) fechar()
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        fechar()
        return
      }
      if (e.key !== 'Tab' || !pop) return
      const focaveis = [...pop.querySelectorAll<HTMLElement>('button:not([disabled])')]
      if (focaveis.length === 0) return
      const primeiro = focaveis[0]
      const ultimo = focaveis[focaveis.length - 1]
      const ativo = document.activeElement
      if (e.shiftKey && (ativo === primeiro || !pop.contains(ativo))) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && ativo === ultimo) {
        e.preventDefault()
        primeiro.focus()
      }
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="readmenu" ref={rootRef}>
      <button
        ref={btnRef}
        type="button"
        className="read-tool readmenu-btn"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
      >
        Aa
      </button>
      {open && (
        <div
          className="readmenu-pop"
          ref={popRef}
          role="dialog"
          aria-modal="true"
          aria-label="Preferências de leitura"
        >
          <div className="readmenu-row" role="group" aria-label="Tamanho do texto">
            <button
              type="button"
              className="read-tool"
              disabled={prefs.sizeStep === 0}
              aria-label="Diminuir texto"
              onClick={() => onPrefs(bumpReadingSize(-1))}
            >
              A−
            </button>
            <button
              type="button"
              className="read-tool"
              disabled={prefs.sizeStep === SIZE_STEPS.length - 1}
              aria-label="Aumentar texto"
              onClick={() => onPrefs(bumpReadingSize(1))}
            >
              A+
            </button>
          </div>
          <div className="readmenu-row" role="group" aria-label="Fonte">
            {FONT_OPTIONS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`read-tool${prefs.font === f.id ? ' active' : ''}`}
                aria-pressed={prefs.font === f.id}
                onClick={() => onPrefs(setReadingFont(f.id))}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="readmenu-row" role="group" aria-label="Modo do texto bíblico">
            {LAYOUTS.map((l) => (
              <button
                key={l.id}
                type="button"
                className={`read-tool${prefs.layout === l.id ? ' active' : ''}`}
                aria-pressed={prefs.layout === l.id}
                onClick={() => onPrefs(setReadingLayout(l.id))}
              >
                {l.label}
              </button>
            ))}
          </div>
          <div className="readmenu-row" role="group" aria-label="Espaçamento entre linhas">
            <button
              type="button"
              className="read-tool"
              disabled={prefs.leadingStep === 0}
              aria-label="Diminuir espaçamento"
              onClick={() => onPrefs(bumpReadingLeading(-1))}
            >
              ▼
            </button>
            <button
              type="button"
              className="read-tool"
              disabled={prefs.leadingStep === LEADING_STEPS.length - 1}
              aria-label="Aumentar espaçamento"
              onClick={() => onPrefs(bumpReadingLeading(1))}
            >
              ▲
            </button>
          </div>
          <div className="readmenu-row" role="group" aria-label="Largura do texto">
            {MEASURE_OPTIONS.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`read-tool${prefs.measure === m.id ? ' active' : ''}`}
                aria-pressed={prefs.measure === m.id}
                onClick={() => onPrefs(setReadingMeasure(m.id))}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className="readmenu-row" role="group" aria-label="Tema">
            {TEMAS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`read-tool${themePref === t.id ? ' active' : ''}`}
                aria-pressed={themePref === t.id}
                onClick={() => {
                  setThemePref(t.id)
                  setPref(t.id)
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
