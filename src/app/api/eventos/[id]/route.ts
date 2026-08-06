import { NextRequest, NextResponse } from "next/server";
import { corpoValidado, erro, exigirSessao, materiaExiste } from "@/lib/api";
import { db } from "@/lib/db";
import { NovoEventoSchema } from "@/lib/parser/schema";

function idValido(id: string): number | null {
  const idNum = Number(id);
  return Number.isInteger(idNum) && idNum > 0 ? idNum : null;
}

/** DELETE /api/eventos/:id — remove um evento (só o admin). */
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const naoAutorizado = exigirSessao(req);
  if (naoAutorizado) return naoAutorizado;

  const { id } = await ctx.params; // no App Router novo, params é assíncrono
  const idNum = idValido(id);
  if (idNum === null) {
    return erro("Id inválido.", 400);
  }

  try {
    await db.deleteEvento(idNum);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[/api/eventos/:id] falha ao apagar:", e);
    return erro("Não consegui apagar. Veja o terminal do servidor.", 500);
  }
}

/** PATCH /api/eventos/:id — corrige um evento existente sem apagar e recriar. */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const naoAutorizado = exigirSessao(req);
  if (naoAutorizado) return naoAutorizado;

  const { id } = await ctx.params;
  const idNum = idValido(id);
  if (idNum === null) {
    return erro("Id inválido.", 400);
  }

  const corpo = await corpoValidado(
    req,
    NovoEventoSchema,
    (faltas) => `Evento incompleto ou inválido (${faltas}).`,
  );
  if (!corpo.ok) return corpo.resposta;
  const campos = corpo.dados;

  if (campos.materia_id !== null && !(await materiaExiste(campos.materia_id))) {
    return erro(`Matéria desconhecida: ${campos.materia_id}`, 400);
  }

  try {
    const evento = await db.updateEvento(idNum, campos);
    if (!evento) return erro("Evento não encontrado.", 404);
    return NextResponse.json({ evento });
  } catch (e) {
    console.error("[/api/eventos/:id] falha ao editar:", e);
    return erro("Não consegui salvar. Veja o terminal do servidor.", 500);
  }
}
