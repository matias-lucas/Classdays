import { describe, expect, it } from "vitest";
import {
  cancelamentoDa,
  cancelamentosDe,
  eventosFuturos,
  montarSemana,
  proximoItem,
} from "@/lib/agenda";
import type { AulaFixa, Evento } from "@/lib/types";

// Cenário fixo: semana de 06/07/2026 (seg) a 10/07/2026 (sex).
// "Hoje" nos testes é terça, 07/07.
const HOJE = "2026-07-07";

const GRADE: AulaFixa[] = [
  { id: 1, materia_id: "alglin", dia_semana: 1, hora_ini: "19:00", hora_fim: "20:40", sala: "Sala 3" },
  { id: 2, materia_id: "edados", dia_semana: 2, hora_ini: "19:00", hora_fim: "20:40", sala: "Lab 2" },
  { id: 3, materia_id: "bd", dia_semana: 2, hora_ini: "20:50", hora_fim: "22:30", sala: "Lab 2" },
  { id: 4, materia_id: "req", dia_semana: 3, hora_ini: "19:00", hora_fim: "20:40", sala: "Sala 5" },
];

function evento(parcial: Partial<Evento> & Pick<Evento, "id" | "tipo" | "data">): Evento {
  return {
    titulo: "—",
    materia_id: null,
    hora: null,
    observacao: null,
    created_at: "2026-07-01T00:00:00.000Z",
    ...parcial,
  };
}

describe("cancelamentos", () => {
  const cancelDiaInteiro = evento({ id: 1, tipo: "cancelamento", data: "2026-07-08" });
  const cancelSoBd = evento({ id: 2, tipo: "cancelamento", data: "2026-07-07", materia_id: "bd" });

  it("cancelamento de dia inteiro derruba qualquer matéria", () => {
    expect(cancelamentoDa([cancelDiaInteiro], "2026-07-08", "req")).toBe(cancelDiaInteiro);
    expect(cancelamentoDa([cancelDiaInteiro], "2026-07-09", "req")).toBeNull();
  });

  it("cancelamento de uma matéria não afeta as outras", () => {
    expect(cancelamentoDa([cancelSoBd], "2026-07-07", "bd")).toBe(cancelSoBd);
    expect(cancelamentoDa([cancelSoBd], "2026-07-07", "edados")).toBeNull();
  });

  it("cancelamentosDe filtra só o tipo cancelamento", () => {
    const prova = evento({ id: 3, tipo: "prova", data: "2026-07-09" });
    expect(cancelamentosDe([prova, cancelSoBd])).toEqual([cancelSoBd]);
  });
});

describe("montarSemana", () => {
  it("distribui as aulas nos dias certos", () => {
    const semana = montarSemana(GRADE, [], "2026-07-06");
    expect(semana).toHaveLength(5);
    expect(semana[0].aulas.map((a) => a.aula.materia_id)).toEqual(["alglin"]);
    expect(semana[1].aulas.map((a) => a.aula.materia_id)).toEqual(["edados", "bd"]);
    expect(semana[4].aulas).toHaveLength(0); // sexta sem aula nesta grade
  });

  it("marca cancelamento de dia inteiro e de matéria específica", () => {
    const cancelamentos = [
      evento({ id: 1, tipo: "cancelamento", data: "2026-07-08" }), // quarta inteira
      evento({ id: 2, tipo: "cancelamento", data: "2026-07-07", materia_id: "bd" }),
    ];
    const semana = montarSemana(GRADE, cancelamentos, "2026-07-06");
    expect(semana[2].cancelamentoDiaInteiro).not.toBeNull();
    expect(semana[1].cancelamentoDiaInteiro).toBeNull();
    expect(semana[1].aulas.find((a) => a.aula.materia_id === "bd")?.cancelamento).not.toBeNull();
    expect(semana[1].aulas.find((a) => a.aula.materia_id === "edados")?.cancelamento).toBeNull();
  });

  it("casa um evento (prova/trabalho/atividade) com a aula da mesma data e matéria", () => {
    const prova = evento({
      id: 1, tipo: "prova", data: "2026-07-07", materia_id: "edados", titulo: "Prova X",
    });
    const semana = montarSemana(GRADE, [prova], "2026-07-06");
    expect(semana[1].aulas.find((a) => a.aula.materia_id === "edados")?.evento).toBe(prova);
    expect(semana[1].aulas.find((a) => a.aula.materia_id === "bd")?.evento).toBeNull();
  });

  it("cancelamento não conta como evento da aula", () => {
    const cancel = evento({ id: 1, tipo: "cancelamento", data: "2026-07-07", materia_id: "edados" });
    const semana = montarSemana(GRADE, [cancel], "2026-07-06");
    expect(semana[1].aulas.find((a) => a.aula.materia_id === "edados")?.evento).toBeNull();
  });
});

describe("proximoItem (o card Próximo)", () => {
  it("antes da aula de hoje, a aula de hoje é o próximo", () => {
    const nx = proximoItem(GRADE, [], HOJE, "10:00");
    expect(nx).toMatchObject({ kind: "aula", materia_id: "edados", data: HOJE, hora: "19:00" });
  });

  it("depois que a primeira aula de hoje começou, vem a segunda", () => {
    const nx = proximoItem(GRADE, [], HOJE, "19:30");
    expect(nx).toMatchObject({ kind: "aula", materia_id: "bd", hora: "20:50" });
  });

  it("depois de todas as aulas de hoje, vai pro dia seguinte", () => {
    const nx = proximoItem(GRADE, [], HOJE, "23:00");
    expect(nx).toMatchObject({ kind: "aula", materia_id: "req", data: "2026-07-08" });
  });

  it("um evento mais cedo que a próxima aula ganha", () => {
    const prova = evento({
      id: 1, tipo: "prova", data: HOJE, hora: "18:00", titulo: "Prova X", materia_id: "alglin",
    });
    const nx = proximoItem(GRADE, [prova], HOJE, "10:00");
    expect(nx).toMatchObject({ kind: "evento", tipo: "prova", titulo: "Prova X" });
  });

  it("aula cancelada não aparece como próximo", () => {
    const cancelamentos = [
      evento({ id: 1, tipo: "cancelamento", data: HOJE, materia_id: "edados" }),
    ];
    const nx = proximoItem(GRADE, cancelamentos, HOJE, "10:00");
    expect(nx).toMatchObject({ kind: "aula", materia_id: "bd", data: HOJE });
  });

  it("evento sem hora ainda conta durante o dia todo", () => {
    const entrega = evento({
      id: 1, tipo: "trabalho", data: HOJE, titulo: "Entrega", materia_id: "edados",
    });
    const nx = proximoItem([], [entrega], HOJE, "22:00");
    expect(nx).toMatchObject({ tipo: "trabalho", titulo: "Entrega" });
  });

  it("filtro por matéria restringe o pool", () => {
    const nx = proximoItem(GRADE, [], HOJE, "10:00", "req");
    expect(nx).toMatchObject({ kind: "aula", materia_id: "req", data: "2026-07-08" });
  });

  it("sem nada à frente devolve null", () => {
    expect(proximoItem([], [], HOJE, "10:00")).toBeNull();
  });
});

describe("eventosFuturos", () => {
  it("corta o passado, mantém hoje, ordena por data e hora", () => {
    const lista = [
      evento({ id: 1, tipo: "prova", data: "2026-07-06" }), // ontem — fora
      evento({ id: 2, tipo: "trabalho", data: HOJE, hora: "23:59" }),
      evento({ id: 3, tipo: "prova", data: HOJE, hora: "19:00" }),
      evento({ id: 4, tipo: "evento", data: "2026-07-20" }),
    ];
    expect(eventosFuturos(lista, HOJE).map((e) => e.id)).toEqual([3, 2, 4]);
  });

  it("cancelamentos aparecem na lista (são avisos importantes)", () => {
    const lista = [evento({ id: 1, tipo: "cancelamento", data: "2026-07-08" })];
    expect(eventosFuturos(lista, HOJE)).toHaveLength(1);
  });

  it("filtro por matéria esconde eventos gerais (materia_id null)", () => {
    const lista = [
      evento({ id: 1, tipo: "evento", data: "2026-07-20" }), // geral
      evento({ id: 2, tipo: "prova", data: "2026-07-21", materia_id: "bd" }),
    ];
    expect(eventosFuturos(lista, HOJE, "bd").map((e) => e.id)).toEqual([2]);
  });
});
