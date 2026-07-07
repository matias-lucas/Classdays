import type { ReactNode } from "react";
import { Badge } from "@/components/Badge";
import {
  DIAS_CURTOS,
  diaSemanaDe,
  diffDias,
  fmtDiaMesPartes,
  fmtHora,
  rotuloRelativo,
} from "@/lib/dates";
import type { Evento, Materia } from "@/lib/types";

/** Cor usada quando o evento é da turma toda (sem matéria). */
export const COR_TURMA = "#6A4D9C";

interface Props {
  evento: Evento;
  materia: Materia | undefined; // undefined = evento geral da turma
  hojeIso: string;
  /** Espaço para ações extras (o admin encaixa o botão de apagar aqui). */
  children?: ReactNode;
  /**
   * Posição na lista — só a tela do aluno passa isso, pra entrada em
   * cascata (stagger). Sem essa prop (uso no admin), a linha não anima:
   * lá a lista muda por ação do próprio usuário (salvar/apagar), não é
   * uma "revelação" que precise de entrada.
   */
  indice?: number;
}

/**
 * Uma linha da lista de eventos: bloco de data à esquerda (dia grande na cor
 * da matéria), corpo com matéria + selo + título. Compartilhada entre a tela
 * do aluno e o admin — mesma cara nos dois lugares, de propósito.
 */
export function EventoLinha({ evento, materia, hojeIso, children, indice }: Props) {
  const cor = materia?.cor ?? COR_TURMA;
  const nome = materia?.nome ?? "Turma";
  const { dia, mes } = fmtDiaMesPartes(evento.data);
  const dias = diffDias(hojeIso, evento.data);

  const quando = [
    DIAS_CURTOS[diaSemanaDe(evento.data)],
    evento.hora ? fmtHora(evento.hora) : null,
    rotuloRelativo(dias),
  ]
    .filter(Boolean)
    .join(" · ");

  const style = {
    "--sc": cor,
    ...(indice !== undefined ? { "--i": Math.min(indice, 8) } : {}),
  } as React.CSSProperties;

  return (
    <div
      className={`ev${evento.tipo === "cancelamento" ? " cancelado" : ""}${indice !== undefined ? " ev-entra" : ""}`}
      style={style}
    >
      <div className="ev-date" aria-hidden="true">
        <div className="ev-day">{dia}</div>
        <div className="ev-mon">{mes}</div>
      </div>
      <div className="ev-body">
        <div className="ev-top">
          <span className="ev-subj">
            <span className="dot" style={{ background: cor }} />
            {nome}
          </span>
          <Badge tipo={evento.tipo} />
        </div>
        <div className="ev-title">{evento.titulo}</div>
        <div className="ev-when">{quando}</div>
        {evento.observacao && <div className="ev-obs">{evento.observacao}</div>}
      </div>
      {children}
    </div>
  );
}
