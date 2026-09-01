// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import { clearReadingPosition, getReadingPosition, setReadingPosition } from './reading-position'
import { installLocalStorageMock } from './testing/storage-mock'

installLocalStorageMock()

describe('reading-position', () => {
  beforeEach(() => localStorage.clear())

  it('salva e lê por perícope', () => {
    setReadingPosition(12, 340.7)
    expect(getReadingPosition(12)).toBe(341)
    expect(getReadingPosition(13)).toBeNull()
  })

  it('clear remove só a perícope pedida', () => {
    setReadingPosition(1, 100)
    setReadingPosition(2, 200)
    clearReadingPosition(1)
    expect(getReadingPosition(1)).toBeNull()
    expect(getReadingPosition(2)).toBe(200)
  })

  it('JSON corrompido é tratado como vazio', () => {
    localStorage.setItem('pericopes-reading-pos', '{nope')
    expect(getReadingPosition(1)).toBeNull()
    setReadingPosition(1, 50)
    expect(getReadingPosition(1)).toBe(50)
  })

  it('valores negativos são normalizados para 0', () => {
    setReadingPosition(3, -20)
    expect(getReadingPosition(3)).toBe(0)
  })
})
