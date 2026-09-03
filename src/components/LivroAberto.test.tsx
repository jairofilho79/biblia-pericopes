// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import LivroAberto from './LivroAberto'
import { bookByAbbrev } from '../lib/bible-books'
import type { FiltroLeitura } from '../lib/content'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  document.body.removeChild(container)
})

describe('LivroAberto', () => {
  it('zera campos quando o livro muda (sem key do consumidor)', () => {
    const gn = bookByAbbrev('Gn')
    const jo = bookByAbbrev('Jo')
    if (!gn || !jo) throw new Error('Livros não encontrados')

    // Renderizar com Gênesis
    act(() => {
      root.render(
        <LivroAberto
          livro={gn}
          prog={undefined}
          itens={[]}
          concluidas={new Set()}
          filtro={'todos' as FiltroLeitura}
          cap={null}
          onCap={() => {}}
          onTrocar={() => {}}
          onIrParaVersiculo={() => {}}
        />
      )
    })

    // Encontrar o input de capítulo e digitar um número válido
    const inputCap = container.querySelector('input[inputMode="numeric"]') as HTMLInputElement
    if (!inputCap) throw new Error('Input de capítulo não encontrado')
    act(() => {
      inputCap.value = '3'
      inputCap.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(inputCap.value).toBe('3')

    // Re-renderizar com João (mesmo componente, livro diferente)
    act(() => {
      root.render(
        <LivroAberto
          livro={jo}
          prog={undefined}
          itens={[]}
          concluidas={new Set()}
          filtro={'todos' as FiltroLeitura}
          cap={null}
          onCap={() => {}}
          onTrocar={() => {}}
          onIrParaVersiculo={() => {}}
        />
      )
    })

    // Verificar que o campo foi zerado
    const inputCapAfter = container.querySelector('input[inputMode="numeric"]') as HTMLInputElement
    if (!inputCapAfter) throw new Error('Input de capítulo não encontrado após re-render')
    expect(inputCapAfter.value).toBe('')
  })
})
