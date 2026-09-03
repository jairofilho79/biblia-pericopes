import { useEffect, useRef, useState } from 'react'
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import Leitura from './pages/Leitura'
import Jornada from './pages/Jornada'
import Indice from './pages/Indice'
import Pesquisar from './pages/Pesquisar'
import Entrar from './pages/Entrar'
import Ajustes from './pages/Ajustes'
import { applyReadingPrefs, getReadingPrefs } from './lib/reading-prefs'
import { getStoredTheme, resolveTheme } from './lib/theme'
import { authClient } from './lib/auth-client'
import { initSyncTriggers, signOutLocal } from './lib/sync'
import { useHideOnScroll } from './lib/use-hide-on-scroll'
import { iniciarPrefetch } from './lib/prefetch-catalogo'
import ThemeMenu from './components/ThemeMenu'

function Shell() {
  const { data: session } = authClient.useSession()
  const { pathname } = useLocation()
  const headerHidden = useHideOnScroll(pathname.startsWith('/leitura/'))
  const [saindo, setSaindo] = useState(false)
  const [erroSaida, setErroSaida] = useState('')
  const erroSaidaTimer = useRef<number | undefined>(undefined)

  async function sair() {
    if (saindo) return
    setSaindo(true)
    setErroSaida('')
    try {
      await signOutLocal()
    } catch {
      // nunca deixar virar rejeição não tratada: o usuário precisa saber
      // (some sozinho depois de um tempo, como o flashAviso da Leitura)
      window.clearTimeout(erroSaidaTimer.current)
      setErroSaida('Não foi possível sair. Tente de novo.')
      erroSaidaTimer.current = window.setTimeout(() => setErroSaida(''), 4000)
    } finally {
      setSaindo(false)
    }
  }

  useEffect(() => {
    applyReadingPrefs(getReadingPrefs())
  }, [])

  useEffect(() => {
    initSyncTriggers()
    iniciarPrefetch()
  }, [])

  // Sem preferência gravada, o app segue o sistema em tempo real. Só o
  // dataset muda: o ThemeMenu mostra a preferência ("Sistema"), não o resolvido.
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
        <ThemeMenu />
        <nav>
          <NavLink to="/jornada">Jornada</NavLink>
          <NavLink to="/indice">Índice</NavLink>
          <NavLink to="/pesquisar">Pesquisar</NavLink>
          {/* Fora do bloco de sessão: reset é local (IndexedDB) e funciona sem
              conta — deslogado, o progresso local É o progresso. Quando o
              menu de Perfil chegar (sessão de jornadas), esta entrada muda de
              lugar para dentro dele. */}
          <NavLink to="/ajustes">Ajustes</NavLink>
          {session ? (
            <span className="nav-conta-wrap">
              <button
                type="button"
                className="linkish nav-conta"
                onClick={() => void sair()}
                disabled={saindo}
                title={session.user.email}
              >
                {saindo ? 'Saindo…' : 'Sair'}
              </button>
              {/* Sempre montado (mesmo padrão de .verse-actions-aviso): uma
                  região aria-live só anuncia mudança de conteúdo se já
                  existir no DOM antes da mudança. Criar o nó já populado
                  no mesmo update não é confiável em leitores de tela. Quem
                  usa toque também não vê `title` (precisa de hover), então
                  a falha precisa aparecer na tela, não só ser lida em voz
                  alta — por isso o texto fica visível, não .sr-only. */}
              <span className="nav-conta-erro" role="status" aria-live="polite">
                {erroSaida}
              </span>
            </span>
          ) : (
            <NavLink to="/entrar">Entrar</NavLink>
          )}
        </nav>
      </header>
      <main className="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/leitura/:ordem" element={<Leitura />} />
          <Route path="/jornada" element={<Jornada />} />
          <Route path="/indice" element={<Indice />} />
          <Route path="/pesquisar" element={<Pesquisar />} />
          <Route path="/entrar" element={<Entrar />} />
          <Route path="/ajustes" element={<Ajustes />} />
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
