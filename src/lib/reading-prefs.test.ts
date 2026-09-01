// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  bumpReadingLeading,
  getReadingPrefs,
  LEADING_STEPS,
  setReadingLayout,
  setReadingMeasure,
} from './reading-prefs'
import { installLocalStorageMock } from './testing/storage-mock'

installLocalStorageMock()

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

describe('reading-prefs espaçamento e medida', () => {
  beforeEach(() => localStorage.clear())

  it('padrões são leadingStep 1 e medida média', () => {
    expect(getReadingPrefs()).toMatchObject({ leadingStep: 1, measure: 'media' })
  })

  it('prefs antigas sem os campos novos recebem os padrões', () => {
    localStorage.setItem('pericopes-reading', JSON.stringify({ sizeStep: 3, font: 'sans' }))
    expect(getReadingPrefs()).toMatchObject({
      sizeStep: 3,
      font: 'sans',
      layout: 'corrido',
      leadingStep: 1,
      measure: 'media',
    })
  })

  it('bumpReadingLeading anda nos passos e trava nas pontas', () => {
    expect(bumpReadingLeading(1).leadingStep).toBe(2)
    expect(bumpReadingLeading(-1).leadingStep).toBe(1)
    expect(bumpReadingLeading(-5).leadingStep).toBe(0)
    expect(bumpReadingLeading(99).leadingStep).toBe(LEADING_STEPS.length - 1)
  })

  it('setReadingMeasure persiste, aplica as variáveis CSS e valor inválido volta ao padrão', () => {
    setReadingMeasure('larga')
    expect(getReadingPrefs().measure).toBe('larga')
    expect(document.documentElement.style.getPropertyValue('--read-measure')).toBe('46rem')
    expect(document.documentElement.style.getPropertyValue('--read-leading')).toBe('1.65')

    localStorage.setItem('pericopes-reading', JSON.stringify({ measure: 'gigante', leadingStep: 9 }))
    expect(getReadingPrefs()).toMatchObject({ measure: 'media', leadingStep: 1 })
  })
})
