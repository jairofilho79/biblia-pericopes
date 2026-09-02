import { describe, expect, it } from 'vitest'
import { cabecalhoContentRange, chaveAudio } from './audio'

describe('chaveAudio', () => {
  it('aceita voz/ordem.m4a', () => {
    expect(chaveAudio('nt-ml/1600.m4a')).toBe('nt-ml/1600.m4a')
  })

  it('rejeita travessia de caminho', () => {
    expect(chaveAudio('../segredo.m4a')).toBeNull()
    expect(chaveAudio('nt-ml/../1600.m4a')).toBeNull()
  })

  it('rejeita nomes fora do formato', () => {
    expect(chaveAudio('nt-ml/abc.m4a')).toBeNull()
    expect(chaveAudio('nt-ml/1600.mp3')).toBeNull()
    expect(chaveAudio('NT-ML/1600.m4a')).toBeNull()
    expect(chaveAudio('nt-ml/1600.m4a/extra')).toBeNull()
    expect(chaveAudio('')).toBeNull()
  })
})

describe('cabecalhoContentRange', () => {
  it('offset + length', () => {
    expect(cabecalhoContentRange({ offset: 0, length: 100 }, 1000)).toBe('bytes 0-99/1000')
  })

  it('offset sem length vai até o fim', () => {
    expect(cabecalhoContentRange({ offset: 900 }, 1000)).toBe('bytes 900-999/1000')
  })

  it('suffix pega o rabo do arquivo', () => {
    expect(cabecalhoContentRange({ suffix: 100 }, 1000)).toBe('bytes 900-999/1000')
  })

  it('sem range não há cabeçalho', () => {
    expect(cabecalhoContentRange(undefined, 1000)).toBeNull()
  })
})
