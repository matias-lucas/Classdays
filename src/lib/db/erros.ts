/**
 * Erro de conflito (id repetido, horário duplicado) — a rota traduz isso
 * pra 409 com uma frase humana. Os dois adaptadores lançam a mesma classe,
 * pra rota não precisar saber se está falando com o JSON local ou o
 * Postgres (que sinaliza duplicata com o código 23505).
 *
 * Vive num arquivo à parte (não em index.ts) porque index.ts importa
 * dbLocal/dbSupabase dos adaptadores — se os adaptadores importassem a
 * classe de volta de index.ts, isso criaria um ciclo de módulos que quebra
 * a inicialização de `db` dependendo da ordem de import.
 */
export class ConflitoBanco extends Error {}
