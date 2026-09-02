import { useEffect, useState } from 'react'
import { getThemePref, setThemePref, type ThemePref } from '../lib/theme'
import { usePopover } from '../lib/use-popover'

const TEMAS: { id: ThemePref; label: string }[] = [
  { id: 'system', label: 'Sistema' },
  { id: 'light', label: 'Claro' },
  { id: 'sepia', label: 'Sépia' },
  { id: 'dark', label: 'Escuro' },
]

/** Seletor de tema do header: o gatilho mostra a preferência atual, não a próxima. */
export default function ThemeMenu() {
  const [pref, setPref] = useState<ThemePref>(() => getThemePref())
  const { open, toggle, rootRef, btnRef, popRef } = usePopover()

  useEffect(() => {
    const onTheme = () => setPref(getThemePref())
    window.addEventListener('pericopes-theme', onTheme)
    return () => window.removeEventListener('pericopes-theme', onTheme)
  }, [])

  const atual = TEMAS.find((t) => t.id === pref) ?? TEMAS[0]

  return (
    <div className="theme-menu" ref={rootRef}>
      <button
        ref={btnRef}
        type="button"
        className="theme-toggle"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Tema: ${atual.label}. Mudar tema`}
        title="Mudar tema"
        onClick={toggle}
      >
        {atual.label}
      </button>
      {open && (
        <div
          className="readmenu-pop theme-pop"
          ref={popRef}
          role="dialog"
          aria-modal="true"
          aria-label="Tema"
        >
          <div className="readmenu-row" role="group" aria-label="Tema">
            {TEMAS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`read-tool${pref === t.id ? ' active' : ''}`}
                aria-pressed={pref === t.id}
                onClick={() => setThemePref(t.id)}
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
