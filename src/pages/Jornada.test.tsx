// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Jornada as JornadaType, PericopeIndex, Progresso } from '../lib/types'

// Sessão controlada pelo teste: `sessao` null = deslogado.
let sessao: { user: { id: string } } | null = { user: { id: 'u1' } }
vi.mock('../lib/auth-client', () => ({
  authClient: { useSession: () => ({ data: sessao }) },
}))

// loadIndex NUNCA lê public/data/index.json em teste (ausente na CI): um
// catálogo mínimo em memória, no mesmo espírito de jornadas.test.ts.
function peri(ordem: number, livro: string, abbrev: string, cap = 1): PericopeIndex {
  return {
    ordem,
    livro,
    abbrev,
    capitulo_inicio: cap,
    versiculo_inicio: 1,
    capitulo_fim: cap,
    versiculo_fim: 10,
    titulo_pericope_pt: `${livro} ${cap}`,
    minutos: 3,
  }
}
const INDICE: PericopeIndex[] = [peri(0, 'Gênesis', 'Gn', 1), peri(1, 'Gênesis', 'Gn', 2)]
vi.mock('../lib/content', () => ({
  loadIndex: () => Promise.resolve(INDICE),
}))

const getJornadaCorrente = vi.fn<() => Promise<JornadaType | undefined>>()
const listJornadas = vi.fn<() => Promise<JornadaType[]>>()
const listAllProgresso = vi.fn<() => Promise<Progresso[]>>()
const atualizarJornada = vi.fn<(id: string, patch: Partial<JornadaType>) => Promise<JornadaType>>()
vi.mock('../lib/user-db', () => ({
  getJornadaCorrente: () => getJornadaCorrente(),
  listJornadas: () => listJornadas(),
  listAllProgresso: () => listAllProgresso(),
  atualizarJornada: (id: string, patch: Partial<JornadaType>) => atualizarJornada(id, patch),
}))

import Jornada from './Jornada'

function jornada(over: Partial<JornadaType> = {}): JornadaType {
  return {
    id: 'j1',
    nome: 'Gênesis',
    tipo: 'livro',
    escopo: 'Gênesis',
    inicioOrdem: 0,
    contaDesde: null,
    criadoEm: '2026-01-01T00:00:00.000Z',
    atualizadoEm: '2026-01-01T00:00:00.000Z',
    arquivadaEm: null,
    concluidaEm: null,
    ...over,
  }
}

let root: Root
let host: HTMLDivElement

function montar() {
  act(() => {
    root.render(
      <MemoryRouter>
        <Jornada />
      </MemoryRouter>,
    )
  })
}

// Deixa as promises encadeadas em carregar() resolverem antes de inspecionar o DOM.
async function assentar() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  })
}

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  sessao = { user: { id: 'u1' } }
  getJornadaCorrente.mockReset().mockResolvedValue(undefined)
  listJornadas.mockReset().mockResolvedValue([])
  listAllProgresso.mockReset().mockResolvedValue([])
  atualizarJornada.mockReset().mockResolvedValue(jornada())
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

describe('Jornada — sem sessão', () => {
  it('mostra só o convite, sem consultar o IndexedDB', async () => {
    sessao = null
    montar()
    await assentar()
    expect(host.textContent).toContain('Entre')
    expect(host.querySelector('a[href="/entrar"]')).not.toBeNull()
    expect(getJornadaCorrente).not.toHaveBeenCalled()
  })
})

describe('Jornada — logado, sem jornada corrente', () => {
  it('mostra "nenhuma jornada ainda" e o link para o passo 1', async () => {
    montar()
    await assentar()
    expect(host.textContent).toContain('Nenhuma jornada ainda')
    const botao = [...host.querySelectorAll('button')].find((b) => b.textContent === 'Comece uma jornada')
    expect(botao).not.toBeUndefined()
    act(() => botao!.click())
    expect(host.textContent).toContain('próxima etapa')
  })
})

describe('Jornada — logado, com jornada corrente', () => {
  it('mostra nome, progresso e barra', async () => {
    getJornadaCorrente.mockResolvedValue(jornada({ nome: 'Minha jornada' }))
    listAllProgresso.mockResolvedValue([{ pericopeOrdem: 0, status: 'concluido', atualizadoEm: '2026-02-01T00:00:00.000Z' }])
    montar()
    await assentar()
    expect(host.textContent).toContain('Minha jornada')
    expect(host.textContent).toContain('1 de 2')
    const fill = host.querySelector('.book-progress-fill') as HTMLElement | null
    expect(fill?.style.width).toBe('50%')
  })

  it('Reiniciar pede confirmação inline e só então grava o patch', async () => {
    getJornadaCorrente.mockResolvedValue(jornada({ id: 'j9' }))
    montar()
    await assentar()
    const reiniciar = [...host.querySelectorAll('button')].find((b) => b.textContent === 'Reiniciar')!
    act(() => reiniciar.click())
    expect(atualizarJornada).not.toHaveBeenCalled()
    expect(host.textContent).toContain('do zero?')

    const sim = [...host.querySelectorAll('button')].find((b) => b.textContent === 'Sim')!
    await act(async () => sim.click())
    expect(atualizarJornada).toHaveBeenCalledTimes(1)
    const [id, patch] = atualizarJornada.mock.calls[0]
    expect(id).toBe('j9')
    expect(patch.concluidaEm).toBeNull()
    expect(typeof patch.contaDesde).toBe('string')
  })

  it('Cancelar na confirmação não grava nada', async () => {
    getJornadaCorrente.mockResolvedValue(jornada({ id: 'j9' }))
    montar()
    await assentar()
    const encerrar = [...host.querySelectorAll('button')].find((b) => b.textContent === 'Encerrar')!
    act(() => encerrar.click())
    const cancelar = [...host.querySelectorAll('button')].find((b) => b.textContent === 'Cancelar')!
    act(() => cancelar.click())
    expect(atualizarJornada).not.toHaveBeenCalled()
    expect(host.textContent).not.toContain('Encerrar esta jornada?')
  })

  it('Encerrar grava arquivadaEm e nada mais', async () => {
    getJornadaCorrente.mockResolvedValue(jornada({ id: 'j9' }))
    montar()
    await assentar()
    const encerrar = [...host.querySelectorAll('button')].find((b) => b.textContent === 'Encerrar')!
    act(() => encerrar.click())
    const sim = [...host.querySelectorAll('button')].find((b) => b.textContent === 'Sim')!
    await act(async () => sim.click())
    const [, patch] = atualizarJornada.mock.calls[0]
    expect(Object.keys(patch)).toEqual(['arquivadaEm'])
    expect(typeof patch.arquivadaEm).toBe('string')
  })
})

describe('Jornada — histórico', () => {
  it('lista as jornadas arquivadas com o progresso final, e a corrente não aparece ali', async () => {
    const corrente = jornada({ id: 'c', nome: 'Corrente' })
    const antiga = jornada({
      id: 'a',
      nome: 'Antiga',
      arquivadaEm: '2026-03-01T00:00:00.000Z',
      concluidaEm: '2026-03-01T00:00:00.000Z',
    })
    getJornadaCorrente.mockResolvedValue(corrente)
    listJornadas.mockResolvedValue([corrente, antiga])
    montar()
    await assentar()
    expect(host.textContent).toContain('Anteriores')
    expect(host.textContent).toContain('Antiga')
    // "Corrente" aparece só uma vez, no card do topo — não duplicada no histórico.
    const ocorrencias = host.textContent?.split('Corrente').length ?? 0
    expect(ocorrencias - 1).toBe(1)
  })

  it('sem histórico, a seção "Anteriores" não aparece', async () => {
    montar()
    await assentar()
    expect(host.textContent).not.toContain('Anteriores')
  })
})
