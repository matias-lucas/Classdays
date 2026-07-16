"use client";

import { useState } from "react";

/**
 * O toggle "grade divulgada" do /admin: liga/desliga se a turma vê "Hoje" e
 * "Grade da semana" (desligado, essas seções mostram "Ainda não divulgado").
 * Otimista — muda a UI na hora e desfaz se o PATCH falhar.
 */
export function useGradeVisivel(inicial: boolean) {
  const [gradeVisivel, setGradeVisivel] = useState(inicial);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function alternar(novo: boolean) {
    setGradeVisivel(novo);
    setSalvando(true);
    setErro(null);
    try {
      const r = await fetch("/api/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gradeVisivel: novo }),
      });
      if (!r.ok) {
        const corpo = await r.json().catch(() => null);
        setGradeVisivel(!novo); // desfaz
        setErro(corpo?.erro ?? "Não consegui salvar.");
      }
    } catch {
      setGradeVisivel(!novo); // desfaz
      setErro("Sem conexão com o servidor.");
    } finally {
      setSalvando(false);
    }
  }

  return { gradeVisivel, salvando, erro, alternar };
}
