"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/Badge";
import { COR_TURMA } from "@/components/EventoLinha";
import {
  DIAS_CURTOS,
  diaSemanaDe,
  diffDias,
  fmtDiaMes,
  fmtHora,
  rotuloRelativo,
} from "@/lib/dates";
import type { Evento, Materia } from "@/lib/types";
import { ProximoDetalhe } from "./ProximoDetalhe";

interface Props {
  /** O próximo EVENTO (nunca aula/cancelamento), ou null se não há nenhum. */
  evento: Evento | null;
  /** Todos os eventos futuros — o menu que o card abre lista todos eles. */
  proximos: Evento[];
  materiaDe: (id: string | null) => Materia | undefined;
  hojeIso: string;
  agoraHHMM: string;
  filtroAtivo: boolean;
}

/**
 * O card-assinatura do app: responde "qual o próximo evento?" sem exigir
 * leitura. Cor do filete = matéria; selo = tipo; contagem ("hoje", "em 3 dias")
 * em pill. O "Próximo" mostra só EVENTOS (prova/trabalho/atividade) — aula da
 * grade e cancelamento não entram. Por isso o card é sempre clicável: abre o
 * menu expressivo (1b) com todos os próximos eventos.
 */
export function HeroProximo({
  evento,
  proximos,
  materiaDe,
  hojeIso,
  agoraHHMM,
  filtroAtivo,
}: Props) {
  const [aberto, setAberto] = useState(false);

  // Se o próximo evento some (passou, ou trocou o filtro pra algo sem eventos),
  // o menu não faz sentido: garante que ele não fique/reabra pendurado.
  const temEvento = evento !== null;
  useEffect(() => {
    if (!temEvento) setAberto(false);
  }, [temEvento]);

  if (!evento) {
    return (
      <div className="hero-wrap">
        <div className="hero" style={{ "--sc": "var(--ink-faint)" } as React.CSSProperties}>
          <p
            className="hero-empty hero-body"
            key={filtroAtivo ? "vazio-filtro" : "vazio-geral"}
          >
            {filtroAtivo
              ? "Nenhum evento com esse filtro."
              : "Nenhum evento à vista."}
          </p>
        </div>
      </div>
    );
  }

  const materia = materiaDe(evento.materia_id);
  const cor = materia?.cor ?? COR_TURMA;

  const meta = [
    `${DIAS_CURTOS[diaSemanaDe(evento.data)]} ${fmtDiaMes(evento.data)}`,
    evento.hora ? fmtHora(evento.hora) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  // identidade do evento — muda quando o "próximo" troca de fato (filtro, ou o
  // relógio avança pro próximo evento), pra remontar e reanimar só aí
  const itemKey = `${evento.id}`;

  return (
    <div className="hero-wrap">
      <button
        type="button"
        className="hero hero-clicavel"
        style={{ "--sc": cor } as React.CSSProperties}
        onClick={() => setAberto(true)}
        aria-haspopup="dialog"
        aria-expanded={aberto}
      >
        <div className="hero-body" key={itemKey}>
          <div className="hero-top">
            <span className="subj">
              <span className="dot" />
              {materia?.nome ?? "Turma"}
            </span>
            <Badge tipo={evento.tipo} />
          </div>
          <div className="hero-title">{evento.titulo}</div>
          <div className="hero-meta">
            <span>{meta}</span>
            <span className="countdown">
              {rotuloRelativo(diffDias(hojeIso, evento.data))}
            </span>
          </div>
          {evento.observacao && <p className="hero-obs">{evento.observacao}</p>}
          <span className="hero-seta" aria-hidden="true">
            ›
          </span>
        </div>
      </button>

      <ProximoDetalhe
        open={aberto}
        evento={evento}
        materia={materia}
        proximos={proximos}
        materiaDe={materiaDe}
        hojeIso={hojeIso}
        agoraHHMM={agoraHHMM}
        onFechar={() => setAberto(false)}
      />
    </div>
  );
}
