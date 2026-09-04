import { describe, it, expect } from 'vitest'
import { removerColchetes } from './blivre-texto.ts'

describe('removerColchetes', () => {
  it('devolve intacto o versículo que não tem colchete', () => {
    const t = 'O SENHOR é meu pastor, nada me faltará.'
    expect(removerColchetes(t)).toBe(t)
  })

  it('tira os colchetes e mantém a palavra suprida', () => {
    expect(removerColchetes('Deus [é] nosso refúgio e força')).toBe('Deus é nosso refúgio e força')
  })

  it('cola o sufixo hifenizado na palavra anterior', () => {
    // PSA 20:9 — "Salva [-nos] ,SENHOR!"
    expect(removerColchetes('Salva [-nos] ,SENHOR!')).toBe('Salva-nos, SENHOR!')
    // PSA 135:1 — "louvai [-o] vós"
    expect(removerColchetes('louvai [-o] vós, servos do SENHOR')).toBe(
      'louvai-o vós, servos do SENHOR',
    )
  })

  it('tira o espaço que sobra antes da pontuação', () => {
    // LEV 24:5
    expect(removerColchetes('cada torta será de dois décimos [de efa] .')).toBe(
      'cada torta será de dois décimos de efa.',
    )
    // 1CH 4:13
    expect(removerColchetes('Os filhos de Otniel: Hatate [e Meonotai] .')).toBe(
      'Os filhos de Otniel: Hatate e Meonotai.',
    )
  })

  it('funciona com o colchete abrindo o versículo', () => {
    // DEU 32:4
    expect(removerColchetes('[Ele é] a Rocha, sua obra é perfeita')).toBe(
      'Ele é a Rocha, sua obra é perfeita',
    )
  })

  it('preserva a pontuação que estava DENTRO do colchete', () => {
    // PSA 25:13
    expect(removerColchetes('sua semente [isto é, sua descendência] possuirá a terra')).toBe(
      'sua semente isto é, sua descendência possuirá a terra',
    )
  })

  it('trata mais de um colchete no mesmo versículo', () => {
    expect(removerColchetes('Olha [para mim, e] ouve-me; ilumina [os] meus olhos')).toBe(
      'Olha para mim, e ouve-me; ilumina os meus olhos',
    )
  })

  it('não deixa espaço duplo nem sobra nas pontas', () => {
    expect(removerColchetes('  Agradecei ao SENHOR, porque sua bondade [dura] para sempre.  ')).toBe(
      'Agradecei ao SENHOR, porque sua bondade dura para sempre.',
    )
  })
})
