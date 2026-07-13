"use client";

import { useState } from "react";
import { Drawer } from "./Drawer";
import { useTema } from "./useTema";

/**
 * Botão de menu (no topo da agenda) + o painel lateral que ele abre. Por ora o
 * painel guarda só o ajuste de aparência (tema claro/escuro); é a casa estável
 * dos ajustes conforme o roadmap avança (drawer com navegação, etc.).
 */
export function MenuLateral() {
  const [aberto, setAberto] = useState(false);
  const { tema, definir } = useTema();

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
