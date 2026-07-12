"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Materia } from "@/lib/types";

interface Props {
  materias: Materia[];
  filtro: string | null;
  aoTrocar: (id: string | null) => void;
}

/**
 * Chips roláveis de filtro por matéria. O chip ativo inverte (fundo navy),
 * e `aria-pressed` conta o estado para leitores de tela.
 *
 * Quando os chips não cabem, a barra some (sem scrollbar) e no lugar entram
 * duas pistas: um **fade** nas bordas que têm conteúdo escondido (via máscara,
 * controlada pelas vars `--fade-l/--fade-r`) e uma **seta** cutucando pro lado
 * do overflow — que se apaga assim que o usuário rola (a pista já cumpriu o
 * papel). Tudo medido no cliente; no primeiro render (servidor) nada aparece,
 * então não há divergência de hidratação.
 */
export function FiltroMaterias({ materias, filtro, aoTrocar }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [fadeL, setFadeL] = useState(false);
  const [fadeR, setFadeR] = useState(false);
  // a seta some depois do primeiro scroll — não volta
  const [jaRolou, setJaRolou] = useState(false);

  const medir = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const overflow = el.scrollWidth - el.clientWidth;
    if (overflow <= 1) {
      setFadeL(false);
      setFadeR(false);
      return;
    }
    setFadeL(el.scrollLeft > 1);
    setFadeR(el.scrollLeft < overflow - 1);
  }, []);

  useEffect(() => {
    medir();
    const el = scrollRef.current;
    if (!el) return;
    // ResizeObserver pega mudança de largura da faixa (viewport, layout).
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    // A largura dos chips muda quando a fonte carrega (a faixa em si não muda
    // de tamanho, então o RO não dispara) — remede quando as fontes ficam prontas.
    document.fonts?.ready.then(medir).catch(() => {});
    return () => ro.disconnect();
  }, [medir, materias]);

  const aoRolar = () => {
    const el = scrollRef.current;
    if (!jaRolou && el && el.scrollLeft > 8) setJaRolou(true);
    medir();
  };

  const mostrarSeta = fadeR && !jaRolou;

  return (
    <div className="filtros-wrap">
      <div
        className="filters"
        role="group"
        aria-label="Filtrar por matéria"
        ref={scrollRef}
        onScroll={aoRolar}
        style={
          {
            "--fade-l": fadeL ? "26px" : "0px",
            "--fade-r": fadeR ? "26px" : "0px",
          } as React.CSSProperties
        }
      >
        <button
          type="button"
          className={`chip${filtro === null ? " on" : ""}`}
          aria-pressed={filtro === null}
          onClick={() => aoTrocar(null)}
        >
          Todas
        </button>
        {materias.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`chip${filtro === m.id ? " on" : ""}`}
            aria-pressed={filtro === m.id}
            onClick={() => aoTrocar(filtro === m.id ? null : m.id)}
          >
            <span className="dot" style={{ background: m.cor }} />
            {m.nome}
          </button>
        ))}
      </div>
      <span className={`filtros-seta${mostrarSeta ? " on" : ""}`} aria-hidden="true">
        ›
      </span>
    </div>
  );
}
