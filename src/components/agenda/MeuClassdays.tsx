"use client";

import { useEffect, useState } from "react";
import { Drawer } from "@/components/layout/Drawer";
import type { Materia } from "@/lib/types";

/**
 * Evento global que abre o painel "Meu Classdays" de fora (o item do
 * MenuLateral o dispara). Mesmo padrão do EVENTO_ABRIR_PROXIMOS.
 */
export const EVENTO_ABRIR_MEU_CLASSDAYS = "classdays:abrir-meu-classdays";

interface Props {
  materias: Materia[];
  materiasOcultas: string[];
  alternar: (id: string) => void;
}

/**
 * "Meu Classdays": aviso discreto (só aparece com algo oculto) + painel onde
 * o aluno escolhe quais matérias somem da própria agenda — nunca mexe no que
 * os outros veem. Reaproveita o Drawer e o switch genérico (mesma anatomia da
 * linha de tema): switch ligado = matéria visível, o estado inicial (tudo
 * ligado) bate com quem nunca configurou nada.
 */
export function MeuClassdays({ materias, materiasOcultas, alternar }: Props) {
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    const abrir = () => setAberto(true);
    window.addEventListener(EVENTO_ABRIR_MEU_CLASSDAYS, abrir);
    return () => window.removeEventListener(EVENTO_ABRIR_MEU_CLASSDAYS, abrir);
  }, []);

  const qtdOcultas = materiasOcultas.length;

  return (
    <>
      {qtdOcultas > 0 && (
        <button type="button" className="aviso-ocultas" onClick={() => setAberto(true)}>
          {qtdOcultas} {qtdOcultas === 1 ? "matéria oculta" : "matérias ocultas"} · Meu Classdays
        </button>
      )}

      <Drawer open={aberto} onFechar={() => setAberto(false)} titulo="Meu Classdays">
        <div className="drawer-sec">
          <span className="drawer-label">Minhas matérias</span>
          <p className="drawer-desc">
            Alterne a visualização de matérias no seu dispositivo.
          </p>
          <ul className="drawer-nav">
            {materias.map((m) => (
              <li key={m.id}>
                <label className="linha-switch">
                  <input
                    type="checkbox"
                    className="switch-check"
                    role="switch"
                    checked={!materiasOcultas.includes(m.id)}
                    onChange={() => alternar(m.id)}
                  />
                  <span className="drawer-nav-ico" aria-hidden="true">
                    <span className="dot" style={{ background: m.cor }} />
                  </span>
                  {m.nome}
                  <span className="switch-slider" aria-hidden="true" />
                </label>
              </li>
            ))}
          </ul>
        </div>
      </Drawer>
    </>
  );
}
