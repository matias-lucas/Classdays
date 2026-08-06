// Testa POST /api/eventos e PATCH/DELETE /api/eventos/:id importando os
// handlers direto (mesmo padrão de src/app/api/grade/__tests__/route.test.ts).
// PATCH é novo na E2 (editar sem apagar e recriar).
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { COOKIE_SESSAO, tokenDeSessao } from "@/lib/auth";
import { bancoTemporario } from "@/lib/db/__tests__/tmp";
import { dbLocal } from "@/lib/db/local";
import { PATCH as patchEvento } from "../[id]/route";
import { POST as postEvento } from "../route";

let tmp: ReturnType<typeof bancoTemporario>;

beforeEach(() => {
  process.env.ADMIN_PASSWORD = "senha-de-teste";
  tmp = bancoTemporario();
});

afterEach(async () => {
  await tmp.limpar();
});

function reqAutenticado(method: string, body: unknown, url: string) {
  return new NextRequest(url, {
    method,
    headers: {
      cookie: `${COOKIE_SESSAO}=${tokenDeSessao()}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

const EVENTO_VALIDO = {
  tipo: "evento",
  titulo: "Reunião de teste",
  materia_id: null,
  data: "2027-01-01",
  data_fim: null,
  hora: null,
  observacao: null,
};

describe("PATCH /api/eventos/:id (E2)", () => {
  it("sem cookie devolve 401", async () => {
    const req = new NextRequest("http://localhost/api/eventos/1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(EVENTO_VALIDO),
    });
    const res = await patchEvento(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(401);
  });

  it("id inexistente devolve 404", async () => {
    const req = reqAutenticado(
      "PATCH",
      EVENTO_VALIDO,
      "http://localhost/api/eventos/999999",
    );
    const res = await patchEvento(req, { params: Promise.resolve({ id: "999999" }) });
    expect(res.status).toBe(404);
  });

  it("corpo inválido (data_fim < data) devolve 400", async () => {
    const [existente] = await dbLocal.getEventos();
    const req = reqAutenticado(
      "PATCH",
      { ...EVENTO_VALIDO, data: "2027-01-10", data_fim: "2027-01-01" },
      `http://localhost/api/eventos/${existente.id}`,
    );
    const res = await patchEvento(req, { params: Promise.resolve({ id: String(existente.id) }) });
    expect(res.status).toBe(400);
  });

  it("edita um evento existente preservando id e created_at", async () => {
    const [existente] = await dbLocal.getEventos();
    const req = reqAutenticado(
      "PATCH",
      { ...EVENTO_VALIDO, titulo: "Título corrigido" },
      `http://localhost/api/eventos/${existente.id}`,
    );
    const res = await patchEvento(req, { params: Promise.resolve({ id: String(existente.id) }) });
    expect(res.status).toBe(200);
    const { evento } = await res.json();
    expect(evento.id).toBe(existente.id);
    expect(evento.created_at).toBe(existente.created_at);
    expect(evento.titulo).toBe("Título corrigido");
  });
});

describe("POST /api/eventos com data_fim (E2, sanity)", () => {
  it("cria evento com período (data_fim > data)", async () => {
    const req = reqAutenticado(
      "POST",
      { ...EVENTO_VALIDO, data: "2027-01-04", data_fim: "2027-01-09" },
      "http://localhost/api/eventos",
    );
    const res = await postEvento(req);
    expect(res.status).toBe(201);
    const { evento } = await res.json();
    expect(evento.data_fim).toBe("2027-01-09");
  });
});
