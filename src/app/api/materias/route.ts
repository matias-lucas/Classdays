import { NextRequest, NextResponse } from "next/server";
import { corpoValidado, erro, exigirSessao } from "@/lib/api";
import { ConflitoBanco, db } from "@/lib/db";
import { NovaMateriaSchema } from "@/lib/schemas/grade";

/** POST /api/materias — cria uma matéria nova pelo editor do /admin. */
export async function POST(req: NextRequest) {
  const naoAutorizado = exigirSessao(req);
  if (naoAutorizado) return naoAutorizado;

  const corpo = await corpoValidado(
    req,
    NovaMateriaSchema,
    (faltas) => `Matéria incompleta ou inválida (${faltas}).`,
  );
  if (!corpo.ok) return corpo.resposta;

  try {
    const materia = await db.addMateria(corpo.dados);
    return NextResponse.json({ materia }, { status: 201 });
  } catch (e) {
    if (e instanceof ConflitoBanco) return erro(e.message, 409);
    console.error("[/api/materias] falha ao salvar:", e);
    return erro("Não consegui salvar. Veja o terminal do servidor.", 500);
  }
}
