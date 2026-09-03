import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import Leitura from './pages/Leitura'
import Indice from './pages/Indice'
import Pesquisar from './pages/Pesquisar'
import Entrar from './pages/Entrar'
import { applyReadingPrefs, getReadingPrefs } from './lib/reading-prefs'
import { getStoredTheme, resolveTheme } from './lib/theme'
import { initSyncTriggers } from './lib/sync'
import { useHideOnScroll } from './lib/use-hide-on-scroll'
import { iniciarPrefetch } from './lib/prefetch-catalogo'
import PerfilMenu from './components/PerfilMenu'

function Shell() {
  const { pathname } = useLocation()
  const [perfilAberto, setPerfilAberto] = useState(false)
  // Com o menu aberto o header fica travado: rolar levaria o popover embora.
  const headerHidden = useHideOnScroll(pathname.startsWith('/leitura/') && !perfilAberto)

  useEffect(() => {
    applyReadingPrefs(getReadingPrefs())
  }, [])

  useEffect(() => {
    initSyncTriggers()
    iniciarPrefetch()
  }, [])

  // Sem preferência gravada, o app segue o sistema em tempo real. Só o
  // dataset muda: o Perfil mostra a preferência ("Sistema"), não o resolvido.
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const onSystem = () => {
      if (getStoredTheme() !== null) return
      document.documentElement.dataset.theme = resolveTheme()
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
        {/* "Hoje" saiu: a marca à esquerda já é o mesmo <NavLink to="/">. */}
        <nav>
          <NavLink to="/indice">Índice</NavLink>
          <NavLink to="/pesquisar">Pesquisar</NavLink>
          <PerfilMenu onOpenChange={setPerfilAberto} />
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
