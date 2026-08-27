"use client";

import { useCallback, useEffect, useState } from "react";
import type { Materia } from "@/lib/types";

const CHAVE_PREFS = "classdays:prefs:v1";

interface Preferencias {
  materiasOcultas: string[];
}

function lerPreferencias(): string[] {
  try {
    const bruto = localStorage.getItem(CHAVE_PREFS);
    const dado = bruto ? (JSON.parse(bruto) as Partial<Preferencias>) : null;
    const lista = dado?.materiasOcultas;
    return Array.isArray(lista) ? lista.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function salvarPreferencias(materiasOcultas: string[]) {
  try {
    localStorage.setItem(CHAVE_PREFS, JSON.stringify({ materiasOcultas }));
  } catch {
    // localStorage indisponível (modo privado etc.): a escolha ainda vale
    // nesta visita, só não sobrevive ao reload.
  }
}

/**
 * "Meu Classdays": matérias que o aluno escolheu esconder da própria agenda —
 * fica só no aparelho dele (localStorage), a agenda pública de quem nunca
 * mexeu aqui continua intacta.
 *
 * Hydration-safe: nasce vazio (igual ao servidor) e só lê o localStorage
 * depois de montar, num `useEffect` — a agenda aparece inteira e "encolhe"
 * num frame, honesto e sem mismatch (mesmo padrão do recolhimento de seções).
 */
export function usePreferencias(materias: Materia[]) {
  const [materiasOcultas, setMateriasOcultas] = useState<string[]>([]);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    const idsValidos = new Set(materias.map((m) => m.id));
    // set-state-in-effect é o padrão de hidratação descrito no doc acima: o
    // localStorage não existe no servidor, então a leitura só pode ser aqui.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMateriasOcultas(lerPreferencias().filter((id) => idsValidos.has(id)));
    setPronto(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const alternar = useCallback((id: string) => {
    setMateriasOcultas((atual) => {
      const proximo = atual.includes(id)
        ? atual.filter((x) => x !== id)
        : [...atual, id];
      salvarPreferencias(proximo);
      return proximo;
    });
  }, []);

  return { materiasOcultas, alternar, pronto };
}
