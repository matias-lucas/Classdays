"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Estado do gesto exposto pelo hook. `dx` é o quanto o dedo puxou (px, com
 * resistência aplicada); `assentando` guarda pra onde o trilho está deslizando
 * depois que o dedo soltou ("volta" = não passou do limiar, desfaz).
 */
export interface Arraste {
  dx: number;
  assentando: "prox" | "ant" | "volta" | null;
}

const LIMIAR_TROCA = 64; // px puxados pra confirmar a troca ao soltar
const LIMIAR_EIXO = 8; // px pra decidir se o gesto é horizontal ou vertical

const reduzMovimento = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

interface Opcoes {
  /** Elemento que recebe o gesto (também é quem captura o ponteiro). */
  alvoRef: React.RefObject<HTMLElement | null>;
  /** Consultado no início de cada gesto — permite desligar o arraste. */
  habilitado: () => boolean;
  /** Chamado UMA vez quando a troca se confirma (após o assentamento). */
  aoConfirmar: (dir: "prox" | "ant") => void;
}

/**
 * Máquina do gesto de arraste horizontal (a navegação por toque da grade).
 *
 * - Trava de eixo: os primeiros px decidem se o gesto é horizontal (o hook
 *   assume e captura o ponteiro) ou vertical (a página continua rolando).
 * - Resistência: segue o dedo 1:1 dentro de uma largura; além disso, freia —
 *   não dá pra "arremessar" várias semanas de uma vez.
 * - Ao soltar: passou do limiar confirma ("prox"/"ant"), senão volta.
 * - `finalizar` é idempotente: o transitionend do trilho e o timeout de
 *   segurança (aba oculta etc.) podem ambos chamá-lo sem confirmar duas vezes.
 *
 * Quem anima o trilho é o componente, lendo `arraste`; o hook só governa o
 * estado do gesto.
 */
export function useArrasteHorizontal({ alvoRef, habilitado, aoConfirmar }: Opcoes) {
  const [arraste, setArraste] = useState<Arraste | null>(null);

  const gesto = useRef({
    ativo: false, // travou no eixo horizontal?
    avaliando: false, // dedo desceu, ainda decidindo o eixo
    pointerId: -1,
    x0: 0,
    y0: 0,
    largura: 0,
  });
  const finalizado = useRef(false);

  const comResistencia = (dx: number, largura: number) => {
    const max = largura || 320;
    if (Math.abs(dx) <= max) return dx;
    return Math.sign(dx) * (max + (Math.abs(dx) - max) * 0.2);
  };

  const finalizar = (dir: "prox" | "ant" | "volta") => {
    if (finalizado.current) return;
    finalizado.current = true;
    if (dir === "prox" || dir === "ant") aoConfirmar(dir);
    setArraste(null);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!habilitado() || e.pointerType === "mouse") return;
    const g = gesto.current;
    g.avaliando = true;
    g.ativo = false;
    g.pointerId = e.pointerId;
    g.x0 = e.clientX;
    g.y0 = e.clientY;
    g.largura = alvoRef.current?.clientWidth ?? 0;
    finalizado.current = false;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesto.current;
    if (g.pointerId !== e.pointerId) return;
    const dx = e.clientX - g.x0;
    const dy = e.clientY - g.y0;

    if (g.avaliando) {
      // ainda decidindo o eixo: horizontal → assume; vertical → deixa a página rolar
      if (Math.abs(dx) < LIMIAR_EIXO && Math.abs(dy) < LIMIAR_EIXO) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        g.avaliando = false;
        return;
      }
      g.avaliando = false;
      g.ativo = true;
      alvoRef.current?.setPointerCapture(e.pointerId);
    }
    if (!g.ativo) return;
    setArraste({ dx: comResistencia(dx, g.largura), assentando: null });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const g = gesto.current;
    if (g.pointerId !== e.pointerId) return;
    const foiAtivo = g.ativo;
    g.ativo = false;
    g.avaliando = false;
    g.pointerId = -1;
    if (!foiAtivo) return;

    const dx = e.clientX - g.x0;
    const dir: "prox" | "ant" | "volta" =
      dx <= -LIMIAR_TROCA ? "prox" : dx >= LIMIAR_TROCA ? "ant" : "volta";

    // Sem movimento: pula o assentamento e confirma/desfaz na hora.
    if (reduzMovimento()) {
      finalizar(dir);
      return;
    }
    setArraste((a) => (a ? { ...a, assentando: dir } : null));
  };

  // Rede de segurança do assentamento: se o transitionend não vier, finaliza.
  // Precisa ser MAIOR que a duração da transição no CSS (480ms), senão corta a
  // animação no meio.
  useEffect(() => {
    if (!arraste?.assentando) return;
    const dir = arraste.assentando;
    const t = setTimeout(() => finalizar(dir), 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arraste?.assentando]);

  return {
    arraste,
    finalizar,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    },
  };
}
