// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import { getReadingPrefs, setReadingLayout } from './reading-prefs'

describe('reading-prefs layout', () => {
  beforeEach(() => localStorage.clear())

  it('padrão é corrido', () => {
    expect(getReadingPrefs().layout).toBe('corrido')
  })

  it('prefs antigas sem layout recebem corrido', () => {
    localStorage.setItem('pericopes-reading', JSON.stringify({ sizeStep: 3, font: 'sans' }))
    const prefs = getReadingPrefs()
    expect(prefs).toMatchObject({ sizeStep: 3, font: 'sans', layout: 'corrido' })
  })

  it('setReadingLayout persiste e valor inválido volta ao padrão', () => {
    setReadingLayout('blocos')
    expect(getReadingPrefs().layout).toBe('blocos')
    localStorage.setItem('pericopes-reading', JSON.stringify({ layout: 'zigue' }))
    expect(getReadingPrefs().layout).toBe('corrido')
  })
})
