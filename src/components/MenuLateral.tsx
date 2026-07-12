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
          <div className="seg" role="group" aria-label="Tema">
            <button
              type="button"
              className={`seg-opt${tema === "light" ? " on" : ""}`}
              aria-pressed={tema === "light"}
              onClick={() => definir("light")}
            >
              Claro
            </button>
            <button
              type="button"
              className={`seg-opt${tema === "dark" ? " on" : ""}`}
              aria-pressed={tema === "dark"}
              onClick={() => definir("dark")}
            >
              Escuro
            </button>
          </div>
        </div>
      </Drawer>
    </>
  );
}
