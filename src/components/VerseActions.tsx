import { useEffect } from 'react'
import type { DestaqueCor } from '../lib/types'

export const CORES: { id: DestaqueCor; label: string }[] = [
  { id: 'amarelo', label: 'Amarelo' },
  { id: 'verde', label: 'Verde' },
  { id: 'azul', label: 'Azul' },
  { id: 'rosa', label: 'Rosa' },
]

type Props = {
  label: string
  temDestaque: boolean
  aviso: string
  onCopiar: () => void
  onCompartilhar: () => void
  onDestacar: (cor: DestaqueCor) => void
  onRemoverDestaque: () => void
  onAnotar: () => void
  onFechar: () => void
}

export default function VerseActions({
  label,
  temDestaque,
  aviso,
  onCopiar,
  onCompartilhar,
  onDestacar,
  onRemoverDestaque,
  onAnotar,
  onFechar,
}: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onFechar()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onFechar])

  return (
    <div className="verse-actions" role="dialog" aria-label={`Ações para ${label}`}>
      <div className="verse-actions-head">
        <strong className="verse-actions-ref">{label}</strong>
        <button type="button" className="linkish" onClick={onFechar}>
          Fechar
        </button>
      </div>
      <div className="verse-actions-row">
        <button type="button" className="ghost" onClick={onCopiar}>
          Copiar
        </button>
        <button type="button" className="ghost" onClick={onCompartilhar}>
          Compartilhar
        </button>
        <button type="button" className="ghost" onClick={onAnotar}>
          Anotar
        </button>
      </div>
      <div className="verse-actions-row" role="group" aria-label="Destacar">
        {CORES.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`hl-swatch hl-${c.id}`}
            aria-label={`Destacar em ${c.label.toLowerCase()}`}
            onClick={() => onDestacar(c.id)}
          />
        ))}
        {temDestaque && (
          <button type="button" className="linkish" onClick={onRemoverDestaque}>
            Remover
          </button>
        )}
      </div>
      <p className="verse-actions-aviso" role="status" aria-live="polite">
        {aviso}
      </p>
    </div>
  )
}
