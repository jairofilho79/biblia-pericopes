export type Pericope = {
  ordem: number
  livro: string
  abbrev: string
  capitulo_inicio: number
  versiculo_inicio: number
  capitulo_fim: number
  versiculo_fim: number
  titulo_pericope_pt: string
  texto_naa: string
  /** O que saber ANTES de ler o texto */
  contexto_historico_literario: string
  /** Apanhado do que aconteceu e por quê; Deus/Jesus só quando couber com naturalidade */
  resenha: string
  perguntas_reflexao: string[]
  /** Outline curto para o pregador; markdown com **negrito** */
  topicos_pregar?: string
}

export type ProgressoStatus = 'nao_iniciado' | 'em_andamento' | 'concluido'

export type Progresso = {
  pericopeOrdem: number
  status: ProgressoStatus
  atualizadoEm: string
}

export type Anotacao = {
  id: string
  pericopeOrdem: number
  texto: string
  criadoEm: string
  atualizadoEm: string
}

export type DestaqueCor = 'amarelo' | 'verde' | 'azul' | 'rosa'

/** `id` determinístico `${pericopeOrdem}:${verseId}`: um destaque por versículo
 * por usuário, então destacar de novo é um upsert e o LWW resolve sozinho. */
export type Destaque = {
  id: string
  pericopeOrdem: number
  /** "capitulo:versiculo", igual ao TextoBlock.id */
  verseId: string
  cor: DestaqueCor
  criadoEm: string
  atualizadoEm: string
}

export type RawPericope = {
  ordem: number
  titulo_en: string
  livro_en: string
  livro: string
  abbrev: string
  capitulo_inicio: number
  versiculo_inicio: number
  capitulo_fim: number
  versiculo_fim: number
  texto_naa: string
}
