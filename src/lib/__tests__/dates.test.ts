import { describe, expect, it } from "vitest";
import {
  addDias,
  contagemRegressiva,
  diaSemanaDe,
  diffDias,
  faixaHorario,
  fmtDiaMes,
  fmtDiaMesPartes,
  fmtHora,
  hojeISO,
  horaAgora,
  proximoDiaDaSemana,
  rotuloRelativo,
  rotuloSemana,
  segundaDaSemana,
} from "@/lib/dates";

// 2026-07-07 é uma terça-feira. Usada como "hoje" em vários testes.
const TER = "2026-07-07";

describe("hojeISO / horaAgora (fuso de Brasília)", () => {
  it("converte um instante UTC para a data local de Brasília", () => {
    // 2026-07-08 01:30 UTC ainda é 2026-07-07 22:30 em Brasília (UTC-3)
    const instante = new Date("2026-07-08T01:30:00Z");
    expect(hojeISO(instante)).toBe("2026-07-07");
    expect(horaAgora(instante)).toBe("22:30");
  });

  it("na virada da meia-noite em Brasília muda o dia", () => {
    const instante = new Date("2026-07-08T03:00:00Z"); // 00:00 em Brasília
    expect(hojeISO(instante)).toBe("2026-07-08");
  });
});

describe("aritmética de calendário", () => {
  it("soma e subtrai dias atravessando meses", () => {
    expect(addDias("2026-07-30", 3)).toBe("2026-08-02");
    expect(addDias("2026-08-01", -1)).toBe("2026-07-31");
  });

  it("diffDias devolve negativo pro passado", () => {
    expect(diffDias(TER, "2026-07-10")).toBe(3);
    expect(diffDias(TER, "2026-07-06")).toBe(-1);
    expect(diffDias(TER, TER)).toBe(0);
  });

  it("diaSemanaDe segue a convenção do JS (0=dom)", () => {
    expect(diaSemanaDe(TER)).toBe(2); // terça
    expect(diaSemanaDe("2026-07-12")).toBe(0); // domingo
  });

  it("segundaDaSemana acha a segunda, inclusive no domingo", () => {
    expect(segundaDaSemana(TER)).toBe("2026-07-06");
    expect(segundaDaSemana("2026-07-06")).toBe("2026-07-06"); // já é segunda
    expect(segundaDaSemana("2026-07-12")).toBe("2026-07-06"); // domingo pertence à semana anterior
  });
});

describe("proximoDiaDaSemana (a alma do 'próxima terça')", () => {
  it("dia mais à frente na mesma semana", () => {
    expect(proximoDiaDaSemana(TER, 5)).toBe("2026-07-10"); // sexta
  });

  it("dia que já passou nesta semana vai pra próxima", () => {
    expect(proximoDiaDaSemana(TER, 1)).toBe("2026-07-13"); // segunda
  });

  it("o mesmo dia de hoje pula pra semana seguinte…", () => {
    expect(proximoDiaDaSemana(TER, 2)).toBe("2026-07-14");
  });

  it("…a menos que incluirHoje seja true", () => {
    expect(proximoDiaDaSemana(TER, 2, true)).toBe(TER);
  });
});

describe("formatação pt-BR", () => {
  it("datas e horas no estilo do protótipo", () => {
    expect(fmtDiaMes("2026-07-07")).toBe("07/07");
    expect(fmtDiaMesPartes("2026-07-07")).toEqual({ dia: "07", mes: "jul" });
    expect(fmtHora("19:00")).toBe("19h00");
  });

  it("rótulos relativos", () => {
    expect(rotuloRelativo(-1)).toBe("passou");
    expect(rotuloRelativo(0)).toBe("hoje");
    expect(rotuloRelativo(1)).toBe("amanhã");
    expect(rotuloRelativo(5)).toBe("em 5 dias");
  });

  it("rótulos de semana (cabeçalho da agenda)", () => {
    expect(rotuloSemana(0)).toBe("Esta semana");
    expect(rotuloSemana(1)).toBe("Semana que vem");
    expect(rotuloSemana(-1)).toBe("Semana passada");
    expect(rotuloSemana(3)).toBe("Em 3 semanas");
    expect(rotuloSemana(-3)).toBe("3 semanas atrás");
  });

  it("faixaHorario classifica os dois horários da noite", () => {
    expect(faixaHorario("19:00", "20:40")).toBe("cedo");
    expect(faixaHorario("20:50", "22:30")).toBe("tarde");
    expect(faixaHorario("19:00", "22:00")).toBe("full"); // noite inteira
    expect(faixaHorario("19:00", "22:30")).toBe("full");
  });
});

describe("contagemRegressiva (o relógio do card expressivo 1b)", () => {
  // "agora": terça 2026-07-07, 18:30.
  const AGORA = "18:30";

  it("mesmo dia, ainda vai começar: quebra em horas e minutos", () => {
    const c = contagemRegressiva(TER, AGORA, TER, "20:45");
    expect(c).toMatchObject({ dias: 0, horas: 2, minutos: 15, temHora: true });
    expect(c.totalMin).toBe(135);
  });

  it("faltando menos de uma hora conta só minutos", () => {
    const c = contagemRegressiva(TER, AGORA, TER, "18:50");
    expect(c).toMatchObject({ dias: 0, horas: 0, minutos: 20 });
    expect(c.totalMin).toBe(20);
  });

  it("dias à frente somam com o delta de horário do dia", () => {
    // 3 dias inteiros (4320 min) + (19:00 − 18:30 = 30 min) = 4350
    const c = contagemRegressiva(TER, AGORA, "2026-07-10", "19:00");
    expect(c).toMatchObject({ dias: 3, horas: 0, minutos: 30, temHora: true });
    expect(c.totalMin).toBe(4350);
  });

  it("hora-alvo mais cedo que agora empurra a quebra pro dia anterior", () => {
    // amanhã 08:00, faltando de hoje 18:30: 1440 + (480 − 1110) = 810 min = 13h30
    const c = contagemRegressiva(TER, AGORA, "2026-07-08", "08:00");
    expect(c).toMatchObject({ dias: 0, horas: 13, minutos: 30 });
    expect(c.totalMin).toBe(810);
  });

  it("evento de dia inteiro conta só em dias (temHora:false)", () => {
    const c = contagemRegressiva(TER, AGORA, "2026-07-10", null);
    expect(c).toMatchObject({ dias: 3, horas: 0, minutos: 0, temHora: false });
    expect(c.totalMin).toBe(4320);
  });

  it("dia inteiro hoje: zero dias, mas ainda 'é hoje' (temHora:false)", () => {
    const c = contagemRegressiva(TER, AGORA, TER, null);
    expect(c).toMatchObject({ dias: 0, temHora: false, totalMin: 0 });
  });

  it("instante já passado: totalMin negativo e a quebra zera (não conta pra trás)", () => {
    const c = contagemRegressiva(TER, AGORA, TER, "17:00");
    expect(c.totalMin).toBe(-90);
    expect(c).toMatchObject({ dias: 0, horas: 0, minutos: 0 });
  });
});
