// Testa as rotas /api/grade e /api/grade/:id importando os handlers direto
// (sem servidor HTTP) e chamando com um NextRequest montado à mão — inclui
// o cookie de sessão real, então a checagem de auth (§Passo 0.4) roda de
// verdade. Cobre os passos 16-19 do §Passo 6 do docs/PLANO-V2.md.
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { COOKIE_SESSAO, tokenDeSessao } from "@/lib/auth";
import { bancoTemporario } from "@/lib/db/__tests__/tmp";
import { dbLocal } from "@/lib/db/local";
import { DELETE as deleteAula, PATCH as patchAula } from "../[id]/route";
import { POST as postGrade } from "../route";

let tmp: ReturnType<typeof bancoTemporario>;

beforeEach(() => {
  process.env.ADMIN_PASSWORD = "senha-de-teste";
  tmp = bancoTemporario();
});

afterEach(async () => {
  await tmp.limpar();
});

function reqAutenticado(body: unknown, url = "http://localhost/api/grade") {
  return new NextRequest(url, {
    method: "POST",
    headers: {
      cookie: `${COOKIE_SESSAO}=${tokenDeSessao()}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function reqSemSessao(body: unknown, url = "http://localhost/api/grade") {
  return new NextRequest(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/grade", () => {
  it("sem cookie devolve 401", async () => {
    const res = await postGrade(reqSemSessao({}));
    expect(res.status).toBe(401);
  });

  it("cookie inválido devolve 401", async () => {
    const req = new NextRequest("http://localhost/api/grade", {
      method: "POST",
      headers: { cookie: `${COOKIE_SESSAO}=lixo`, "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect((await postGrade(req)).status).toBe(401);
  });

  it("matéria inexistente devolve 400", async () => {
    const res = await postGrade(
      reqAutenticado({
        materia_id: "nao-existe",
        dia_semana: 1,
        hora_ini: "07:00",
        hora_fim: "07:50",
        sala: null,
      }),
    );
    expect(res.status).toBe(400);
  });

  it("cria a aula com sessão válida e dados corretos", async () => {
    const [materia] = await dbLocal.getMaterias();
    const res = await postGrade(
      reqAutenticado({
        materia_id: materia.id,
        dia_semana: 1,
        hora_ini: "07:00",
        hora_fim: "07:50",
        sala: null,
      }),
    );
    expect(res.status).toBe(201);
    const { aula } = await res.json();
    expect(aula.materia_id).toBe(materia.id);
  });

  it("horário duplicado devolve 409", async () => {
    const [existente] = await dbLocal.getGrade();
    const res = await postGrade(
      reqAutenticado({
        materia_id: existente.materia_id,
        dia_semana: existente.dia_semana,
        hora_ini: existente.hora_ini,
        hora_fim: existente.hora_fim,
        sala: "Outra sala",
      }),
    );
    expect(res.status).toBe(409);
  });
});

describe("PATCH e DELETE /api/grade/:id", () => {
  it("PATCH sem cookie devolve 401", async () => {
    const res = await patchAula(reqSemSessao({}), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(401);
  });

  it("DELETE de id inexistente devolve 404", async () => {
    const req = new NextRequest("http://localhost/api/grade/999999", {
      method: "DELETE",
      headers: { cookie: `${COOKIE_SESSAO}=${tokenDeSessao()}` },
    });
    const res = await deleteAula(req, { params: Promise.resolve({ id: "999999" }) });
    expect(res.status).toBe(404);
  });

  it("DELETE de aula existente devolve 200 e some da grade", async () => {
    const [existente] = await dbLocal.getGrade();
    const req = new NextRequest(`http://localhost/api/grade/${existente.id}`, {
      method: "DELETE",
      headers: { cookie: `${COOKIE_SESSAO}=${tokenDeSessao()}` },
    });
    const res = await deleteAula(req, { params: Promise.resolve({ id: String(existente.id) }) });
    expect(res.status).toBe(200);
    expect((await dbLocal.getGrade()).some((a) => a.id === existente.id)).toBe(false);
  });
});
