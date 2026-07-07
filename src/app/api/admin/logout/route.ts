import { NextResponse } from "next/server";
import { COOKIE_SESSAO } from "@/lib/auth";

/** POST /api/admin/logout — apaga o cookie de sessão. */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_SESSAO, "", { maxAge: 0, path: "/" });
  return res;
}
