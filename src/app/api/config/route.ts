import { NextRequest, NextResponse } from "next/server";
import { erro, exigirSessao } from "@/lib/api";
import { db } from "@/lib/db";

/**
 * PATCH /api/config — liga/desliga a divulgação da grade pra turma
 * (o toggle do /admin acima de "Hoje" e "Grade da semana").
 */
export async function PATCH(req: NextRequest) {
  const naoAutorizado = exigirSessao(req);
  if (naoAutorizado) return naoAutorizado;

  const body = await req.json().catch(() => null);
  if (typeof body?.gradeVisivel !== "boolean") {
    return erro("Campo gradeVisivel inválido.", 400);
  }

  try {
    await db.setGradeVisivel(body.gradeVisivel);
    return NextResponse.json({ gradeVisivel: body.gradeVisivel });
  } catch (e) {
    console.error("[/api/config] falha ao salvar:", e);
    return erro("Não consegui salvar. Veja o terminal do servidor.", 500);
  }
}
