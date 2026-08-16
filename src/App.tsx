import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import Home from './pages/Home'
import Leitura from './pages/Leitura'
import Indice from './pages/Indice'
import Pesquisar from './pages/Pesquisar'
import { applyReadingPrefs, getReadingPrefs } from './lib/reading-prefs'
import { applyTheme, resolveTheme, toggleTheme, type Theme } from './lib/theme'

export default function App() {
  const [theme, setTheme] = useState<Theme>(() => resolveTheme())

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    applyReadingPrefs(getReadingPrefs())
  }, [])

  return (
    <BrowserRouter basename="/biblia-pericopes">
      <div className="shell">
        <header className="top">
          <NavLink to="/" className="brand">
            <img
              className="brand-mark"
              src={`${import.meta.env.BASE_URL}brand/logo.png`}
              alt=""
              width={32}
              height={32}
            />
            <span>Perícopes</span>
          </NavLink>
          <nav>
            <NavLink to="/" end>
              Hoje
            </NavLink>
            <NavLink to="/indice">Índice</NavLink>
            <NavLink to="/pesquisar">Pesquisar</NavLink>
            <button
              type="button"
              className="theme-toggle"
              onClick={() => setTheme(toggleTheme())}
              aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
              title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            >
              {theme === 'dark' ? 'Claro' : 'Escuro'}
            </button>
          </nav>
        </header>
        <main className="main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/leitura/:ordem" element={<Leitura />} />
            <Route path="/indice" element={<Indice />} />
            <Route path="/pesquisar" element={<Pesquisar />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
