"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { EVENTO_ABRIR_PROXIMOS } from "./agenda/HeroProximo";
import { EVENTO_EXPANDIR_SECAO } from "./agenda/SecaoRecolhivel";
import { Drawer } from "./Drawer";
import { useTema } from "./useTema";

/**
 * Botão de menu (no topo da agenda) + o painel lateral que ele abre: navegação
 * (seções da própria página e o painel admin) e ajustes de aparência. Novos
 * destinos (Opcionais 1/2 do roadmap) entram como itens em ITENS_NAV.
 */

type ItemNav = { rotulo: string; icone: ReactNode } & (
  | { tipo: "link"; href: string }
  | { tipo: "scroll"; secao: string }
  | { tipo: "evento"; nome: string }
);

/* Ícones do menu: SVGs de traço em currentColor (o CSS decide a cor), 20px,
   mesmo peso de linha (1.6) pra lerem como uma família só. */

function IcoCalendario() {
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" fill="none" aria-hidden="true">
      <rect x="2.75" y="4" width="14.5" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6.5 2.5v3M13.5 2.5v3M2.75 8.25h14.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="7" cy="12.5" r="1.4" fill="currentColor" />
    </svg>
  );
}

function IcoCadeado() {
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" fill="none" aria-hidden="true">
      <rect x="4" y="9" width="12" height="8.5" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6.75 9V6.75a3.25 3.25 0 0 1 6.5 0V9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="10" cy="13.25" r="1.4" fill="currentColor" />
    </svg>
  );
}

function IcoSol() {
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="3.4" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M10 2.2v1.9M10 15.9v1.9M2.2 10h1.9M15.9 10h1.9M4.5 4.5l1.3 1.3M14.2 14.2l1.3 1.3M15.5 4.5l-1.3 1.3M5.8 14.2l-1.3 1.3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IcoLua() {
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" fill="none" aria-hidden="true">
      <path
        d="M16.4 12.1A6.9 6.9 0 0 1 7.9 3.6a7 7 0 1 0 8.5 8.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const ITENS_NAV: ItemNav[] = [
  {
    rotulo: "Próximos eventos",
    icone: <IcoCalendario />,
    tipo: "evento",
    nome: EVENTO_ABRIR_PROXIMOS,
  },
  { rotulo: "Painel admin", icone: <IcoCadeado />, tipo: "link", href: "/admin" },
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

  // Fecha o drawer e só então dispara o evento global (mesmo motivo do rAF em
  // irParaSecao: deixa o Drawer devolver o foco antes do menu que abre prendê-lo).
  const dispararEvento = (nome: string) => {
    setAberto(false);
    requestAnimationFrame(() => {
      window.dispatchEvent(new CustomEvent(nome));
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
                    <span className="drawer-nav-ico">{item.icone}</span>
                    {item.rotulo}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="drawer-nav-item"
                    onClick={() =>
                      item.tipo === "evento"
                        ? dispararEvento(item.nome)
                        : irParaSecao(item.secao)
                    }
                  >
                    <span className="drawer-nav-ico">{item.icone}</span>
                    {item.rotulo}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="drawer-sec">
          <span className="drawer-label">Aparência</span>
          {/* Mesma anatomia dos itens de navegação (ícone + rótulo), com o
              switch à direita. A linha inteira é o <label>: todo o alvo (≥44px)
              alterna o tema. O checkbox fica invisível mas focável, para operar
              por teclado (Tab + Espaço); marcado = tema claro. */}
          <label className="tema-linha">
            <input
              type="checkbox"
              className="toggle-tema-check"
              role="switch"
              checked={tema === "light"}
              onChange={(e) => definir(e.target.checked ? "light" : "dark")}
            />
            {/* key={tema} remonta o span na troca → a animação de "amanhecer"
                do ícone (globals.css) replay a cada alternância */}
            <span className="drawer-nav-ico" aria-hidden="true" key={tema}>
              {tema === "light" ? <IcoSol /> : <IcoLua />}
            </span>
            {tema === "light" ? "Tema claro" : "Tema escuro"}
            <span className="toggle-tema-slider" aria-hidden="true" />
          </label>
        </div>
      </Drawer>
    </>
  );
}
