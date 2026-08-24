"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Drawer } from "@/components/layout/Drawer";
import { EventoLinha } from "@/components/ui/EventoLinha";
import { painelPorGrupo } from "@/lib/sino";
import type { Evento, Materia } from "@/lib/types";
import { EVENTO_ABRIR_PROXIMOS } from "./HeroProximo";

/** Evento global que abre o sino de fora — mesmo padrão do EVENTO_ABRIR_MEU_CLASSDAYS. */
export const EVENTO_ABRIR_SINO = "classdays:abrir-sino";

interface Props {
  /** Todos os eventos futuros (lidos e não lidos), já ordenados. */
  eventos: Evento[];
  /** Ids de `eventos` que o aluno ainda não viu. */
  naoLidos: ReadonlySet<number>;
  materiaDe: (id: string | null) => Materia | undefined;
  hojeIso: string;
  /** Chamado toda vez que o painel abre — marca os candidatos atuais como vistos. */
  onAbrir: () => void;
}

/**
 * Badge com a contagem de eventos que o aluno nunca viu no painel (E5). O
 * painel vem em dois grupos (`painelPorGrupo`): "Novidades" em cima, com todas
 * elas, e "Já vistas" logo abaixo, com as mais próximas — notificação não some
 * por ter sido lida, só desce, fica apagada e perde o selo "novo".
 * Abrir já marca tudo como lido (ver = ler, mesma honestidade do resto do
 * app). Cada item fecha o sino e abre o menu de "Próximos eventos"
 * (ProximoDetalhe) já existente, em vez de duplicar aquela lista.
 */
export function Sino({ eventos, naoLidos, materiaDe, hojeIso, onAbrir }: Props) {
  const [aberto, setAberto] = useState(false);
  // Quem estava por ler no instante do clique: onAbrir marca tudo como visto
  // na hora, o que apagaria os selos "novo" antes de o painel renderizar.
  // Também decide a lista, e por isso NÃO é zerado ao fechar: o painel some
  // deslizando, e recortá-lo no meio da saída seria um pulo à toa.
  const [novosNoClique, setNovosNoClique] = useState<ReadonlySet<number>>(new Set());

  const { novos, lidos } = useMemo(
    () => painelPorGrupo(eventos, novosNoClique),
    [eventos, novosNoClique],
  );

  const abrir = useCallback(() => {
    setNovosNoClique(new Set(naoLidos));
    setAberto(true);
    onAbrir();
  }, [naoLidos, onAbrir]);

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

  const qtd = naoLidos.size;

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

      <Drawer open={aberto} onFechar={() => setAberto(false)} titulo="Notificações">
        {novos.length === 0 && lidos.length === 0 && (
          <div className="drawer-sec">
            <span className="drawer-label">Novidades</span>
            <p className="drawer-desc">Nada marcado por enquanto.</p>
          </div>
        )}
        {novos.length > 0 && (
          <div className="drawer-sec">
            <span className="drawer-label">Novidades</span>
            <Lista eventos={novos} novo materiaDe={materiaDe} hojeIso={hojeIso} aoClicar={verNoDetalhe} />
          </div>
        )}
        {lidos.length > 0 && (
          <div className="drawer-sec">
            <span className="drawer-label">Já vistas</span>
            <Lista eventos={lidos} materiaDe={materiaDe} hojeIso={hojeIso} aoClicar={verNoDetalhe} />
          </div>
        )}
      </Drawer>
    </>
  );
}

/**
 * Um grupo da lista. `novo` decide as duas coisas ao mesmo tempo: o desenho do
 * cartão (tint + sombra x contorno plano) e o selo — estado de leitura nunca
 * fica só na cor.
 */
function Lista({
  eventos,
  novo,
  materiaDe,
  hojeIso,
  aoClicar,
}: {
  eventos: Evento[];
  novo?: boolean;
  materiaDe: (id: string | null) => Materia | undefined;
  hojeIso: string;
  aoClicar: () => void;
}) {
  return (
    <ul className="drawer-nav sino-lista">
      {eventos.map((e) => (
        <li key={e.id}>
          <button
            type="button"
            className={`sino-item${novo ? " sino-novo" : " sino-lido"}`}
            onClick={aoClicar}
          >
            <EventoLinha evento={e} materia={materiaDe(e.materia_id)} hojeIso={hojeIso}>
              {novo && <span className="sino-selo">novo</span>}
            </EventoLinha>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Exportado: o item "Notificações" do menu lateral usa o mesmo desenho. */
export function IcoSino() {
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
