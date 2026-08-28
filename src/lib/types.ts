/**
 * Tipos centrais do Classdays.
 *
 * Os nomes dos campos espelham exatamente as colunas do banco (Supabase/Postgres).
 * Isso evita camadas de "tradução" entre banco → servidor → tela: o mesmo objeto
 * que sai do banco chega ao componente React.
 */

export const TIPOS_EVENTO = [
  "prova",
  "trabalho",
  "atividade",
  "evento",
  "cancelamento",
  "feriado",
  "recesso",
] as const;

export type TipoEvento = (typeof TIPOS_EVENTO)[number];

/**
 * Só importa em período (`data_fim` preenchido): qual data é a notícia no
 * hero. "inicio" = só a abertura importa (vagas limitadas — some do hero
 * depois de começar); "fim" = só o prazo importa (entrega — disputa o hero
 * pelo término desde o primeiro dia, mesmo antes de começar); "ambos" = a
 * regra clássica (início enquanto não começa, término enquanto rola).
 */
export const ENFASES_PERIODO = ["inicio", "fim", "ambos"] as const;

export type EnfasePeriodo = (typeof ENFASES_PERIODO)[number];

export interface Materia {
  id: string; // curto e legível: 'alglin', 'calc'...
  nome: string;
  prof: string | null;
  cor: string; // hex da matéria na UI, ex: '#5457C5'
}

export interface AulaFixa {
  id: number;
  materia_id: string;
  dia_semana: number; // 1 = segunda … 5 = sexta
  hora_ini: string; // "19:00"
  hora_fim: string; // "20:40"
  sala: string | null;
}

export interface Evento {
  id: number;
  tipo: TipoEvento;
  titulo: string;
  materia_id: string | null; // null = evento geral da turma
  data: string; // "AAAA-MM-DD"
  data_fim: string | null; // "AAAA-MM-DD" > data; null = evento pontual (não período)
  hora: string | null; // "HH:MM" ou null (dia inteiro / sem hora definida)
  enfase: EnfasePeriodo; // só lido quando data_fim existe; "ambos" nos pontuais (ignorado)
  /**
   * Este evento derruba as aulas da grade enquanto acontece (a OLINFEG, uma
   * semana de exames, um congresso). Vale o(s) dia(s) INTEIRO(s) — mesmo com
   * `materia_id` preenchido: para tirar só uma aula existe o `cancelamento`.
   * Feriado e recesso derrubam por serem o que são, com ou sem este campo
   * (ver `suspendeAulas` em src/lib/agenda.ts).
   */
  suspende_aulas: boolean;
  observacao: string | null;
  created_at: string; // ISO timestamp
}

/** Evento ainda sem id/created_at — é o que o formulário/parser produz. */
export type NovoEvento = Omit<Evento, "id" | "created_at">;

/** Aula ainda sem id — o que o formulário da grade produz. */
export type NovaAula = Omit<AulaFixa, "id">;

/** Matéria sem o id (edição não muda a chave primária). */
export type EdicaoMateria = Omit<Materia, "id">;
