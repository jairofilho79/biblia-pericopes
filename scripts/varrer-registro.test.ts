import { describe, it, expect } from 'vitest'
import { varrer } from './varrer-registro.ts'

const material = (extra: Record<string, unknown>) => ({
  ordem: 1,
  titulo_pericope_pt: 'Um título digno',
  contexto_historico_literario: 'Prosa em registro correto sobre a passagem.',
  resenha: 'Prosa em registro correto sobre a passagem.',
  perguntas_reflexao: ['Uma pergunta.', 'Outra pergunta.'],
  topicos_pregar: 'Linha de raciocínio\n- a **um**',
  ...extra,
})

describe('varrer', () => {
  it('não acha nada em material bem escrito', () => {
    expect(varrer(material({}))).toEqual([])
  })

  it('pega o animal do sacrifício reduzido a "bicho" — caso real de Levítico 1', () => {
    const r = varrer(material({ resenha: 'Ela mesma põe a mão na cabeça do bicho.' }))
    expect(r).toHaveLength(1)
    expect(r[0].motivo).toMatch(/bicho/)
    expect(r[0].campo).toBe('resenha')
  })

  it('pega as quatro construções que um subagent corrigiu sozinho', () => {
    for (const frase of [
      'o bicho do mato que fugia',
      'o texto não maquia o custo do erro',
      'não se trata de chutar um culpado',
      'e ali ele descontou a mão no servo',
    ]) {
      expect(varrer(material({ resenha: frase })).length).toBeGreaterThan(0)
    }
  })

  it('varre também o título e as perguntas, não só a prosa', () => {
    expect(varrer(material({ titulo_pericope_pt: 'A treta de Caim' }))[0].campo).toBe('titulo_pericope_pt')
    expect(varrer(material({ perguntas_reflexao: ['Você já deu um jeito assim?', 'E daí?'] }))[0].campo).toBe(
      'perguntas_reflexao',
    )
  })

  it('devolve o trecho em volta, para dar para julgar sem abrir o arquivo', () => {
    const r = varrer(material({ resenha: 'Antes disso tudo, ele resolveu calar a boca do acusador ali.' }))
    expect(r[0].trecho).toContain('calar a boca')
    expect(r[0].trecho).toContain('acusador')
  })

  it('não confunde gíria com o texto bíblico: "de boa farinha" e "boa velhice" passam', () => {
    expect(varrer(material({ resenha: 'Manda preparar três medidas de boa farinha para os visitantes.' }))).toEqual([])
    expect(varrer(material({ resenha: 'O texto chama isso de boa velhice, e não de sobrevida.' }))).toEqual([])
  })

  it('mas pega "de boa" quando é gíria mesmo — fechando a oração', () => {
    expect(varrer(material({ resenha: 'Ele seguiu de boa, sem pensar duas vezes.' })).length).toBe(1)
  })

  it('acha mais de uma suspeita no mesmo campo', () => {
    expect(varrer(material({ resenha: 'A galera fez uma treta e ninguém deu um jeito.' })).length).toBeGreaterThanOrEqual(2)
  })
})
