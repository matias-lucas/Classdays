import { NextRequest, NextResponse } from "next/server";
import { COOKIE_SESSAO, sessaoValida } from "@/lib/auth";
import { db } from "@/lib/db";

/** DELETE /api/eventos/:id — remove um evento (só o admin). */
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!sessaoValida(req.cookies.get(COOKIE_SESSAO)?.value)) {
    return NextResponse.json({ erro: "Faça login para usar o admin." }, { status: 401 });
  }

  const { id } = await ctx.params; // no App Router novo, params é assíncrono
  const idNum = Number(id);
  if (!Number.isInteger(idNum) || idNum <= 0) {
    return NextResponse.json({ erro: "Id inválido." }, { status: 400 });
  }

  try {
    await db.deleteEvento(idNum);
    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error("[/api/eventos/:id] falha ao apagar:", erro);
    return NextResponse.json(
      { erro: "Não consegui apagar. Veja o terminal do servidor." },
      { status: 500 },
    );
  }
}
