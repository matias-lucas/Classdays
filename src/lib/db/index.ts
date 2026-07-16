import type { AulaFixa, Evento, Materia, NovoEvento } from "@/lib/types";
import { dbLocal } from "./local";
import { dbSupabase } from "./supabase";

/**
 * Contrato de acesso a dados do Classdays.
 *
 * O resto do app só conhece esta interface — não sabe (nem precisa saber) se
 * os dados vêm de um JSON no disco ou do Supabase. Trocar de banco = trocar
 * qual adaptador é exportado aqui embaixo, e nada mais muda.
 *
 * Na v1 o admin só cria/apaga EVENTOS. Matérias e grade fixa mudam raramente
 * (uma vez por semestre), então são editadas direto no seed/banco.
 */
export interface Database {
  getMaterias(): Promise<Materia[]>;
  getGrade(): Promise<AulaFixa[]>;
  getEventos(): Promise<Evento[]>;
  addEvento(novo: NovoEvento): Promise<Evento>;
  deleteEvento(id: number): Promise<void>;
  /** A grade fixa e o "Hoje" já foram divulgados pra turma? (liga/desliga no /admin) */
  getGradeVisivel(): Promise<boolean>;
  setGradeVisivel(visivel: boolean): Promise<void>;
}

/**
 * Escolha automática do backend:
 * com as variáveis do Supabase presentes → Supabase; sem elas → JSON local.
 * Assim o projeto roda na hora ao clonar, e "liga" no banco real só com o .env.
 */
const usaSupabase = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
);

export const db: Database = usaSupabase ? dbSupabase : dbLocal;

/** Exibido discretamente no /admin, pra nunca haver dúvida de onde os dados estão. */
export const nomeBackend: "supabase" | "local" = usaSupabase
  ? "supabase"
  : "local";
