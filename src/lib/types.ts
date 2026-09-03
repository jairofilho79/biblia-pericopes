/** Metadados de uma perícope: o que o índice de boot carrega. */
export type PericopeIndex = {
  ordem: number
  livro: string
  abbrev: string
  capitulo_inicio: number
  versiculo_inicio: number
  capitulo_fim: number
  versiculo_fim: number
  titulo_pericope_pt: string
  /** Minutos de leitura, pré-calculados pelo gerador de shards. */
  minutos: number
}

/** Perícope completa: índice + o conteúdo que vem dos shards do livro. */
export type Pericope = PericopeIndex & {
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
  /** Vínculo opcional a versículo(s): "c:v" ou "c:v-c:v". */
  verseRef: string | null
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

export type PosicaoTipo = 'secao' | 'versiculo' | 'narracao'

/** Checkpoint de leitura: uma linha por perícope, a última âncora relevante.
 * `ref` fala o vocabulário do DOM da Leitura — id de seção ("texto"),
 * verseId ("3:16"), parágrafo em prosa ("resenha-0") ou alvo de narração. */
export type PosicaoLeitura = {
  pericopeOrdem: number
  tipo: PosicaoTipo
  ref: string
  /** Segundos do áudio quando tipo é "narracao"; null nos demais. */
  tempo: number | null
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

export type JornadaTipo = 'sequencia' | 'bloco' | 'livro' // 'cronologica' depois

/**
 * Percurso declarado pelo leitor. Guarda só a DEFINIÇÃO — a rota e o
 * progresso são derivados em runtime do índice e do `progresso` global
 * (src/lib/jornadas.ts). Nunca uma segunda contabilidade de leitura.
 */
export type Jornada = {
  id: string
  nome: string
  tipo: JornadaTipo
  /**
   * 'sequencia' → 'biblia' | 'vt' | 'nt'
   * 'bloco'     → id de BLOCOS (ex.: 'pentateuco')
   * 'livro'     → nome do livro, como em PericopeIndex.livro
   */
  escopo: string
  /** Ordem da 1ª perícope da jornada dentro da rota do escopo. */
  inicioOrdem: number
  /**
   * Âncora da atribuição.
   * `null` → "continuar": qualquer conclusão no escopo conta, de qualquer época.
   * ISO    → "reler": só conclusões a partir dali contam, e o cursor volta ao início.
   */
  contaDesde: string | null
  criadoEm: string
  atualizadoEm: string
  arquivadaEm: string | null
  concluidaEm: string | null
}
