// Mesmo padrão de src/app/api/grade/__tests__/route.test.ts. Cobre os
// passos 16, 17, 20 e 21 do §Passo 6 do docs/PLANO-V2.md.
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { COOKIE_SESSAO, tokenDeSessao } from "@/lib/auth";
import { bancoTemporario } from "@/lib/db/__tests__/tmp";
import { dbLocal } from "@/lib/db/local";
import { DELETE as deleteMateria, PATCH as patchMateria } from "../[id]/route";
import { POST as postMateria } from "../route";

let tmp: ReturnType<typeof bancoTemporario>;

beforeEach(() => {
  process.env.ADMIN_PASSWORD = "senha-de-teste";
  tmp = bancoTemporario();
});

afterEach(async () => {
  await tmp.limpar();
});

const NOVA_MATERIA = { id: "poo1", nome: "POO I", prof: "Prof. Naosei", cor: "#5457C5" };

function reqAutenticado(body: unknown) {
  return new NextRequest("http://localhost/api/materias", {
    method: "POST",
    headers: {
      cookie: `${COOKIE_SESSAO}=${tokenDeSessao()}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/materias", () => {
  it("sem cookie devolve 401", async () => {
    const req = new NextRequest("http://localhost/api/materias", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(NOVA_MATERIA),
    });
    expect((await postMateria(req)).status).toBe(401);
  });

  it("cookie inválido devolve 401", async () => {
    const req = new NextRequest("http://localhost/api/materias", {
      method: "POST",
      headers: { cookie: `${COOKIE_SESSAO}=lixo`, "content-type": "application/json" },
      body: JSON.stringify(NOVA_MATERIA),
    });
    expect((await postMateria(req)).status).toBe(401);
  });

  it("cria a matéria com sessão válida", async () => {
    const res = await postMateria(reqAutenticado(NOVA_MATERIA));
    expect(res.status).toBe(201);
    expect((await dbLocal.getMaterias()).some((m) => m.id === "poo1")).toBe(true);
  });

  it("id repetido devolve 409", async () => {
    const [existente] = await dbLocal.getMaterias();
    const res = await postMateria(reqAutenticado({ ...NOVA_MATERIA, id: existente.id }));
    expect(res.status).toBe(409);
  });
});

describe("DELETE /api/materias/:id", () => {
  it("com aula vinculada devolve 409 e nada é apagado", async () => {
    const [comAula] = await dbLocal.getGrade();
    const req = new NextRequest(`http://localhost/api/materias/${comAula.materia_id}`, {
      method: "DELETE",
      headers: { cookie: `${COOKIE_SESSAO}=${tokenDeSessao()}` },
    });
    const res = await deleteMateria(req, { params: Promise.resolve({ id: comAula.materia_id }) });
    expect(res.status).toBe(409);
    expect((await dbLocal.getMaterias()).some((m) => m.id === comAula.materia_id)).toBe(true);
  });

  it("sem vínculo devolve 200 e some de getMaterias", async () => {
    await postMateria(reqAutenticado(NOVA_MATERIA)); // sem aula/evento apontando pra ela

    const req = new NextRequest("http://localhost/api/materias/poo1", {
      method: "DELETE",
      headers: { cookie: `${COOKIE_SESSAO}=${tokenDeSessao()}` },
    });
    const res = await deleteMateria(req, { params: Promise.resolve({ id: "poo1" }) });
    expect(res.status).toBe(200);
    expect((await dbLocal.getMaterias()).some((m) => m.id === "poo1")).toBe(false);
  });

  it("id inexistente devolve 404", async () => {
    const req = new NextRequest("http://localhost/api/materias/nao-existe", {
      method: "DELETE",
      headers: { cookie: `${COOKIE_SESSAO}=${tokenDeSessao()}` },
    });
    const res = await deleteMateria(req, { params: Promise.resolve({ id: "nao-existe" }) });
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/materias/:id", () => {
  it("edita nome/professor/cor preservando o id", async () => {
    const [existente] = await dbLocal.getMaterias();
    const req = new NextRequest(`http://localhost/api/materias/${existente.id}`, {
      method: "PATCH",
      headers: {
        cookie: `${COOKIE_SESSAO}=${tokenDeSessao()}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ nome: "Nome Corrigido", prof: "Prof. Real", cor: "#12897E" }),
    });
    const res = await patchMateria(req, { params: Promise.resolve({ id: existente.id }) });
    expect(res.status).toBe(200);
    const { materia } = await res.json();
    expect(materia.id).toBe(existente.id);
    expect(materia.nome).toBe("Nome Corrigido");
  });

  it("id inexistente devolve 404", async () => {
    const req = new NextRequest("http://localhost/api/materias/nao-existe", {
      method: "PATCH",
      headers: {
        cookie: `${COOKIE_SESSAO}=${tokenDeSessao()}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ nome: "Materia X", prof: null, cor: "#000000" }),
    });
    const res = await patchMateria(req, { params: Promise.resolve({ id: "nao-existe" }) });
    expect(res.status).toBe(404);
  });
});
