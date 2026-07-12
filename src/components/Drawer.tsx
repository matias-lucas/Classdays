"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface Props {
  open: boolean;
  onFechar: () => void;
  titulo: string;
  children: ReactNode;
}

/**
 * Painel lateral genérico (menu/ajustes). Enquanto aberto: trava o scroll do
 * fundo, prende o foco dentro do painel (Tab circula), fecha no Esc e no clique
 * do scrim, e devolve o foco a quem abriu ao fechar. Fica sempre montado — a
 * classe `.on` faz a entrada/saída animada; fechado, `visibility:hidden` (no
 * CSS) o tira da ordem de tabulação. Movimento reduzido é tratado no globals.css.
 */
export function Drawer({ open, onFechar, titulo, children }: Props) {
  const asideRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const aside = asideRef.current;
    const anterior = document.activeElement as HTMLElement | null;

    const overflowAntes = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focaveis = () =>
      aside
        ? Array.from(
            aside.querySelectorAll<HTMLElement>(
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

  return (
    <>
      <div
        className={`scrim${open ? " on" : ""}`}
        onClick={onFechar}
        aria-hidden="true"
      />
      <aside
        ref={asideRef}
        className={`drawer${open ? " on" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        aria-hidden={!open}
      >
        <div className="drawer-head">
          <span className="drawer-titulo">{titulo}</span>
          <button
            type="button"
            className="drawer-fechar"
            aria-label="Fechar menu"
            onClick={onFechar}
          >
            ×
          </button>
        </div>
        <div className="drawer-corpo">{children}</div>
      </aside>
    </>
  );
}
