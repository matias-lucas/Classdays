import { Badge } from "@/components/Badge";
import { COR_TURMA } from "@/components/EventoLinha";
import type { ItemProximo } from "@/lib/agenda";
import {
  DIAS_CURTOS,
  diaSemanaDe,
  diffDias,
  fmtDiaMes,
  fmtHora,
  rotuloRelativo,
} from "@/lib/dates";
import type { Materia } from "@/lib/types";

interface Props {
  item: ItemProximo | null;
  materiaDe: (id: string | null) => Materia | undefined;
  hojeIso: string;
  filtroAtivo: boolean;
}

/**
 * O card-assinatura do app: responde "o que vem agora?" sem exigir leitura.
 * Cor do filete = matéria; selo = tipo; contagem ("hoje", "em 3 dias") em pill.
 */
export function HeroProximo({ item, materiaDe, hojeIso, filtroAtivo }: Props) {
  if (!item) {
    return (
      <div className="hero" style={{ "--sc": "var(--ink-faint)" } as React.CSSProperties}>
        <p className="hero-empty">
          {filtroAtivo
            ? "Nada por vir com esse filtro."
            : "Sem aulas ou eventos à vista."}
        </p>
      </div>
    );
  }

  const materia = materiaDe(item.materia_id);
  const cor = materia?.cor ?? COR_TURMA;
  const ehAula = item.kind === "aula";
  // Para aula, o nome da matéria É o título (sem repetir na linha de cima).
  const titulo = ehAula ? (materia?.nome ?? "Aula") : item.titulo;

  const meta = [
    `${DIAS_CURTOS[diaSemanaDe(item.data)]} ${fmtDiaMes(item.data)}`,
    item.hora ? fmtHora(item.hora) : null,
    item.sala,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="hero" style={{ "--sc": cor } as React.CSSProperties}>
      <div className="hero-top">
        <span className="subj">
          <span className="dot" />
          {ehAula ? (materia?.prof ?? "Aula da grade") : (materia?.nome ?? "Turma")}
        </span>
        {ehAula ? <Badge tipo="aula" /> : <Badge tipo={item.tipo!} />}
      </div>
      <div className="hero-title">{titulo}</div>
      <div className="hero-meta">
        <span>{meta}</span>
        <span className="countdown">{rotuloRelativo(diffDias(hojeIso, item.data))}</span>
      </div>
      {item.observacao && <p className="hero-obs">{item.observacao}</p>}
    </div>
  );
}
