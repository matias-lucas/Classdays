"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
 * banhado na cor do TIPO (`--tc`: vermelho de prova, azul de trabalho…), que é
 * o que dá urgência ao destaque, com contagem regressiva grande e viva
 * (números gigantes, unidades menores) — seguido da lista de todos os outros
 * eventos que vêm. A cor da matéria (`--sc`) segue no ponto do assunto e nas
 * linhas da lista: os dois códigos não se misturam, cada um no seu posto. Por
 * isso a seção "Próximos eventos" saiu da home: este menu a substitui.
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

  // Portal: o DOM do menu vai direto pro <body>, fora da árvore do HeroProximo.
  // `position: fixed` deixa de ser relativo à viewport quando um ancestral tem
  // `transform` (ele vira o containing block) — e o .hero-wrap aplica transform
  // no hover do desktop. Sem o portal, abrir o menu com o mouse sobre o card
  // prendia scrim e folha dentro do card: scrim encolhido, folha no topo e a
  // grade da semana pintando por cima. No servidor não existe `document`, então
  // só montamos no cliente — fechado ele é visibility:hidden, ninguém nota.
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

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

  if (!montado) return null;

  return createPortal(
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
        style={
          {
            "--sc": cor,
            "--tc": `var(--badge-${evento.tipo}-fg)`,
          } as React.CSSProperties
        }
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
            <span className="pd-big">{comUnidadesMenores(big)}</span>
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
    </>,
    document.body,
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

/**
 * A tipografia do mock aprovado: dígitos gigantes, unidades menores penduradas
 * na base ("2h 15min" → 2 e 15 grandes, "h"/"min" pequenos). Palavras sem
 * dígito ("hoje", "amanhã", "agora") não têm unidade — ficam inteiras no
 * tamanho cheio.
 */
function comUnidadesMenores(big: string): React.ReactNode {
  if (!/\d/.test(big)) return big;
  return big.split(/(\d+)/).map((parte, i) => {
    if (parte === "") return null;
    if (/^\d+$/.test(parte)) return <span key={i}>{parte}</span>;
    return (
      <span key={i} className="pd-big-un">
        {parte}
      </span>
    );
  });
}
