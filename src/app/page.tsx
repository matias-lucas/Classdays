import { AgendaAluno } from "@/components/agenda/AgendaAluno";
import { hojeISO, horaAgora } from "@/lib/dates";
import { db } from "@/lib/db";

/**
 * A tela do aluno — pública, sem login.
 *
 * Server component: busca os dados no banco AQUI (no servidor) e entrega
 * tudo pronto pro componente interativo. `force-dynamic` desliga o cache do
 * Next para esta rota: cancelamento cadastrado às 18h aparece pra quem abrir
 * às 18h01 — num mural de turma, dado fresco vale mais que cache.
 */
export const dynamic = "force-dynamic";

export default async function PaginaAluno() {
  const [materias, grade, eventos, gradeVisivel] = await Promise.all([
    db.getMaterias(),
    db.getGrade(),
    db.getEventos(),
    db.getGradeVisivel(),
  ]);

  return (
    <AgendaAluno
      materias={materias}
      grade={grade}
      eventos={eventos}
      hojeInicial={hojeISO()}
      agoraInicial={horaAgora()}
      gradeVisivel={gradeVisivel}
    />
  );
}
