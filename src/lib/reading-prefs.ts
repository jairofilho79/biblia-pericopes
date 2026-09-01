const KEY = 'pericopes-reading'

export type ReadingFont = 'serif' | 'literata' | 'sans'

export type ReadingLayout = 'corrido' | 'blocos'

export type ReadingPrefs = {
  sizeStep: number
  font: ReadingFont
  layout: ReadingLayout
}

/** rem steps for biblical + prose text */
export const SIZE_STEPS = [0.95, 1.05, 1.15, 1.28, 1.42, 1.58] as const

export const FONT_OPTIONS: { id: ReadingFont; label: string; stack: string }[] = [
  { id: 'serif', label: 'Serif', stack: "'Source Serif 4', Georgia, serif" },
  { id: 'literata', label: 'Literata', stack: "'Literata', Georgia, serif" },
  { id: 'sans', label: 'Sans', stack: "'Source Sans 3', 'DM Sans', system-ui, sans-serif" },
]

const DEFAULTS: ReadingPrefs = { sizeStep: 2, font: 'serif', layout: 'corrido' }

export function getReadingPrefs(): ReadingPrefs {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULTS }
    const parsed = JSON.parse(raw) as Partial<ReadingPrefs>
    const sizeStep =
      typeof parsed.sizeStep === 'number' && parsed.sizeStep >= 0 && parsed.sizeStep < SIZE_STEPS.length
        ? parsed.sizeStep
        : DEFAULTS.sizeStep
    const font = FONT_OPTIONS.some((f) => f.id === parsed.font) ? (parsed.font as ReadingFont) : DEFAULTS.font
    const layout: ReadingLayout = parsed.layout === 'blocos' ? 'blocos' : 'corrido'
    return { sizeStep, font, layout }
  } catch {
    return { ...DEFAULTS }
  }
}

export function applyReadingPrefs(prefs: ReadingPrefs) {
  const root = document.documentElement
  root.style.setProperty('--read-size', `${SIZE_STEPS[prefs.sizeStep]}rem`)
  const stack = FONT_OPTIONS.find((f) => f.id === prefs.font)?.stack ?? FONT_OPTIONS[0].stack
  root.style.setProperty('--read-font', stack)
  localStorage.setItem(KEY, JSON.stringify(prefs))
}

export function setReadingSizeStep(step: number): ReadingPrefs {
  const prefs = getReadingPrefs()
  prefs.sizeStep = Math.max(0, Math.min(SIZE_STEPS.length - 1, step))
  applyReadingPrefs(prefs)
  return prefs
}

export function bumpReadingSize(delta: number): ReadingPrefs {
  return setReadingSizeStep(getReadingPrefs().sizeStep + delta)
}

export function setReadingFont(font: ReadingFont): ReadingPrefs {
  const prefs = getReadingPrefs()
  prefs.font = font
  applyReadingPrefs(prefs)
  return prefs
}

export function setReadingLayout(layout: ReadingLayout): ReadingPrefs {
  const prefs = getReadingPrefs()
  prefs.layout = layout
  applyReadingPrefs(prefs)
  return prefs
}
