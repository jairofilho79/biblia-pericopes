import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import '@fontsource-variable/literata'
import '@fontsource-variable/source-serif-4'
import '@fontsource-variable/source-sans-3'
import '@fontsource-variable/fraunces'
import '@fontsource-variable/dm-sans'
import './styles/app.css'

registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
