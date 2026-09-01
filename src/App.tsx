import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import Leitura from './pages/Leitura'
import Indice from './pages/Indice'
import Pesquisar from './pages/Pesquisar'
import Entrar from './pages/Entrar'
import { applyReadingPrefs, getReadingPrefs } from './lib/reading-prefs'
import { getStoredTheme, resolveTheme, toggleTheme, type Theme } from './lib/theme'
import { authClient } from './lib/auth-client'
import { initSyncTriggers, signOutLocal } from './lib/sync'
import { useHideOnScroll } from './lib/use-hide-on-scroll'

function Shell() {
  const [theme, setTheme] = useState<Theme>(() => resolveTheme())
  const { data: session } = authClient.useSession()
  const { pathname } = useLocation()
  const headerHidden = useHideOnScroll(pathname.startsWith('/leitura/'))

  useEffect(() => {
    applyReadingPrefs(getReadingPrefs())
  }, [])

  useEffect(() => {
    initSyncTriggers()
  }, [])

  useEffect(() => {
    const onTheme = () => setTheme(resolveTheme())
    window.addEventListener('pericopes-theme', onTheme)
    return () => window.removeEventListener('pericopes-theme', onTheme)
  }, [])

  // Sem preferência gravada, o app segue o sistema em tempo real.
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const onSystem = () => {
      if (getStoredTheme() !== null) return
      const t = resolveTheme()
      document.documentElement.dataset.theme = t
      setTheme(t)
    }
    mq.addEventListener('change', onSystem)
    return () => mq.removeEventListener('change', onSystem)
  }, [])

  return (
    <div className="shell">
      <header className={`top${headerHidden ? ' top-hidden' : ''}`}>
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
        <button
          type="button"
          className="theme-toggle"
          onClick={() => setTheme(toggleTheme())}
          aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
          title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
        >
          {theme === 'dark' ? 'Claro' : 'Escuro'}
        </button>
        <nav>
          <NavLink to="/" end>
            Hoje
          </NavLink>
          <NavLink to="/indice">Índice</NavLink>
          <NavLink to="/pesquisar">Pesquisar</NavLink>
          {session ? (
            <button
              type="button"
              className="linkish nav-conta"
              onClick={() => signOutLocal()}
              title={session.user.email}
            >
              Sair
            </button>
          ) : (
            <NavLink to="/entrar">Entrar</NavLink>
          )}
        </nav>
      </header>
      <main className="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/leitura/:ordem" element={<Leitura />} />
          <Route path="/indice" element={<Indice />} />
          <Route path="/pesquisar" element={<Pesquisar />} />
          <Route path="/entrar" element={<Entrar />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  )
}
