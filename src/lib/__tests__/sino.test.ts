import { describe, expect, it } from "vitest";
import {
  JANELA_ESTREIA_MS,
  LIMITE_VISTOS,
  TETO_LIDOS,
  comVistos,
  idsNaoLidos,
  painelPorGrupo,
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
    suspende_aulas: false,
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
  const AGORA = "2026-08-24T18:00:00.000Z";
  /** ISO de N horas atrás em relação a AGORA. */
  const haHoras = (h: number) => new Date(Date.parse(AGORA) - h * 3_600_000).toISOString();

  it("primeira visita: o que é mais velho que a janela de estreia nasce lido", () => {
    const antigo = evento({ id: 1, created_at: haHoras(72) });
    const ontem = evento({ id: 2, created_at: haHoras(30) });
    expect(vistosIniciais([antigo, ontem], null, AGORA)).toEqual([1, 2]);
  });

  it("primeira visita: cadastrado nas últimas 24h é novidade (o caso do celular)", () => {
    // O bug: aluno abrindo o site pela primeira vez recebia TUDO como lido, e
    // o evento cadastrado minutos antes não acendia ponto nenhum.
    const velho = evento({ id: 1, created_at: haHoras(48) });
    const recente = evento({ id: 2, created_at: haHoras(2) });
    expect(vistosIniciais([velho, recente], null, AGORA)).toEqual([1]);
  });

  it("primeira visita: a borda dos 24h conta como já lida", () => {
    const naBorda = evento({ id: 1, created_at: haHoras(JANELA_ESTREIA_MS / 3_600_000) });
    const umMinutoDepois = evento({ id: 2, created_at: haHoras(23.98) });
    expect(vistosIniciais([naBorda, umMinutoDepois], null, AGORA)).toEqual([1]);
  });

  it("primeira visita: created_at com offset do Postgres é lido por instante, não por string", () => {
    // "+00:00" e "Z" comparam diferente como texto; como instante, não.
    const pg = evento({ id: 1, created_at: "2026-08-21T18:00:00.123456+00:00" });
    const pgRecente = evento({ id: 2, created_at: "2026-08-24T17:00:00.123456+00:00" });
    expect(vistosIniciais([pg, pgRecente], null, AGORA)).toEqual([1]);
  });

  it("primeira visita sem novidade nenhuma na janela: sino calado, tudo lido", () => {
    const janela = [evento({ id: 1, created_at: haHoras(100) }), evento({ id: 2, created_at: haHoras(99) })];
    expect(vistosIniciais(janela, null, AGORA)).toEqual([1, 2]);
  });

  it("migrando da v1: o que chegou depois da última visita continua novo", () => {
    const antes = evento({ id: 1, created_at: "2026-07-01T10:00:00.000Z" });
    const depois = evento({ id: 2, created_at: "2026-07-03T10:00:00.000Z" });
    expect(vistosIniciais([antes, depois], "2026-07-02T00:00:00.000Z", AGORA)).toEqual([1]);
  });

  it("migrando da v1: evento criado no instante exato da visita conta como visto", () => {
    const e = evento({ id: 1, created_at: "2026-07-02T00:00:00.000Z" });
    expect(vistosIniciais([e], "2026-07-02T00:00:00.000Z", AGORA)).toEqual([1]);
  });

  it("migrando da v1: a última visita manda, mesmo sendo muito mais velha que 24h", () => {
    // Quem já esteve aqui é medido pelo que viu — a janela de estreia não
    // encurta o histórico dele.
    const e = evento({ id: 1, created_at: haHoras(48) });
    expect(vistosIniciais([e], "2026-01-01T00:00:00.000Z", AGORA)).toEqual([]);
  });

  it("corte ilegível cai na baseline conservadora: tudo lido, sem badge de agenda inteira", () => {
    const janela = [evento({ id: 1, created_at: haHoras(1) }), evento({ id: 2 })];
    expect(vistosIniciais(janela, "vixe", AGORA)).toEqual([1, 2]);
    expect(vistosIniciais(janela, null, "nao é data")).toEqual([1, 2]);
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

describe("painelPorGrupo", () => {
  const janela = [1, 2, 3, 4, 5].map((id) => evento({ id }));

  it("novidades vêm em cima, já vistas embaixo", () => {
    const { novos, lidos } = painelPorGrupo(janela, new Set([2, 4]));
    expect(novos.map((e) => e.id)).toEqual([2, 4]);
    expect(lidos.map((e) => e.id)).toEqual([1, 3, 5]);
  });

  it("dentro de cada grupo a ordem de entrada (cronológica) é preservada", () => {
    const { novos } = painelPorGrupo(janela, new Set([5, 1, 3]));
    expect(novos.map((e) => e.id)).toEqual([1, 3, 5]);
  });

  it("mostra todos os não lidos, mesmo passando do teto", () => {
    const { novos } = painelPorGrupo(janela, new Set([1, 2, 3, 4, 5]), 2);
    expect(novos.map((e) => e.id)).toEqual([1, 2, 3, 4, 5]);
  });

  it("corta os já lidos no teto, sem mexer nos não lidos", () => {
    const { novos, lidos } = painelPorGrupo(janela, new Set([5]), 2);
    expect(novos.map((e) => e.id)).toEqual([5]);
    expect(lidos.map((e) => e.id)).toEqual([1, 2]);
  });

  it("nada a mostrar devolve os dois grupos vazios", () => {
    expect(painelPorGrupo([], new Set())).toEqual({ novos: [], lidos: [] });
  });

  it("já vistas vêm por ordem de cadastro, mais recente primeiro — não por data do evento", () => {
    // e2 acontece antes de e1, mas foi cadastrado depois: no grupo "Já
    // vistas" isso não é a agenda de novo, é aviso — quem avisou por último
    // vem em cima.
    const e1 = evento({ id: 1, data: "2026-07-08", created_at: "2026-07-01T00:00:00.000Z" });
    const e2 = evento({ id: 2, data: "2026-07-05", created_at: "2026-07-10T00:00:00.000Z" });
    const e3 = evento({ id: 3, data: "2026-07-20", created_at: "2026-07-05T00:00:00.000Z" });
    const { lidos } = painelPorGrupo([e1, e2, e3], new Set());
    expect(lidos.map((e) => e.id)).toEqual([2, 3, 1]);
  });

  it("o teto padrão deixa passar oito já vistas", () => {
    const muitos = Array.from({ length: 20 }, (_, i) => evento({ id: i + 1 }));
    expect(painelPorGrupo(muitos, new Set()).lidos).toHaveLength(TETO_LIDOS);
  });
});

/**
 * As três peças são certas em separado e erravam juntas — a baseline marcava
 * como lida a novidade que `idsNaoLidos` acabaria de receber. Este bloco
 * refaz o caminho do aluno na ordem em que o hook chama cada uma.
 */
describe("o roteiro do aluno (as peças encadeadas)", () => {
  const AGORA = "2026-08-24T18:00:00.000Z";
  const haHoras = (h: number) => new Date(Date.parse(AGORA) - h * 3_600_000).toISOString();

  const velho = evento({ id: 1, created_at: haHoras(200) });
  const recem = evento({ id: 2, created_at: haHoras(0.2) });
  const janela = [velho, recem];

  it("estreia no celular, evento cadastrado minutos antes: badge de 1 e ele em Novidades", () => {
    const naoLidos = idsNaoLidos(janela, vistosIniciais(janela, null, AGORA));
    expect(naoLidos).toEqual(new Set([2]));
    const { novos, lidos } = painelPorGrupo(janela, naoLidos);
    expect(novos.map((e) => e.id)).toEqual([2]);
    expect(lidos.map((e) => e.id)).toEqual([1]);
  });

  it("abrir o painel apaga o badge e nada do que já era velho volta", () => {
    const depoisDeAbrir = comVistos(vistosIniciais(janela, null, AGORA), janela);
    expect(idsNaoLidos(janela, depoisDeAbrir).size).toBe(0);
  });

  it("quem já entrou uma vez recebe TODA novidade, sem prazo de 24h", () => {
    // Estreia + painel aberto: daqui pra frente quem manda é a lista de ids, e
    // ela não tem janela. O evento que aparecer amanhã é novo mesmo que o
    // aluno só volte ao site na semana seguinte.
    const guardados = comVistos(vistosIniciais(janela, null, AGORA), janela);
    const cadastradoDepois = evento({ id: 3, created_at: "2026-08-31T09:00:00.000Z" });
    expect(idsNaoLidos([...janela, cadastradoDepois], guardados)).toEqual(new Set([3]));
  });
});
