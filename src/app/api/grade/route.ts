import { NextRequest, NextResponse } from "next/server";
import { corpoValidado, erro, exigirSessao, materiaExiste } from "@/lib/api";
import { ConflitoBanco, db } from "@/lib/db";
import { NovaAulaSchema } from "@/lib/schemas/grade";

/** POST /api/grade — cria uma aula fixa (dia + horário + matéria + sala). */
export async function POST(req: NextRequest) {
  const naoAutorizado = exigirSessao(req);
  if (naoAutorizado) return naoAutorizado;

  const corpo = await corpoValidado(
    req,
    NovaAulaSchema,
    (faltas) => `Aula incompleta ou inválida (${faltas}).`,
  );
  if (!corpo.ok) return corpo.resposta;

  if (!(await materiaExiste(corpo.dados.materia_id))) {
    return erro(`Matéria desconhecida: ${corpo.dados.materia_id}`, 400);
  }

  try {
    const aula = await db.addAula(corpo.dados);
    return NextResponse.json({ aula }, { status: 201 });
  } catch (e) {
    if (e instanceof ConflitoBanco) return erro(e.message, 409);
    console.error("[/api/grade] falha ao salvar:", e);
    return erro("Não consegui salvar. Veja o terminal do servidor.", 500);
  }
}
