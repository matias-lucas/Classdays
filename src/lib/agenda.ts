import { addDias, diaSemanaDe } from "@/lib/dates";
import type { AulaFixa, Evento, TipoEvento } from "@/lib/types";

/**
 * Lógica de domínio da agenda — funções PURAS.
 *
 * Nada aqui lê banco, relógio ou fuso: tudo entra por parâmetro ("hoje" e
 * "agora" inclusive). Isso permite testar com datas fixas e garante que
 * servidor e navegador calculem exatamente a mesma tela (sem hydration
 * mismatch).
 */

// ---------------------------------------------------------------------------
// cancelamentos
// ---------------------------------------------------------------------------

/** Só os eventos de cancelamento (é com eles que a grade real é montada). */
export function cancelamentosDe(eventos: Evento[]): Evento[] {
  return eventos.filter((e) => e.tipo === "cancelamento");
}

/**
 * A aula de `materiaId` em `dataIso` está cancelada?
 * Devolve o evento de cancelamento (pra UI mostrar o motivo), ou null.
 * - cancelamento com materia_id null → derruba o dia inteiro;
 * - com materia_id preenchido → derruba só aquela matéria naquela data.
 */
export function cancelamentoDa(
  cancelamentos: Evento[],
  dataIso: string,
  materiaId: string | null,
): Evento | null {
  return (
    cancelamentos.find(
      (c) =>
        c.data === dataIso &&
        (c.materia_id === null || c.materia_id === materiaId),
    ) ?? null
  );
}

// ---------------------------------------------------------------------------
// grade da semana (segunda a sexta, já cruzada com cancelamentos)
// ---------------------------------------------------------------------------

export interface DiaDaSemana {
  data: string; // "AAAA-MM-DD"
  cancelamentoDiaInteiro: Evento | null;
  aulas: Array<{
    aula: AulaFixa;
    cancelamento: Evento | null; // cancelamento só desta aula, se houver
    evento: Evento | null; // prova/trabalho/atividade dessa matéria nessa data, se houver
  }>;
}

/** Monta os 5 dias úteis da semana que começa em `segundaIso`. */
export function montarSemana(
  grade: AulaFixa[],
  eventos: Evento[],
  segundaIso: string,
): DiaDaSemana[] {
  const cancelamentos = cancelamentosDe(eventos);
  const dias: DiaDaSemana[] = [];
  for (let i = 0; i < 5; i++) {
    const data = addDias(segundaIso, i);
    // dia_semana usa 1=seg…5=sex — os mesmos números do getDay() do JS
    // para dias úteis, então dá pra comparar direto.
    const doDia = grade.filter((g) => g.dia_semana === diaSemanaDe(data));
    dias.push({
      data,
      cancelamentoDiaInteiro:
        cancelamentos.find((c) => c.data === data && c.materia_id === null) ??
        null,
      aulas: doDia.map((aula) => ({
        aula,
        cancelamento: cancelamentoDa(cancelamentos, data, aula.materia_id),
        evento:
          eventos.find(
            (e) =>
              e.tipo !== "cancelamento" &&
              e.data === data &&
              e.materia_id === aula.materia_id,
          ) ?? null,
      })),
    });
  }
  return dias;
}

// ---------------------------------------------------------------------------
// "Próximo" (o card-herói do topo)
// ---------------------------------------------------------------------------

export interface ItemProximo {
  kind: "aula" | "evento";
  tipo: TipoEvento | null; // null quando é aula da grade
  titulo: string;
  materia_id: string | null;
  data: string;
  hora: string | null;
  sala: string | null;
  observacao: string | null;
}

/** Quantos dias de futuro vasculhar atrás da próxima aula. */
const HORIZONTE_DIAS = 28;

/**
 * O que vem agora? Junta as próximas ocorrências de aula (pulando as
 * canceladas) com os eventos futuros e pega o mais próximo no tempo.
 * Itens de hoje só contam se a hora ainda não passou (sem hora = vale o
 * dia todo). Cancelamentos não competem: eles são ausência de coisa,
 * e aparecem na grade e na lista.
 */
export function proximoItem(
  grade: AulaFixa[],
  eventos: Evento[],
  hojeIso: string,
  agoraHHMM: string,
  filtroMateria: string | null = null,
): ItemProximo | null {
  const cancelamentos = cancelamentosDe(eventos);
  const pool: ItemProximo[] = [];

  // ocorrências futuras das aulas fixas
  for (let i = 0; i < HORIZONTE_DIAS; i++) {
    const data = addDias(hojeIso, i);
    for (const g of grade) {
      if (g.dia_semana !== diaSemanaDe(data)) continue;
      if (cancelamentoDa(cancelamentos, data, g.materia_id)) continue;
      pool.push({
        kind: "aula",
        tipo: null,
        titulo: "", // a UI mostra o nome da matéria
        materia_id: g.materia_id,
        data,
        hora: g.hora_ini,
        sala: g.sala,
        observacao: null,
      });
    }
  }

  // eventos pontuais (provas, trabalhos, …) — cancelamento não entra
  for (const e of eventos) {
    if (e.tipo === "cancelamento") continue;
    pool.push({
      kind: "evento",
      tipo: e.tipo,
      titulo: e.titulo,
      materia_id: e.materia_id,
      data: e.data,
      hora: e.hora,
      sala: null,
      observacao: e.observacao,
    });
  }

  const candidatos = pool
    .filter((x) => (filtroMateria ? x.materia_id === filtroMateria : true))
    .filter((x) => {
      if (x.data > hojeIso) return true;
      if (x.data < hojeIso) return false;
      return x.hora === null || x.hora >= agoraHHMM; // hoje: só o que ainda vem
    })
    .sort(
      (a, b) =>
        a.data.localeCompare(b.data) ||
        (a.hora ?? "99:99").localeCompare(b.hora ?? "99:99"),
    );

  return candidatos[0] ?? null;
}

// ---------------------------------------------------------------------------
// "Hoje" (a timeline do dia)
// ---------------------------------------------------------------------------

export interface ItemHoje {
  kind: "aula" | "evento";
  tipo: TipoEvento | null; // null quando é aula da grade
  titulo: string; // "" quando é aula (a UI mostra o nome da matéria)
  materia_id: string | null;
  hora: string | null;
  sala: string | null;
  observacao: string | null;
}

/**
 * O dia de hoje, em ordem cronológica: as aulas fixas de hoje (pulando as
 * canceladas) somadas aos eventos de hoje. É uma timeline do que *acontece*
 * hoje — por isso, diferente de `eventosFuturos`, o cancelamento não vira um
 * item: ele é ausência de aula, e some da linha (a grade logo abaixo continua
 * mostrando o risco). Sem parâmetro `agora`: a timeline mostra o dia inteiro,
 * sem marcador de "agora" e sem esconder o que já passou.
 */
export function itensDeHoje(
  grade: AulaFixa[],
  eventos: Evento[],
  hojeIso: string,
  filtroMateria: string | null = null,
): ItemHoje[] {
  const cancelamentos = cancelamentosDe(eventos);
  const itens: ItemHoje[] = [];

  // aulas fixas de hoje que não estão canceladas
  const dow = diaSemanaDe(hojeIso);
  for (const g of grade) {
    if (g.dia_semana !== dow) continue;
    if (cancelamentoDa(cancelamentos, hojeIso, g.materia_id)) continue;
    itens.push({
      kind: "aula",
      tipo: null,
      titulo: "",
      materia_id: g.materia_id,
      hora: g.hora_ini,
      sala: g.sala,
      observacao: null,
    });
  }

  // eventos pontuais de hoje — cancelamento não entra (é ausência, não item)
  for (const e of eventos) {
    if (e.tipo === "cancelamento") continue;
    if (e.data !== hojeIso) continue;
    itens.push({
      kind: "evento",
      tipo: e.tipo,
      titulo: e.titulo,
      materia_id: e.materia_id,
      hora: e.hora,
      sala: null,
      observacao: e.observacao,
    });
  }

  return itens
    .filter((x) => (filtroMateria ? x.materia_id === filtroMateria : true))
    .sort((a, b) => (a.hora ?? "99:99").localeCompare(b.hora ?? "99:99"));
}

// ---------------------------------------------------------------------------
// lista "Próximos eventos"
// ---------------------------------------------------------------------------

/**
 * Eventos de hoje em diante, ordenados. Cancelamentos APARECEM aqui
 * (aviso importante), diferente do card Próximo.
 */
export function eventosFuturos(
  eventos: Evento[],
  hojeIso: string,
  filtroMateria: string | null = null,
): Evento[] {
  return eventos
    .filter((e) => e.data >= hojeIso)
    .filter((e) => (filtroMateria ? e.materia_id === filtroMateria : true))
    .sort(
      (a, b) =>
        a.data.localeCompare(b.data) ||
        (a.hora ?? "99:99").localeCompare(b.hora ?? "99:99"),
    );
}
