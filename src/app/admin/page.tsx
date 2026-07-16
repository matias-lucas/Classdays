import type { Metadata } from "next";
import { cookies } from "next/headers";
import { LoginAdmin } from "@/components/admin/LoginAdmin";
import { PainelAdmin } from "@/components/admin/PainelAdmin";
import { COOKIE_SESSAO, sessaoValida } from "@/lib/auth";
import { hojeISO } from "@/lib/dates";
import { db, nomeBackend } from "@/lib/db";
import { claudeDisponivel } from "@/lib/parser/claude";

export const metadata: Metadata = {
  title: "Admin — Classdays",
  robots: { index: false }, // área do representante não aparece em buscador
};

export const dynamic = "force-dynamic";

/**
 * /admin — protegido por cookie de sessão.
 *
 * A checagem acontece AQUI, no servidor, antes de qualquer dado sair: sem
 * sessão válida, o que desce pro navegador é só o formulário de login
 * (os eventos nem viajam). As rotas de API fazem a mesma checagem — a
 * página protege a tela, as rotas protegem os dados.
 */
export default async function PaginaAdmin() {
  const jarra = await cookies(); // async no App Router novo
  const logado = sessaoValida(jarra.get(COOKIE_SESSAO)?.value);

  if (!logado) {
    return <LoginAdmin />;
  }

  const [materias, eventos, gradeVisivel] = await Promise.all([
    db.getMaterias(),
    db.getEventos(),
    db.getGradeVisivel(),
  ]);

  return (
    <PainelAdmin
      materias={materias}
      eventos={eventos}
      hojeIso={hojeISO()}
      backend={nomeBackend}
      claudeAtivo={claudeDisponivel()}
      gradeVisivelInicial={gradeVisivel}
    />
  );
}
