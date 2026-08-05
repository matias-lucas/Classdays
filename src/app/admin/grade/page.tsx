import type { Metadata } from "next";
import { cookies } from "next/headers";
import { LoginAdmin } from "@/components/admin/LoginAdmin";
import { PainelGrade } from "@/components/admin/PainelGrade";
import { COOKIE_SESSAO, sessaoValida } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Editar grade — Classdays",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

/**
 * /admin/grade — mesma checagem de sessão do /admin: sem sessão válida, o
 * que desce pro navegador é só o formulário de login (materias e grade nem
 * viajam).
 */
export default async function PaginaGradeAdmin() {
  const jarra = await cookies();
  const logado = sessaoValida(jarra.get(COOKIE_SESSAO)?.value);

  if (!logado) {
    return <LoginAdmin />;
  }

  const [materias, grade] = await Promise.all([db.getMaterias(), db.getGrade()]);

  return <PainelGrade materias={materias} grade={grade} />;
}
