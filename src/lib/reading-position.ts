const KEY = 'pericopes-reading-pos'

type Store = Record<string, { y: number }>

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Store
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function write(store: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(store))
  } catch {
    // storage cheio/indisponível nunca quebra a leitura
  }
}

export function getReadingPosition(ordem: number): number | null {
  const entry = read()[String(ordem)]
  return entry && typeof entry.y === 'number' && Number.isFinite(entry.y) ? entry.y : null
}

export function setReadingPosition(ordem: number, y: number) {
  const store = read()
  store[String(ordem)] = { y: Math.max(0, Math.round(y)) }
  write(store)
}

export function clearReadingPosition(ordem: number) {
  const store = read()
  delete store[String(ordem)]
  write(store)
}
