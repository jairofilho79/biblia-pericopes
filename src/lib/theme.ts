const KEY = 'pericopes-theme'

export type Theme = 'light' | 'dark' | 'sepia'

/** Preferência armazenada; 'system' = nenhuma chave gravada. */
export type ThemePref = Theme | 'system'

const TEMAS: Theme[] = ['light', 'dark', 'sepia']

export function getStoredTheme(): Theme | null {
  try {
    const v = localStorage.getItem(KEY)
    return TEMAS.includes(v as Theme) ? (v as Theme) : null
  } catch {
    return null
  }
}

export function getThemePref(): ThemePref {
  return getStoredTheme() ?? 'system'
}

export function resolveTheme(): Theme {
  return getStoredTheme() ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
}

/** Ponto único de aplicação: dataset + persistência + evento de resync. */
export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    // storage cheio/indisponível nunca quebra a leitura
  }
  window.dispatchEvent(new Event('pericopes-theme'))
}

export function setThemePref(pref: ThemePref): Theme {
  if (pref !== 'system') {
    applyTheme(pref)
    return pref
  }
  // 'system' é a AUSÊNCIA da chave: gravar o resolvido aqui congelaria o tema
  // e o app deixaria de acompanhar o sistema.
  try {
    localStorage.removeItem(KEY)
  } catch {
    // idem
  }
  const resolvido = resolveTheme()
  document.documentElement.dataset.theme = resolvido
  window.dispatchEvent(new Event('pericopes-theme'))
  return resolvido
}
