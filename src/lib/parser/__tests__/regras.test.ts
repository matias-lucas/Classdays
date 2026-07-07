import { describe, expect, it } from "vitest";
import { parseComRegras } from "@/lib/parser/regras";
import type { Materia } from "@/lib/types";

// "Hoje" fixo em todos os testes: terça-feira, 07/07/2026.
const HOJE = "2026-07-07";

const MATERIAS: Materia[] = [
  { id: "alglin", nome: "Álgebra Linear", prof: null, cor: "#5457C5" },
  { id: "calc", nome: "Cálculo II", prof: null, cor: "#12897E" },
  { id: "edados", nome: "Estrutura de Dados", prof: null, cor: "#C77A0E" },
  { id: "req", nome: "Eng. de Requisitos", prof: null, cor: "#C13F7A" },
  { id: "bd", nome: "Banco de Dados", prof: null, cor: "#7C4DBB" },
];

function parse(frase: string) {
  return parseComRegras(frase, { hojeIso: HOJE, materias: MATERIAS });
}

describe("as frases-exemplo do CLAUDE.md", () => {
  it("dia 13/07 haverá prova de álgebra linear", () => {
    const r = parse("dia 13/07 haverá prova de álgebra linear");
    expect(r.evento).toMatchObject({
      tipo: "prova",
      materia_id: "alglin",
      data: "2026-07-13",
      hora: null,
    });
    expect(r.avisos).toHaveLength(0);
  });

  it("na próxima terça não haverá aula", () => {
    const r = parse("na próxima terça não haverá aula");
    expect(r.evento).toMatchObject({
      tipo: "cancelamento",
      materia_id: null, // dia inteiro
      data: "2026-07-14", // hoje É terça → a PRÓXIMA é daqui a 7 dias
      titulo: "Não haverá aula",
    });
  });
});

describe("datas", () => {
  it("dd/mm com ano explícito", () => {
    expect(parse("prova de cálculo 13/08/2026 às 19h").evento.data).toBe("2026-08-13");
  });

  it("'13 de agosto' por extenso", () => {
    expect(parse("prova de cálculo 13 de agosto").evento.data).toBe("2026-08-13");
  });

  it("'dia 20' sem mês → dia 20 deste mês", () => {
    expect(parse("prova de estrutura de dados dia 20").evento.data).toBe("2026-07-20");
  });

  it("'dia 5' que já passou → mês que vem", () => {
    expect(parse("entrega do trabalho dia 5").evento.data).toBe("2026-08-05");
  });

  it("dd/mm que já passou no ano → ano que vem, com aviso", () => {
    const r = parse("prova dia 05/01");
    expect(r.evento.data).toBe("2027-01-05");
    expect(r.avisos.some((a) => a.includes("2027"))).toBe(true);
  });

  it("amanhã / depois de amanhã / hoje", () => {
    expect(parse("amanhã não haverá aula").evento.data).toBe("2026-07-08");
    expect(parse("reunião depois de amanhã").evento.data).toBe("2026-07-09");
    expect(parse("hoje não haverá aula").evento.data).toBe(HOJE);
  });

  it("dia da semana simples pega a ocorrência desta semana", () => {
    expect(parse("prova de requisitos na quinta").evento.data).toBe("2026-07-09");
    expect(parse("aula de banco de dados cancelada na sexta").evento.data).toBe("2026-07-10");
  });

  // Semântica escolhida: "próxima X" / "X que vem" = a PRÓXIMA ocorrência
  // (nunca hoje). Dito numa terça, "sexta que vem" é a sexta desta semana —
  // é assim que se fala. O preview mostra a data resolvida, então qualquer
  // ambiguidade fica visível antes de salvar.
  it("'que vem' e 'próxima' pegam a ocorrência seguinte (nunca hoje)", () => {
    expect(parse("entrega do projeto de banco de dados sexta que vem").evento.data).toBe(
      "2026-07-10",
    );
    expect(parse("prova de álgebra na próxima segunda").evento.data).toBe("2026-07-13");
    // hoje é terça: "próxima terça" pula pra semana que vem
    expect(parse("prova de cálculo na próxima terça").evento.data).toBe("2026-07-14");
  });

  it("dd/mm ganha do dia da semana quando os dois aparecem", () => {
    expect(parse("prova sexta-feira dia 24/07").evento.data).toBe("2026-07-24");
  });

  it("sem data → null + aviso (nunca inventa)", () => {
    const r = parse("prova de álgebra linear");
    expect(r.evento.data).toBeNull();
    expect(r.avisos.some((a) => a.toLowerCase().includes("data"))).toBe(true);
  });
});

describe("horas", () => {
  it("formatos comuns", () => {
    expect(parse("prova amanhã às 19h").evento.hora).toBe("19:00");
    expect(parse("prova amanhã as 19h30").evento.hora).toBe("19:30");
    expect(parse("prova amanhã 19:00").evento.hora).toBe("19:00");
    expect(parse("entrega amanhã às 23h59").evento.hora).toBe("23:59");
    expect(parse("reunião amanhã às 10 horas").evento.hora).toBe("10:00");
  });

  it("sem hora → null (sem aviso: hora é opcional)", () => {
    const r = parse("prova de cálculo dia 23/07");
    expect(r.evento.hora).toBeNull();
    expect(r.avisos).toHaveLength(0);
  });

  it("não confunde a data dd/mm com hora", () => {
    const r = parse("prova dia 13/07");
    expect(r.evento.hora).toBeNull();
    expect(r.evento.data).toBe("2026-07-13");
  });
});

describe("tipos", () => {
  it.each([
    ["prova de cálculo amanhã", "prova"],
    ["avaliação de requisitos amanhã", "prova"],
    ["entrega do projeto amanhã", "trabalho"],
    ["seminário de requisitos amanhã", "trabalho"],
    ["lista de exercícios amanhã", "atividade"],
    ["atividade valendo nota amanhã", "atividade"],
    ["palestra sobre carreira amanhã", "evento"],
    ["amanhã não haverá aula", "cancelamento"],
    ["aula de cálculo cancelada amanhã", "cancelamento"],
    ["não teremos aula amanhã", "cancelamento"],
  ])("%s → %s", (frase, esperado) => {
    expect(parse(frase).evento.tipo).toBe(esperado);
  });
});

describe("matérias", () => {
  it("nome completo ganha de token parcial ('dados' aparece em duas)", () => {
    expect(parse("entrega do projeto de banco de dados amanhã").evento.materia_id).toBe("bd");
    expect(parse("prova de estrutura de dados amanhã").evento.materia_id).toBe("edados");
  });

  it("token forte único identifica ('álgebra', 'cálculo', 'requisitos')", () => {
    expect(parse("prova de álgebra amanhã").evento.materia_id).toBe("alglin");
    expect(parse("prova de cálculo amanhã").evento.materia_id).toBe("calc");
    expect(parse("entrega de requisitos amanhã").evento.materia_id).toBe("req");
  });

  it("id curto citado direto", () => {
    expect(parse("prova de bd amanhã").evento.materia_id).toBe("bd");
  });

  it("matéria desconhecida → null + aviso quando o tipo pede matéria", () => {
    const r = parse("prova de física quântica amanhã");
    expect(r.evento.materia_id).toBeNull();
    expect(r.avisos.some((a) => a.toLowerCase().includes("matéria"))).toBe(true);
  });

  it("cancelamento de matéria específica vs dia inteiro", () => {
    expect(parse("amanhã não haverá aula de cálculo").evento.materia_id).toBe("calc");
    expect(parse("amanhã não haverá aula").evento.materia_id).toBeNull();
  });
});

describe("títulos", () => {
  it("tipos com título padrão", () => {
    expect(parse("prova de cálculo amanhã").evento.titulo).toBe("Prova");
    expect(parse("entrega do projeto amanhã").evento.titulo).toBe("Entrega de trabalho");
    expect(parse("lista de sql amanhã").evento.titulo).toBe("Lista de exercícios");
    expect(parse("amanhã não haverá aula de cálculo").evento.titulo).toBe("Aula cancelada");
  });

  it("evento genérico usa a própria frase, sem data/hora", () => {
    const r = parse("semana acadêmica dia 22/07");
    expect(r.evento.titulo).toBe("Semana acadêmica");
    const r2 = parse("reunião com o coordenador depois de amanhã às 10h");
    expect(r2.evento.titulo).toBe("Reunião com o coordenador");
  });
});
