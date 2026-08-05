import { NextRequest, NextResponse } from "next/server";
import type { z } from "zod";
import { COOKIE_SESSAO, sessaoValida } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Helpers compartilhados pelas rotas de API do /admin.
 *
 * As quatro rotas originais (eventos, eventos/[id], parse, config) repetiam
 * o mesmo bloco de auth e o mesmo formato de erro. A E1 soma mais seis rotas
 * (materias, materias/[id], grade, grade/[id]) — sem extrair, viraria dez
 * cópias do mesmo código.
 */

/** Devolve a resposta 401 quando não há sessão válida; null quando pode seguir. */
export function exigirSessao(req: NextRequest): NextResponse | null {
  if (!sessaoValida(req.cookies.get(COOKIE_SESSAO)?.value)) {
    return erro("Faça login para usar o admin.", 401);
  }
  return null;
}

/** Resposta de erro no formato único do app: { erro: string }. */
export function erro(mensagem: string, status: number): NextResponse {
  return NextResponse.json({ erro: mensagem }, { status });
}

/**
 * Lê o JSON do corpo e valida com um schema zod.
 * `mensagem` customiza o texto de erro: string fixa, ou função que recebe os
 * campos que falharam (ex.: "tipo, data") e monta a frase.
 */
export async function corpoValidado<T>(
  req: NextRequest,
  schema: z.ZodType<T>,
  mensagem?: string | ((faltas: string) => string),
): Promise<{ ok: true; dados: T } | { ok: false; resposta: NextResponse }> {
  const body = await req.json().catch(() => null);
  const resultado = schema.safeParse(body);
  if (!resultado.success) {
    const faltas = resultado.error.issues.map((i) => i.path.join(".")).join(", ");
    const texto =
      typeof mensagem === "function"
        ? mensagem(faltas)
        : (mensagem ?? `Dados inválidos (${faltas}).`);
    return { ok: false, resposta: erro(texto, 400) };
  }
  return { ok: true, dados: resultado.data };
}

/** A matéria existe? (checagem que POST /api/eventos já fazia na mão) */
export async function materiaExiste(id: string): Promise<boolean> {
  const materias = await db.getMaterias();
  return materias.some((m) => m.id === id);
}
