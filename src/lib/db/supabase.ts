import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { NovoEvento } from "@/lib/types";
import type { Database } from "./index";

/**
 * Adaptador SUPABASE: as mesmas cinco operações, agora contra o Postgres.
 *
 * Este módulo só roda no SERVIDOR (server components e rotas de API), então
 * pode usar a service_role key — a chave que ignora RLS e pode escrever.
 * Ela nunca chega ao navegador. Se só a anon key existir, as leituras
 * funcionam (as policies de SELECT são públicas) e as escritas falham,
 * o que é exatamente o comportamento esperado.
 *
 * As tabelas estão em supabase/0001_schema.sql; o seed, em 0002_seed.sql.
 */

let cliente: SupabaseClient | null = null;

function supabase(): SupabaseClient {
  if (!cliente) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const chave =
      process.env.SUPABASE_SERVICE_ROLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !chave) {
      throw new Error(
        "Variáveis do Supabase ausentes — confira NEXT_PUBLIC_SUPABASE_URL e as chaves no .env.local",
      );
    }
    cliente = createClient(url, chave, {
      auth: { persistSession: false }, // não há login de usuário; é acesso de servidor
    });
  }
  return cliente;
}

/** Transforma o erro do Supabase em exceção normal (o try/catch de quem chama cuida). */
function ouErro<T>(resultado: { data: T | null; error: { message: string } | null }): T {
  if (resultado.error) throw new Error(`Supabase: ${resultado.error.message}`);
  return resultado.data as T;
}

/** Postgres devolve time como "19:00:00"; o app inteiro fala "19:00". */
function hhmm<T extends string | null>(t: T): T {
  return (t ? t.slice(0, 5) : t) as T;
}

export const dbSupabase: Database = {
  async getMaterias() {
    return ouErro(await supabase().from("materias").select("*").order("nome"));
  },

  async getGrade() {
    const linhas = ouErro(
      await supabase()
        .from("grade_horaria")
        .select("*")
        .order("dia_semana")
        .order("hora_ini"),
    ) as Array<{ hora_ini: string; hora_fim: string } & Record<string, unknown>>;
    return linhas.map((l) => ({
      ...l,
      hora_ini: hhmm(l.hora_ini),
      hora_fim: hhmm(l.hora_fim),
    })) as never;
  },

  async getEventos() {
    const linhas = ouErro(
      await supabase()
        .from("eventos")
        .select("*")
        .order("data")
        .order("hora", { nullsFirst: false }),
    ) as Array<{ hora: string | null } & Record<string, unknown>>;
    return linhas.map((l) => ({ ...l, hora: hhmm(l.hora) })) as never;
  },

  async addEvento(novo: NovoEvento) {
    return ouErro(
      await supabase().from("eventos").insert(novo).select().single(),
    );
  },

  async deleteEvento(id: number) {
    ouErro(await supabase().from("eventos").delete().eq("id", id));
  },
};
