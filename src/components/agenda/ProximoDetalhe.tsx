"use client";

import { useEffect, useRef } from "react";
import { Badge } from "@/components/Badge";
import { COR_TURMA, EventoLinha } from "@/components/EventoLinha";
import {
  type Contagem,
  contagemRegressiva,
  DIAS_LONGOS,
  diaSemanaDe,
  fmtDiaMes,
  fmtHora,
} from "@/lib/dates";
import type { Evento, Materia } from "@/lib/types";

interface Props {
  open: boolean;
  /** O próximo evento — o cabeçalho expressivo (1b) do menu. */
  evento: Evento;
  materia: Materia | undefined;
  /** Todos os eventos futuros (inclui cancelamentos) — a lista do menu. */
  proximos: Evento[];
  materiaDe: (id: string | null) => Materia | undefined;
  hojeIso: string;
  agoraHHMM: string;
  onFechar: () => void;
}

/**
 * O "Próximo" expressivo (tela 1b) virou o **menu de próximos eventos**: um
 * overlay que sobe por cima da agenda, com o próximo evento em destaque —
 * banhado na cor da matéria, contagem regressiva grande e viva — seguido da
 * lista de todos os outros eventos que vêm. Por isso a seção "Próximos eventos"
 * saiu da home: este menu a substitui.
 *
 * Fica sempre montado (a classe `.on` anima entrada/saída, e `visibility:hidden`
 * no CSS o tira da tabulação quando fechado). Aberto: trava o scroll do fundo,
 * prende o foco dentro, fecha no Esc e no clique do scrim, e devolve o foco a
 * quem abriu — o mesmo contrato do Drawer. Movimento reduzido: o globals.css
 * zera as animações. A contagem reavalia junto com o relógio de minuto do
 * AgendaAluno (props `hojeIso`/`agoraHHMM`).
 */
export function ProximoDetalhe({
  open,
  evento,
  materia,
  proximos,
  materiaDe,
  hojeIso,
  agoraHHMM,
  onFechar,
}: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const sheet = sheetRef.current;
    const anterior = document.activeElement as HTMLElement | null;

    const overflowAntes = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focaveis = () =>
      sheet
        ? Array.from(
            sheet.querySelectorAll<HTMLElement>(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
            ),
          ).filter((el) => !el.hasAttribute("disabled"))
        : [];

    focaveis()[0]?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onFechar();
        return;
      }
      if (e.key !== "Tab") return;
      const f = focaveis();
      if (f.length === 0) return;
      const primeiro = f[0];
      const ultimo = f[f.length - 1];
      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflowAntes;
      anterior?.focus?.();
    };
  }, [open, onFechar]);

  const cor = materia?.cor ?? COR_TURMA;
  const contagem = contagemRegressiva(hojeIso, agoraHHMM, evento.data, evento.hora);
  const { lead, big } = partesContagem(contagem);

  const quando = [
    `${DIAS_LONGOS[diaSemanaDe(evento.data)]}, ${fmtDiaMes(evento.data)}`,
    evento.hora ? `às ${fmtHora(evento.hora)}` : "dia todo",
  ]
    .filter(Boolean)
    .join(" · ");

  // a lista mostra o resto — o evento em destaque não se repete embaixo
  const resto = proximos.filter((e) => e.id !== evento.id);

  return (
    <>
      <div
        className={`scrim${open ? " on" : ""}`}
        onClick={onFechar}
        aria-hidden="true"
      />
      <div
        ref={sheetRef}
        className={`pd-sheet${open ? " on" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Próximos eventos"
        aria-hidden={!open}
        style={{ "--sc": cor } as React.CSSProperties}
      >
        <div className="pd-glow" aria-hidden="true" />
        <button
          type="button"
          className="pd-fechar"
          aria-label="Fechar"
          onClick={onFechar}
        >
          ×
        </button>

        <div className="pd-corpo">
          <div className="pd-top">
            <span className="pd-subj">
              <span className="dot" />
              {materia?.nome ?? "Turma"}
            </span>
            <Badge tipo={evento.tipo} />
          </div>

          <h2 className="pd-title">{evento.titulo}</h2>

          <div className="pd-count">
            {lead && <span className="pd-lead">{lead}</span>}
            <span className="pd-big">{big}</span>
          </div>

          <div className="pd-quando">{quando}</div>

          {evento.observacao && <p className="pd-obs">{evento.observacao}</p>}

          {resto.length > 0 && (
            <div className="pd-lista">
              <span className="pd-lista-label">Depois desse</span>
              {resto.map((e, i) => (
                <EventoLinha
                  key={e.id}
                  evento={e}
                  materia={materiaDe(e.materia_id)}
                  hojeIso={hojeIso}
                  indice={i}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/**
 * A contagem em palavras: um lead pequeno + o número grande. Sem hora, conta em
 * dias ("faltam 3 dias" / "amanhã" / "é hoje"); com hora, no dia do evento
 * quebra em horas e minutos ("começa em 2h 15min"). Já começou → "agora".
 */
function partesContagem(c: Contagem): { lead: string; big: string } {
  if (c.temHora && c.totalMin <= 0) return { lead: "", big: "agora" };

  if (!c.temHora) {
    if (c.dias === 0) return { lead: "é", big: "hoje" };
    if (c.dias === 1) return { lead: "acontece", big: "amanhã" };
    return { lead: "faltam", big: `${c.dias} dias` };
  }

  if (c.dias >= 1) {
    return {
      lead: c.dias === 1 ? "falta" : "faltam",
      big: `${c.dias} ${c.dias === 1 ? "dia" : "dias"}`,
    };
  }
  if (c.horas === 0) return { lead: "começa em", big: `${c.minutos} min` };
  if (c.minutos === 0) return { lead: "começa em", big: `${c.horas}h` };
  return { lead: "começa em", big: `${c.horas}h ${c.minutos}min` };
}
