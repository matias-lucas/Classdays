"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Evento } from "@/lib/types";

const CHAVE_SINO = "classdays:sino:v1";

function lerUltimoVisto(): string | null {
  try {
    const bruto = localStorage.getItem(CHAVE_SINO);
    return bruto && bruto.length > 0 ? bruto : null;
  } catch {
    return null;
  }
}

function salvarUltimoVisto(iso: string) {
  try {
    localStorage.setItem(CHAVE_SINO, iso);
  } catch {
    // localStorage indisponível (modo privado etc.): a marcação não
    // sobrevive ao reload, mas não trava a interação — mesma postura do
    // usePreferencias.
  }
}

/**
 * "Sino": quais eventos de `candidatos` (a janela de dias já filtrada por
 * quem chama, ver `eventosNoIntervalo`) têm `created_at` depois da última
 * vez que o aluno abriu o painel de novidades. `localStorage` guarda só esse
 * timestamp.
 *
 * Hydration-safe: nasce com `naoLidos: []` (igual ao servidor) e só lê o
 * localStorage depois de montar, num `useEffect` — mesmo padrão do
 * `usePreferencias`. Primeira visita (chave ainda não existe): a baseline
 * vira "agora", pra não abrir o app já com um badge cheio de tudo que já
 * existia antes do aluno chegar.
 */
export function useNaoLidos(candidatos: Evento[]) {
  const [ultimoVisto, setUltimoVisto] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    const salvo = lerUltimoVisto();
    const baseline = salvo ?? new Date().toISOString();
    if (!salvo) salvarUltimoVisto(baseline);
    setUltimoVisto(baseline);
    setPronto(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const naoLidos = useMemo(
    () => (pronto && ultimoVisto ? candidatos.filter((e) => e.created_at > ultimoVisto) : []),
    [pronto, ultimoVisto, candidatos],
  );

  const marcarVistos = useCallback(() => {
    if (candidatos.length === 0) return;
    const maisRecente = candidatos.reduce(
      (max, e) => (e.created_at > max ? e.created_at : max),
      ultimoVisto ?? "",
    );
    if (maisRecente && maisRecente !== ultimoVisto) {
      setUltimoVisto(maisRecente);
      salvarUltimoVisto(maisRecente);
    }
  }, [candidatos, ultimoVisto]);

  return { naoLidos, marcarVistos, pronto };
}
