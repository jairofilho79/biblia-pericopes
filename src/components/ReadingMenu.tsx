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
import { usePopover } from '../lib/use-popover'

type Props = {
  prefs: ReadingPrefs
  onPrefs: (p: ReadingPrefs) => void
}

const LAYOUTS: { id: ReadingLayout; label: string }[] = [
  { id: 'corrido', label: 'Corrido' },
  { id: 'blocos', label: 'Blocos' },
]

export default function ReadingMenu({ prefs, onPrefs }: Props) {
  const { open, toggle, rootRef, btnRef, popRef } = usePopover()

  return (
    <div className="readmenu" ref={rootRef}>
      <button
        ref={btnRef}
        type="button"
        className="read-tool readmenu-btn"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={toggle}
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
        </div>
      )}
    </div>
  )
}
