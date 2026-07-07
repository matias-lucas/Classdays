import { NextRequest, NextResponse } from "next/server";
import {
  autenticacaoConfigurada,
  COOKIE_SESSAO,
  senhaCorreta,
  SESSAO_DIAS,
  tokenDeSessao,
} from "@/lib/auth";

/** POST /api/admin/login — { senha } → cookie de sessão. */
export async function POST(req: NextRequest) {
  if (!autenticacaoConfigurada()) {
    return NextResponse.json(
      { erro: "ADMIN_PASSWORD não configurada no .env.local (mínimo 6 caracteres)." },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => null);
  const senha = typeof body?.senha === "string" ? body.senha : "";

  if (!senhaCorreta(senha)) {
    // Meio segundo de freio: torna tentativa-e-erro em massa impraticável
    // sem atrapalhar quem só digitou errado.
    await new Promise((r) => setTimeout(r, 500));
    return NextResponse.json({ erro: "Senha incorreta." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_SESSAO, tokenDeSessao(), {
    httpOnly: true, // JavaScript da página não lê o cookie (anti-XSS)
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSAO_DIAS * 24 * 60 * 60,
    path: "/",
  });
  return res;
}
