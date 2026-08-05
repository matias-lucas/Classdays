import type {
  AulaFixa,
  EdicaoMateria,
  Evento,
  Materia,
  NovaAula,
  NovoEvento,
} from "@/lib/types";
import { dbLocal } from "./local";
import { dbSupabase } from "./supabase";

export { ConflitoBanco } from "./erros";

/**
 * Contrato de acesso a dados do Classdays.
 *
 * O resto do app só conhece esta interface — não sabe (nem precisa saber) se
 * os dados vêm de um JSON no disco ou do Supabase. Trocar de banco = trocar
 * qual adaptador é exportado aqui embaixo, e nada mais muda.
 *
 * Desde a E1, o admin também cria/edita/apaga MATÉRIAS e a GRADE fixa pela
 * interface (antes, só eventos — matérias e grade mudavam direto no
 * seed/banco). Convenção dos métodos de escrita: `null`/`false` = não
 * encontrado (a rota devolve 404); exceção = falha real (a rota devolve 500).
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

  addMateria(nova: Materia): Promise<Materia>;
  updateMateria(id: string, campos: EdicaoMateria): Promise<Materia | null>;
  deleteMateria(id: string): Promise<boolean>;
  addAula(nova: NovaAula): Promise<AulaFixa>;
  updateAula(id: number, campos: NovaAula): Promise<AulaFixa | null>;
  deleteAula(id: number): Promise<boolean>;
  /** Quantas aulas e eventos apontam para esta matéria (trava a exclusão). */
  contarUsos(materiaId: string): Promise<{ aulas: number; eventos: number }>;
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
