import { describe, expect, it } from "vitest";
import {
  ativoEm,
  cancelamentoDa,
  cancelamentosDe,
  continuosAtivos,
  ehAusencia,
  ehPeriodo,
  emAndamento,
  eventosFuturos,
  feriadoEm,
  fimDe,
  itensDeHoje,
  montarSemana,
  proximoEvento,
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
    data_fim: null,
    hora: null,
    enfase: "ambos",
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

describe("proximoEvento (o card Próximo — só eventos)", () => {
  const provaHoje = evento({
    id: 1, tipo: "prova", data: HOJE, hora: "18:00", titulo: "Prova X", materia_id: "alglin",
  });
  const trabalhoDepois = evento({
    id: 2, tipo: "trabalho", data: "2026-07-09", titulo: "Entrega", materia_id: "edados",
  });

  it("pega o evento mais próximo no tempo", () => {
    expect(proximoEvento([trabalhoDepois, provaHoje], HOJE, "10:00")?.id).toBe(1);
  });

  it("evento de hoje cuja hora já passou não conta", () => {
    expect(proximoEvento([provaHoje], HOJE, "18:30")).toBeNull();
  });

  it("evento de hoje ainda por vir conta; sem hora vale o dia todo", () => {
    const semHora = evento({ id: 4, tipo: "trabalho", data: HOJE, titulo: "Lista", materia_id: "bd" });
    expect(proximoEvento([semHora], HOJE, "22:00")?.id).toBe(4);
  });

  it("nunca devolve cancelamento, mesmo sendo o mais cedo", () => {
    const cancel = evento({ id: 3, tipo: "cancelamento", data: HOJE, hora: "08:00", materia_id: "edados" });
    expect(proximoEvento([cancel, provaHoje], HOJE, "07:00")?.id).toBe(1);
  });

  it("filtro por matéria restringe", () => {
    expect(proximoEvento([provaHoje, trabalhoDepois], HOJE, "10:00", "edados")?.id).toBe(2);
  });

  it("sem eventos à frente devolve null", () => {
    expect(proximoEvento([], HOJE, "10:00")).toBeNull();
    const passado = evento({ id: 9, tipo: "prova", data: "2026-07-01" });
    expect(proximoEvento([passado], HOJE, "10:00")).toBeNull();
  });
});

describe("itensDeHoje (a timeline do dia)", () => {
  it("lista as aulas de hoje em ordem de horário", () => {
    const itens = itensDeHoje(GRADE, [], HOJE);
    expect(itens.map((i) => [i.kind, i.materia_id, i.hora])).toEqual([
      ["aula", "edados", "19:00"],
      ["aula", "bd", "20:50"],
    ]);
  });

  it("aula carrega hora_fim da grade; evento não tem duração (null)", () => {
    const prova = evento({
      id: 1, tipo: "prova", data: HOJE, hora: "18:00", titulo: "Prova X", materia_id: "alglin",
    });
    const itens = itensDeHoje(GRADE, [prova], HOJE);
    expect(itens.map((i) => [i.kind, i.hora, i.hora_fim])).toEqual([
      ["evento", "18:00", null], // evento é um instante
      ["aula", "19:00", "20:40"], // edados: fim vem da grade
      ["aula", "20:50", "22:30"], // bd
    ]);
  });

  it("intercala eventos e aulas ordenados juntos pela hora", () => {
    const prova = evento({
      id: 1, tipo: "prova", data: HOJE, hora: "18:00", titulo: "Prova X", materia_id: "alglin",
    });
    const reuniao = evento({
      id: 2, tipo: "evento", data: HOJE, hora: "20:00", titulo: "Reunião",
    });
    const itens = itensDeHoje(GRADE, [prova, reuniao], HOJE);
    expect(itens.map((i) => [i.kind, i.hora])).toEqual([
      ["evento", "18:00"], // prova
      ["aula", "19:00"], // edados
      ["evento", "20:00"], // reunião
      ["aula", "20:50"], // bd
    ]);
  });

  it("aula de matéria cancelada some da timeline", () => {
    const cancel = evento({ id: 1, tipo: "cancelamento", data: HOJE, materia_id: "edados" });
    const itens = itensDeHoje(GRADE, [cancel], HOJE);
    expect(itens.map((i) => i.materia_id)).toEqual(["bd"]);
  });

  it("cancelamento de dia inteiro remove as aulas, mas os eventos ficam", () => {
    const cancelDia = evento({ id: 1, tipo: "cancelamento", data: HOJE });
    const prova = evento({
      id: 2, tipo: "prova", data: HOJE, hora: "15:00", titulo: "Prova online", materia_id: "bd",
    });
    const itens = itensDeHoje(GRADE, [cancelDia, prova], HOJE);
    expect(itens.map((i) => [i.kind, i.titulo])).toEqual([["evento", "Prova online"]]);
  });

  it("cancelamento sozinho não vira item da timeline", () => {
    const cancel = evento({ id: 1, tipo: "cancelamento", data: HOJE, materia_id: "edados" });
    // sexta (2026-07-10) não tem aula na GRADE, então só sobraria o cancelamento
    expect(itensDeHoje(GRADE, [cancel], "2026-07-10")).toEqual([]);
  });

  it("dia sem aulas nem eventos devolve lista vazia", () => {
    // 2026-07-10 é sexta; a GRADE não tem aula nesse dia
    expect(itensDeHoje(GRADE, [], "2026-07-10")).toEqual([]);
  });

  it("evento sem hora vai para o fim (depois das aulas com horário)", () => {
    const entrega = evento({
      id: 1, tipo: "trabalho", data: HOJE, titulo: "Entrega", materia_id: "edados",
    });
    const itens = itensDeHoje(GRADE, [entrega], HOJE);
    expect(itens.map((i) => i.hora)).toEqual(["19:00", "20:50", null]);
  });

  it("filtro por matéria restringe às aulas e eventos daquela matéria", () => {
    const itens = itensDeHoje(GRADE, [], HOJE, "bd");
    expect(itens.map((i) => [i.kind, i.materia_id])).toEqual([["aula", "bd"]]);
  });

  it("filtro por matéria esconde eventos gerais (materia_id null)", () => {
    const geral = evento({ id: 1, tipo: "evento", data: HOJE, hora: "12:00", titulo: "Geral" });
    const itens = itensDeHoje(GRADE, [geral], HOJE, "edados");
    expect(itens.map((i) => i.materia_id)).toEqual(["edados"]);
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

  it("período em andamento aparece mesmo com início no passado", () => {
    const periodo = evento({ id: 1, tipo: "evento", data: "2026-07-01", data_fim: "2026-07-09" });
    expect(eventosFuturos([periodo], HOJE).map((e) => e.id)).toEqual([1]);
  });

  it("período terminado ontem não aparece", () => {
    const periodo = evento({ id: 1, tipo: "evento", data: "2026-06-20", data_fim: "2026-07-06" }); // fimDe = ontem
    expect(eventosFuturos([periodo], HOJE)).toHaveLength(0);
  });

  it("ordena um período em andamento como 'hoje' — antes do evento de amanhã, junto do pontual de hoje", () => {
    const periodo = evento({ id: 1, tipo: "evento", data: "2026-07-01", data_fim: "2026-07-09" });
    const pontualHoje = evento({ id: 2, tipo: "prova", data: HOJE, hora: "19:00" });
    const amanha = evento({ id: 3, tipo: "trabalho", data: "2026-07-08" });
    expect(eventosFuturos([amanha, periodo, pontualHoje], HOJE).map((e) => e.id)).toEqual([
      2, 1, 3,
    ]);
  });
});

describe("períodos (E2): fimDe / ehPeriodo / ativoEm / emAndamento", () => {
  const periodo = evento({ id: 1, tipo: "evento", data: "2026-07-10", data_fim: "2026-07-15" });
  const pontual = evento({ id: 2, tipo: "evento", data: "2026-07-10" });

  it("ativoEm nas bordas: primeiro dia, último dia, véspera e dia seguinte", () => {
    expect(ativoEm(periodo, "2026-07-10")).toBe(true);
    expect(ativoEm(periodo, "2026-07-15")).toBe(true);
    expect(ativoEm(periodo, "2026-07-09")).toBe(false);
    expect(ativoEm(periodo, "2026-07-16")).toBe(false);
  });

  it("fimDe: sem data_fim devolve a própria data", () => {
    expect(fimDe(pontual)).toBe("2026-07-10");
    expect(fimDe(periodo)).toBe("2026-07-15");
  });

  it("ehPeriodo distingue período de evento pontual", () => {
    expect(ehPeriodo(periodo)).toBe(true);
    expect(ehPeriodo(pontual)).toBe(false);
  });

  it("emAndamento só quando É período e hoje cai dentro do intervalo", () => {
    expect(emAndamento(periodo, "2026-07-12")).toBe(true);
    expect(emAndamento(periodo, "2026-07-09")).toBe(false); // ainda não começou
    expect(emAndamento(periodo, "2026-07-16")).toBe(false); // já terminou
    expect(emAndamento(pontual, "2026-07-10")).toBe(false); // pontual nunca "em andamento"
  });

  it("período atravessando a virada do mês", () => {
    const p = evento({ id: 3, tipo: "evento", data: "2026-07-28", data_fim: "2026-08-03" });
    expect(ativoEm(p, "2026-07-31")).toBe(true);
    expect(ativoEm(p, "2026-08-01")).toBe(true);
    expect(ativoEm(p, "2026-08-04")).toBe(false);
  });

  it("período atravessando a virada do ano", () => {
    const recesso = evento({ id: 4, tipo: "evento", data: "2026-12-20", data_fim: "2027-01-05" });
    expect(ativoEm(recesso, "2026-12-31")).toBe(true);
    expect(ativoEm(recesso, "2027-01-01")).toBe(true);
    expect(ativoEm(recesso, "2027-01-06")).toBe(false);
  });
});

describe("continuosAtivos e montarSemana.continuos", () => {
  it("continuosAtivos só devolve períodos em curso, nunca cancelamento", () => {
    const recesso = evento({
      id: 1, tipo: "evento", titulo: "Recesso", data: "2026-07-06", data_fim: "2026-07-17",
    });
    const cancelPeriodo = evento({
      id: 2, tipo: "cancelamento", data: "2026-07-06", data_fim: "2026-07-17",
    });
    const pontual = evento({ id: 3, tipo: "prova", data: HOJE });
    expect(continuosAtivos([recesso, cancelPeriodo, pontual], HOJE).map((e) => e.id)).toEqual([
      1,
    ]);
  });

  it("montarSemana marca `continuos` nos cinco dias de um recesso de 2 semanas", () => {
    const recesso = evento({
      id: 1, tipo: "evento", titulo: "Recesso", data: "2026-07-06", data_fim: "2026-07-17",
    });
    const semana = montarSemana(GRADE, [recesso], "2026-07-06");
    expect(semana).toHaveLength(5);
    expect(semana.every((d) => d.continuos.some((e) => e.id === 1))).toBe(true);
  });

  it("montarSemana casa evento com a aula usando ativoEm (período tocando a matéria)", () => {
    const provaPeriodo = evento({
      id: 1, tipo: "prova", data: "2026-07-06", data_fim: "2026-07-08", materia_id: "edados",
    });
    const semana = montarSemana(GRADE, [provaPeriodo], "2026-07-06");
    // terça (07/07) cai dentro do período, e é o dia da aula de edados
    expect(semana[1].aulas.find((a) => a.aula.materia_id === "edados")?.evento).toBe(
      provaPeriodo,
    );
  });
});

describe("proximoEvento com períodos", () => {
  // enfase default "ambos" (ver helper `evento`).
  const periodoAndamento = evento({
    id: 1, tipo: "evento", titulo: "Renovação", data: "2026-07-01", data_fim: "2026-07-09",
  });

  it("período em andamento (ênfase 'ambos') disputa o hero pelo término, vencendo evento futuro mais distante", () => {
    const futuro = evento({ id: 2, tipo: "evento", titulo: "Retorno", data: "2026-07-10" });
    expect(proximoEvento([periodoAndamento, futuro], HOJE, "10:00")?.id).toBe(1);
  });

  it("período em andamento (ênfase 'ambos') perde pra evento futuro mais próximo que seu término", () => {
    const futuroProximo = evento({ id: 2, tipo: "prova", titulo: "Prova", data: "2026-07-08" });
    expect(proximoEvento([periodoAndamento, futuroProximo], HOJE, "10:00")?.id).toBe(2);
  });

  it("assume o período em andamento quando não há mais nada à frente", () => {
    expect(proximoEvento([periodoAndamento], HOJE, "10:00")?.id).toBe(1);
  });
});

describe("proximoEvento com ênfase de período (E5)", () => {
  it("ênfase 'fim': disputa o hero pelo término mesmo já em andamento, vencendo um evento futuro mais distante", () => {
    const prazoEmCurso = evento({
      id: 1, tipo: "trabalho", titulo: "Prazo de envio", data: "2026-07-01",
      data_fim: "2026-07-09", enfase: "fim",
    });
    const provaDepois = evento({ id: 2, tipo: "prova", titulo: "Prova", data: "2026-07-10" });
    // término do prazo (09/07) é mais cedo que a prova (10/07) — vence mesmo
    // já rodando desde 01/07. Ênfase "ambos" em andamento se comporta igual
    // hoje — ver "período em andamento (ênfase 'ambos') disputa o hero pelo
    // término" em "proximoEvento com períodos".
    expect(proximoEvento([prazoEmCurso, provaDepois], HOJE, "10:00")?.id).toBe(1);
  });

  it("ênfase 'fim': antes mesmo de começar, já disputa pelo término", () => {
    const prazoFuturo = evento({
      id: 1, tipo: "trabalho", titulo: "Prazo de envio", data: "2026-07-20",
      data_fim: "2026-07-22", enfase: "fim",
    });
    const provaMaisLonge = evento({ id: 2, tipo: "prova", titulo: "Prova", data: "2026-07-25" });
    expect(proximoEvento([prazoFuturo, provaMaisLonge], HOJE, "10:00")?.id).toBe(1);
  });

  it("ênfase 'ambos': antes de começar, disputa pelo início — não pelo término", () => {
    const matriculasFuturas = evento({
      id: 1, tipo: "evento", titulo: "Matrículas", data: "2026-07-20",
      data_fim: "2026-07-25", enfase: "ambos",
    });
    const provaEntreOInicioEOTermino = evento({
      id: 2, tipo: "prova", titulo: "Prova", data: "2026-07-22",
    });
    // se usasse o término (25/07) a prova (22/07) venceria; usando o início
    // (20/07, já que ainda não começou), a matrícula vence.
    expect(
      proximoEvento([matriculasFuturas, provaEntreOInicioEOTermino], HOJE, "10:00")?.id,
    ).toBe(1);
  });

  it("ênfase 'inicio': some do hero assim que começa, mesmo sem nada mais à frente", () => {
    const vagasAbertas = evento({
      id: 1, tipo: "evento", titulo: "Inscrições abertas", data: "2026-07-01",
      data_fim: "2026-07-09", enfase: "inicio",
    });
    expect(proximoEvento([vagasAbertas], HOJE, "10:00")).toBeNull();
  });

  it("ênfase 'inicio': continua disputando o hero normalmente antes de começar", () => {
    const vagasFuturas = evento({
      id: 1, tipo: "evento", titulo: "Inscrições abertas", data: "2026-07-09",
      data_fim: "2026-07-15", enfase: "inicio",
    });
    expect(proximoEvento([vagasFuturas], HOJE, "10:00")?.id).toBe(1);
  });
});

describe("itensDeHoje nunca lista períodos", () => {
  it("período ativo hoje não vira item da timeline (vive na faixa 'em andamento')", () => {
    const periodo = evento({
      id: 1, tipo: "evento", titulo: "Recesso", data: HOJE, data_fim: "2026-07-10",
    });
    const itens = itensDeHoje(GRADE, [periodo], HOJE);
    expect(itens.every((i) => i.kind === "aula")).toBe(true);
  });
});

describe("ehAusencia (E3)", () => {
  it("só feriado e recesso são ausência — nunca matéria/'GERAL'", () => {
    expect(ehAusencia("feriado")).toBe(true);
    expect(ehAusencia("recesso")).toBe(true);
    expect(ehAusencia("evento")).toBe(false);
    expect(ehAusencia("cancelamento")).toBe(false);
    expect(ehAusencia("prova")).toBe(false);
  });
});

describe("feriadoEm (E3)", () => {
  it("acha um feriado de um dia só, só na data exata", () => {
    const feriado = evento({ id: 1, tipo: "feriado", data: HOJE, titulo: "Feriado" });
    expect(feriadoEm([feriado], HOJE)).toBe(feriado);
    expect(feriadoEm([feriado], "2026-07-08")).toBeNull();
  });

  it("acha um recesso (período) em qualquer dia dentro do intervalo", () => {
    const recesso = evento({
      id: 1, tipo: "recesso", titulo: "Recesso", data: "2026-07-06", data_fim: "2026-07-17",
    });
    expect(feriadoEm([recesso], "2026-07-10")).toBe(recesso);
    expect(feriadoEm([recesso], "2026-07-18")).toBeNull();
  });

  it("nunca confunde cancelamento ou evento comum com feriado", () => {
    const cancel = evento({ id: 1, tipo: "cancelamento", data: HOJE });
    const comum = evento({ id: 2, tipo: "evento", data: HOJE });
    expect(feriadoEm([cancel, comum], HOJE)).toBeNull();
  });
});

describe("montarSemana com feriado/recesso (E3)", () => {
  it("feriado de um dia derruba as aulas só daquele dia e marca `feriado`", () => {
    const feriado = evento({ id: 1, tipo: "feriado", data: "2026-07-07", titulo: "Feriado" });
    const semana = montarSemana(GRADE, [feriado], "2026-07-06");
    expect(semana[1].feriado).toBe(feriado);
    expect(semana[1].aulas).toHaveLength(0);
    expect(semana[0].feriado).toBeNull();
    expect(semana[0].aulas).toHaveLength(1); // segunda intacta
  });

  it("recesso derruba as aulas todos os dias que cobre e não duplica em `continuos`", () => {
    const recesso = evento({
      id: 1, tipo: "recesso", titulo: "Recesso", data: "2026-07-06", data_fim: "2026-07-17",
    });
    const semana = montarSemana(GRADE, [recesso], "2026-07-06");
    expect(semana.every((d) => d.aulas.length === 0)).toBe(true);
    expect(semana.every((d) => d.feriado?.id === 1)).toBe(true);
    expect(semana.every((d) => d.continuos.length === 0)).toBe(true);
  });

  it("feriado num dia não esconde o cancelamento de dia inteiro de outro dia", () => {
    const feriado = evento({ id: 1, tipo: "feriado", data: "2026-07-07" });
    const cancel = evento({ id: 2, tipo: "cancelamento", data: "2026-07-08" });
    const semana = montarSemana(GRADE, [feriado, cancel], "2026-07-06");
    expect(semana[2].cancelamentoDiaInteiro).toBe(cancel);
  });
});

describe("itensDeHoje com feriado/recesso (E3)", () => {
  it("feriado de um dia suprime as aulas mas ainda vira item da timeline", () => {
    const feriado = evento({ id: 1, tipo: "feriado", data: HOJE, titulo: "Feriado" });
    const itens = itensDeHoje(GRADE, [feriado], HOJE);
    expect(itens).toEqual([
      expect.objectContaining({ kind: "evento", tipo: "feriado", titulo: "Feriado" }),
    ]);
  });

  it("recesso (período) suprime as aulas e não vira item (vive na faixa 'em andamento')", () => {
    const recesso = evento({
      id: 1, tipo: "recesso", titulo: "Recesso", data: HOJE, data_fim: "2026-07-10",
    });
    expect(itensDeHoje(GRADE, [recesso], HOJE)).toEqual([]);
  });
});

describe("proximoEvento nunca escolhe feriado/recesso (E3)", () => {
  it("pula um feriado mais cedo e pega o próximo evento de verdade", () => {
    const feriado = evento({ id: 1, tipo: "feriado", data: HOJE, titulo: "Feriado" });
    const prova = evento({ id: 2, tipo: "prova", data: "2026-07-09", titulo: "Prova" });
    expect(proximoEvento([feriado, prova], HOJE, "08:00")?.id).toBe(2);
  });

  it("recesso em andamento não assume o hero mesmo sem mais nada à frente", () => {
    const recesso = evento({ id: 1, tipo: "recesso", data: "2026-07-01", data_fim: "2026-07-09" });
    expect(proximoEvento([recesso], HOJE, "10:00")).toBeNull();
  });
});

