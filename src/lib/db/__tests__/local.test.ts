import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ConflitoBanco } from "../index";
import { dbLocal } from "../local";
import { bancoTemporario } from "./tmp";

let tmp: ReturnType<typeof bancoTemporario>;

beforeEach(() => {
  tmp = bancoTemporario();
});

afterEach(async () => {
  await tmp.limpar();
});

describe("dbLocal — grade", () => {
  it("addAula gera id sequencial e persiste no arquivo temporário", async () => {
    const antes = await dbLocal.getGrade();
    const proximoId = antes.reduce((max, a) => Math.max(max, a.id), 0) + 1;

    const aula = await dbLocal.addAula({
      materia_id: antes[0].materia_id,
      dia_semana: 1,
      hora_ini: "07:00",
      hora_fim: "07:50",
      sala: null,
    });

    expect(aula.id).toBe(proximoId);
    const depois = await dbLocal.getGrade();
    expect(depois.some((a) => a.id === aula.id)).toBe(true);
  });

  it("getGrade devolve ordenado por dia e hora", async () => {
    const grade = await dbLocal.getGrade();
    for (let i = 1; i < grade.length; i++) {
      const anterior = grade[i - 1];
      const atual = grade[i];
      const emOrdem =
        anterior.dia_semana < atual.dia_semana ||
        (anterior.dia_semana === atual.dia_semana && anterior.hora_ini <= atual.hora_ini);
      expect(emOrdem).toBe(true);
    }
  });

  it("updateAula de id inexistente devolve null", async () => {
    const resultado = await dbLocal.updateAula(999999, {
      materia_id: "alglin",
      dia_semana: 1,
      hora_ini: "07:00",
      hora_fim: "07:50",
      sala: null,
    });
    expect(resultado).toBeNull();
  });

  it("deleteAula de id inexistente devolve false", async () => {
    expect(await dbLocal.deleteAula(999999)).toBe(false);
  });

  it("addAula rejeita horário duplicado (mesma matéria, dia e hora_ini)", async () => {
    const [existente] = await dbLocal.getGrade();
    await expect(
      dbLocal.addAula({
        materia_id: existente.materia_id,
        dia_semana: existente.dia_semana,
        hora_ini: existente.hora_ini,
        hora_fim: existente.hora_fim,
        sala: "Outra sala",
      }),
    ).rejects.toThrow(ConflitoBanco);
  });
});

describe("dbLocal — matérias", () => {
  it("addMateria + getMaterias ordenadas por nome", async () => {
    await dbLocal.addMateria({ id: "zzz", nome: "Zeta", prof: null, cor: "#123456" });
    await dbLocal.addMateria({ id: "aaa", nome: "Alfa", prof: null, cor: "#654321" });

    const nomes = (await dbLocal.getMaterias()).map((m) => m.nome);
    expect(nomes).toEqual([...nomes].sort((a, b) => a.localeCompare(b)));
  });

  it("updateMateria preserva o id mesmo se vier outro no corpo", async () => {
    await dbLocal.addMateria({ id: "bd2", nome: "BD2", prof: "Prof. Kenyo", cor: "#111111" });

    const editada = await dbLocal.updateMateria("bd2", {
      nome: "Banco de Dados II",
      prof: "Prof. Kenyo",
      cor: "#222222",
    });

    expect(editada?.id).toBe("bd2");
    expect(editada?.nome).toBe("Banco de Dados II");
  });

  it("updateMateria de id inexistente devolve null", async () => {
    const resultado = await dbLocal.updateMateria("nao-existe", {
      nome: "X",
      prof: null,
      cor: "#000000",
    });
    expect(resultado).toBeNull();
  });

  it("deleteMateria de id inexistente devolve false", async () => {
    expect(await dbLocal.deleteMateria("nao-existe")).toBe(false);
  });

  it("contarUsos conta aulas e eventos separadamente", async () => {
    await dbLocal.addMateria({ id: "poo1", nome: "POO I", prof: null, cor: "#333333" });
    await dbLocal.addAula({
      materia_id: "poo1",
      dia_semana: 3,
      hora_ini: "07:00",
      hora_fim: "07:50",
      sala: null,
    });

    const usos = await dbLocal.contarUsos("poo1");
    expect(usos.aulas).toBe(1);
    expect(usos.eventos).toBe(0);
  });

  it("addMateria rejeita id repetido", async () => {
    const [existente] = await dbLocal.getMaterias();
    await expect(
      dbLocal.addMateria({ id: existente.id, nome: "Duplicada", prof: null, cor: "#000000" }),
    ).rejects.toThrow(ConflitoBanco);
  });

  it("seed não é mutado entre dois bancos temporários (regressão do 0.1)", async () => {
    await dbLocal.addMateria({ id: "novaid", nome: "Nova", prof: null, cor: "#444444" });

    await tmp.limpar();
    tmp = bancoTemporario();

    const materias = await dbLocal.getMaterias();
    expect(materias.some((m) => m.id === "novaid")).toBe(false);
  });
});
