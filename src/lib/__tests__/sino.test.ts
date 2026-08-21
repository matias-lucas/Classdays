import { describe, expect, it } from "vitest";
import {
  LIMITE_VISTOS,
  TETO_LIDOS,
  comVistos,
  idsNaoLidos,
  listaDoPainel,
  parseVistos,
  vistosIniciais,
} from "@/lib/sino";
import type { Evento } from "@/lib/types";

function evento(parcial: Partial<Evento> & Pick<Evento, "id">): Evento {
  return {
    tipo: "prova",
    titulo: "—",
    materia_id: null,
    data: "2026-07-08",
    data_fim: null,
    hora: null,
    enfase: "ambos",
    observacao: null,
    created_at: "2026-07-01T00:00:00.000Z",
    ...parcial,
  };
}

describe("idsNaoLidos", () => {
  it("marca como novo só quem não está na lista de vistos", () => {
    const janela = [evento({ id: 1 }), evento({ id: 2 }), evento({ id: 3 })];
    expect(idsNaoLidos(janela, [1, 3])).toEqual(new Set([2]));
  });

  it("sem nada visto, a janela inteira é nova", () => {
    const janela = [evento({ id: 1 }), evento({ id: 2 })];
    expect(idsNaoLidos(janela, [])).toEqual(new Set([1, 2]));
  });

  it("id visto que já saiu da janela não inventa novidade", () => {
    expect(idsNaoLidos([evento({ id: 9 })], [1, 2, 9])).toEqual(new Set());
  });

  it("evento distante cadastrado agora conta como novo (o caso do XI OLINFEG)", () => {
    // Data lá na frente e created_at de hoje: com a janela de 7 dias ele nunca
    // virava novidade, e com a baseline por timestamp nasceria lido.
    const distante = evento({ id: 38, data: "2026-09-16", created_at: "2026-08-21T15:22:00.000Z" });
    expect(idsNaoLidos([distante], [1, 2])).toEqual(new Set([38]));
  });
});

describe("comVistos", () => {
  it("soma a janela aos vistos anteriores, sem repetir", () => {
    expect(comVistos([1, 2], [evento({ id: 2 }), evento({ id: 3 })])).toEqual([1, 2, 3]);
  });

  it("janela vazia não mexe na lista", () => {
    expect(comVistos([1, 2], [])).toEqual([1, 2]);
  });

  it("respeita o teto, descartando os mais antigos", () => {
    const antigos = Array.from({ length: LIMITE_VISTOS }, (_, i) => i + 1);
    const proximos = comVistos(antigos, [evento({ id: 9001 })]);
    expect(proximos).toHaveLength(LIMITE_VISTOS);
    expect(proximos.at(-1)).toBe(9001);
    expect(proximos).not.toContain(1); // o mais velho caiu
    expect(proximos).toContain(2);
  });
});

describe("vistosIniciais", () => {
  it("primeira visita: a janela inteira nasce lida (nada de badge no primeiro acesso)", () => {
    const janela = [evento({ id: 1 }), evento({ id: 2 })];
    expect(vistosIniciais(janela, null)).toEqual([1, 2]);
  });

  it("migrando da v1: o que chegou depois da última visita continua novo", () => {
    const antes = evento({ id: 1, created_at: "2026-07-01T10:00:00.000Z" });
    const depois = evento({ id: 2, created_at: "2026-07-03T10:00:00.000Z" });
    expect(vistosIniciais([antes, depois], "2026-07-02T00:00:00.000Z")).toEqual([1]);
  });

  it("migrando da v1: evento criado no instante exato da visita conta como visto", () => {
    const e = evento({ id: 1, created_at: "2026-07-02T00:00:00.000Z" });
    expect(vistosIniciais([e], "2026-07-02T00:00:00.000Z")).toEqual([1]);
  });
});

describe("parseVistos", () => {
  it("lê a lista guardada", () => {
    expect(parseVistos("[1,2,3]")).toEqual([1, 2, 3]);
  });

  it("chave ausente ou vazia devolve null (quem chama aplica a baseline)", () => {
    expect(parseVistos(null)).toBeNull();
    expect(parseVistos("")).toBeNull();
  });

  it("JSON quebrado ou de outro formato devolve null", () => {
    expect(parseVistos("{oi")).toBeNull();
    expect(parseVistos('"2026-07-01T00:00:00.000Z"')).toBeNull(); // valor da v1
    expect(parseVistos('{"a":1}')).toBeNull();
  });

  it("lista vazia é estado válido (tudo lido), não baseline", () => {
    expect(parseVistos("[]")).toEqual([]);
  });

  it("descarta entradas que não são id", () => {
    expect(parseVistos('[1,"2",null,3]')).toEqual([1, 3]);
  });
});

describe("listaDoPainel", () => {
  const janela = [1, 2, 3, 4, 5].map((id) => evento({ id }));

  it("mostra todos os não lidos, mesmo passando do teto de lidos", () => {
    const naoLidos = new Set([1, 2, 3, 4, 5]);
    expect(listaDoPainel(janela, naoLidos, 2).map((e) => e.id)).toEqual([1, 2, 3, 4, 5]);
  });

  it("corta os já lidos no teto, preservando a ordem de entrada", () => {
    expect(listaDoPainel(janela, new Set(), 2).map((e) => e.id)).toEqual([1, 2]);
  });

  it("o teto conta só os lidos — o não lido do fim não é empurrado pra fora", () => {
    const naoLidos = new Set([5]);
    expect(listaDoPainel(janela, naoLidos, 2).map((e) => e.id)).toEqual([1, 2, 5]);
  });

  it("nada a mostrar continua vazio", () => {
    expect(listaDoPainel([], new Set())).toEqual([]);
  });

  it("o teto padrão deixa passar oito lidos", () => {
    const muitos = Array.from({ length: 20 }, (_, i) => evento({ id: i + 1 }));
    expect(listaDoPainel(muitos, new Set())).toHaveLength(TETO_LIDOS);
  });
});
