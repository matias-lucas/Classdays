// Mocka o SDK do Anthropic (sem chave, sem rede) pra testar só o SANEAMENTO
// campo a campo que a E2 acrescenta em torno de data_fim — a mesma lógica
// que já protege data/hora/materia_id contra formato inesperado do modelo.
import { describe, expect, it, vi } from "vitest";
import type { Materia } from "@/lib/types";

const parseMock = vi.fn();

vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { parse: parseMock };
  },
}));

const { parseComClaude } = await import("@/lib/parser/claude");

const MATERIAS: Materia[] = [{ id: "bd", nome: "Banco de Dados", prof: null, cor: "#7C4DBB" }];

function respostaClaude(parsed_output: Record<string, unknown>) {
  parseMock.mockResolvedValueOnce({ stop_reason: "end_turn", parsed_output });
}

describe("parseComClaude — saneamento de data_fim (E2)", () => {
  it("data_fim em formato inesperado vira null + aviso; resto da resposta é preservado", async () => {
    respostaClaude({
      tipo: "evento",
      titulo: "Renovação de matrícula",
      materia_id: null,
      data: "2026-08-04",
      data_fim: "não-é-uma-data",
      hora: null,
      observacao: null,
    });

    const r = await parseComClaude("renovação de matrícula de 4/8 a 9/8", {
      hojeIso: "2026-08-01",
      materias: MATERIAS,
    });

    expect(r.evento.data_fim).toBeNull();
    expect(r.evento.data).toBe("2026-08-04");
    expect(r.evento.titulo).toBe("Renovação de matrícula");
    expect(r.avisos.some((a) => a.toLowerCase().includes("final"))).toBe(true);
  });

  it("data_fim <= data também vira null + aviso (nunca derruba a resposta inteira)", async () => {
    respostaClaude({
      tipo: "evento",
      titulo: "Evento mal formado",
      materia_id: null,
      data: "2026-08-09",
      data_fim: "2026-08-04",
      hora: null,
      observacao: null,
    });

    const r = await parseComClaude("evento", { hojeIso: "2026-08-01", materias: MATERIAS });
    expect(r.evento.data_fim).toBeNull();
    expect(r.evento.titulo).toBe("Evento mal formado");
    expect(r.avisos.length).toBeGreaterThan(0);
  });

  it("data_fim válida (> data) é preservada, sem aviso extra", async () => {
    respostaClaude({
      tipo: "evento",
      titulo: "Renovação de matrícula",
      materia_id: null,
      data: "2026-08-04",
      data_fim: "2026-08-09",
      hora: null,
      observacao: null,
    });

    const r = await parseComClaude("renovação de matrícula de 4/8 a 9/8", {
      hojeIso: "2026-08-01",
      materias: MATERIAS,
    });
    expect(r.evento.data_fim).toBe("2026-08-09");
    expect(r.avisos).toHaveLength(0);
  });
});
