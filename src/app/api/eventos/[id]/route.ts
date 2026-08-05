import { NextRequest, NextResponse } from "next/server";
import { erro, exigirSessao } from "@/lib/api";
import { db } from "@/lib/db";

/** DELETE /api/eventos/:id — remove um evento (só o admin). */
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const naoAutorizado = exigirSessao(req);
  if (naoAutorizado) return naoAutorizado;

  const { id } = await ctx.params; // no App Router novo, params é assíncrono
  const idNum = Number(id);
  if (!Number.isInteger(idNum) || idNum <= 0) {
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
