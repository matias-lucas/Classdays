import { describe, expect, it } from "vitest";
import { EventoParseadoSchema, NovoEventoSchema } from "@/lib/parser/schema";

const BASE = {
  tipo: "evento" as const,
  titulo: "Evento de teste",
  materia_id: null,
  hora: null,
  observacao: null,
};

describe("EventoParseadoSchema — data_fim (E2)", () => {
  it("período de um dia (data_fim === data) é normalizado para null", () => {
    const r = EventoParseadoSchema.safeParse({ ...BASE, data: "2026-08-04", data_fim: "2026-08-04" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.data_fim).toBeNull();
  });

  it("data_fim < data é rejeitado", () => {
    const r = EventoParseadoSchema.safeParse({ ...BASE, data: "2026-08-09", data_fim: "2026-08-04" });
    expect(r.success).toBe(false);
  });

  it("data_fim > data é aceito e preservado", () => {
    const r = EventoParseadoSchema.safeParse({ ...BASE, data: "2026-08-04", data_fim: "2026-08-09" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.data_fim).toBe("2026-08-09");
  });

  it("data_fim null (evento pontual) passa normalmente", () => {
    const r = EventoParseadoSchema.safeParse({ ...BASE, data: "2026-08-04", data_fim: null });
    expect(r.success).toBe(true);
  });

  it("data null com data_fim null continua válido (parser sem data)", () => {
    const r = EventoParseadoSchema.safeParse({ ...BASE, data: null, data_fim: null });
    expect(r.success).toBe(true);
  });
});

describe("NovoEventoSchema — data_fim (E2)", () => {
  it("data_fim < data é rejeitado (o que pode ser SALVO exige data obrigatória)", () => {
    const r = NovoEventoSchema.safeParse({ ...BASE, data: "2026-08-09", data_fim: "2026-08-04" });
    expect(r.success).toBe(false);
  });

  it("data ausente é rejeitado (diferente do parseado, aqui é obrigatória)", () => {
    const r = NovoEventoSchema.safeParse({ ...BASE, data: null, data_fim: null });
    expect(r.success).toBe(false);
  });

  it("período válido normaliza data_fim === data para null", () => {
    const r = NovoEventoSchema.safeParse({ ...BASE, data: "2026-08-04", data_fim: "2026-08-04" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.data_fim).toBeNull();
  });
});

describe("NovoEventoSchema — suspende_aulas", () => {
  it("corpo sem o campo continua válido e nasce false", () => {
    // é o que garante que o formulário antigo (e o /api/parse) não quebrem
    // entre o deploy da coluna e o do resto
    const r = NovoEventoSchema.safeParse({ ...BASE, data: "2026-09-16", data_fim: null });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.suspende_aulas).toBe(false);
  });

  it("true atravessa a fronteira intacto", () => {
    const r = NovoEventoSchema.safeParse({
      ...BASE, data: "2026-09-16", data_fim: "2026-09-18", suspende_aulas: true,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.suspende_aulas).toBe(true);
  });

  it("valor que não é booleano é rejeitado", () => {
    const r = NovoEventoSchema.safeParse({
      ...BASE, data: "2026-09-16", data_fim: null, suspende_aulas: "sim",
    });
    expect(r.success).toBe(false);
  });
});
