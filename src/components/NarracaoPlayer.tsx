import { useEffect, useState } from 'react'

/**
 * Narração pré-gerada (voz clonada, servida do R2 via /api/audio). Só aparece
 * quando o áudio da perícope existe — um HEAD barato decide; enquanto o corpus
 * é gerado aos poucos, as perícopes sem narração seguem só com o TTS do
 * navegador logo abaixo.
 */
export default function NarracaoPlayer({ ordem }: { ordem: number }) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    const url = `/api/audio/nt-ml/${ordem}.m4a`
    let vivo = true
    setSrc(null)
    fetch(url, { method: 'HEAD' })
      .then((r) => {
        if (vivo && r.ok) setSrc(url)
      })
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [ordem])

  if (!src) return null
  return (
    <div className="narracao">
      <span className="narracao-rotulo">🎙️ Narração</span>
      <audio controls preload="none" src={src} aria-label="Narração da perícope" />
    </div>
  )
}
