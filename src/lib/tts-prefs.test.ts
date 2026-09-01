// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  getVelocidade,
  getVozPreferida,
  rateDaVelocidade,
  setVelocidade,
  setVozPreferida,
  TTS_VELOCIDADE_KEY,
  TTS_VOZ_KEY,
} from './tts-prefs'
import { installLocalStorageMock } from './testing/storage-mock'

installLocalStorageMock()

describe('tts-prefs: voz', () => {
  beforeEach(() => localStorage.clear())

  it('sem escolha gravada, a voz é automática (null)', () => {
    expect(getVozPreferida()).toBeNull()
  })

  it('gravar e ler a voz preferida persiste o voiceURI', () => {
    setVozPreferida('com.apple.voice.premium.pt-BR.Luciana')
    expect(getVozPreferida()).toBe('com.apple.voice.premium.pt-BR.Luciana')
  })

  it('voltar para automática limpa a chave do storage', () => {
    setVozPreferida('qualquer')
    setVozPreferida(null)
    expect(getVozPreferida()).toBeNull()
    expect(localStorage.getItem(TTS_VOZ_KEY)).toBeNull()
  })
})

describe('tts-prefs: velocidade', () => {
  beforeEach(() => localStorage.clear())

  it('sem escolha gravada, a velocidade é normal', () => {
    expect(getVelocidade()).toBe('normal')
  })

  it('gravar e ler cada velocidade persiste a escolha', () => {
    setVelocidade('lenta')
    expect(getVelocidade()).toBe('lenta')
    setVelocidade('rapida')
    expect(getVelocidade()).toBe('rapida')
    setVelocidade('normal')
    expect(getVelocidade()).toBe('normal')
  })

  it('lixo no storage cai no padrão normal', () => {
    localStorage.setItem(TTS_VELOCIDADE_KEY, 'turbo')
    expect(getVelocidade()).toBe('normal')
  })

  it('cada velocidade mapeia para um rate moderado, sem exageros', () => {
    expect(rateDaVelocidade('lenta')).toBe(0.85)
    expect(rateDaVelocidade('normal')).toBe(1)
    expect(rateDaVelocidade('rapida')).toBe(1.15)
  })
})
