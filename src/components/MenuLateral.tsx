"use client";

import Link from "next/link";
import { useState } from "react";
import { EVENTO_EXPANDIR_SECAO } from "./agenda/SecaoRecolhivel";
import { Drawer } from "./Drawer";
import { useTema } from "./useTema";

/**
 * Botão de menu (no topo da agenda) + o painel lateral que ele abre: navegação
 * (seções da própria página e o painel admin) e ajustes de aparência. Novos
 * destinos (Opcionais 1/2 do roadmap) entram como itens em ITENS_NAV.
 */

type ItemNav =
  | { rotulo: string; tipo: "link"; href: string }
  | { rotulo: string; tipo: "scroll"; secao: string };

const ITENS_NAV: ItemNav[] = [
  { rotulo: "Próximos eventos", tipo: "scroll", secao: "proximo" },
  { rotulo: "Painel admin", tipo: "link", href: "/admin" },
];

export function MenuLateral() {
  const [aberto, setAberto] = useState(false);
  const { tema, definir } = useTema();

  // Fecha o drawer e só então rola até a seção: o Drawer trava o scroll do
  // body enquanto aberto e devolve o foco ao botão do menu ao fechar — o rAF
  // garante que o scroll acontece depois dessas duas coisas.
  const irParaSecao = (secao: string) => {
    setAberto(false);
    requestAnimationFrame(() => {
      window.dispatchEvent(new CustomEvent(EVENTO_EXPANDIR_SECAO, { detail: secao }));
      const reduz = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      document
        .getElementById(`sec-${secao}`)
        ?.scrollIntoView({ behavior: reduz ? "auto" : "smooth", block: "start" });
    });
  };

  return (
    <>
      <button
        type="button"
        className="menu-btn"
        aria-label="Abrir menu"
        aria-haspopup="dialog"
        aria-expanded={aberto}
        onClick={() => setAberto(true)}
      >
        <span className="menu-ico" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </button>

      <Drawer open={aberto} onFechar={() => setAberto(false)} titulo="Classdays">
        <nav className="drawer-sec" aria-label="Navegação">
          <span className="drawer-label">Navegação</span>
          <ul className="drawer-nav">
            {ITENS_NAV.map((item) => (
              <li key={item.rotulo}>
                {item.tipo === "link" ? (
                  <Link className="drawer-nav-item" href={item.href}>
                    {item.rotulo}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="drawer-nav-item"
                    onClick={() => irParaSecao(item.secao)}
                  >
                    {item.rotulo}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="drawer-sec">
          <span className="drawer-label">Aparência</span>
          {/* Desmarcado = lua (tema escuro); marcado = bolinha cheia sobre o
              trilho de alta ênfase (tema claro). O checkbox fica invisível mas
              focável, para operar por teclado (Tab + Espaço). */}
          <label className="toggle-tema">
            <input
              type="checkbox"
              className="toggle-tema-check"
              role="switch"
              checked={tema === "light"}
              onChange={(e) => definir(e.target.checked ? "light" : "dark")}
              aria-label="Tema claro"
            />
            <span className="toggle-tema-slider" aria-hidden="true" />
          </label>
        </div>
      </Drawer>
    </>
  );
}
