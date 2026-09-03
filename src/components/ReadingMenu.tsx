import { usePopover } from '../lib/use-popover'
import LeituraPrefs from './LeituraPrefs'

export default function ReadingMenu() {
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
          <LeituraPrefs />
        </div>
      )}
    </div>
  )
}
