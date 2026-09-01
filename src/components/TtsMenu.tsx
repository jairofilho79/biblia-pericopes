import { useEffect, useRef, useState } from 'react'
import { falarAmostra, listarVozesPt, ttsSupported } from '../lib/tts'
import {
  getVelocidade,
  getVozPreferida,
  rateDaVelocidade,
  setVelocidade,
  setVozPreferida,
  type Velocidade,
} from '../lib/tts-prefs'

const VELOCIDADES: { id: Velocidade; label: string }[] = [
  { id: 'lenta', label: 'Lenta' },
  { id: 'normal', label: 'Normal' },
  { id: 'rapida', label: 'Rápida' },
]

/**
 * Ajustes da leitura em voz alta: voz (com prévia) e velocidade. As escolhas
 * vão direto para o storage — o controller as lê a cada play, então valem na
 * próxima fala sem o menu precisar avisar ninguém.
 */
export default function TtsMenu() {
  const [open, setOpen] = useState(false)
  const [voz, setVoz] = useState<string | null>(() => getVozPreferida())
  const [vel, setVel] = useState<Velocidade>(() => getVelocidade())
  const [vozes, setVozes] = useState<SpeechSynthesisVoice[]>([])
  const rootRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // A lista só importa com o menu aberto — e chega tarde no iOS/Chrome, daí
    // o listener de voiceschanged enquanto o menu estiver na tela.
    if (!open || !ttsSupported()) return
    const s = window.speechSynthesis
    const atualizar = () => setVozes(listarVozesPt(s.getVoices()))
    atualizar()
    s.addEventListener('voiceschanged', atualizar)
    return () => s.removeEventListener('voiceschanged', atualizar)
  }, [open])

  useEffect(() => {
    if (!open) return
    const pop = popRef.current
    pop?.querySelector<HTMLElement>('button:not([disabled]), select')?.focus()

    function fechar() {
      setOpen(false)
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
      const focaveis = [...pop.querySelectorAll<HTMLElement>('button:not([disabled]), select')]
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
        className="read-tool"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Ajustes da leitura em voz alta"
        title="Voz e velocidade"
        onClick={() => setOpen((v) => !v)}
      >
        ⚙
      </button>
      {open && (
        <div
          className="readmenu-pop ttsmenu-pop"
          ref={popRef}
          role="dialog"
          aria-modal="true"
          aria-label="Ajustes da leitura em voz alta"
        >
          <div className="readmenu-row ttsmenu-voz-row">
            <label className="ttsmenu-label" htmlFor="ttsmenu-voz">
              Voz
            </label>
            <select
              id="ttsmenu-voz"
              className="ttsmenu-voz"
              value={voz ?? ''}
              onChange={(e) => {
                const uri = e.target.value || null
                setVozPreferida(uri)
                setVoz(uri)
              }}
            >
              <option value="">Automática</option>
              {vozes.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="read-tool"
              aria-label="Ouvir uma amostra da voz escolhida"
              onClick={() => falarAmostra(voz, rateDaVelocidade(vel))}
            >
              🔊 Prévia
            </button>
          </div>
          <div className="readmenu-row" role="group" aria-label="Velocidade da leitura">
            {VELOCIDADES.map((v) => (
              <button
                key={v.id}
                type="button"
                className={`read-tool${vel === v.id ? ' active' : ''}`}
                aria-pressed={vel === v.id}
                onClick={() => {
                  setVelocidade(v.id)
                  setVel(v.id)
                }}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
