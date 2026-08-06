import { fimDe } from "@/lib/agenda";
import { diffDias, rotuloRelativo } from "@/lib/dates";
import type { Evento } from "@/lib/types";

interface Props {
  eventos: Evento[];
  hojeIso: string;
}

/**
 * Períodos em curso (ex.: renovação de matrícula) — cor NEUTRA de propósito,
 * nunca a cor de matéria: os dois códigos de cor não se misturam (DESIGN.md).
 * Fica acima da timeline de "Hoje"; a grade da semana marca os mesmos
 * períodos por dia com um chip equivalente (GradeSemana), sem repetir este
 * componente lá — a lista aqui é a "fonte", o chip lá é só um lembrete.
 */
export function FaixaEmAndamento({ eventos, hojeIso }: Props) {
  if (eventos.length === 0) return null;

  return (
    <div className="faixa-andamento">
      {eventos.map((e) => (
        <div className="faixa-item" key={e.id}>
          <span className="faixa-titulo">{e.titulo}</span>
          <span className="faixa-termina">
            termina {rotuloRelativo(diffDias(hojeIso, fimDe(e)))}
          </span>
        </div>
      ))}
    </div>
  );
}
