import { describe, expect, it } from "vitest";
import {
  addDias,
  diaSemanaDe,
  diffDias,
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
});
