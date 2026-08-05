import { NextRequest, NextResponse } from "next/server";
import { corpoValidado, erro, exigirSessao, materiaExiste } from "@/lib/api";
import { db } from "@/lib/db";
import { NovoEventoSchema } from "@/lib/parser/schema";

/**
 * POST /api/eventos — salva o evento que o admin confirmou no preview.
 * Valida na fronteira: schema (zod) + matéria existente.
 */
export async function POST(req: NextRequest) {
  const naoAutorizado = exigirSessao(req);
  if (naoAutorizado) return naoAutorizado;

  const corpo = await corpoValidado(
    req,
    NovoEventoSchema,
    (faltas) => `Evento incompleto ou inválido (${faltas}).`,
  );
  if (!corpo.ok) return corpo.resposta;
  const novo = corpo.dados;

  if (novo.materia_id !== null && !(await materiaExiste(novo.materia_id))) {
    return erro(`Matéria desconhecida: ${novo.materia_id}`, 400);
  }

  try {
    const evento = await db.addEvento(novo);
    return NextResponse.json({ evento }, { status: 201 });
  } catch (e) {
    console.error("[/api/eventos] falha ao salvar:", e);
    return erro("Não consegui salvar. Veja o terminal do servidor.", 500);
  }
}
