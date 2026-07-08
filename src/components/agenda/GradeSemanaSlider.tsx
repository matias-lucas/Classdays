"use client";

import { useEffect, useRef, useState } from "react";
import type { DiaDaSemana } from "@/lib/agenda";
import type { Materia } from "@/lib/types";
import { GradeSemana } from "./GradeSemana";

interface Props {
  semana: DiaDaSemana[];
  materiaDe: (id: string | null) => Materia | undefined;
  hojeIso: string;
  filtro: string | null;
  /** Pra que lado o usuário navegou no tempo — decide o sentido do carrossel. */
  direcao: "inicial" | "prox" | "ant";
  /** Marcar os dias já passados (some no mobile, apaga no desktop). */
  marcarPassados: boolean;
}

interface Transicao {
  saindo: DiaDaSemana[]; // a semana que estava na tela
  dir: "prox" | "ant";
  token: number; // muda a cada troca → remonta o trilho e reinicia a animação
}

/**
 * O carrossel da "Grade da semana".
 *
 * Trocar de semana não troca o conteúdo na hora: mantém a semana que sai E a
 * que entra na tela ao mesmo tempo, lado a lado num "trilho" de largura dupla,
 * e desliza o trilho inteiro. A semana atual é jogada pra fora por um lado
 * enquanto a nova é puxada de fora pra dentro pelo outro — as duas se movem
 * juntas. Avançar (prox) empurra pra esquerda; voltar (ant), o inverso.
 *
 * Só a semana em foco depende de `hojeIso`/`filtro`; a que sai é um retrato
 * congelado do que já estava renderizado.
 */
export function GradeSemanaSlider({
  semana,
  materiaDe,
  hojeIso,
  filtro,
  direcao,
  marcarPassados,
}: Props) {
  const identidade = semana[0]?.data;
  const [transicao, setTransicao] = useState<Transicao | null>(null);

  // refs guardam o que estava na tela ANTES desta renderização, pra montar a
  // semana "saindo" no instante em que a troca é detectada.
  const semanaAnterior = useRef(semana);
  const idAnterior = useRef(identidade);

  useEffect(() => {
    if (idAnterior.current !== identidade) {
      const reduzMovimento = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      // Sem movimento (ou primeira carga): troca seca, sem carrossel.
      if (!reduzMovimento && (direcao === "prox" || direcao === "ant")) {
        setTransicao((t) => ({
          saindo: semanaAnterior.current,
          dir: direcao,
          token: (t?.token ?? 0) + 1,
        }));
      }
      idAnterior.current = identidade;
    }
    semanaAnterior.current = semana;
  }, [identidade, semana, direcao]);

  // Rede de segurança: se o animationend não disparar (aba oculta, etc.),
  // limpa a transição mesmo assim, pra nunca ficar preso no trilho.
  useEffect(() => {
    if (!transicao) return;
    const t = setTimeout(() => setTransicao(null), 700);
    return () => clearTimeout(t);
  }, [transicao]);

  const painelAtual = (
    <div className="grade-panel">
      <GradeSemana
        semana={semana}
        materiaDe={materiaDe}
        hojeIso={hojeIso}
        filtro={filtro}
        marcarPassados={marcarPassados}
      />
    </div>
  );

  if (!transicao) {
    return <div className="grade-viewport">{painelAtual}</div>;
  }

  const painelSaindo = (
    <div className="grade-panel" aria-hidden="true">
      <GradeSemana
        semana={transicao.saindo}
        materiaDe={materiaDe}
        hojeIso={hojeIso}
        filtro={filtro}
        marcarPassados={marcarPassados}
      />
    </div>
  );

  // avançar: [sai, entra] e o trilho corre pra esquerda (0 → -50%)
  // voltar:  [entra, sai] e o trilho corre pra direita (-50% → 0)
  const avancando = transicao.dir === "prox";

  return (
    <div className="grade-viewport">
      <div
        className={`grade-track ${avancando ? "to-prox" : "to-ant"}`}
        key={transicao.token}
        onAnimationEnd={(e) => {
          if (e.target === e.currentTarget) setTransicao(null);
        }}
      >
        {avancando ? painelSaindo : painelAtual}
        {avancando ? painelAtual : painelSaindo}
      </div>
    </div>
  );
}
