import { NextRequest, NextResponse } from "next/server";
import { COOKIE_SESSAO, sessaoValida } from "@/lib/auth";
import { db } from "@/lib/db";
import { NovoEventoSchema } from "@/lib/parser/schema";

/**
 * POST /api/eventos — salva o evento que o admin confirmou no preview.
 * Valida na fronteira: schema (zod) + matéria existente.
 */
export async function POST(req: NextRequest) {
  if (!sessaoValida(req.cookies.get(COOKIE_SESSAO)?.value)) {
    return NextResponse.json({ erro: "Faça login para usar o admin." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const novo = NovoEventoSchema.safeParse(body);
  if (!novo.success) {
    const faltas = novo.error.issues.map((i) => i.path.join(".")).join(", ");
    return NextResponse.json(
      { erro: `Evento incompleto ou inválido (${faltas}).` },
      { status: 400 },
    );
  }

  if (novo.data.materia_id !== null) {
    const materias = await db.getMaterias();
    if (!materias.some((m) => m.id === novo.data.materia_id)) {
      return NextResponse.json(
        { erro: `Matéria desconhecida: ${novo.data.materia_id}` },
        { status: 400 },
      );
    }
  }

  try {
    const evento = await db.addEvento(novo.data);
    return NextResponse.json({ evento }, { status: 201 });
  } catch (erro) {
    console.error("[/api/eventos] falha ao salvar:", erro);
    return NextResponse.json(
      { erro: "Não consegui salvar. Veja o terminal do servidor." },
      { status: 500 },
    );
  }
}
