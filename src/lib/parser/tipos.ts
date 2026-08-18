import type { EnfasePeriodo, TipoEvento } from "@/lib/types";

/**
 * O que um parser (Claude ou regras) devolve a partir de uma frase.
 *
 * É quase um NovoEvento, com uma diferença importante: `data` pode ser null.
 * Parser NUNCA inventa — se a frase não diz a data, o campo volta vazio e o
 * card de preview obriga o admin a preencher antes de salvar.
 */
export interface EventoParseado {
  tipo: TipoEvento;
  titulo: string;
  materia_id: string | null;
  data: string | null; // "AAAA-MM-DD" ou null se a frase não disse
  data_fim: string | null; // "AAAA-MM-DD" > data, quando é um período; senão null
  hora: string | null; // "HH:MM" ou null
  enfase: EnfasePeriodo; // o parser nunca infere — nasce "ambos", o admin ajusta no preview
  observacao: string | null;
}

export interface ResultadoParse {
  evento: EventoParseado;
  /** Quem interpretou: a API do Claude ou as regras locais de fallback. */
  origem: "claude" | "regras";
  /** Alertas pro admin revisar no preview ("não achei a matéria", etc.). */
  avisos: string[];
}
