// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import { getStoredTheme, getThemePref, resolveTheme, setThemePref, toggleTheme } from './theme'
import { installLocalStorageMock } from './testing/storage-mock'

installLocalStorageMock()

describe('theme', () => {
  beforeEach(() => {
    localStorage.clear()
    delete document.documentElement.dataset.theme
  })

  it('sem chave, a preferência é seguir o sistema', () => {
    expect(getStoredTheme()).toBeNull()
    expect(getThemePref()).toBe('system')
    // happy-dom não prefere dark: o resolvido é claro
    expect(resolveTheme()).toBe('light')
  })

  it('setThemePref("sepia") grava, aplica e vira a preferência', () => {
    expect(setThemePref('sepia')).toBe('sepia')
    expect(localStorage.getItem('pericopes-theme')).toBe('sepia')
    expect(document.documentElement.dataset.theme).toBe('sepia')
    expect(getThemePref()).toBe('sepia')
    expect(resolveTheme()).toBe('sepia')
  })

  it('setThemePref("system") remove a chave e aplica o resolvido', () => {
    setThemePref('dark')
    expect(setThemePref('system')).toBe('light')
    expect(localStorage.getItem('pericopes-theme')).toBeNull()
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(getThemePref()).toBe('system')
  })

  it('valor armazenado desconhecido é ignorado', () => {
    localStorage.setItem('pericopes-theme', 'roxo')
    expect(getStoredTheme()).toBeNull()
    expect(getThemePref()).toBe('system')
  })

  it('toggleTheme a partir de sépia vai para escuro', () => {
    setThemePref('sepia')
    expect(toggleTheme()).toBe('dark')
    expect(getThemePref()).toBe('dark')
  })
})
