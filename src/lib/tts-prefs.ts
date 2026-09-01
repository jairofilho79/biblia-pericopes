export type Velocidade = 'lenta' | 'normal' | 'rapida'

export const TTS_VOZ_KEY = 'pericopes-tts-voz'
export const TTS_VELOCIDADE_KEY = 'pericopes-tts-velocidade'

/** Sem escolha (ou storage indisponível) vale "automática": o app ranqueia. */
export function getVozPreferida(): string | null {
  try {
    return localStorage.getItem(TTS_VOZ_KEY)
  } catch {
    return null
  }
}

/** Escolha global (não por perícope); `null` volta para a automática. */
export function setVozPreferida(voiceURI: string | null): void {
  try {
    if (voiceURI === null) localStorage.removeItem(TTS_VOZ_KEY)
    else localStorage.setItem(TTS_VOZ_KEY, voiceURI)
  } catch {
    // storage cheio/indisponível nunca quebra a leitura
  }
}

export function getVelocidade(): Velocidade {
  try {
    const v = localStorage.getItem(TTS_VELOCIDADE_KEY)
    return v === 'lenta' || v === 'rapida' ? v : 'normal'
  } catch {
    return 'normal'
  }
}

export function setVelocidade(v: Velocidade): void {
  try {
    localStorage.setItem(TTS_VELOCIDADE_KEY, v)
  } catch {
    // idem: falha de storage é silenciosa
  }
}

/** Sem exageros de propósito: o passo é curto para a fala continuar natural. */
export function rateDaVelocidade(v: Velocidade): number {
  return v === 'lenta' ? 0.85 : v === 'rapida' ? 1.15 : 1
}
