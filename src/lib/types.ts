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
] as const;

export type TipoEvento = (typeof TIPOS_EVENTO)[number];

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
  hora: string | null; // "HH:MM" ou null (dia inteiro / sem hora definida)
  observacao: string | null;
  created_at: string; // ISO timestamp
}

/** Evento ainda sem id/created_at — é o que o formulário/parser produz. */
export type NovoEvento = Omit<Evento, "id" | "created_at">;
