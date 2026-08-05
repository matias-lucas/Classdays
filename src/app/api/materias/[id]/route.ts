import { NextRequest, NextResponse } from "next/server";
import { corpoValidado, erro, exigirSessao } from "@/lib/api";
import { db } from "@/lib/db";
import { EdicaoMateriaSchema } from "@/lib/schemas/grade";

/** PATCH /api/materias/:id — edita nome, professor ou cor de uma matéria. */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const naoAutorizado = exigirSessao(req);
  if (naoAutorizado) return naoAutorizado;

  const { id } = await ctx.params;
  const corpo = await corpoValidado(
    req,
    EdicaoMateriaSchema,
    (faltas) => `Matéria incompleta ou inválida (${faltas}).`,
  );
  if (!corpo.ok) return corpo.resposta;

  try {
    const materia = await db.updateMateria(id, corpo.dados);
    if (!materia) return erro("Matéria não encontrada.", 404);
    return NextResponse.json({ materia });
  } catch (e) {
    console.error("[/api/materias/:id] falha ao editar:", e);
    return erro("Não consegui salvar. Veja o terminal do servidor.", 500);
  }
}

/**
 * DELETE /api/materias/:id — apaga uma matéria, bloqueado quando há aula ou
 * evento vinculado (nunca deixa histórico órfão).
 */
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const naoAutorizado = exigirSessao(req);
  if (naoAutorizado) return naoAutorizado;

  const { id } = await ctx.params;

  try {
    const { aulas, eventos } = await db.contarUsos(id);
    if (aulas + eventos > 0) {
      return erro(
        `Não dá pra excluir: ${aulas} aula(s) na grade e ${eventos} evento(s) usam esta matéria. Remova-os antes.`,
        409,
      );
    }

    const ok = await db.deleteMateria(id);
    if (!ok) return erro("Matéria não encontrada.", 404);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[/api/materias/:id] falha ao apagar:", e);
    return erro("Não consegui apagar. Veja o terminal do servidor.", 500);
  }
}
