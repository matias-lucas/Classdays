import { NextRequest, NextResponse } from "next/server";
import { COOKIE_SESSAO, sessaoValida } from "@/lib/auth";
import { hojeISO } from "@/lib/dates";
import { db } from "@/lib/db";
import { claudeDisponivel, parseComClaude } from "@/lib/parser/claude";
import { parseComRegras } from "@/lib/parser/regras";
import { PedidoParseSchema } from "@/lib/parser/schema";
import type { ResultadoParse } from "@/lib/parser/tipos";

/**
 * POST /api/parse — o coração do input inteligente.
 *
 * { frase } → { evento, origem, avisos }
 *
 * A frase vai para o Claude junto com a data de hoje e a lista de matérias;
 * volta um evento estruturado. Sem chave da API (ou se a chamada falhar),
 * o parser de regras assume — o admin nunca fica na mão.
 *
 * NADA é salvo aqui: o resultado vira um card de preview editável e só
 * entra no banco quando o admin confirmar (POST /api/eventos).
 */
export async function POST(req: NextRequest) {
  if (!sessaoValida(req.cookies.get(COOKIE_SESSAO)?.value)) {
    return NextResponse.json({ erro: "Faça login para usar o admin." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const pedido = PedidoParseSchema.safeParse(body);
  if (!pedido.success) {
    return NextResponse.json(
      { erro: "Escreva uma frase entre 3 e 300 caracteres." },
      { status: 400 },
    );
  }

  const ctx = { hojeIso: hojeISO(), materias: await db.getMaterias() };
  const { frase } = pedido.data;

  let resultado: ResultadoParse;
  if (claudeDisponivel()) {
    try {
      resultado = await parseComClaude(frase, ctx);
    } catch (erro) {
      console.error("[/api/parse] Claude falhou, caindo para regras:", erro);
      resultado = parseComRegras(frase, ctx);
      resultado.avisos.unshift(
        "A API do Claude falhou agora — interpretei com as regras locais. Confira com atenção.",
      );
    }
  } else {
    resultado = parseComRegras(frase, ctx);
  }

  return NextResponse.json(resultado);
}
