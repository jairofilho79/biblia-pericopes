// Limites do protocolo de sync compartilhados pelo cliente.
//
// IMPORTANTE: worker/sync-logic.ts mantém uma cópia própria destes valores
// (MAX_ITENS / MAX_TEXTO) porque o código do Worker não pode importar de src/
// (tsconfig e bundle separados). Ao mudar um valor aqui, mude lá também.

/** Máximo de itens por lista (progresso/anotacoes/destaques) em um único POST /api/sync. */
export const MAX_ITENS_POR_LOTE = 500

/** Máximo de caracteres do texto de uma anotação; o servidor rejeita acima disso. */
export const MAX_TEXTO = 20_000
