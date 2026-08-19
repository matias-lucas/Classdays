"use client";

import { useCallback, useEffect, useState } from "react";
import { Drawer } from "@/components/layout/Drawer";
import { EventoLinha } from "@/components/ui/EventoLinha";
import type { Evento, Materia } from "@/lib/types";
import { EVENTO_ABRIR_PROXIMOS } from "./HeroProximo";

/** Evento global que abre o sino de fora — mesmo padrão do EVENTO_ABRIR_MEU_CLASSDAYS. */
export const EVENTO_ABRIR_SINO = "classdays:abrir-sino";

interface Props {
  naoLidos: Evento[];
  materiaDe: (id: string | null) => Materia | undefined;
  hojeIso: string;
  /** Chamado toda vez que o painel abre — marca os candidatos atuais como vistos. */
  onAbrir: () => void;
}

/**
 * Badge com a contagem de eventos novos (criados depois da última visita) na
 * janela de dias que o AgendaAluno decide (E5). Abrir o painel já marca tudo
 * como visto — não tem "marcar como lido" manual, mesma honestidade do resto
 * do app (ver = lido). Cada item fecha o sino e abre o menu de "Próximos
 * eventos" (ProximoDetalhe) já existente, em vez de duplicar aquela lista.
 */
export function Sino({ naoLidos, materiaDe, hojeIso, onAbrir }: Props) {
  const [aberto, setAberto] = useState(false);

  const abrir = useCallback(() => {
    setAberto(true);
    onAbrir();
  }, [onAbrir]);

  useEffect(() => {
    window.addEventListener(EVENTO_ABRIR_SINO, abrir);
    return () => window.removeEventListener(EVENTO_ABRIR_SINO, abrir);
  }, [abrir]);

  // Fecha o sino e só então abre o painel completo — mesmo rAF que o
  // MenuLateral usa entre um Drawer fechar e o próximo prender o foco.
  const verNoDetalhe = () => {
    setAberto(false);
    requestAnimationFrame(() => {
      window.dispatchEvent(new CustomEvent(EVENTO_ABRIR_PROXIMOS));
    });
  };

  const qtd = naoLidos.length;

  return (
    <>
      <button
        type="button"
        className="menu-btn sino-btn"
        aria-label={
          qtd > 0
            ? `Notificações — ${qtd} ${qtd === 1 ? "novidade" : "novidades"}`
            : "Notificações"
        }
        aria-haspopup="dialog"
        aria-expanded={aberto}
        onClick={abrir}
      >
        <IcoSino />
        {qtd > 0 && (
          <span className="sino-badge" aria-hidden="true">
            {qtd > 9 ? "9+" : qtd}
          </span>
        )}
      </button>

      <Drawer open={aberto} onFechar={() => setAberto(false)} titulo="Novidades">
        <div className="drawer-sec">
          <span className="drawer-label">Nos próximos dias</span>
          {naoLidos.length === 0 ? (
            <p className="drawer-desc">Nada de novo por enquanto.</p>
          ) : (
            <ul className="drawer-nav sino-lista">
              {naoLidos.map((e) => (
                <li key={e.id}>
                  <button type="button" className="sino-item" onClick={verNoDetalhe}>
                    <EventoLinha evento={e} materia={materiaDe(e.materia_id)} hojeIso={hojeIso} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Drawer>
    </>
  );
}

function IcoSino() {
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" fill="none" aria-hidden="true">
      <path
        d="M5 8.5a5 5 0 0 1 10 0c0 3.2 1 4.4 1.6 5.1.3.4 0 1-.5 1H3.9c-.5 0-.8-.6-.5-1C4 12.9 5 11.7 5 8.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M8.2 17a1.9 1.9 0 0 0 3.6 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
