import { NextRequest, NextResponse } from "next/server";
import { corpoValidado, erro, exigirSessao, materiaExiste } from "@/lib/api";
import { ConflitoBanco, db } from "@/lib/db";
import { NovaAulaSchema } from "@/lib/schemas/grade";

/** PATCH /api/grade/:id — edita dia, horário, matéria ou sala de uma aula. */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const naoAutorizado = exigirSessao(req);
  if (naoAutorizado) return naoAutorizado;

  const { id } = await ctx.params;
  const idNum = Number(id);
  if (!Number.isInteger(idNum) || idNum <= 0) {
    return erro("Id inválido.", 400);
  }

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
    const aula = await db.updateAula(idNum, corpo.dados);
    if (!aula) return erro("Aula não encontrada.", 404);
    return NextResponse.json({ aula });
  } catch (e) {
    if (e instanceof ConflitoBanco) return erro(e.message, 409);
    console.error("[/api/grade/:id] falha ao editar:", e);
    return erro("Não consegui salvar. Veja o terminal do servidor.", 500);
  }
}

/** DELETE /api/grade/:id — remove uma aula da grade fixa. */
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const naoAutorizado = exigirSessao(req);
  if (naoAutorizado) return naoAutorizado;

  const { id } = await ctx.params;
  const idNum = Number(id);
  if (!Number.isInteger(idNum) || idNum <= 0) {
    return erro("Id inválido.", 400);
  }

  try {
    const ok = await db.deleteAula(idNum);
    if (!ok) return erro("Aula não encontrada.", 404);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[/api/grade/:id] falha ao apagar:", e);
    return erro("Não consegui apagar. Veja o terminal do servidor.", 500);
  }
}
