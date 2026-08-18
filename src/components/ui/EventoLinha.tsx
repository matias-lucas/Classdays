import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { ehAusencia, emAndamento, ehPeriodo, fimDe } from "@/lib/agenda";
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
export const COR_TURMA = "#525258";

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
  /**
   * A linha repete um evento já mostrado em destaque em outro lugar da
   * mesma tela (ex.: o "Próximo" no topo do menu de próximos eventos) —
   * fica apagada e sem interação, só marcando o lugar cronológico dela.
   * Nunca entra em cascata (mesmo com `indice`): a keyframe de entrada
   * também anima `opacity` até 1 e, com `animation-fill-mode: both`,
   * sobreporia o `opacity: .45` do fantasma no mesmo elemento.
   */
  esmaecido?: boolean;
}

/**
 * Uma linha da lista de eventos: bloco de data à esquerda (dia grande na cor
 * da matéria), corpo com matéria + selo + título. Compartilhada entre a tela
 * do aluno e o admin — mesma cara nos dois lugares, de propósito.
 */
export function EventoLinha({
  evento,
  materia,
  hojeIso,
  children,
  indice,
  esmaecido,
}: Props) {
  const ausencia = ehAusencia(evento.tipo);
  const cor = materia?.cor ?? (ausencia ? `var(--badge-${evento.tipo}-fg)` : COR_TURMA);
  const nome = materia?.nome ?? "GERAL";
  const periodo = ehPeriodo(evento);
  const emCurso = periodo && emAndamento(evento, hojeIso);
  const { dia, mes } = fmtDiaMesPartes(evento.data);
  const fimPartes = periodo ? fmtDiaMesPartes(fimDe(evento)) : null;
  const dias = diffDias(hojeIso, periodo ? fimDe(evento) : evento.data);

  const quando = [
    periodo ? null : DIAS_CURTOS[diaSemanaDe(evento.data)],
    !periodo && evento.hora ? fmtHora(evento.hora) : null,
    emCurso ? `termina ${rotuloRelativo(dias)}` : rotuloRelativo(dias),
  ]
    .filter(Boolean)
    .join(" · ");

  const style = {
    "--sc": cor,
    ...(indice !== undefined ? { "--i": Math.min(indice, 8) } : {}),
  } as React.CSSProperties;

  return (
    <div
      className={`ev${evento.tipo === "cancelamento" ? " cancelado" : ""}${indice !== undefined && !esmaecido ? " ev-entra" : ""}${esmaecido ? " ev-fantasma" : ""}`}
      style={style}
      aria-hidden={esmaecido || undefined}
    >
      <div className="ev-date" aria-hidden="true">
        {fimPartes ? (
          <>
            <div className="ev-day ev-day-periodo">
              {dia}
              <span className="ev-arrow">→</span>
              {fimPartes.dia}
            </div>
            <div className="ev-mon">{mes === fimPartes.mes ? mes : `${mes}–${fimPartes.mes}`}</div>
          </>
        ) : (
          <>
            <div className="ev-day">{dia}</div>
            <div className="ev-mon">{mes}</div>
          </>
        )}
      </div>
      <div className="ev-body">
        <div className="ev-top">
          {!ausencia && (
            <span className="ev-subj">
              <span className="dot" style={{ background: cor }} />
              {nome}
            </span>
          )}
          {emCurso && <span className="badge badge-andamento">em andamento</span>}
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
