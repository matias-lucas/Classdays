import { NextRequest, NextResponse } from "next/server";
import { COOKIE_SESSAO, sessaoValida } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * PATCH /api/config — liga/desliga a divulgação da grade pra turma
 * (o toggle do /admin acima de "Hoje" e "Grade da semana").
 */
export async function PATCH(req: NextRequest) {
  if (!sessaoValida(req.cookies.get(COOKIE_SESSAO)?.value)) {
    return NextResponse.json({ erro: "Faça login para usar o admin." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (typeof body?.gradeVisivel !== "boolean") {
    return NextResponse.json({ erro: "Campo gradeVisivel inválido." }, { status: 400 });
  }

  try {
    await db.setGradeVisivel(body.gradeVisivel);
    return NextResponse.json({ gradeVisivel: body.gradeVisivel });
  } catch (erro) {
    console.error("[/api/config] falha ao salvar:", erro);
    return NextResponse.json(
      { erro: "Não consegui salvar. Veja o terminal do servidor." },
      { status: 500 },
    );
  }
}
