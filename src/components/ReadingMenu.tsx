import { useEffect, useRef, useState } from 'react'
import {
  bumpReadingSize,
  FONT_OPTIONS,
  setReadingFont,
  setReadingLayout,
  SIZE_STEPS,
  type ReadingLayout,
  type ReadingPrefs,
} from '../lib/reading-prefs'
import { resolveTheme, toggleTheme, type Theme } from '../lib/theme'

type Props = {
  prefs: ReadingPrefs
  onPrefs: (p: ReadingPrefs) => void
}

const LAYOUTS: { id: ReadingLayout; label: string }[] = [
  { id: 'corrido', label: 'Corrido' },
  { id: 'blocos', label: 'Blocos' },
]

export default function ReadingMenu({ prefs, onPrefs }: Props) {
  const [open, setOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>(() => resolveTheme())
  const rootRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const onTheme = () => setTheme(resolveTheme())
    window.addEventListener('pericopes-theme', onTheme)
    return () => window.removeEventListener('pericopes-theme', onTheme)
  }, [])

  useEffect(() => {
    if (!open) return
    function onDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        btnRef.current?.focus()
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
        <div className="readmenu-pop" role="dialog" aria-label="Preferências de leitura">
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
          <div className="readmenu-row" role="group" aria-label="Tema">
            <button
              type="button"
              className="read-tool"
              onClick={() => toggleTheme()}
            >
              {theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
