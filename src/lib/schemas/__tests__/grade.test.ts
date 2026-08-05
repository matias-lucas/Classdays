import { describe, expect, it } from "vitest";
import { NovaAulaSchema, NovaMateriaSchema, slugDeNome } from "../grade";

describe("NovaAulaSchema", () => {
  const base = {
    materia_id: "bd",
    dia_semana: 2,
    hora_ini: "19:00",
    hora_fim: "20:40",
    sala: "Lab 2",
  };

  it("hora_fim igual ou antes de hora_ini é inválido", () => {
    expect(NovaAulaSchema.safeParse({ ...base, hora_fim: "19:00" }).success).toBe(false); // igual
    expect(NovaAulaSchema.safeParse({ ...base, hora_ini: "20:40", hora_fim: "19:00" }).success).toBe(
      false,
    ); // invertido
  });

  it("hora_fim depois de hora_ini é válido", () => {
    expect(NovaAulaSchema.safeParse(base).success).toBe(true);
  });

  it.each([0, 6, 7])("dia_semana %i é inválido", (dia) => {
    expect(NovaAulaSchema.safeParse({ ...base, dia_semana: dia }).success).toBe(false);
  });

  it.each([1, 5])("dia_semana %i é válido", (dia) => {
    expect(NovaAulaSchema.safeParse({ ...base, dia_semana: dia }).success).toBe(true);
  });

  it.each(["24:00", "9:00", "19:60"])("hora %s é inválida", (hora) => {
    expect(NovaAulaSchema.safeParse({ ...base, hora_ini: hora }).success).toBe(false);
  });

  it("hora 09:00 é válida", () => {
    expect(NovaAulaSchema.safeParse({ ...base, hora_ini: "09:00", hora_fim: "10:00" }).success).toBe(
      true,
    );
  });

  it("campos extras no corpo são descartados pelo zod", () => {
    const resultado = NovaAulaSchema.parse({
      ...base,
      id: 999,
      created_at: "2026-01-01T00:00:00.000Z",
    });
    expect(resultado).not.toHaveProperty("id");
    expect(resultado).not.toHaveProperty("created_at");
  });
});

describe("NovaMateriaSchema", () => {
  const base = { id: "bd2", nome: "Banco de Dados II", prof: "Prof. Kenyo", cor: "#5457C5" };

  it.each(["BD2", "2bd", "bd-2", "b", "a".repeat(17)])("id %s é inválido", (id) => {
    expect(NovaMateriaSchema.safeParse({ ...base, id }).success).toBe(false);
  });

  it("id bd2 é válido", () => {
    expect(NovaMateriaSchema.safeParse(base).success).toBe(true);
  });

  it.each(["#FFF", "vermelho", "#GGGGGG"])("cor %s é inválida", (cor) => {
    expect(NovaMateriaSchema.safeParse({ ...base, cor }).success).toBe(false);
  });

  it("cor #5457C5 é válida", () => {
    expect(NovaMateriaSchema.safeParse(base).success).toBe(true);
  });
});

describe("slugDeNome", () => {
  it("remove acentos e usa a primeira palavra", () => {
    expect(slugDeNome("Programação Orientada a Objetos I")).toBe("programacao");
    expect(slugDeNome("Álgebra Linear")).toBe("algebra");
  });

  it("ignora espaços extras entre palavras", () => {
    expect(slugDeNome("  Banco   de Dados")).toBe("banco");
  });

  it("mantém número no fim da palavra", () => {
    expect(slugDeNome("Calculo2 Avancado")).toBe("calculo2");
  });

  it("nome de 1 letra vira slug de 2 caracteres (regra mínima do id)", () => {
    const slug = slugDeNome("A");
    expect(slug).toMatch(/^[a-z][a-z0-9]$/);
  });

  it("prefixa com letra quando a palavra começa em número", () => {
    const slug = slugDeNome("2Materia Extra");
    expect(slug).toMatch(/^[a-z]/);
  });

  it("sempre produz um id que passa no regex do id de matéria", () => {
    const ID_MATERIA = /^[a-z][a-z0-9]{1,15}$/;
    for (const nome of ["Programação Orientada a Objetos I", "A", "2Materia", "Cálculo II"]) {
      expect(slugDeNome(nome)).toMatch(ID_MATERIA);
    }
  });
});
