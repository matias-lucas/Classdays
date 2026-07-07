import type { AulaFixa, Evento, Materia } from "@/lib/types";

/**
 * Dados iniciais do banco local (e referência pro seed do Supabase).
 *
 * ⚠️ PLACEHOLDER: matérias, professores e horários vieram do protótipo visual.
 * Troque pela grade real da turma aqui (e em supabase/0002_seed.sql) — o app
 * inteiro se ajusta sozinho, inclusive cores e filtros.
 */

export const MATERIAS_SEED: Materia[] = [
  { id: "alglin", nome: "Álgebra Linear", prof: "Prof. Marina Alves", cor: "#5457C5" },
  { id: "calc", nome: "Cálculo II", prof: "Prof. Roberto Lima", cor: "#12897E" },
  { id: "edados", nome: "Estrutura de Dados", prof: "Prof. Carla Souza", cor: "#C77A0E" },
  { id: "req", nome: "Eng. de Requisitos", prof: "Prof. Daniel Rocha", cor: "#C13F7A" },
  { id: "bd", nome: "Banco de Dados", prof: "Prof. Helena Dias", cor: "#7C4DBB" },
];

// dia_semana: 1 = segunda … 5 = sexta
export const GRADE_SEED: AulaFixa[] = [
  { id: 1, materia_id: "alglin", dia_semana: 1, hora_ini: "19:00", hora_fim: "20:40", sala: "Sala 3" },
  { id: 2, materia_id: "calc", dia_semana: 1, hora_ini: "20:50", hora_fim: "22:30", sala: "Sala 3" },
  { id: 3, materia_id: "edados", dia_semana: 2, hora_ini: "19:00", hora_fim: "20:40", sala: "Lab 2" },
  { id: 4, materia_id: "bd", dia_semana: 2, hora_ini: "20:50", hora_fim: "22:30", sala: "Lab 2" },
  { id: 5, materia_id: "req", dia_semana: 3, hora_ini: "19:00", hora_fim: "20:40", sala: "Sala 5" },
  { id: 6, materia_id: "calc", dia_semana: 4, hora_ini: "19:00", hora_fim: "20:40", sala: "Sala 3" },
  { id: 7, materia_id: "alglin", dia_semana: 4, hora_ini: "20:50", hora_fim: "22:30", sala: "Sala 3" },
  { id: 8, materia_id: "bd", dia_semana: 5, hora_ini: "19:00", hora_fim: "20:40", sala: "Lab 1" },
];

/**
 * Eventos de demonstração (datas de julho/2026, perto do dia em que o projeto
 * nasceu). Inclui um cancelamento de dia inteiro e um de uma matéria só, para
 * dar pra ver os dois casos na grade. Apague-os pelo /admin quando quiser.
 */
export const EVENTOS_SEED: Evento[] = [
  {
    id: 1,
    tipo: "prova",
    titulo: "Prova — Unidade 2",
    materia_id: "alglin",
    data: "2026-07-13",
    hora: "19:00",
    observacao: null,
    created_at: "2026-07-07T03:00:00.000Z",
  },
  {
    id: 2,
    tipo: "trabalho",
    titulo: "Entrega do Projeto AVL",
    materia_id: "edados",
    data: "2026-07-14",
    hora: null,
    observacao: "Enviar pelo AVA até o fim do dia",
    created_at: "2026-07-07T03:00:00.000Z",
  },
  {
    id: 3,
    tipo: "cancelamento",
    titulo: "Não haverá aula",
    materia_id: null, // dia inteiro sem aula
    data: "2026-07-15",
    hora: null,
    observacao: "Conselho universitário",
    created_at: "2026-07-07T03:00:00.000Z",
  },
  {
    id: 4,
    tipo: "atividade",
    titulo: "Lista de SQL (vale nota)",
    materia_id: "bd",
    data: "2026-07-16",
    hora: "23:59",
    observacao: null,
    created_at: "2026-07-07T03:00:00.000Z",
  },
  {
    id: 5,
    tipo: "cancelamento",
    titulo: "Aula cancelada",
    materia_id: "bd", // só a aula de BD cai nesse dia
    data: "2026-07-17",
    hora: null,
    observacao: "Professora em congresso",
    created_at: "2026-07-07T03:00:00.000Z",
  },
  {
    id: 6,
    tipo: "evento",
    titulo: "Semana Acadêmica",
    materia_id: null,
    data: "2026-07-22",
    hora: null,
    observacao: "Programação no mural do curso",
    created_at: "2026-07-07T03:00:00.000Z",
  },
  {
    id: 7,
    tipo: "prova",
    titulo: "Prova — Integrais",
    materia_id: "calc",
    data: "2026-07-23",
    hora: "19:00",
    observacao: null,
    created_at: "2026-07-07T03:00:00.000Z",
  },
];
