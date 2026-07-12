import { Badge } from "@/components/Badge";
import { COR_TURMA } from "@/components/EventoLinha";
import type { ItemHoje } from "@/lib/agenda";
import { fmtHora } from "@/lib/dates";
import type { Materia } from "@/lib/types";

interface Props {
  itens: ItemHoje[];
  materiaDe: (id: string | null) => Materia | undefined;
  filtroAtivo: boolean;
}

/**
 * A timeline de "Hoje": o dia inteiro numa linha vertical, aula e evento na
 * mesma régua de horário. Cada nó recebe a cor da matéria (`--sc`). Eventos
 * ganham selo pulsante (é o que exige olhar). NÃO existe marcador de "agora":
 * a timeline mostra o dia todo, sem cronômetro — o card "Próximo" é quem cuida
 * do "o que vem já". Sem nada hoje, um estado vazio calmo.
 */
export function HojeTimeline({ itens, materiaDe, filtroAtivo }: Props) {
  if (itens.length === 0) {
    return (
      <div className="hoje-vazio" key={filtroAtivo ? "vazio-filtro" : "vazio-geral"}>
        {filtroAtivo
          ? "Nada dessa matéria hoje."
          : "Nada marcado pra hoje. Aproveite."}
      </div>
    );
  }

  return (
    <ol className="hoje">
      {itens.map((item, i) => {
        const materia = materiaDe(item.materia_id);
        const cor = materia?.cor ?? COR_TURMA;
        const ehAula = item.kind === "aula";
        // aula: o nome da matéria é o título. evento: o próprio título.
        const titulo = ehAula ? (materia?.nome ?? "Aula") : item.titulo;
        // linha de cima: prof (aula) ou nome da matéria/"Turma" (evento).
        const contexto = ehAula
          ? (materia?.prof ?? "Aula da grade")
          : (materia?.nome ?? "Turma");

        const meta = [item.hora ? fmtHora(item.hora) : "dia todo", item.sala]
          .filter(Boolean)
          .join(" · ");

        return (
          <li
            className={`hoje-item ${ehAula ? "is-aula" : "is-evento"}`}
            key={`${item.kind}-${item.materia_id}-${item.hora}-${titulo}`}
            style={
              {
                "--sc": cor,
                "--i": Math.min(i, 8),
              } as React.CSSProperties
            }
          >
            <div className="hoje-node" aria-hidden="true">
              <span className="hoje-dot" />
            </div>
            <div className="hoje-card">
              <div className="hoje-top">
                <span className="hoje-ctx">{contexto}</span>
                {ehAula ? <Badge tipo="aula" /> : <Badge tipo={item.tipo!} />}
              </div>
              <div className="hoje-title">{titulo}</div>
              <div className="hoje-meta">{meta}</div>
              {item.observacao && <p className="hoje-obs">{item.observacao}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
