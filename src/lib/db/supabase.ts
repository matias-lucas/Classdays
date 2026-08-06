import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  AulaFixa,
  EdicaoMateria,
  Materia,
  NovaAula,
  NovoEvento,
} from "@/lib/types";
import { ConflitoBanco } from "./erros";
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

/**
 * Como `ouErro`, mas o código 23505 (violação de índice/chave única do
 * Postgres) vira ConflitoBanco com uma frase humana — nunca a mensagem crua
 * do banco chega à tela.
 */
function ouErroOuConflito<T>(
  resultado: { data: T | null; error: { message: string; code?: string } | null },
  mensagemConflito: string,
): T {
  if (resultado.error) {
    if (resultado.error.code === "23505") throw new ConflitoBanco(mensagemConflito);
    throw new Error(`Supabase: ${resultado.error.message}`);
  }
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
    const evento = ouErro(
      await supabase().from("eventos").insert(novo).select().single(),
    ) as { hora: string | null } & Record<string, unknown>;
    return { ...evento, hora: hhmm(evento.hora) } as never;
  },

  async updateEvento(id: number, campos: NovoEvento) {
    const evento = ouErro(
      await supabase().from("eventos").update(campos).eq("id", id).select().maybeSingle(),
    ) as ({ hora: string | null } & Record<string, unknown>) | null;
    if (!evento) return null;
    return { ...evento, hora: hhmm(evento.hora) } as never;
  },

  async deleteEvento(id: number) {
    ouErro(await supabase().from("eventos").delete().eq("id", id));
  },

  async getGradeVisivel() {
    const linha = ouErro(
      await supabase().from("config").select("grade_visivel").eq("id", 1).single(),
    ) as { grade_visivel: boolean };
    return linha.grade_visivel;
  },

  async setGradeVisivel(visivel: boolean) {
    ouErro(
      await supabase().from("config").update({ grade_visivel: visivel }).eq("id", 1),
    );
  },

  async addMateria(nova: Materia) {
    return ouErroOuConflito(
      await supabase().from("materias").insert(nova).select().single(),
      `A matéria "${nova.id}" já existe.`,
    );
  },

  async updateMateria(id: string, campos: EdicaoMateria) {
    return ouErro(
      await supabase().from("materias").update(campos).eq("id", id).select().maybeSingle(),
    );
  },

  async deleteMateria(id: string) {
    const linhas = ouErro(
      await supabase().from("materias").delete().eq("id", id).select(),
    ) as unknown[];
    return linhas.length > 0;
  },

  async addAula(nova: NovaAula) {
    const aula = ouErroOuConflito(
      await supabase().from("grade_horaria").insert(nova).select().single(),
      "Já existe uma aula desta matéria neste horário.",
    ) as { hora_ini: string; hora_fim: string } & Record<string, unknown>;
    return { ...aula, hora_ini: hhmm(aula.hora_ini), hora_fim: hhmm(aula.hora_fim) } as never;
  },

  async updateAula(id: number, campos: NovaAula) {
    const aula = ouErroOuConflito(
      await supabase().from("grade_horaria").update(campos).eq("id", id).select().maybeSingle(),
      "Já existe uma aula desta matéria neste horário.",
    ) as ({ hora_ini: string; hora_fim: string } & Record<string, unknown>) | null;
    if (!aula) return null;
    return { ...aula, hora_ini: hhmm(aula.hora_ini), hora_fim: hhmm(aula.hora_fim) } as never;
  },

  async deleteAula(id: number) {
    const linhas = ouErro(
      await supabase().from("grade_horaria").delete().eq("id", id).select(),
    ) as unknown[];
    return linhas.length > 0;
  },

  async contarUsos(materiaId: string) {
    const aulas = await supabase()
      .from("grade_horaria")
      .select("*", { count: "exact", head: true })
      .eq("materia_id", materiaId);
    if (aulas.error) throw new Error(`Supabase: ${aulas.error.message}`);

    const eventos = await supabase()
      .from("eventos")
      .select("*", { count: "exact", head: true })
      .eq("materia_id", materiaId);
    if (eventos.error) throw new Error(`Supabase: ${eventos.error.message}`);

    return { aulas: aulas.count ?? 0, eventos: eventos.count ?? 0 };
  },
};
